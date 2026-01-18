import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, EntityType } from '../audit/dto/audit.dto';
import {
  ClassificationResult,
  ExtractedTag,
  ContractProfile,
  FeatureScore,
  TagDto,
  CreateTagInput,
  UpdateTagInput,
  TagDeleteResult,
} from './dto/tagging.dto';

type DecimalValue = { toString(): string } | null | undefined;

const INDUSTRIES = ['金融', '制造', '零售', '医疗', '教育', '政府', '互联网'];

@Injectable()
export class TaggingService {
  private readonly logger = new Logger(TaggingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

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

  // ==================== Tag CRUD Methods ====================

  /**
   * Get all tags with optional filters
   */
  async getTags(
    category?: string,
    includeInactive = false,
    search?: string
  ): Promise<TagDto[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (!includeInactive) {
      where.isActive = true;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const tags = await this.prisma.tag.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return tags.map((t) => this.toTagDto(t));
  }

  /**
   * Get a single tag by ID
   */
  async getTag(id: string): Promise<TagDto | null> {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
    });

    return tag ? this.toTagDto(tag) : null;
  }

  /**
   * Get all tag categories
   */
  async getTagCategories(): Promise<string[]> {
    const result = await this.prisma.tag.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return result.map((r: { category: string }) => r.category);
  }

  /**
   * Create a new tag
   */
  async createTag(
    input: CreateTagInput,
    operatorId: string,
    ipAddress?: string
  ): Promise<TagDto> {
    // Check if name already exists
    const existing = await this.prisma.tag.findUnique({
      where: { name: input.name },
    });

    if (existing) {
      throw new ConflictException('Tag name already exists');
    }

    const tag = await this.prisma.tag.create({
      data: {
        name: input.name,
        category: input.category,
        color: input.color || '#3b82f6',
        isActive: true,
        isSystem: false,
      },
    });

    // Log the audit
    await this.auditService.log({
      action: AuditAction.CREATE_TAG,
      entityType: EntityType.TAG,
      entityId: tag.id,
      entityName: tag.name,
      newValue: {
        name: tag.name,
        category: tag.category,
        color: tag.color,
      },
      operatorId,
      ipAddress,
    });

    this.logger.log(`Tag created: ${tag.name} (${tag.category})`);
    return this.toTagDto(tag);
  }

  /**
   * Update a tag
   */
  async updateTag(
    id: string,
    input: UpdateTagInput,
    operatorId: string,
    ipAddress?: string
  ): Promise<TagDto> {
    const existing = await this.prisma.tag.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Tag not found');
    }

    // If name is being changed, check it doesn't conflict
    if (input.name && input.name !== existing.name) {
      const nameConflict = await this.prisma.tag.findUnique({
        where: { name: input.name },
      });
      if (nameConflict) {
        throw new ConflictException('Tag name already exists');
      }
    }

    const oldValue = {
      name: existing.name,
      category: existing.category,
      color: existing.color,
    };

    const tag = await this.prisma.tag.update({
      where: { id },
      data: {
        name: input.name,
        category: input.category,
        color: input.color,
      },
    });

    // Log the audit
    await this.auditService.log({
      action: AuditAction.UPDATE_TAG,
      entityType: EntityType.TAG,
      entityId: tag.id,
      entityName: tag.name,
      oldValue,
      newValue: {
        name: tag.name,
        category: tag.category,
        color: tag.color,
      },
      operatorId,
      ipAddress,
    });

    return this.toTagDto(tag);
  }

  /**
   * Delete a tag (soft delete)
   */
  async deleteTag(
    id: string,
    operatorId: string,
    ipAddress?: string
  ): Promise<TagDeleteResult> {
    const existing = await this.prisma.tag.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Tag not found');
    }

    await this.prisma.tag.update({
      where: { id },
      data: { isActive: false },
    });

    // Log the audit
    await this.auditService.log({
      action: AuditAction.DELETE_TAG,
      entityType: EntityType.TAG,
      entityId: existing.id,
      entityName: existing.name,
      oldValue: { isActive: true },
      newValue: { isActive: false },
      operatorId,
      ipAddress,
    });

    this.logger.log(`Tag soft deleted: ${existing.name}`);
    return {
      success: true,
      message: 'Tag deleted successfully',
    };
  }

  /**
   * Assign a tag to a contract
   */
  async assignTagToContract(
    contractId: string,
    tagId: string,
    operatorId: string,
    ipAddress?: string
  ): Promise<void> {
    // Verify contract exists
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Verify tag exists
    const tag = await this.prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Check if already assigned
    const existing = await this.prisma.contractTag.findUnique({
      where: {
        contractId_tagId: {
          contractId,
          tagId,
        },
      },
    });

    if (existing) {
      return; // Already assigned, do nothing
    }

    await this.prisma.contractTag.create({
      data: {
        contractId,
        tagId,
      },
    });

    // Log the audit
    await this.auditService.log({
      action: AuditAction.ASSIGN_TAG,
      entityType: EntityType.CONTRACT,
      entityId: contractId,
      entityName: contract.name,
      newValue: {
        tagId,
        tagName: tag.name,
      },
      operatorId,
      ipAddress,
    });

    this.logger.log(`Tag ${tag.name} assigned to contract ${contract.contractNo}`);
  }

  /**
   * Remove a tag from a contract
   */
  async removeTagFromContract(
    contractId: string,
    tagId: string,
    operatorId: string,
    ipAddress?: string
  ): Promise<void> {
    // Verify contract exists
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Verify tag exists
    const tag = await this.prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    const existing = await this.prisma.contractTag.findUnique({
      where: {
        contractId_tagId: {
          contractId,
          tagId,
        },
      },
    });

    if (!existing) {
      return; // Not assigned, do nothing
    }

    await this.prisma.contractTag.delete({
      where: {
        contractId_tagId: {
          contractId,
          tagId,
        },
      },
    });

    // Log the audit
    await this.auditService.log({
      action: AuditAction.REMOVE_TAG,
      entityType: EntityType.CONTRACT,
      entityId: contractId,
      entityName: contract.name,
      oldValue: {
        tagId,
        tagName: tag.name,
      },
      operatorId,
      ipAddress,
    });

    this.logger.log(`Tag ${tag.name} removed from contract ${contract.contractNo}`);
  }

  /**
   * Batch assign tags to a contract
   */
  async assignTagsToContract(
    contractId: string,
    tagIds: string[],
    operatorId: string,
    ipAddress?: string
  ): Promise<void> {
    for (const tagId of tagIds) {
      await this.assignTagToContract(contractId, tagId, operatorId, ipAddress);
    }
  }

  // Transform to TagDto
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toTagDto(tag: any): TagDto {
    return {
      id: tag.id,
      name: tag.name,
      category: tag.category,
      color: tag.color,
      isActive: tag.isActive,
      isSystem: tag.isSystem,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    };
  }

  // ==================== Private Helper Methods ====================

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
