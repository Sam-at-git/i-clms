import { PrismaClient, DepartmentCode, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env['DATABASE_URL'] || '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

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

  console.log(`Created ${departments.length} departments`);

  // 创建管理员用户
  const adminDept = departments.find((d) => d.code === DepartmentCode.EXECUTIVE);
  if (adminDept) {
    const admin = await prisma.user.upsert({
      where: { email: 'admin@iclms.com' },
      update: {},
      create: {
        email: 'admin@iclms.com',
        name: '系统管理员',
        // bcrypt hash of "password" with 10 rounds
        password: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
        role: UserRole.ADMIN,
        departmentId: adminDept.id,
      },
    });
    console.log(`Created admin user: ${admin.email}`);
  }

  // 创建一些常用标签
  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { name: '高风险' },
      update: {},
      create: { name: '高风险', category: '风险等级', color: '#ff4d4f' },
    }),
    prisma.tag.upsert({
      where: { name: '中风险' },
      update: {},
      create: { name: '中风险', category: '风险等级', color: '#faad14' },
    }),
    prisma.tag.upsert({
      where: { name: '低风险' },
      update: {},
      create: { name: '低风险', category: '风险等级', color: '#52c41a' },
    }),
    prisma.tag.upsert({
      where: { name: '金融行业' },
      update: {},
      create: { name: '金融行业', category: '行业', color: '#1890ff' },
    }),
    prisma.tag.upsert({
      where: { name: '制造业' },
      update: {},
      create: { name: '制造业', category: '行业', color: '#722ed1' },
    }),
    prisma.tag.upsert({
      where: { name: '重点客户' },
      update: {},
      create: { name: '重点客户', category: '客户分级', color: '#eb2f96' },
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
