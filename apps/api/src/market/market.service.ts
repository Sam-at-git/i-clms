import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SearchResponse,
  ContractSearchResult,
  ContractSearchInput,
} from './dto/contract-search.dto';
import {
  TagOverview,
  TagStats,
  CategoryTags,
} from './dto/tag-stats.dto';
import {
  CaseOverview,
  CaseStudy,
  IndustryCases,
} from './dto/case-study.dto';
import { ContractType } from '../graphql/types/enums';

// Type for Prisma Decimal values
type DecimalValue = { toString(): string } | null | undefined;

@Injectable()
export class MarketService {
  constructor(private readonly prisma: PrismaService) {}

  async searchContracts(input: ContractSearchInput): Promise<SearchResponse> {
    const { keyword, tags, types, industries, minAmount, maxAmount, limit = 20, offset = 0 } = input;

    // Build where clause
    const where: Record<string, unknown> = {
      status: { in: ['ACTIVE', 'EXECUTING', 'COMPLETED'] },
    };

    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { contractNo: { contains: keyword, mode: 'insensitive' } },
        { customer: { name: { contains: keyword, mode: 'insensitive' } } },
      ];
    }

    if (types && types.length > 0) {
      where.type = { in: types };
    }

    if (industries && industries.length > 0) {
      where.industry = { in: industries };
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amountWithTax = {};
      if (minAmount !== undefined) {
        (where.amountWithTax as Record<string, number>).gte = minAmount;
      }
      if (maxAmount !== undefined) {
        (where.amountWithTax as Record<string, number>).lte = maxAmount;
      }
    }

    if (tags && tags.length > 0) {
      where.tags = {
        some: {
          tag: {
            name: { in: tags },
          },
        },
      };
    }

    // Get total count
    const total = await this.prisma.contract.count({ where });

    // Get results
    const contracts = await this.prisma.contract.findMany({
      where,
      include: {
        customer: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { signedAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const results: ContractSearchResult[] = contracts.map((contract) => ({
      id: contract.id,
      contractNo: contract.contractNo,
      name: contract.name,
      customerName: contract.customer.name,
      type: contract.type as ContractType,
      industry: contract.industry,
      amount: this.decimalToNumber(contract.amountWithTax),
      signedAt: contract.signedAt,
      tags: contract.tags.map((t) => t.tag.name),
      highlight: keyword
        ? this.generateHighlight(contract.name, keyword)
        : null,
    }));

    return { total, results };
  }

  async getTagOverview(): Promise<TagOverview> {
    // Get all tags with their contract counts
    const tags = await this.prisma.tag.findMany({
      include: {
        contracts: {
          include: {
            contract: true,
          },
        },
      },
    });

    const totalTags = tags.length;

    // Calculate tag stats
    const tagStats: TagStats[] = tags.map((tag) => ({
      tagId: tag.id,
      tagName: tag.name,
      category: tag.category,
      color: tag.color,
      count: tag.contracts.length,
      totalValue: tag.contracts.reduce(
        (sum, ct) => sum + this.decimalToNumber(ct.contract.amountWithTax),
        0
      ),
    }));

    // Sort by count for top tags
    const topTags = [...tagStats]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Group by category
    const categoryMap = new Map<string, TagStats[]>();
    for (const stat of tagStats) {
      const category = stat.category || '未分类';
      const existing = categoryMap.get(category) || [];
      existing.push(stat);
      categoryMap.set(category, existing);
    }

    const byCategory: CategoryTags[] = Array.from(categoryMap.entries()).map(
      ([category, categoryTags]) => ({
        category,
        tags: categoryTags.sort((a, b) => b.count - a.count),
      })
    );

    return {
      totalTags,
      topTags,
      byCategory,
    };
  }

  async getCaseOverview(): Promise<CaseOverview> {
    // Get completed contracts as cases (high value, completed successfully)
    const completedContracts = await this.prisma.contract.findMany({
      where: {
        status: 'COMPLETED',
      },
      include: {
        customer: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { amountWithTax: 'desc' },
    });

    const totalCases = completedContracts.length;

    // Group by industry
    const industryMap = new Map<string, { count: number; value: number }>();
    for (const contract of completedContracts) {
      const industry = contract.industry || '未分类';
      const existing = industryMap.get(industry) || { count: 0, value: 0 };
      existing.count += 1;
      existing.value += this.decimalToNumber(contract.amountWithTax);
      industryMap.set(industry, existing);
    }

    const byIndustry: IndustryCases[] = Array.from(industryMap.entries())
      .map(([industry, data]) => ({
        industry,
        count: data.count,
        totalValue: data.value,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    // Featured cases (top 10 by value)
    const featured: CaseStudy[] = completedContracts.slice(0, 10).map((contract) => ({
      id: contract.id,
      contractNo: contract.contractNo,
      name: contract.name,
      customerName: contract.customer.name,
      industry: contract.industry,
      type: contract.type as ContractType,
      amount: this.decimalToNumber(contract.amountWithTax),
      signedAt: contract.signedAt,
      description: this.generateCaseDescription(contract),
      highlights: this.generateCaseHighlights(contract),
      tags: contract.tags.map((t) => t.tag.name),
    }));

    return {
      totalCases,
      byIndustry,
      featured,
    };
  }

  private generateHighlight(text: string, keyword: string): string {
    const index = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (index === -1) return text.slice(0, 100);

    const start = Math.max(0, index - 20);
    const end = Math.min(text.length, index + keyword.length + 20);
    const highlight = text.slice(start, end);

    return (start > 0 ? '...' : '') + highlight + (end < text.length ? '...' : '');
  }

  private generateCaseDescription(contract: {
    name: string;
    type: string;
  }): string {
    const typeLabels: Record<string, string> = {
      STAFF_AUGMENTATION: '人力框架',
      PROJECT_OUTSOURCING: '项目外包',
      PRODUCT_SALES: '产品购销',
    };

    return `成功完成${typeLabels[contract.type] || contract.type}项目：${contract.name}`;
  }

  private generateCaseHighlights(contract: {
    type: string;
    amountWithTax: DecimalValue;
  }): string[] {
    const highlights: string[] = [];
    const amount = this.decimalToNumber(contract.amountWithTax);

    if (amount >= 1000000) {
      highlights.push('百万级大单');
    } else if (amount >= 500000) {
      highlights.push('重要客户项目');
    }

    if (contract.type === 'STAFF_AUGMENTATION') {
      highlights.push('人力资源服务');
    } else if (contract.type === 'PROJECT_OUTSOURCING') {
      highlights.push('项目交付成功');
    } else if (contract.type === 'PRODUCT_SALES') {
      highlights.push('产品解决方案');
    }

    highlights.push('按时完成交付');

    return highlights;
  }

  private decimalToNumber(value: DecimalValue): number {
    if (!value) return 0;
    return Number(value.toString());
  }
}
