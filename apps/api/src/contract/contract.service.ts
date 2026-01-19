import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { Prisma } from '@prisma/client';
import {
  CreateContractInput,
  UpdateContractInput,
  ContractFilterInput,
  ContractOrderInput,
  ContractOrderField,
  SortOrder,
} from './dto';
import { ContractConnection } from './models';

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    filter?: ContractFilterInput,
    skip = 0,
    take = 20,
    orderBy?: ContractOrderInput
  ): Promise<ContractConnection> {
    const where = this.buildWhereClause(filter);

    const orderByClause = this.buildOrderByClause(orderBy);

    const [nodes, totalCount] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        skip,
        take: take + 1, // Fetch one extra to check hasNextPage
        orderBy: orderByClause,
        include: {
          customer: true,
          department: true,
          uploadedBy: {
            include: {
              department: true,
            },
          },
          parentContract: true,
          supplements: true,
        },
      }),
      this.prisma.contract.count({ where }),
    ]);

    const hasNextPage = nodes.length > take;
    if (hasNextPage) {
      nodes.pop(); // Remove the extra item
    }

    return {
      nodes: nodes.map((node) => this.transformContract(node)),
      totalCount,
      hasNextPage,
      hasPreviousPage: skip > 0,
    };
  }

  async findOne(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        customer: true,
        department: true,
        uploadedBy: {
          include: {
            department: true,
          },
        },
        parentContract: true,
        supplements: true,
        staffAugmentation: {
          include: {
            rateItems: true,
          },
        },
        projectOutsourcing: {
          include: {
            milestones: true,
          },
        },
        productSales: {
          include: {
            lineItems: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!contract) {
      return null;
    }

    return this.transformContract(contract);
  }

  async findByContractNo(contractNo: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { contractNo },
      include: {
        customer: true,
        department: true,
        uploadedBy: {
          include: {
            department: true,
          },
        },
        parentContract: true,
        supplements: true,
      },
    });

    if (!contract) {
      return null;
    }

    return this.transformContract(contract);
  }

  async create(input: CreateContractInput) {
    // 处理客户：如果没有customerId但有customerName，则创建或查找客户
    let customerId = input.customerId;
    if (!customerId && input.customerName) {
      // 先尝试按名称查找
      let customer = await this.prisma.customer.findFirst({
        where: { name: input.customerName },
      });
      // 如果不存在则创建
      if (!customer) {
        customer = await this.prisma.customer.create({
          data: { name: input.customerName },
        });
        this.logger.log(`Created new customer: ${customer.name} (${customer.id})`);
      }
      customerId = customer.id;
    }

    if (!customerId) {
      throw new Error('必须提供customerId或customerName');
    }

    const contract = await this.prisma.contract.create({
      data: {
        contractNo: input.contractNo,
        name: input.name,
        type: input.type,
        status: input.status || 'DRAFT',
        ourEntity: input.ourEntity,
        customerId: customerId,
        amountWithTax: new Prisma.Decimal(input.amountWithTax),
        amountWithoutTax: input.amountWithoutTax
          ? new Prisma.Decimal(input.amountWithoutTax)
          : null,
        currency: input.currency || 'CNY',
        taxRate: input.taxRate ? new Prisma.Decimal(input.taxRate) : null,
        taxAmount: input.taxAmount ? new Prisma.Decimal(input.taxAmount) : null,
        paymentMethod: input.paymentMethod,
        paymentTerms: input.paymentTerms,
        signedAt: input.signedAt,
        effectiveAt: input.effectiveAt,
        expiresAt: input.expiresAt,
        duration: input.duration,
        fileUrl: input.fileUrl,
        fileType: input.fileType,
        departmentId: input.departmentId,
        salesPerson: input.salesPerson,
        industry: input.industry,
        uploadedById: input.uploadedById,
        parentContractId: input.parentContractId,
      },
      include: {
        customer: true,
        department: true,
        uploadedBy: {
          include: {
            department: true,
          },
        },
        parentContract: true,
        supplements: true,
      },
    });

    return this.transformContract(contract);
  }

  async update(id: string, input: UpdateContractInput) {
    const existing = await this.prisma.contract.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Contract with ID ${id} not found`);
    }

    const updateData: Prisma.ContractUpdateInput = {};

    if (input.contractNo !== undefined) updateData.contractNo = input.contractNo;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.ourEntity !== undefined) updateData.ourEntity = input.ourEntity;
    if (input.customerId !== undefined) {
      updateData.customer = { connect: { id: input.customerId } };
    }
    if (input.amountWithTax !== undefined) {
      updateData.amountWithTax = new Prisma.Decimal(input.amountWithTax);
    }
    if (input.amountWithoutTax !== undefined) {
      updateData.amountWithoutTax = input.amountWithoutTax
        ? new Prisma.Decimal(input.amountWithoutTax)
        : null;
    }
    if (input.currency !== undefined) updateData.currency = input.currency;
    if (input.taxRate !== undefined) {
      updateData.taxRate = input.taxRate
        ? new Prisma.Decimal(input.taxRate)
        : null;
    }
    if (input.taxAmount !== undefined) {
      updateData.taxAmount = input.taxAmount
        ? new Prisma.Decimal(input.taxAmount)
        : null;
    }
    if (input.paymentMethod !== undefined)
      updateData.paymentMethod = input.paymentMethod;
    if (input.paymentTerms !== undefined)
      updateData.paymentTerms = input.paymentTerms;
    if (input.signedAt !== undefined) updateData.signedAt = input.signedAt;
    if (input.effectiveAt !== undefined)
      updateData.effectiveAt = input.effectiveAt;
    if (input.expiresAt !== undefined) updateData.expiresAt = input.expiresAt;
    if (input.duration !== undefined) updateData.duration = input.duration;
    if (input.fileUrl !== undefined) updateData.fileUrl = input.fileUrl;
    if (input.fileType !== undefined) updateData.fileType = input.fileType;
    if (input.departmentId !== undefined) {
      updateData.department = { connect: { id: input.departmentId } };
    }
    if (input.salesPerson !== undefined)
      updateData.salesPerson = input.salesPerson;
    if (input.industry !== undefined) updateData.industry = input.industry;
    if (input.parseStatus !== undefined)
      updateData.parseStatus = input.parseStatus;
    if (input.parsedAt !== undefined) updateData.parsedAt = input.parsedAt;
    if (input.parseConfidence !== undefined)
      updateData.parseConfidence = input.parseConfidence;
    if (input.needsManualReview !== undefined)
      updateData.needsManualReview = input.needsManualReview;

    const contract = await this.prisma.contract.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        department: true,
        uploadedBy: {
          include: {
            department: true,
          },
        },
        parentContract: true,
        supplements: true,
      },
    });

    return this.transformContract(contract);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.prisma.contract.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Contract with ID ${id} not found`);
    }

    await this.prisma.contract.delete({ where: { id } });
    return true;
  }

  /**
   * 检查合同编号是否重复
   */
  async checkDuplicate(contractNo: string) {
    const existingContract = await this.prisma.contract.findUnique({
      where: { contractNo },
      include: {
        customer: true,
        department: true,
        uploadedBy: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!existingContract) {
      return {
        isDuplicate: false,
        existingContract: undefined,
        message: undefined,
      };
    }

    return {
      isDuplicate: true,
      existingContract: this.transformContract(existingContract),
      message: `合同编号 ${contractNo} 已存在`,
    };
  }

  /**
   * 创建或更新合同（支持强制更新重复合同）
   */
  async createOrUpdate(
    input: CreateContractInput,
    options: { forceUpdate?: boolean; operatorId?: string } = {}
  ) {
    const { forceUpdate = false, operatorId } = options;

    // 1. 检查重复
    const duplicateCheck = await this.checkDuplicate(input.contractNo);

    if (duplicateCheck.isDuplicate && !forceUpdate) {
      throw new Error(
        `合同编号 ${input.contractNo} 已存在。如需更新，请设置 forceUpdate 为 true。`
      );
    }

    // 2. 如果是强制更新，记录审计日志并更新
    if (duplicateCheck.isDuplicate && forceUpdate && duplicateCheck.existingContract) {
      this.logger.log(
        `Force updating duplicate contract: ${input.contractNo} (ID: ${duplicateCheck.existingContract.id})`
      );

      // 记录审计日志（如果提供了operatorId）
      if (operatorId) {
        await this.logDuplicateUpdate(
          duplicateCheck.existingContract,
          input,
          operatorId
        );
      }

      // 转换input为UpdateContractInput格式
      const updateInput: UpdateContractInput = {
        contractNo: input.contractNo,
        name: input.name,
        type: input.type,
        status: input.status,
        ourEntity: input.ourEntity,
        customerId: input.customerId,
        amountWithTax: input.amountWithTax,
        amountWithoutTax: input.amountWithoutTax,
        currency: input.currency,
        taxRate: input.taxRate,
        taxAmount: input.taxAmount,
        paymentMethod: input.paymentMethod,
        paymentTerms: input.paymentTerms,
        signedAt: input.signedAt,
        effectiveAt: input.effectiveAt,
        expiresAt: input.expiresAt,
        duration: input.duration,
        fileUrl: input.fileUrl,
        fileType: input.fileType,
        departmentId: input.departmentId,
        salesPerson: input.salesPerson,
        industry: input.industry,
      };

      return this.update(duplicateCheck.existingContract.id, updateInput);
    }

    // 3. 创建新合同
    return this.create(input);
  }

  /**
   * 记录重复合同更新的审计日志
   */
  private async logDuplicateUpdate(
    existingContract: any,
    newInput: CreateContractInput,
    operatorId: string
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'UPDATE_DUPLICATE_CONTRACT',
          entityType: 'CONTRACT',
          entityId: existingContract.id,
          entityName: existingContract.contractNo,
          oldValue: {
            contractNo: existingContract.contractNo,
            name: existingContract.name,
            amountWithTax: existingContract.amountWithTax?.toString(),
            signedAt: existingContract.signedAt?.toISOString(),
            customer: existingContract.customer?.name,
          },
          newValue: {
            contractNo: newInput.contractNo,
            name: newInput.name,
            amountWithTax: newInput.amountWithTax,
            signedAt: newInput.signedAt?.toISOString(),
            customerName: newInput.customerName,
          },
          operatorId,
        },
      });
      this.logger.log(
        `Audit log created for duplicate contract update: ${existingContract.contractNo}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to create audit log for duplicate contract: ${errorMessage}`,
        errorStack
      );
    }
  }

  private buildWhereClause(
    filter?: ContractFilterInput
  ): Prisma.ContractWhereInput {
    if (!filter) return {};

    const where: Prisma.ContractWhereInput = {};

    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { contractNo: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter.types?.length) {
      where.type = { in: filter.types };
    }

    if (filter.statuses?.length) {
      where.status = { in: filter.statuses };
    }

    if (filter.parseStatuses?.length) {
      where.parseStatus = { in: filter.parseStatuses };
    }

    if (filter.customerId) {
      where.customerId = filter.customerId;
    }

    if (filter.departmentId) {
      where.departmentId = filter.departmentId;
    }

    if (filter.signedAfter || filter.signedBefore) {
      where.signedAt = {};
      if (filter.signedAfter) {
        where.signedAt.gte = filter.signedAfter;
      }
      if (filter.signedBefore) {
        where.signedAt.lte = filter.signedBefore;
      }
    }

    if (filter.expiresAfter || filter.expiresBefore) {
      where.expiresAt = {};
      if (filter.expiresAfter) {
        where.expiresAt.gte = filter.expiresAfter;
      }
      if (filter.expiresBefore) {
        where.expiresAt.lte = filter.expiresBefore;
      }
    }

    if (filter.needsManualReview !== undefined) {
      where.needsManualReview = filter.needsManualReview;
    }

    return where;
  }

  private buildOrderByClause(
    orderBy?: ContractOrderInput
  ): Prisma.ContractOrderByWithRelationInput {
    const field = orderBy?.field || ContractOrderField.CREATED_AT;
    const direction = orderBy?.direction || SortOrder.DESC;

    return { [field]: direction };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private transformContract(contract: any) {
    return {
      ...contract,
      amountWithTax: contract.amountWithTax?.toString(),
      amountWithoutTax: contract.amountWithoutTax?.toString(),
      taxRate: contract.taxRate?.toString(),
      taxAmount: contract.taxAmount?.toString(),
      supplements: contract.supplements || [],
    };
  }
}
