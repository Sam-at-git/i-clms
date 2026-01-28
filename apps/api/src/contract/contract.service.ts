import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { Prisma, ContractType as PrismaContractType } from '@prisma/client';
import {
  CreateContractInput,
  UpdateContractInput,
  ContractFilterInput,
  ContractOrderInput,
  ContractOrderField,
  SortOrder,
} from './dto';
import { ContractConnection } from './models';
import { ContractType } from './models/enums';

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
          basicInfo: true,
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
        basicInfo: true,
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
        basicInfo: true,
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
        // ==================== 合同元数据（扩展） ====================
        version: input.version,
        governingLanguage: input.governingLanguage || '中文',
        // ==================== 签约方信息 ====================
        ourEntity: input.ourEntity,
        customerId: customerId,
        // ==================== 甲方扩展信息（合同级别） ====================
        clientLegalRep: input.clientLegalRep,
        clientRegistrationNumber: input.clientRegistrationNumber,
        clientBusinessLicense: input.clientBusinessLicense,
        clientAddress: input.clientAddress,
        clientContactPerson: input.clientContactPerson,
        clientPhone: input.clientPhone,
        clientEmail: input.clientEmail,
        clientFax: input.clientFax,
        clientBankName: input.clientBankName,
        clientBankAccount: input.clientBankAccount,
        clientAccountName: input.clientAccountName,
        // ==================== 乙方信息 ====================
        vendorLegalRep: input.vendorLegalRep,
        vendorRegistrationNumber: input.vendorRegistrationNumber,
        vendorBusinessLicense: input.vendorBusinessLicense,
        vendorAddress: input.vendorAddress,
        vendorContactPerson: input.vendorContactPerson,
        vendorPhone: input.vendorPhone,
        vendorEmail: input.vendorEmail,
        vendorFax: input.vendorFax,
        vendorBankName: input.vendorBankName,
        vendorBankAccount: input.vendorBankAccount,
        vendorAccountName: input.vendorAccountName,
        // ==================== 财务条款 ====================
        amountWithTax: new Prisma.Decimal(input.amountWithTax),
        amountWithoutTax: input.amountWithoutTax
          ? new Prisma.Decimal(input.amountWithoutTax)
          : null,
        currency: input.currency || 'CNY',
        taxRate: input.taxRate ? new Prisma.Decimal(input.taxRate) : null,
        taxAmount: input.taxAmount ? new Prisma.Decimal(input.taxAmount) : null,
        paymentMethod: input.paymentMethod,
        paymentTerms: input.paymentTerms,
        // ==================== 财务条款（扩展） ====================
        isTaxInclusive: input.isTaxInclusive ?? true,
        pricingModel: input.pricingModel,
        // ==================== 时间周期 ====================
        signedAt: input.signedAt,
        effectiveAt: input.effectiveAt,
        expiresAt: input.expiresAt,
        duration: input.duration,
        // ==================== 物理属性 ====================
        fileUrl: input.fileUrl,
        fileType: input.fileType,
        departmentId: input.departmentId,
        salesPerson: input.salesPerson,
        industry: input.industry,
        signLocation: input.signLocation,
        copies: input.copies,
        uploadedById: input.uploadedById,
        parentContractId: input.parentContractId,
        markdownText: input.markdownText, // 保存markdown文本用于向量化
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
        basicInfo: true,
      },
    });

    // 创建类型特定详情（如果提供了数据）
    await this.createTypeSpecificDetails(contract.id, contract.type as ContractType, input);

    // 创建基本信息详情（如果提供了数据）
    await this.createContractBasicInfo(contract.id, input);

    // 重新查询以获取包含详情的完整数据
    const fullContract = await this.prisma.contract.findUnique({
      where: { id: contract.id },
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
        basicInfo: true,
      },
    });

    return this.transformContract(fullContract);
  }

  /**
   * 创建类型特定详情（里程碑、费率、产品清单等）
   */
  private async createTypeSpecificDetails(
    contractId: string,
    contractType: ContractType,
    input: CreateContractInput
  ): Promise<void> {
    try {
      switch (contractType) {
        case ContractType.PROJECT_OUTSOURCING:
          await this.createProjectOutsourcingDetails(contractId, input);
          break;
        case ContractType.STAFF_AUGMENTATION:
          await this.createStaffAugmentationDetails(contractId, input);
          break;
        case ContractType.PRODUCT_SALES:
          await this.createProductSalesDetails(contractId, input);
          break;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create type-specific details: ${errorMessage}`);
      // 不抛出错误，允许合同创建成功，只是详情创建失败
    }
  }

  /**
   * 创建项目外包详情和里程碑
   */
  private async createProjectOutsourcingDetails(
    contractId: string,
    input: CreateContractInput
  ): Promise<void> {
    const detailInput = input.projectOutsourcingDetail;
    if (!detailInput) return;

    const detail = await this.prisma.projectOutsourcingDetail.create({
      data: {
        contractId,
        sowSummary: detailInput.sowSummary,
        deliverables: detailInput.deliverables,
        acceptanceCriteria: detailInput.acceptanceCriteria,
        acceptanceFlow: detailInput.acceptanceFlow,
        changeManagementFlow: detailInput.changeManagementFlow,
      },
    });

    // 创建里程碑
    if (detailInput.milestones && detailInput.milestones.length > 0) {
      await this.prisma.projectMilestone.createMany({
        data: detailInput.milestones.map((m) => ({
          detailId: detail.id,
          sequence: m.sequence,
          name: m.name,
          deliverables: m.deliverables,
          amount: m.amount ? new Prisma.Decimal(m.amount) : null,
          paymentPercentage: m.paymentPercentage ? new Prisma.Decimal(m.paymentPercentage) : null,
          plannedDate: m.plannedDate,
          actualDate: m.actualDate,
          acceptanceCriteria: m.acceptanceCriteria,
          status: m.status || 'PENDING',
        })),
      });
      this.logger.log(`Created ${detailInput.milestones.length} milestones for contract ${contractId}`);
    }
  }

  /**
   * 人力框架详情和费率项
   */
  private async createStaffAugmentationDetails(
    contractId: string,
    input: CreateContractInput
  ): Promise<void> {
    const detailInput = input.staffAugmentationDetail;
    if (!detailInput) return;

    const detail = await this.prisma.staffAugmentationDetail.create({
      data: {
        contractId,
        estimatedTotalHours: detailInput.estimatedTotalHours,
        monthlyHoursCap: detailInput.monthlyHoursCap,
        yearlyHoursCap: detailInput.yearlyHoursCap,
        settlementCycle: detailInput.settlementCycle,
        timesheetApprovalFlow: detailInput.timesheetApprovalFlow,
        adjustmentMechanism: detailInput.adjustmentMechanism,
        staffReplacementFlow: detailInput.staffReplacementFlow,
      },
    });

    // 创建费率项
    if (detailInput.rateItems && detailInput.rateItems.length > 0) {
      await this.prisma.staffRateItem.createMany({
        data: detailInput.rateItems.map((r) => ({
          detailId: detail.id,
          role: r.role,
          rateType: r.rateType,
          rate: new Prisma.Decimal(r.rate),
          rateEffectiveFrom: r.rateEffectiveFrom,
          rateEffectiveTo: r.rateEffectiveTo,
        })),
      });
      this.logger.log(`Created ${detailInput.rateItems.length} rate items for contract ${contractId}`);
    }
  }

  /**
   * 创建产品购销详情和产品清单
   */
  private async createProductSalesDetails(
    contractId: string,
    input: CreateContractInput
  ): Promise<void> {
    const detailInput = input.productSalesDetail;
    if (!detailInput) return;

    const detail = await this.prisma.productSalesDetail.create({
      data: {
        contractId,
        deliveryContent: detailInput.deliveryContent,
        deliveryDate: detailInput.deliveryDate,
        deliveryLocation: detailInput.deliveryLocation,
        shippingResponsibility: detailInput.shippingResponsibility,
        ipOwnership: detailInput.ipOwnership,
        warrantyPeriod: detailInput.warrantyPeriod,
        afterSalesTerms: detailInput.afterSalesTerms,
      },
    });

    // 创建产品清单项
    if (detailInput.lineItems && detailInput.lineItems.length > 0) {
      await this.prisma.productLineItem.createMany({
        data: detailInput.lineItems.map((item) => {
          const unitPrice = new Prisma.Decimal(item.unitPriceWithTax);
          const quantity = new Prisma.Decimal(item.quantity);
          // 如果没有提供小计，自动计算：数量 * 单价
          const calculatedSubtotal = item.subtotal
            ? new Prisma.Decimal(item.subtotal)
            : unitPrice.mul(quantity);
          return {
            detailId: detail.id,
            productName: item.productName,
            specification: item.specification,
            quantity: item.quantity,
            unit: item.unit || '套',
            unitPriceWithTax: unitPrice,
            unitPriceWithoutTax: item.unitPriceWithoutTax ? new Prisma.Decimal(item.unitPriceWithoutTax) : null,
            subtotal: calculatedSubtotal,
          };
        }),
      });
      this.logger.log(`Created ${detailInput.lineItems.length} line items for contract ${contractId}`);
    }
  }

  /**
   * 创建合同基本信息详情（项目、时间、验收、保密、条款等）
   */
  private async createContractBasicInfo(
    contractId: string,
    input: CreateContractInput
  ): Promise<void> {
    const basicInfoInput = input.basicInfo;
    if (!basicInfoInput) return;

    try {
      await this.prisma.contractBasicInfo.create({
        data: {
          contractId,
          projectName: basicInfoInput.projectName,
          projectOverview: basicInfoInput.projectOverview,
          projectStartDate: basicInfoInput.projectStartDate,
          projectEndDate: basicInfoInput.projectEndDate,
          warrantyStartDate: basicInfoInput.warrantyStartDate,
          warrantyPeriodMonths: basicInfoInput.warrantyPeriodMonths ?? 12,
          acceptanceMethod: basicInfoInput.acceptanceMethod,
          acceptancePeriodDays: basicInfoInput.acceptancePeriodDays ?? 15,
          deemedAcceptanceRule: basicInfoInput.deemedAcceptanceRule,
          confidentialityTermYears: basicInfoInput.confidentialityTermYears ?? 3,
          confidentialityDefinition: basicInfoInput.confidentialityDefinition,
          confidentialityObligation: basicInfoInput.confidentialityObligation,
          governingLaw: basicInfoInput.governingLaw,
          disputeResolutionMethod: basicInfoInput.disputeResolutionMethod,
          noticeRequirements: basicInfoInput.noticeRequirements,
        },
      });
      this.logger.log(`Created basic info for contract ${contractId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create basic info: ${errorMessage}`);
      // 不抛出错误，允许合同创建成功
    }
  }

  /**
   * 更新合同基本信息详情
   */
  private async updateContractBasicInfo(
    contractId: string,
    basicInfoInput: any
  ): Promise<void> {
    // 检查是否已存在 basicInfo 记录
    const existing = await this.prisma.contractBasicInfo.findUnique({
      where: { contractId },
    });

    const updateData: any = {};
    if (basicInfoInput.projectName !== undefined) updateData.projectName = basicInfoInput.projectName;
    if (basicInfoInput.projectOverview !== undefined) updateData.projectOverview = basicInfoInput.projectOverview;
    if (basicInfoInput.projectStartDate !== undefined) updateData.projectStartDate = basicInfoInput.projectStartDate;
    if (basicInfoInput.projectEndDate !== undefined) updateData.projectEndDate = basicInfoInput.projectEndDate;
    if (basicInfoInput.warrantyStartDate !== undefined) updateData.warrantyStartDate = basicInfoInput.warrantyStartDate;
    if (basicInfoInput.warrantyPeriodMonths !== undefined) updateData.warrantyPeriodMonths = basicInfoInput.warrantyPeriodMonths;
    if (basicInfoInput.acceptanceMethod !== undefined) updateData.acceptanceMethod = basicInfoInput.acceptanceMethod;
    if (basicInfoInput.acceptancePeriodDays !== undefined) updateData.acceptancePeriodDays = basicInfoInput.acceptancePeriodDays;
    if (basicInfoInput.deemedAcceptanceRule !== undefined) updateData.deemedAcceptanceRule = basicInfoInput.deemedAcceptanceRule;
    if (basicInfoInput.confidentialityTermYears !== undefined) updateData.confidentialityTermYears = basicInfoInput.confidentialityTermYears;
    if (basicInfoInput.confidentialityDefinition !== undefined) updateData.confidentialityDefinition = basicInfoInput.confidentialityDefinition;
    if (basicInfoInput.confidentialityObligation !== undefined) updateData.confidentialityObligation = basicInfoInput.confidentialityObligation;
    if (basicInfoInput.governingLaw !== undefined) updateData.governingLaw = basicInfoInput.governingLaw;
    if (basicInfoInput.disputeResolutionMethod !== undefined) updateData.disputeResolutionMethod = basicInfoInput.disputeResolutionMethod;
    if (basicInfoInput.noticeRequirements !== undefined) updateData.noticeRequirements = basicInfoInput.noticeRequirements;

    try {
      if (existing) {
        // 更新现有记录
        await this.prisma.contractBasicInfo.update({
          where: { contractId },
          data: updateData,
        });
        this.logger.log(`Updated basic info for contract ${contractId}`);
      } else {
        // 创建新记录
        await this.prisma.contractBasicInfo.create({
          data: {
            contractId,
            ...updateData,
          },
        });
        this.logger.log(`Created basic info for contract ${contractId}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update basic info: ${errorMessage}`);
    }
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
    if (input.markdownText !== undefined) updateData.markdownText = input.markdownText;
    if (input.parseStatus !== undefined)
      updateData.parseStatus = input.parseStatus;
    if (input.parsedAt !== undefined) updateData.parsedAt = input.parsedAt;
    if (input.parseConfidence !== undefined)
      updateData.parseConfidence = input.parseConfidence;
    if (input.needsManualReview !== undefined)
      updateData.needsManualReview = input.needsManualReview;

    // ==================== 合同元数据（扩展） ====================
    if (input.version !== undefined) updateData.version = input.version;
    if (input.governingLanguage !== undefined) updateData.governingLanguage = input.governingLanguage;
    // ==================== 甲方扩展信息（合同级别） ====================
    if (input.clientLegalRep !== undefined) updateData.clientLegalRep = input.clientLegalRep;
    if (input.clientBusinessLicense !== undefined) updateData.clientBusinessLicense = input.clientBusinessLicense;
    if (input.clientFax !== undefined) updateData.clientFax = input.clientFax;
    if (input.clientBankName !== undefined) updateData.clientBankName = input.clientBankName;
    if (input.clientBankAccount !== undefined) updateData.clientBankAccount = input.clientBankAccount;
    if (input.clientAccountName !== undefined) updateData.clientAccountName = input.clientAccountName;
    // ==================== 乙方信息 ====================
    if (input.vendorLegalRep !== undefined) updateData.vendorLegalRep = input.vendorLegalRep;
    if (input.vendorRegistrationNumber !== undefined) updateData.vendorRegistrationNumber = input.vendorRegistrationNumber;
    if (input.vendorBusinessLicense !== undefined) updateData.vendorBusinessLicense = input.vendorBusinessLicense;
    if (input.vendorAddress !== undefined) updateData.vendorAddress = input.vendorAddress;
    if (input.vendorContactPerson !== undefined) updateData.vendorContactPerson = input.vendorContactPerson;
    if (input.vendorPhone !== undefined) updateData.vendorPhone = input.vendorPhone;
    if (input.vendorEmail !== undefined) updateData.vendorEmail = input.vendorEmail;
    if (input.vendorFax !== undefined) updateData.vendorFax = input.vendorFax;
    if (input.vendorBankName !== undefined) updateData.vendorBankName = input.vendorBankName;
    if (input.vendorBankAccount !== undefined) updateData.vendorBankAccount = input.vendorBankAccount;
    if (input.vendorAccountName !== undefined) updateData.vendorAccountName = input.vendorAccountName;
    // ==================== 财务条款（扩展） ====================
    if (input.isTaxInclusive !== undefined) updateData.isTaxInclusive = input.isTaxInclusive;
    if (input.pricingModel !== undefined) updateData.pricingModel = input.pricingModel;

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
        basicInfo: true,
      },
    });

    // 更新基本信息详情（如果提供了数据）
    if (input.basicInfo) {
      await this.updateContractBasicInfo(id, input.basicInfo);
    }

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
        basicInfo: true,
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
        // ==================== 合同元数据（扩展） ====================
        version: input.version,
        governingLanguage: input.governingLanguage,
        // ==================== 甲方扩展信息 ====================
        clientLegalRep: input.clientLegalRep,
        clientBusinessLicense: input.clientBusinessLicense,
        clientFax: input.clientFax,
        clientBankName: input.clientBankName,
        clientBankAccount: input.clientBankAccount,
        clientAccountName: input.clientAccountName,
        // ==================== 乙方信息 ====================
        vendorLegalRep: input.vendorLegalRep,
        vendorRegistrationNumber: input.vendorRegistrationNumber,
        vendorBusinessLicense: input.vendorBusinessLicense,
        vendorAddress: input.vendorAddress,
        vendorContactPerson: input.vendorContactPerson,
        vendorPhone: input.vendorPhone,
        vendorEmail: input.vendorEmail,
        vendorFax: input.vendorFax,
        vendorBankName: input.vendorBankName,
        vendorBankAccount: input.vendorBankAccount,
        vendorAccountName: input.vendorAccountName,
        // ==================== 财务条款（扩展） ====================
        isTaxInclusive: input.isTaxInclusive,
        pricingModel: input.pricingModel,
        // ==================== 基本信息 ====================
        basicInfo: input.basicInfo,
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
      // 支持合同名称、合同编号、客户名称、客户简称搜索
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { contractNo: { contains: filter.search, mode: 'insensitive' } },
        { customer: { name: { contains: filter.search, mode: 'insensitive' } } },
        { customer: { shortName: { contains: filter.search, mode: 'insensitive' } } },
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

    if (filter.minAmount !== undefined || filter.maxAmount !== undefined) {
      where.amountWithTax = {};
      if (filter.minAmount !== undefined) {
        where.amountWithTax.gte = filter.minAmount.toString();
      }
      if (filter.maxAmount !== undefined) {
        where.amountWithTax.lte = filter.maxAmount.toString();
      }
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
      // Transform tags from ContractTag[] to TagDto[]
      tags: contract.tags?.map((ct: any) => ct.tag) || [],
      // Map Prisma field names to GraphQL field names for type-specific details
      staffAugmentationDetail: contract.staffAugmentation || null,
      projectOutsourcingDetail: contract.projectOutsourcing || null,
      productSalesDetail: contract.productSales || null,
      // Basic info is already in the correct format
      basicInfo: contract.basicInfo || null,
    };
  }
}
