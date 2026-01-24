import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateContractTemplateInput,
  UpdateContractTemplateInput,
  CloneFromTemplateInput,
} from './dto';

@Injectable()
export class ContractTemplateService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all contract templates with filtering
   */
  async findAll(filters?: {
    type?: string;
    category?: string;
    isActive?: boolean;
    departmentId?: string;
    isSystem?: boolean;
    createdById?: string;
  }) {
    const where: any = {};

    if (filters?.type) where.type = filters.type;
    if (filters?.category) where.category = filters.category;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.departmentId) where.departmentId = filters.departmentId;
    if (filters?.isSystem !== undefined) where.isSystem = filters.isSystem;
    if (filters?.createdById) where.createdById = filters.createdById;

    const [templates, total] = await Promise.all([
      this.prisma.contractTemplate.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          department: {
            select: { id: true, name: true, code: true },
          },
          _count: {
            select: { contracts: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contractTemplate.count({ where }),
    ]);

    return { templates, total };
  }

  /**
   * Get a single template by ID
   */
  async findOne(id: string) {
    const template = await this.prisma.contractTemplate.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { contracts: true },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Contract template with ID ${id} not found`);
    }

    return template;
  }

  /**
   * Create a new contract template
   */
  async create(input: CreateContractTemplateInput, createdById: string) {
    const template = await this.prisma.contractTemplate.create({
      data: {
        name: input.name,
        displayName: input.displayName,
        description: input.description,
        category: input.category,
        type: input.type,
        content: input.content,
        fileUrl: input.fileUrl,
        fileType: input.fileType,
        parameters: input.parameters as any,
        defaultValues: input.defaultValues as any,
        isActive: input.isActive ?? true,
        isSystem: input.isSystem ?? false,
        version: input.version ?? '1.0',
        departmentId: input.departmentId,
        createdById,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return template;
  }

  /**
   * Update an existing contract template
   */
  async update(id: string, input: UpdateContractTemplateInput, userId: string) {
    const template = await this.prisma.contractTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Contract template with ID ${id} not found`);
    }

    // Check if user is the creator or admin
    if (template.createdById !== userId) {
      throw new ForbiddenException('You can only update templates you created');
    }

    const updated = await this.prisma.contractTemplate.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.displayName !== undefined && { displayName: input.displayName }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.type && { type: input.type }),
        ...(input.content && { content: input.content }),
        ...(input.fileUrl !== undefined && { fileUrl: input.fileUrl }),
        ...(input.fileType !== undefined && { fileType: input.fileType }),
        ...(input.parameters !== undefined && { parameters: input.parameters as any }),
        ...(input.defaultValues !== undefined && { defaultValues: input.defaultValues as any }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.version && { version: input.version }),
        ...(input.departmentId !== undefined && { departmentId: input.departmentId }),
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return updated;
  }

  /**
   * Delete a contract template
   */
  async remove(id: string, userId: string) {
    const template = await this.prisma.contractTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Contract template with ID ${id} not found`);
    }

    // Check if user is the creator or admin
    if (template.createdById !== userId) {
      throw new ForbiddenException('You can only delete templates you created');
    }

    // Soft delete by setting isActive to false
    await this.prisma.contractTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true, message: 'Template deleted successfully' };
  }

  /**
   * Clone a contract from template
   */
  async cloneFromTemplate(input: CloneFromTemplateInput, userId: string) {
    const template = await this.prisma.contractTemplate.findUnique({
      where: { id: input.templateId },
    });

    if (!template) {
      throw new NotFoundException(`Contract template with ID ${input.templateId} not found`);
    }

    if (!template.isActive) {
      throw new ForbiddenException('Cannot create contract from inactive template');
    }

    // Get default values from template
    const defaultValues = template.defaultValues as Record<string, any> || {};

    // Create contract from template
    const contract = await this.prisma.contract.create({
      data: {
        contractNo: input.contractNo,
        name: input.name,
        type: template.type,
        ourEntity: input.ourEntity || defaultValues.ourEntity || '',
        customerId: input.customerId,
        departmentId: input.departmentId,
        salesPerson: input.salesPerson,
        uploadedById: input.uploadedById || userId,
        templateId: template.id,
        amountWithTax: defaultValues.amountWithTax || 0,
        currency: defaultValues.currency || 'CNY',
        parseStatus: 'COMPLETED',
        parsedAt: new Date(),
      },
      include: {
        customer: {
          select: { id: true, name: true, shortName: true },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
        template: {
          select: { id: true, name: true, displayName: true },
        },
      },
    });

    // Increment template usage count
    await this.prisma.contractTemplate.update({
      where: { id: template.id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    return contract;
  }

  /**
   * Get template categories
   */
  async getCategories() {
    const templates = await this.prisma.contractTemplate.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category'],
    });

    const categories = templates
      .map((t) => t.category)
      .filter((c): c is string => !!c)
      .sort();

    return categories;
  }

  /**
   * Increment template usage count
   */
  async incrementUsage(id: string) {
    await this.prisma.contractTemplate.update({
      where: { id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  }
}
