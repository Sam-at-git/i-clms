# 02-database-schema.md - 数据库模型设计

**优先级**: P0
**预估代码量**: ~400行
**依赖**: 01-project-setup.md

---

## 1. 功能描述

设计并实现i-CLMS系统的Prisma数据库模型，包括合同、客户、用户等核心实体，支持三种合同类型（人力框架、项目外包、产品购销）的特定字段。

---

## 2. 具体任务

### 2.1 安装Prisma依赖

```bash
# 在api应用中添加Prisma
pnpm add prisma @prisma/client -w
pnpm add -D prisma -w
```

### 2.2 初始化Prisma

```bash
# 在项目根目录创建prisma目录
npx prisma init --datasource-provider postgresql
```

移动prisma目录到合适位置（保持在根目录）：
```
prisma/
├── schema.prisma
└── migrations/
```

### 2.3 Prisma Schema设计

创建 `prisma/schema.prisma`：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ================================
// 用户与权限
// ================================

model User {
  id           String     @id @default(cuid())
  email        String     @unique
  name         String
  password     String
  role         UserRole   @default(USER)
  departmentId String
  department   Department @relation(fields: [departmentId], references: [id])

  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  // 关联
  uploadedContracts Contract[] @relation("ContractUploader")

  @@index([departmentId])
  @@index([email])
}

enum UserRole {
  USER           // 普通用户
  DEPT_ADMIN     // 部门管理员
  ADMIN          // 系统管理员
}

model Department {
  id        String   @id @default(cuid())
  name      String   @unique
  code      DepartmentCode @unique

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // 关联
  users     User[]
  contracts Contract[] @relation("ContractDepartment")
}

enum DepartmentCode {
  FINANCE      // 财务部门
  DELIVERY     // PMO/交付部门
  SALES        // 业务/销售部门
  MARKETING    // 市场部门
  LEGAL        // 法务/风控部门
  EXECUTIVE    // 管理层
}

// ================================
// 客户
// ================================

model Customer {
  id                    String   @id @default(cuid())
  name                  String   // 客户公司全称
  shortName             String?  // 简称
  creditCode            String?  @unique // 统一社会信用代码
  industry              String?  // 所属行业
  address               String?  // 地址
  contactPerson         String?  // 联系人
  contactPhone          String?  // 联系电话
  contactEmail          String?  // 联系邮箱

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // 关联
  contracts             Contract[]

  @@index([name])
  @@index([creditCode])
}

// ================================
// 合同主表
// ================================

model Contract {
  id                    String         @id @default(cuid())

  // 身份标识
  contractNo            String         @unique // 合同编号
  name                  String         // 合同名称

  // 合同类型与状态
  type                  ContractType   // 合同类型
  status                ContractStatus @default(DRAFT)

  // 签约方信息
  ourEntity             String         // 我方主体（签约子公司/法律实体）
  customerId            String
  customer              Customer       @relation(fields: [customerId], references: [id])

  // 财务条款
  amountWithTax         Decimal        @db.Decimal(18, 2) // 含税金额
  amountWithoutTax      Decimal?       @db.Decimal(18, 2) // 不含税金额
  currency              String         @default("CNY")    // 币种
  taxRate               Decimal?       @db.Decimal(5, 2)  // 税率
  taxAmount             Decimal?       @db.Decimal(18, 2) // 税额
  paymentMethod         String?        // 付款方式
  paymentTerms          String?        // 付款条件

  // 时间周期
  signedAt              DateTime?      // 签署日期
  effectiveAt           DateTime?      // 生效日期
  expiresAt             DateTime?      // 终止日期
  duration              String?        // 合同期限描述

  // 物理属性
  fileUrl               String?        // 合同文件存储路径
  fileType              String?        // 文件类型 (pdf/docx)
  copies                Int?           // 合同份数
  signLocation          String?        // 签订地点

  // 分类信息
  industry              String?        // 所属行业
  departmentId          String
  department            Department     @relation("ContractDepartment", fields: [departmentId], references: [id])
  salesPerson           String?        // 销售负责人

  // 解析状态
  parseStatus           ParseStatus    @default(PENDING)
  parsedAt              DateTime?      // 解析完成时间
  parseConfidence       Float?         // 解析置信度
  needsManualReview     Boolean        @default(false) // 是否需要人工确认

  // 关联主合同（补充协议用）
  parentContractId      String?
  parentContract        Contract?      @relation("ContractSupplements", fields: [parentContractId], references: [id])
  supplements           Contract[]     @relation("ContractSupplements")

  // 上传信息
  uploadedById          String
  uploadedBy            User           @relation("ContractUploader", fields: [uploadedById], references: [id])

  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt

  // 类型特定关联
  staffAugmentation     StaffAugmentationDetail?
  projectOutsourcing    ProjectOutsourcingDetail?
  productSales          ProductSalesDetail?

  // 通用标签
  tags                  ContractTag[]

  @@index([customerId])
  @@index([type])
  @@index([status])
  @@index([departmentId])
  @@index([signedAt])
  @@index([expiresAt])
  @@index([parentContractId])
}

