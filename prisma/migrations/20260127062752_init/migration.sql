-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'DEPT_ADMIN', 'ADMIN');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('STAFF_AUGMENTATION', 'PROJECT_OUTSOURCING', 'PRODUCT_SALES');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('FIXED_PRICE', 'TIME_MATERIAL', 'MIXED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'EXECUTING', 'COMPLETED', 'TERMINATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('HOURLY', 'DAILY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DELIVERED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PAYMENT', 'RECEIPT', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RiskAlertType" AS ENUM ('CONTRACT_EXPIRY', 'PAYMENT_OVERDUE', 'COMPLIANCE', 'FINANCIAL', 'LEGAL', 'OPERATIONAL');

-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'DISMISSED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "LegalClauseType" AS ENUM ('INTELLECTUAL_PROPERTY', 'GUARANTEE', 'LIABILITY_LIMITATION', 'TERMINATION_DISPUTE');

-- CreateEnum
CREATE TYPE "DataProtectionRisk" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "SignerType" AS ENUM ('FIRST_PARTY', 'SECOND_PARTY', 'WITNESS', 'GUARANTOR');

-- CreateEnum
CREATE TYPE "SigningStatus" AS ENUM ('PENDING', 'SIGNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('PDF', 'WORD', 'EXCEL', 'HTML');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CONTRACT_EXPIRY', 'PAYMENT_OVERDUE', 'CONTRACT_APPROVAL', 'MILESTONE_DUE', 'RISK_ALERT', 'SYSTEM_ANNOUNCEMENT', 'MENTION', 'TASK_ASSIGNED', 'DOCUMENT_SHARED');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'READ', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CaseStudyStatus" AS ENUM ('DRAFT', 'GENERATED', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "departmentId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "lastPasswordChangedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "creditCode" TEXT,
    "industry" TEXT,
    "address" TEXT,
    "contactPerson" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "contractNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ContractType" NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "version" TEXT,
    "governingLanguage" TEXT DEFAULT '中文',
    "ourEntity" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "clientLegalRep" TEXT,
    "clientBusinessLicense" TEXT,
    "clientFax" TEXT,
    "clientBankName" TEXT,
    "clientBankAccount" TEXT,
    "clientAccountName" TEXT,
    "vendorLegalRep" TEXT,
    "vendorRegistrationNumber" TEXT,
    "vendorBusinessLicense" TEXT,
    "vendorAddress" TEXT,
    "vendorContactPerson" TEXT,
    "vendorPhone" TEXT,
    "vendorEmail" TEXT,
    "vendorFax" TEXT,
    "vendorBankName" TEXT,
    "vendorBankAccount" TEXT,
    "vendorAccountName" TEXT,
    "amountWithTax" DECIMAL(18,2) NOT NULL,
    "amountWithoutTax" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "taxRate" DECIMAL(5,2),
    "taxAmount" DECIMAL(18,2),
    "paymentMethod" TEXT,
    "paymentTerms" TEXT,
    "isTaxInclusive" BOOLEAN NOT NULL DEFAULT true,
    "pricingModel" "PricingModel",
    "signedAt" TIMESTAMP(3),
    "effectiveAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "duration" TEXT,
    "fileUrl" TEXT,
    "fileType" TEXT,
    "copies" INTEGER,
    "signLocation" TEXT,
    "industry" TEXT,
    "departmentId" TEXT NOT NULL,
    "salesPerson" TEXT,
    "parseStatus" "ParseStatus" NOT NULL DEFAULT 'PENDING',
    "parsedAt" TIMESTAMP(3),
    "parseConfidence" DOUBLE PRECISION,
    "needsManualReview" BOOLEAN NOT NULL DEFAULT false,
    "markdownText" TEXT,
    "isVectorized" BOOLEAN NOT NULL DEFAULT false,
    "vectorizedAt" TIMESTAMP(3),
    "vectorizationMethod" TEXT,
    "chunkCount" INTEGER DEFAULT 0,
    "parentContractId" TEXT,
    "templateId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAugmentationDetail" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "estimatedTotalHours" INTEGER,
    "monthlyHoursCap" INTEGER,
    "yearlyHoursCap" INTEGER,
    "settlementCycle" TEXT,
    "timesheetApprovalFlow" TEXT,
    "adjustmentMechanism" TEXT,
    "staffReplacementFlow" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAugmentationDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffRateItem" (
    "id" TEXT NOT NULL,
    "detailId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "rateType" "RateType" NOT NULL,
    "rate" DECIMAL(18,2) NOT NULL,
    "rateEffectiveFrom" TIMESTAMP(3),
    "rateEffectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffRateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectOutsourcingDetail" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "sowSummary" TEXT,
    "deliverables" TEXT,
    "acceptanceCriteria" TEXT,
    "acceptanceFlow" TEXT,
    "changeManagementFlow" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectOutsourcingDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMilestone" (
    "id" TEXT NOT NULL,
    "detailId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "deliverables" TEXT,
    "amount" DECIMAL(18,2),
    "paymentPercentage" DECIMAL(5,2),
    "plannedDate" TIMESTAMP(3),
    "actualDate" TIMESTAMP(3),
    "acceptanceCriteria" TEXT,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "deliverableFileUrl" TEXT,
    "deliverableFileName" TEXT,
    "deliverableUploadedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "acceptedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneStatusHistory" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "fromStatus" "MilestoneStatus" NOT NULL,
    "toStatus" "MilestoneStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "MilestoneStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSalesDetail" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "deliveryContent" TEXT,
    "deliveryDate" TIMESTAMP(3),
    "deliveryLocation" TEXT,
    "shippingResponsibility" TEXT,
    "ipOwnership" TEXT,
    "warrantyPeriod" TEXT,
    "afterSalesTerms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSalesDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductLineItem" (
    "id" TEXT NOT NULL,
    "detailId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "specification" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '套',
    "unitPriceWithTax" DECIMAL(18,2) NOT NULL,
    "unitPriceWithoutTax" DECIMAL(18,2),
    "subtotal" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_basic_info" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "projectName" TEXT,
    "projectOverview" TEXT,
    "projectStartDate" TIMESTAMP(3),
    "projectEndDate" TIMESTAMP(3),
    "warrantyStartDate" TIMESTAMP(3),
    "warrantyPeriodMonths" INTEGER DEFAULT 12,
    "acceptanceMethod" TEXT,
    "acceptancePeriodDays" INTEGER DEFAULT 15,
    "deemedAcceptanceRule" TEXT,
    "confidentialityTermYears" INTEGER DEFAULT 3,
    "confidentialityDefinition" TEXT,
    "confidentialityObligation" TEXT,
    "governingLaw" TEXT,
    "disputeResolutionMethod" TEXT,
    "noticeRequirements" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_basic_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '默认',
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractTag" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "category" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalReview" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "findings" JSONB NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "recommendations" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAlert" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "type" "RiskAlertType" NOT NULL,
    "severity" "RiskSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "dismissedAt" TIMESTAMP(3),
    "dismissedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "factors" JSONB NOT NULL,
    "recommendations" JSONB,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assessedBy" TEXT,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "operatorId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "embedding_cache" (
    "id" SERIAL NOT NULL,
    "textHash" TEXT NOT NULL,
    "modelName" TEXT NOT NULL DEFAULT 'nomic-embed-text',
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "embedding_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_cache" (
    "id" SERIAL NOT NULL,
    "promptHash" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "request" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "llm_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_chunks" (
    "id" SERIAL NOT NULL,
    "contract_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(768),
    "chunk_type" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_fingerprint" (
    "id" SERIAL NOT NULL,
    "fileHash" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "parseResult" JSONB NOT NULL,
    "strategy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "document_fingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_legal_clause" (
    "id" SERIAL NOT NULL,
    "contractId" TEXT NOT NULL,
    "clauseType" "LegalClauseType" NOT NULL,
    "licenseType" TEXT,
    "licenseFee" TEXT,
    "guarantor" TEXT,
    "guaranteeType" TEXT,
    "guaranteeAmount" DECIMAL(20,2),
    "guaranteePeriod" TEXT,
    "liabilityLimit" DECIMAL(20,2),
    "exclusions" TEXT,
    "compensationMethod" TEXT,
    "terminationNotice" TEXT,
    "breachLiability" TEXT,
    "disputeResolution" TEXT,
    "disputeLocation" TEXT,
    "confidence" DOUBLE PRECISION,
    "originalText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_legal_clause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_data_protection" (
    "id" SERIAL NOT NULL,
    "contractId" TEXT NOT NULL,
    "involvesPersonalData" BOOLEAN NOT NULL DEFAULT false,
    "personalDataType" TEXT,
    "processingLocation" TEXT,
    "crossBorderTransfer" TEXT,
    "securityMeasures" TEXT,
    "dataRetention" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'NONE',
    "confidence" DOUBLE PRECISION,
    "originalText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_data_protection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "category" TEXT,
    "type" "ContractType" NOT NULL,
    "content" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileType" TEXT,
    "parameters" JSONB,
    "defaultValues" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_signing" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerTitle" TEXT,
    "signerEmail" TEXT,
    "signerCompany" TEXT NOT NULL,
    "signerType" "SignerType" NOT NULL,
    "status" "SigningStatus" NOT NULL DEFAULT 'PENDING',
    "signedAt" TIMESTAMP(3),
    "signatureUrl" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "isCurrentSigner" BOOLEAN NOT NULL DEFAULT false,
    "rejectedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_signing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_export" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "options" JSONB,
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "contract_export_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "NotificationStatus" NOT NULL DEFAULT 'SENT',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "userId" TEXT NOT NULL,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT false,
    "sms" BOOLEAN NOT NULL DEFAULT false,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "smsSent" BOOLEAN NOT NULL DEFAULT false,
    "smsSentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enableInApp" BOOLEAN NOT NULL DEFAULT true,
    "enableEmail" BOOLEAN NOT NULL DEFAULT false,
    "enableSms" BOOLEAN NOT NULL DEFAULT false,
    "contractExpiry" BOOLEAN NOT NULL DEFAULT true,
    "paymentOverdue" BOOLEAN NOT NULL DEFAULT true,
    "contractApproval" BOOLEAN NOT NULL DEFAULT true,
    "milestoneDue" BOOLEAN NOT NULL DEFAULT true,
    "riskAlert" BOOLEAN NOT NULL DEFAULT true,
    "systemAnnouncement" BOOLEAN NOT NULL DEFAULT true,
    "mention" BOOLEAN NOT NULL DEFAULT true,
    "taskAssigned" BOOLEAN NOT NULL DEFAULT true,
    "documentShared" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_study" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "status" "CaseStudyStatus" NOT NULL DEFAULT 'DRAFT',
    "summary" TEXT NOT NULL,
    "challenges" TEXT,
    "solution" TEXT,
    "results" TEXT,
    "testimonial" TEXT,
    "techStack" TEXT,
    "timeline" TEXT,
    "teamSize" TEXT,
    "fullMarkdown" TEXT NOT NULL,
    "isDesensitized" BOOLEAN NOT NULL DEFAULT true,
    "desensitizeConfig" JSONB,
    "displayCustomerName" TEXT,
    "displayAmount" TEXT,
    "displayIndustry" TEXT,
    "llmModel" TEXT,
    "llmProvider" TEXT,
    "generatedAt" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION,
    "isManuallyEdited" BOOLEAN NOT NULL DEFAULT false,
    "lastEditedAt" TIMESTAMP(3),
    "lastEditedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_study_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE INDEX "Department_isActive_idx" ON "Department"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_creditCode_key" ON "Customer"("creditCode");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Customer_creditCode_idx" ON "Customer"("creditCode");

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE INDEX "CustomerContact_customerId_idx" ON "CustomerContact"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNo_key" ON "Contract"("contractNo");

-- CreateIndex
CREATE INDEX "Contract_customerId_idx" ON "Contract"("customerId");

-- CreateIndex
CREATE INDEX "Contract_type_idx" ON "Contract"("type");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE INDEX "Contract_departmentId_idx" ON "Contract"("departmentId");

-- CreateIndex
CREATE INDEX "Contract_signedAt_idx" ON "Contract"("signedAt");

-- CreateIndex
CREATE INDEX "Contract_expiresAt_idx" ON "Contract"("expiresAt");

-- CreateIndex
CREATE INDEX "Contract_parentContractId_idx" ON "Contract"("parentContractId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAugmentationDetail_contractId_key" ON "StaffAugmentationDetail"("contractId");

-- CreateIndex
CREATE INDEX "StaffRateItem_detailId_idx" ON "StaffRateItem"("detailId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectOutsourcingDetail_contractId_key" ON "ProjectOutsourcingDetail"("contractId");

-- CreateIndex
CREATE INDEX "ProjectMilestone_detailId_idx" ON "ProjectMilestone"("detailId");

-- CreateIndex
CREATE INDEX "ProjectMilestone_sequence_idx" ON "ProjectMilestone"("sequence");

-- CreateIndex
CREATE INDEX "ProjectMilestone_status_idx" ON "ProjectMilestone"("status");

-- CreateIndex
CREATE INDEX "MilestoneStatusHistory_milestoneId_idx" ON "MilestoneStatusHistory"("milestoneId");

-- CreateIndex
CREATE INDEX "MilestoneStatusHistory_changedBy_idx" ON "MilestoneStatusHistory"("changedBy");

-- CreateIndex
CREATE INDEX "MilestoneStatusHistory_changedAt_idx" ON "MilestoneStatusHistory"("changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSalesDetail_contractId_key" ON "ProductSalesDetail"("contractId");

-- CreateIndex
CREATE INDEX "ProductLineItem_detailId_idx" ON "ProductLineItem"("detailId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_basic_info_contractId_key" ON "contract_basic_info"("contractId");

-- CreateIndex
CREATE INDEX "contract_basic_info_contractId_idx" ON "contract_basic_info"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Tag_category_idx" ON "Tag"("category");

-- CreateIndex
CREATE INDEX "Tag_isActive_idx" ON "Tag"("isActive");

-- CreateIndex
CREATE INDEX "ContractTag_contractId_idx" ON "ContractTag"("contractId");

-- CreateIndex
CREATE INDEX "ContractTag_tagId_idx" ON "ContractTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractTag_contractId_tagId_key" ON "ContractTag"("contractId", "tagId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_contractId_idx" ON "FinancialTransaction"("contractId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_type_idx" ON "FinancialTransaction"("type");

-- CreateIndex
CREATE INDEX "FinancialTransaction_status_idx" ON "FinancialTransaction"("status");

-- CreateIndex
CREATE INDEX "FinancialTransaction_occurredAt_idx" ON "FinancialTransaction"("occurredAt");

-- CreateIndex
CREATE INDEX "LegalReview_contractId_idx" ON "LegalReview"("contractId");

-- CreateIndex
CREATE INDEX "LegalReview_status_idx" ON "LegalReview"("status");

-- CreateIndex
CREATE INDEX "LegalReview_reviewerId_idx" ON "LegalReview"("reviewerId");

-- CreateIndex
CREATE INDEX "LegalReview_riskLevel_idx" ON "LegalReview"("riskLevel");

-- CreateIndex
CREATE INDEX "RiskAlert_contractId_idx" ON "RiskAlert"("contractId");

-- CreateIndex
CREATE INDEX "RiskAlert_status_idx" ON "RiskAlert"("status");

-- CreateIndex
CREATE INDEX "RiskAlert_severity_idx" ON "RiskAlert"("severity");

-- CreateIndex
CREATE INDEX "RiskAlert_type_idx" ON "RiskAlert"("type");

-- CreateIndex
CREATE INDEX "RiskAlert_createdAt_idx" ON "RiskAlert"("createdAt");

-- CreateIndex
CREATE INDEX "RiskAssessment_contractId_idx" ON "RiskAssessment"("contractId");

-- CreateIndex
CREATE INDEX "RiskAssessment_assessedAt_idx" ON "RiskAssessment"("assessedAt");

-- CreateIndex
CREATE INDEX "RiskAssessment_riskLevel_idx" ON "RiskAssessment"("riskLevel");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_operatorId_idx" ON "AuditLog"("operatorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "LoginRecord_userId_idx" ON "LoginRecord"("userId");

-- CreateIndex
CREATE INDEX "LoginRecord_createdAt_idx" ON "LoginRecord"("createdAt");

-- CreateIndex
CREATE INDEX "LoginRecord_success_idx" ON "LoginRecord"("success");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE INDEX "SystemConfig_category_idx" ON "SystemConfig"("category");

-- CreateIndex
CREATE INDEX "SystemConfig_key_idx" ON "SystemConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "embedding_cache_text_model_unique" ON "embedding_cache"("textHash", "modelName");

-- CreateIndex
CREATE INDEX "llm_cache_expiresAt_idx" ON "llm_cache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "llm_cache_prompt_model_unique" ON "llm_cache"("promptHash", "modelName");

-- CreateIndex
CREATE INDEX "contract_chunks_contract_id_chunk_index_idx" ON "contract_chunks"("contract_id", "chunk_index");

-- CreateIndex
CREATE UNIQUE INDEX "contract_chunks_contract_index_unique" ON "contract_chunks"("contract_id", "chunk_index");

-- CreateIndex
CREATE UNIQUE INDEX "document_fingerprint_fileHash_key" ON "document_fingerprint"("fileHash");

-- CreateIndex
CREATE INDEX "document_fingerprint_expiresAt_idx" ON "document_fingerprint"("expiresAt");

-- CreateIndex
CREATE INDEX "contract_legal_clause_contractId_idx" ON "contract_legal_clause"("contractId");

-- CreateIndex
CREATE INDEX "contract_legal_clause_clauseType_idx" ON "contract_legal_clause"("clauseType");

-- CreateIndex
CREATE UNIQUE INDEX "contract_data_protection_contractId_key" ON "contract_data_protection"("contractId");

-- CreateIndex
CREATE INDEX "contract_data_protection_contractId_idx" ON "contract_data_protection"("contractId");

-- CreateIndex
CREATE INDEX "contract_data_protection_involvesPersonalData_idx" ON "contract_data_protection"("involvesPersonalData");

-- CreateIndex
CREATE INDEX "contract_data_protection_riskLevel_idx" ON "contract_data_protection"("riskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "contract_template_name_key" ON "contract_template"("name");

-- CreateIndex
CREATE INDEX "contract_template_type_idx" ON "contract_template"("type");

-- CreateIndex
CREATE INDEX "contract_template_category_idx" ON "contract_template"("category");

-- CreateIndex
CREATE INDEX "contract_template_isActive_idx" ON "contract_template"("isActive");

-- CreateIndex
CREATE INDEX "contract_template_createdById_idx" ON "contract_template"("createdById");

-- CreateIndex
CREATE INDEX "contract_template_departmentId_idx" ON "contract_template"("departmentId");

-- CreateIndex
CREATE INDEX "contract_signing_contractId_idx" ON "contract_signing"("contractId");

-- CreateIndex
CREATE INDEX "contract_signing_status_idx" ON "contract_signing"("status");

-- CreateIndex
CREATE INDEX "contract_signing_sequence_idx" ON "contract_signing"("sequence");

-- CreateIndex
CREATE INDEX "contract_export_contractId_idx" ON "contract_export"("contractId");

-- CreateIndex
CREATE INDEX "contract_export_status_idx" ON "contract_export"("status");

-- CreateIndex
CREATE INDEX "contract_export_requestedBy_idx" ON "contract_export"("requestedBy");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_priority_idx" ON "notifications"("priority");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "notification_preferences_userId_idx" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "case_study_contractId_idx" ON "case_study"("contractId");

-- CreateIndex
CREATE INDEX "case_study_status_idx" ON "case_study"("status");

-- CreateIndex
CREATE INDEX "case_study_createdById_idx" ON "case_study"("createdById");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_parentContractId_fkey" FOREIGN KEY ("parentContractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "contract_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAugmentationDetail" ADD CONSTRAINT "StaffAugmentationDetail_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRateItem" ADD CONSTRAINT "StaffRateItem_detailId_fkey" FOREIGN KEY ("detailId") REFERENCES "StaffAugmentationDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectOutsourcingDetail" ADD CONSTRAINT "ProjectOutsourcingDetail_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_detailId_fkey" FOREIGN KEY ("detailId") REFERENCES "ProjectOutsourcingDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneStatusHistory" ADD CONSTRAINT "MilestoneStatusHistory_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneStatusHistory" ADD CONSTRAINT "MilestoneStatusHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSalesDetail" ADD CONSTRAINT "ProductSalesDetail_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLineItem" ADD CONSTRAINT "ProductLineItem_detailId_fkey" FOREIGN KEY ("detailId") REFERENCES "ProductSalesDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_basic_info" ADD CONSTRAINT "contract_basic_info_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractTag" ADD CONSTRAINT "ContractTag_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractTag" ADD CONSTRAINT "ContractTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalReview" ADD CONSTRAINT "LegalReview_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalReview" ADD CONSTRAINT "LegalReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAlert" ADD CONSTRAINT "RiskAlert_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginRecord" ADD CONSTRAINT "LoginRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemConfig" ADD CONSTRAINT "SystemConfig_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_chunks" ADD CONSTRAINT "contract_chunks_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_legal_clause" ADD CONSTRAINT "contract_legal_clause_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_data_protection" ADD CONSTRAINT "contract_data_protection_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_template" ADD CONSTRAINT "contract_template_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_template" ADD CONSTRAINT "contract_template_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_signing" ADD CONSTRAINT "contract_signing_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_export" ADD CONSTRAINT "contract_export_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_study" ADD CONSTRAINT "case_study_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_study" ADD CONSTRAINT "case_study_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
