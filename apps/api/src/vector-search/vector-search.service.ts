import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SemanticSearchResult, SimilarContract } from './dto/vector-search.dto';

const KEYWORDS = [
  { term: '系统开发', related: ['软件', '平台', '应用', '系统'] },
  { term: '人力外包', related: ['人员', '派遣', '外包', '驻场'] },
  { term: '运维服务', related: ['运维', '维护', '支持', '服务'] },
  { term: '咨询项目', related: ['咨询', '顾问', '规划', '设计'] },
  { term: '实施部署', related: ['实施', '部署', '安装', '上线'] },
];

@Injectable()
export class VectorSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async semanticSearch(query: string, limit = 10): Promise<SemanticSearchResult[]> {
    const contracts = await this.prisma.contract.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    const results: SemanticSearchResult[] = [];
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);

    for (const contract of contracts) {
      const nameLower = contract.name.toLowerCase();
      const industryLower = (contract.industry || '').toLowerCase();
      const combinedText = `${nameLower} ${industryLower}`;

      // Calculate similarity based on term matching and semantic expansion
      let similarity = 0;
      const highlights: string[] = [];

      // Direct match scoring
      for (const term of queryTerms) {
        if (combinedText.includes(term)) {
          similarity += 0.3;
          highlights.push(`直接匹配: ${term}`);
        }
      }

      // Semantic expansion scoring
      for (const kw of KEYWORDS) {
        const termMatches = queryTerms.some(t => kw.term.includes(t) || kw.related.some(r => r.includes(t)));
        const contentMatches = kw.related.some(r => combinedText.includes(r));

        if (termMatches && contentMatches) {
          similarity += 0.2;
          highlights.push(`语义关联: ${kw.term}`);
        }
      }

      // Add some randomness to simulate embedding similarity
      similarity += Math.random() * 0.1;

      // Only include results with meaningful similarity
      if (similarity > 0.1) {
        results.push({
          contractId: contract.id,
          contractNo: contract.contractNo,
          name: contract.name,
          similarity: Math.min(similarity, 1.0),
          highlights: highlights.length > 0 ? highlights : ['基于上下文相似'],
        });
      }
    }

    // Sort by similarity and return top results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  async findSimilarContracts(contractId: string, limit = 5): Promise<SimilarContract[]> {
    const targetContract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { customer: true, tags: { include: { tag: true } } },
    });

    if (!targetContract) {
      throw new Error('Contract not found');
    }

    const allContracts = await this.prisma.contract.findMany({
      where: { id: { not: contractId } },
      take: 50,
      include: { customer: true, tags: { include: { tag: true } } },
    });

    const results: SimilarContract[] = [];

    for (const contract of allContracts) {
      let similarity = 0;
      const matchReasons: string[] = [];

      // Same customer match
      if (contract.customerId === targetContract.customerId) {
        similarity += 0.4;
        matchReasons.push('同一客户');
      }

      // Same contract type match
      if (contract.type === targetContract.type) {
        similarity += 0.25;
        matchReasons.push(`同类型: ${contract.type}`);
      }

      // Same industry match
      if (contract.industry && contract.industry === targetContract.industry) {
        similarity += 0.15;
        matchReasons.push(`同行业: ${contract.industry}`);
      }

      // Tag overlap
      const targetTags = new Set(targetContract.tags.map(t => t.tag.name));
      const contractTags = contract.tags.map(t => t.tag.name);
      const overlapTags = contractTags.filter(t => targetTags.has(t));

      if (overlapTags.length > 0) {
        similarity += 0.1 * overlapTags.length;
        matchReasons.push(`共同标签: ${overlapTags.join(', ')}`);
      }

      // Name similarity (simple word overlap)
      const targetWords = new Set(targetContract.name.split(/\s+/));
      const contractWords = contract.name.split(/\s+/);
      const wordOverlap = contractWords.filter(w => targetWords.has(w)).length;

      if (wordOverlap > 0) {
        similarity += 0.05 * wordOverlap;
        matchReasons.push('名称相似');
      }

      // Only include if there's meaningful similarity
      if (similarity > 0.1) {
        results.push({
          contractId: contract.id,
          contractNo: contract.contractNo,
          name: contract.name,
          customerName: contract.customer.name,
          similarity: Math.min(similarity, 1.0),
          matchReasons: matchReasons.length > 0 ? matchReasons : ['内容相似'],
        });
      }
    }

    // Sort by similarity and return top results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }
}