enum ContractType {
  STAFF_AUGMENTATION    // 人力框架合同
  PROJECT_OUTSOURCING   // 项目外包合同
  PRODUCT_SALES         // 产品购销合同
}

enum ContractStatus {
  DRAFT             // 草拟
  PENDING_APPROVAL  // 审批中
  ACTIVE            // 已生效
  EXECUTING         // 执行中
  COMPLETED         // 已完结
  TERMINATED        // 已终止
  EXPIRED           // 已过期
}

enum ParseStatus {
  PENDING           // 待解析
  PROCESSING        // 解析中
  COMPLETED         // 解析完成
  FAILED            // 解析失败
  MANUAL_REVIEW     // 人工审核中
}

// ================================
// 人力框架合同详情
// ================================

model StaffAugmentationDetail {
  id                String   @id @default(cuid())
  contractId        String   @unique
  contract          Contract @relation(fields: [contractId], references: [id], onDelete: Cascade)

  estimatedTotalHours    Int?       // 预计总工时
  monthlyHoursCap        Int?       // 每月工时上限
  yearlyHoursCap         Int?       // 每年工时上限
  settlementCycle        String?    // 结算周期
  timesheetApprovalFlow  String?    // 工时审批流程
  adjustmentMechanism    String?    // 工时调整机制
  staffReplacementFlow   String?    // 人员更换流程

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // 费率明细
  rateItems         StaffRateItem[]
}

model StaffRateItem {
  id                String   @id @default(cuid())
  detailId          String
  detail            StaffAugmentationDetail @relation(fields: [detailId], references: [id], onDelete: Cascade)

  role              String   // 人员级别/角色
  rateType          RateType // 计费类型
  rate              Decimal  @db.Decimal(18, 2) // 费率
  rateEffectiveFrom DateTime? // 费率生效日期
  rateEffectiveTo   DateTime? // 费率失效日期

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([detailId])
}

enum RateType {
  HOURLY    // 时薪
  DAILY     // 日薪
  MONTHLY   // 月薪
}

// ================================
// 项目外包合同详情
// ================================

model ProjectOutsourcingDetail {
  id                String   @id @default(cuid())
  contractId        String   @unique
  contract          Contract @relation(fields: [contractId], references: [id], onDelete: Cascade)

  sowSummary             String?  // SOW范围摘要
  deliverables           String?  // 关键交付物清单
  acceptanceCriteria     String?  // 最终验收标准
  acceptanceFlow         String?  // 验收流程
  changeManagementFlow   String?  // 范围变更流程

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // 里程碑
  milestones        ProjectMilestone[]
}

model ProjectMilestone {
  id                String   @id @default(cuid())
  detailId          String
  detail            ProjectOutsourcingDetail @relation(fields: [detailId], references: [id], onDelete: Cascade)

  sequence          Int      // 顺序
  name              String   // 里程碑名称
  deliverables      String?  // 该里程碑交付物
  amount            Decimal? @db.Decimal(18, 2) // 对应金额
  paymentPercentage Decimal? @db.Decimal(5, 2)  // 付款比例
  plannedDate       DateTime? // 计划完成日期
  actualDate        DateTime? // 实际完成日期
  acceptanceCriteria String? // 验收标准
  status            MilestoneStatus @default(PENDING)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([detailId])
  @@index([sequence])
}

