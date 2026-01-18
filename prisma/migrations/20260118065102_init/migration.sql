-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'DEPT_ADMIN', 'ADMIN');

-- CreateEnum
CREATE TYPE "DepartmentCode" AS ENUM ('FINANCE', 'DELIVERY', 'SALES', 'MARKETING', 'LEGAL', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('STAFF_AUGMENTATION', 'PROJECT_OUTSOURCING', 'PRODUCT_SALES');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'EXECUTING', 'COMPLETED', 'TERMINATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('HOURLY', 'DAILY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DELIVERED', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" "DepartmentCode" NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "contractNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ContractType" NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "ourEntity" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amountWithTax" DECIMAL(18,2) NOT NULL,
    "amountWithoutTax" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "taxRate" DECIMAL(5,2),
    "taxAmount" DECIMAL(18,2),
    "paymentMethod" TEXT,
    "paymentTerms" TEXT,
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
    "parentContractId" TEXT,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "color" TEXT,
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

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_creditCode_key" ON "Customer"("creditCode");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Customer_creditCode_idx" ON "Customer"("creditCode");

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
CREATE UNIQUE INDEX "ProductSalesDetail_contractId_key" ON "ProductSalesDetail"("contractId");

-- CreateIndex
CREATE INDEX "ProductLineItem_detailId_idx" ON "ProductLineItem"("detailId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "ContractTag_contractId_idx" ON "ContractTag"("contractId");

-- CreateIndex
CREATE INDEX "ContractTag_tagId_idx" ON "ContractTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractTag_contractId_tagId_key" ON "ContractTag"("contractId", "tagId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_parentContractId_fkey" FOREIGN KEY ("parentContractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "ProductSalesDetail" ADD CONSTRAINT "ProductSalesDetail_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLineItem" ADD CONSTRAINT "ProductLineItem_detailId_fkey" FOREIGN KEY ("detailId") REFERENCES "ProductSalesDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractTag" ADD CONSTRAINT "ContractTag_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractTag" ADD CONSTRAINT "ContractTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
