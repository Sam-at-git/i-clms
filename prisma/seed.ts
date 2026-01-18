import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env['DATABASE_URL'] || '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Department codes (now strings instead of enum)
const DEPARTMENT_CODES = {
  FINANCE: 'FINANCE',
  DELIVERY: 'DELIVERY',
  SALES: 'SALES',
  MARKETING: 'MARKETING',
  LEGAL: 'LEGAL',
  EXECUTIVE: 'EXECUTIVE',
};

async function main() {
  console.log('Seeding database...');

  // 创建部门
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { code: DEPARTMENT_CODES.FINANCE },
      update: {},
      create: { name: '财务部门', code: DEPARTMENT_CODES.FINANCE, isActive: true },
    }),
    prisma.department.upsert({
      where: { code: DEPARTMENT_CODES.DELIVERY },
      update: {},
      create: { name: 'PMO/交付部门', code: DEPARTMENT_CODES.DELIVERY, isActive: true },
    }),
    prisma.department.upsert({
      where: { code: DEPARTMENT_CODES.SALES },
      update: {},
      create: { name: '业务/销售部门', code: DEPARTMENT_CODES.SALES, isActive: true },
    }),
    prisma.department.upsert({
      where: { code: DEPARTMENT_CODES.MARKETING },
      update: {},
      create: { name: '市场部门', code: DEPARTMENT_CODES.MARKETING, isActive: true },
    }),
    prisma.department.upsert({
      where: { code: DEPARTMENT_CODES.LEGAL },
      update: {},
      create: { name: '法务/风控部门', code: DEPARTMENT_CODES.LEGAL, isActive: true },
    }),
    prisma.department.upsert({
      where: { code: DEPARTMENT_CODES.EXECUTIVE },
      update: {},
      create: { name: '管理层', code: DEPARTMENT_CODES.EXECUTIVE, isActive: true },
    }),
  ]);

  console.log(`Created ${departments.length} departments`);

  // 创建管理员用户
  const adminDept = departments.find((d) => d.code === DEPARTMENT_CODES.EXECUTIVE);
  if (adminDept) {
    // Hash password "admin123"
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = await prisma.user.upsert({
      where: { email: 'admin@iclms.com' },
      update: {},
      create: {
        email: 'admin@iclms.com',
        name: '系统管理员',
        password: hashedPassword,
        role: UserRole.ADMIN,
        departmentId: adminDept.id,
        isActive: true,
        mustChangePassword: false, // Admin doesn't need to change password on first login
      },
    });
    console.log(`Created admin user: ${admin.email} (password: admin123)`);
  }

  // 创建一些常用标签
  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { name: '高风险' },
      update: {},
      create: { name: '高风险', category: '风险等级', color: '#ff4d4f', isActive: true, isSystem: false },
    }),
    prisma.tag.upsert({
      where: { name: '中风险' },
      update: {},
      create: { name: '中风险', category: '风险等级', color: '#faad14', isActive: true, isSystem: false },
    }),
    prisma.tag.upsert({
      where: { name: '低风险' },
      update: {},
      create: { name: '低风险', category: '风险等级', color: '#52c41a', isActive: true, isSystem: false },
    }),
    prisma.tag.upsert({
      where: { name: '金融行业' },
      update: {},
      create: { name: '金融行业', category: '行业', color: '#1890ff', isActive: true, isSystem: false },
    }),
    prisma.tag.upsert({
      where: { name: '制造业' },
      update: {},
      create: { name: '制造业', category: '行业', color: '#722ed1', isActive: true, isSystem: false },
    }),
    prisma.tag.upsert({
      where: { name: '重点客户' },
      update: {},
      create: { name: '重点客户', category: '客户分级', color: '#eb2f96', isActive: true, isSystem: false },
    }),
  ]);

  console.log(`Created ${tags.length} tags`);

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