enum MilestoneStatus {
  PENDING       // 待开始
  IN_PROGRESS   // 进行中
  DELIVERED     // 已交付
  ACCEPTED      // 已验收
  REJECTED      // 被拒绝
}

// ================================
// 产品购销合同详情
// ================================

model ProductSalesDetail {
  id                String   @id @default(cuid())
  contractId        String   @unique
  contract          Contract @relation(fields: [contractId], references: [id], onDelete: Cascade)

  deliveryContent        String?  // 交付内容
  deliveryDate           DateTime? // 交付日期
  deliveryLocation       String?  // 交付地点
  shippingResponsibility String?  // 运输与保险责任
  ipOwnership            String?  // 知识产权归属
  warrantyPeriod         String?  // 保修期
  afterSalesTerms        String?  // 售后服务条款

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // 产品明细
  lineItems         ProductLineItem[]
}

model ProductLineItem {
  id                String   @id @default(cuid())
  detailId          String
  detail            ProductSalesDetail @relation(fields: [detailId], references: [id], onDelete: Cascade)

  productName       String   // 产品名称
  specification     String?  // 规格与配置
  quantity          Int      // 数量
  unit              String   @default("套") // 单位
  unitPriceWithTax  Decimal  @db.Decimal(18, 2) // 含税单价
  unitPriceWithoutTax Decimal? @db.Decimal(18, 2) // 不含税单价
  subtotal          Decimal  @db.Decimal(18, 2) // 小计

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([detailId])
}

// ================================
// 合同标签
// ================================

model Tag {
  id          String   @id @default(cuid())
  name        String   @unique
  category    String?  // 标签类别
  color       String?  // 显示颜色

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  contracts   ContractTag[]
}

model ContractTag {
  id          String   @id @default(cuid())
  contractId  String
  contract    Contract @relation(fields: [contractId], references: [id], onDelete: Cascade)
  tagId       String
  tag         Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)

  createdAt   DateTime @default(now())

  @@unique([contractId, tagId])
  @@index([contractId])
  @@index([tagId])
}
```

### 2.4 配置Prisma生成器

更新 `apps/api/project.json` 添加Prisma命令：

```json
{
  "targets": {
    "prisma:generate": {
      "command": "prisma generate",
      "options": {
        "cwd": "{projectRoot}/../../"
      }
    },
    "prisma:migrate": {
      "command": "prisma migrate dev",
      "options": {
        "cwd": "{projectRoot}/../../"
      }
    },
    "prisma:push": {
      "command": "prisma db push",
      "options": {
        "cwd": "{projectRoot}/../../"
      }
    },
    "prisma:studio": {
      "command": "prisma studio",
      "options": {
        "cwd": "{projectRoot}/../../"
      }
    }
  }
}
```

### 2.5 创建Prisma Service

创建 `apps/api/src/prisma/prisma.module.ts`：

```typescript
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

创建 `apps/api/src/prisma/prisma.service.ts`：

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

创建 `apps/api/src/prisma/index.ts`：

```typescript
export * from './prisma.module';
export * from './prisma.service';
```

### 2.6 在AppModule中导入PrismaModule

更新 `apps/api/src/app/app.module.ts`：

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../prisma';

