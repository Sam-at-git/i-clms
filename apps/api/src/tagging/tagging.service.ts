import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ClassificationResult,
  ExtractedTag,
  ContractProfile,
  FeatureScore,
} from './dto/tagging.dto';

type DecimalValue = { toString(): string } | null | undefined;

const INDUSTRIES = ['金融', '制造', '零售', '医疗', '教育', '政府', '互联网'];

@Injectable()
export class TaggingService {
  constructor(private readonly prisma: PrismaService) {}

  async autoClassifyContract(contractId: string): Promise<ClassificationResult> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { customer: true },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    const amount = this.decimalToNumber(contract.amountWithTax);

    // Simulate classification based on contract attributes
    const confidence = 0.75 + Math.random() * 0.2;

    // Determine scale based on amount
    let scale: string;
    if (amount >= 5000000) scale = '超大型';
    else if (amount >= 1000000) scale = '大型';
    else if (amount >= 500000) scale = '中型';
    else scale = '小型';

    return {
      contractType: contract.type,
      confidence,
      industry: contract.industry || INDUSTRIES[Math.floor(Math.random() * INDUSTRIES.length)],
      scale,
    };
  }

  async extractTags(contractId: string): Promise<ExtractedTag[]> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        customer: true,
        tags: { include: { tag: true } },
      },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    const extractedTags: ExtractedTag[] = [];

    // Extract from existing tags
    for (const ct of contract.tags) {
      extractedTags.push({
        name: ct.tag.name,
        category: ct.tag.category || '未分类',
        confidence: 1.0,
        source: '已有标签',
      });
    }

    // Simulate keyword extraction from contract name
    const keywords = this.extractKeywords(contract.name);
    for (const keyword of keywords) {
      extractedTags.push({
        name: keyword,
        category: '关键词',
        confidence: 0.7 + Math.random() * 0.2,
        source: '合同名称',
      });
    }

    // Add customer type tag
    extractedTags.push({
      name: contract.customer.name.includes('集团') ? '大企业客户' : '中小企业客户',
      category: '客户类型',
      confidence: 0.85,
      source: '客户分析',
    });

    // Add type-based tags
    const typeTags = this.getTypeBasedTags(contract.type);
    extractedTags.push(...typeTags);

    return extractedTags;
  }

  async generateProfile(contractId: string): Promise<ContractProfile> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        customer: true,
        tags: { include: { tag: true } },
      },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    const tags = contract.tags.map((ct) => ct.tag.name);
    const keywords = this.extractKeywords(contract.name);
    const amount = this.decimalToNumber(contract.amountWithTax);

    // Generate feature scores
    const features: FeatureScore[] = [
      { feature: '合同金额', score: Math.min(100, amount / 100000) },
      { feature: '客户价值', score: 60 + Math.random() * 40 },
      { feature: '执行复杂度', score: contract.type === 'PROJECT_OUTSOURCING' ? 80 : 50 },
      { feature: '风险等级', score: 30 + Math.random() * 40 },
      { feature: '战略重要性', score: amount >= 1000000 ? 85 : 50 },
    ];

    return {
      contractId,
      tags,
      keywords,
      features,
    };
  }

  private extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    const patterns = [
      { regex: /系统|平台|软件/g, keyword: '软件开发' },
      { regex: /运维|维护/g, keyword: '运维服务' },
      { regex: /咨询|顾问/g, keyword: '咨询服务' },
      { regex: /实施|部署/g, keyword: '项目实施' },
      { regex: /培训|教育/g, keyword: '培训服务' },
      { regex: /外包|人力/g, keyword: '人力外包' },
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(text)) {
        keywords.push(pattern.keyword);
      }
    }

    return keywords.length > 0 ? keywords : ['通用服务'];
  }

  private getTypeBasedTags(type: string): ExtractedTag[] {
    const tags: ExtractedTag[] = [];

    switch (type) {
      case 'STAFF_AUGMENTATION':
        tags.push(
          { name: '人力派遣', category: '业务模式', confidence: 0.95, source: '合同类型' },
          { name: '长期合作', category: '合同特征', confidence: 0.8, source: '合同类型' }
        );
        break;
      case 'PROJECT_OUTSOURCING':
        tags.push(
          { name: '项目交付', category: '业务模式', confidence: 0.95, source: '合同类型' },
          { name: '里程碑付款', category: '合同特征', confidence: 0.85, source: '合同类型' }
        );
        break;
      case 'PRODUCT_SALES':
        tags.push(
          { name: '产品销售', category: '业务模式', confidence: 0.95, source: '合同类型' },
          { name: '一次性交付', category: '合同特征', confidence: 0.8, source: '合同类型' }
        );
        break;
    }

    return tags;
  }

  private decimalToNumber(value: DecimalValue): number {
    if (!value) return 0;
    return Number(value.toString());
  }
}