@Module({
  imports: [PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### 2.7 创建数据库迁移

```bash
# 启动PostgreSQL
docker compose -f docker/docker-compose.yml up -d postgres

# 创建迁移
npx prisma migrate dev --name init
```

### 2.8 创建Seed数据（可选）

创建 `prisma/seed.ts`：

```typescript
import { PrismaClient, DepartmentCode, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 创建部门
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { code: DepartmentCode.FINANCE },
      update: {},
      create: { name: '财务部门', code: DepartmentCode.FINANCE },
    }),
    prisma.department.upsert({
      where: { code: DepartmentCode.DELIVERY },
      update: {},
      create: { name: 'PMO/交付部门', code: DepartmentCode.DELIVERY },
    }),
    prisma.department.upsert({
      where: { code: DepartmentCode.SALES },
      update: {},
      create: { name: '业务/销售部门', code: DepartmentCode.SALES },
    }),
    prisma.department.upsert({
      where: { code: DepartmentCode.MARKETING },
      update: {},
      create: { name: '市场部门', code: DepartmentCode.MARKETING },
    }),
    prisma.department.upsert({
      where: { code: DepartmentCode.LEGAL },
      update: {},
      create: { name: '法务/风控部门', code: DepartmentCode.LEGAL },
    }),
    prisma.department.upsert({
      where: { code: DepartmentCode.EXECUTIVE },
      update: {},
      create: { name: '管理层', code: DepartmentCode.EXECUTIVE },
    }),
  ]);

  console.log('Created departments:', departments.length);

  // 创建管理员用户
  const adminDept = departments.find(d => d.code === DepartmentCode.EXECUTIVE);
  if (adminDept) {
    const admin = await prisma.user.upsert({
      where: { email: 'admin@iclms.com' },
      update: {},
      create: {
        email: 'admin@iclms.com',
        name: '系统管理员',
        password: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', // "password"
        role: UserRole.ADMIN,
        departmentId: adminDept.id,
      },
    });
    console.log('Created admin user:', admin.email);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

更新 `package.json` 添加seed脚本：

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

### 2.9 更新shared库类型

更新 `libs/shared/src/types/index.ts`，与Prisma schema保持一致：

```typescript
// 合同类型
export type ContractType = 'STAFF_AUGMENTATION' | 'PROJECT_OUTSOURCING' | 'PRODUCT_SALES';

// 合同状态
export type ContractStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'TERMINATED'
  | 'EXPIRED';

// 解析状态
export type ParseStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'MANUAL_REVIEW';

// 用户角色
export type UserRole = 'USER' | 'DEPT_ADMIN' | 'ADMIN';

// 部门代码
export type DepartmentCode =
  | 'FINANCE'
  | 'DELIVERY'
  | 'SALES'
  | 'MARKETING'
  | 'LEGAL'
  | 'EXECUTIVE';

// 费率类型
export type RateType = 'HOURLY' | 'DAILY' | 'MONTHLY';

// 里程碑状态
export type MilestoneStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'ACCEPTED'
  | 'REJECTED';

// 基础实体接口
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// 用户
export interface User extends BaseEntity {
  email: string;
  name: string;
  role: UserRole;
  departmentId: string;
}

// 部门
export interface Department extends BaseEntity {
  name: string;
  code: DepartmentCode;
}

// 客户
export interface Customer extends BaseEntity {
  name: string;
  shortName?: string;
  creditCode?: string;
  industry?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
}

// 合同（简化版，用于列表展示）
export interface ContractSummary {
  id: string;
  contractNo: string;
  name: string;
  type: ContractType;
  status: ContractStatus;
  customerName: string;
  amountWithTax: number;
  currency: string;
  signedAt?: Date;
  expiresAt?: Date;
}

// 合同（完整版）
export interface Contract extends BaseEntity {
  contractNo: string;
  name: string;
  type: ContractType;
  status: ContractStatus;
  ourEntity: string;
  customerId: string;
  amountWithTax: number;
  amountWithoutTax?: number;
  currency: string;
  taxRate?: number;
  taxAmount?: number;
  paymentMethod?: string;
  paymentTerms?: string;
  signedAt?: Date;
  effectiveAt?: Date;
  expiresAt?: Date;
  duration?: string;
  fileUrl?: string;
  fileType?: string;
  copies?: number;
  signLocation?: string;
  industry?: string;
  departmentId: string;
  salesPerson?: string;
  parseStatus: ParseStatus;
  parsedAt?: Date;
  parseConfidence?: number;
  needsManualReview: boolean;
  parentContractId?: string;
  uploadedById: string;
}

// 人力费率项
export interface StaffRateItem {
  id: string;
  role: string;
  rateType: RateType;
  rate: number;
  rateEffectiveFrom?: Date;
  rateEffectiveTo?: Date;
}

// 项目里程碑
export interface ProjectMilestone {
  id: string;
  sequence: number;
  name: string;
  deliverables?: string;
  amount?: number;
  paymentPercentage?: number;
  plannedDate?: Date;
  actualDate?: Date;
  acceptanceCriteria?: string;
  status: MilestoneStatus;
}

// 产品明细项
export interface ProductLineItem {
  id: string;
  productName: string;
  specification?: string;
  quantity: number;
  unit: string;
  unitPriceWithTax: number;
  unitPriceWithoutTax?: number;
  subtotal: number;
}
```

---

## 3. 输入/输出

### 输入
- DATABASE_URL 环境变量
- Docker PostgreSQL 服务运行

### 输出
```
prisma/
├── schema.prisma          # Prisma schema定义
├── migrations/            # 数据库迁移文件
│   └── [timestamp]_init/
│       └── migration.sql
└── seed.ts                # 种子数据

apps/api/src/
├── prisma/
│   ├── prisma.module.ts   # Prisma模块
│   ├── prisma.service.ts  # Prisma服务
│   └── index.ts           # 导出
└── app/
    └── app.module.ts      # 更新导入PrismaModule

libs/shared/src/
└── types/
    └── index.ts           # 更新类型定义
```

---

## 4. 验收标准

### AC-01: Prisma安装成功
- [ ] `pnpm list prisma @prisma/client` 显示已安装
- [ ] `npx prisma --version` 返回版本号

### AC-02: Schema文件存在且语法正确
- [ ] `prisma/schema.prisma` 文件存在
- [ ] 运行 `npx prisma validate` 通过
- [ ] 包含所有必要的模型：User, Department, Customer, Contract及相关

### AC-03: 数据库迁移成功
- [ ] `prisma/migrations/` 目录下有迁移文件
- [ ] 运行 `npx prisma migrate status` 显示已应用
- [ ] PostgreSQL数据库中存在所有表

### AC-04: Prisma Client生成成功
- [ ] 运行 `npx prisma generate` 成功
- [ ] 可以在代码中导入 `@prisma/client`

### AC-05: PrismaService集成到NestJS
- [ ] `apps/api/src/prisma/` 目录存在
- [ ] PrismaModule被AppModule导入
- [ ] 应用启动时能连接数据库

### AC-06: 类型定义与Schema一致
- [ ] `libs/shared/src/types/index.ts` 已更新
- [ ] 类型与Prisma schema枚举/模型对应

### AC-07: Seed数据可执行
- [ ] 运行 `npx prisma db seed` 成功
- [ ] 数据库中存在6个部门记录
- [ ] 数据库中存在管理员用户

### AC-08: 背压检查通过
- [ ] 运行 `pnpm nx affected -t lint` 通过
- [ ] 运行 `pnpm nx affected -t test` 通过
- [ ] 运行 `pnpm nx affected -t build` 通过

---

## 5. 技术约束

- Prisma版本：5.x（最新稳定版）
- PostgreSQL版本：15.x
- 所有金额字段使用 `Decimal(18, 2)` 精度
- 所有外键使用 `cuid()` 格式
- 必须添加适当的索引优化查询性能
- 级联删除只用于强关联的子表

---

## 6. 注意事项

1. **不要**创建GraphQL相关代码（在03-graphql-foundation中处理）
2. **不要**创建复杂的业务逻辑，只设置数据模型
3. 确保所有枚举类型在shared库中有对应定义
4. 数据库连接使用环境变量，不要硬编码
5. 保持schema与PRD中的字段定义一致
6. 补充协议通过parentContractId自关联实现

---

## 7. 完成信号

当所有验收标准（AC-01到AC-08）全部满足时，输出：
```
<promise>COMPLETE</promise>
```

如果遇到阻塞问题，记录到 `05-ralph/BLOCKED.log` 并输出：
```
<promise>BLOCKED: [问题描述]</promise>
```
