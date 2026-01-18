# STYLE.md - 代码风格指南

## 通用规范

### TypeScript
- 启用strict mode
- 禁止使用`any`，必须明确类型
- 使用ESLint + Prettier统一格式
- 单个函数不超过50行
- 单个文件不超过300行

### 命名规范
```typescript
// 变量和函数：camelCase
const contractName = 'xxx';
function parseContract() {}

// 类和接口：PascalCase
class ContractService {}
interface ContractInput {}

// 常量：UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 文件名：kebab-case
contract.service.ts
contract-parser.util.ts
```

---

## NestJS 后端规范

### 模块结构
```
modules/contract/
├── contract.module.ts           # 模块定义
├── contract.resolver.ts         # GraphQL解析器
├── contract.service.ts          # 业务逻辑
├── dto/
│   ├── create-contract.input.ts # 输入类型
│   └── contract.type.ts         # 输出类型
└── contract.service.spec.ts     # 单元测试
```

### Service规范
```typescript
@Injectable()
export class ContractService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建合同
   * @param input 合同输入数据
   * @returns 创建的合同
   */
  async create(input: CreateContractInput): Promise<Contract> {
    return this.prisma.contract.create({ data: input });
  }
}
```

### Resolver规范
```typescript
@Resolver(() => Contract)
export class ContractResolver {
  constructor(private contractService: ContractService) {}

  @Query(() => [Contract])
  async contracts(): Promise<Contract[]> {
    return this.contractService.findAll();
  }

  @Mutation(() => Contract)
  async createContract(
    @Args('input') input: CreateContractInput,
  ): Promise<Contract> {
    return this.contractService.create(input);
  }
}
```

### DTO规范
```typescript
// 输入类型
@InputType()
export class CreateContractInput {
  @Field()
  name: string;

  @Field(() => Float)
  amount: number;

  @Field({ nullable: true })
  description?: string;
}

// 输出类型
@ObjectType()
export class Contract {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => Float)
  amount: number;

  @Field()
  createdAt: Date;
}
```

---

## React 前端规范

### 组件结构
```tsx
// 函数式组件 + TypeScript
interface ContractListProps {
  customerId?: string;
}

export const ContractList: React.FC<ContractListProps> = ({ customerId }) => {
  // Hooks在最顶部
  const { data, loading, error } = useContractsQuery({
    variables: { customerId }
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 早期返回
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  // 渲染
  return (
    <div className="contract-list">
      {data?.contracts.map((contract) => (
        <ContractCard
          key={contract.id}
          contract={contract}
          selected={contract.id === selectedId}
          onSelect={setSelectedId}
        />
      ))}
    </div>
  );
};
```

### Hook规范
```typescript
// 自定义Hook以use开头
export function useContract(id: string) {
  const { data, loading, error } = useContractQuery({ variables: { id } });

  const contract = useMemo(() => data?.contract, [data]);

  return { contract, loading, error };
}
```

### Recoil状态规范
```typescript
// atoms命名：xxxState
export const currentUserState = atom<User | null>({
  key: 'currentUserState',
  default: null,
});

// selectors命名：xxxSelector
export const userNameSelector = selector({
  key: 'userNameSelector',
  get: ({ get }) => get(currentUserState)?.name ?? 'Guest',
});
```

### GraphQL查询规范
```typescript
// 查询文件：xxx.graphql
// queries/contracts.graphql
query Contracts($customerId: ID) {
  contracts(customerId: $customerId) {
    id
    name
    amount
    status
  }
}

mutation CreateContract($input: CreateContractInput!) {
  createContract(input: $input) {
    id
    name
  }
}
```

---

## 测试规范

### 单元测试
```typescript
describe('ContractService', () => {
  let service: ContractService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ContractService, PrismaService],
    }).compile();

    service = module.get(ContractService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create a contract', async () => {
      const input = { name: 'Test Contract', amount: 10000 };
      const expected = { id: '1', ...input };

      jest.spyOn(prisma.contract, 'create').mockResolvedValue(expected);

      const result = await service.create(input);

      expect(result).toEqual(expected);
    });
  });
});
```

### E2E测试
```typescript
// Playwright
test('should display contract list', async ({ page }) => {
  await page.goto('/contracts');

  await expect(page.getByRole('heading', { name: 'Contracts' })).toBeVisible();
  await expect(page.getByTestId('contract-table')).toBeVisible();
});
```

---

## Git提交规范

```bash
# 格式: type(scope): description

# type:
feat     # 新功能
fix      # Bug修复
refactor # 重构
docs     # 文档
test     # 测试
chore    # 构建/工具

# scope:
api      # 后端
web      # 前端
shared   # 共享库
prisma   # 数据库

# 示例
feat(api): add contract parser service
fix(web): fix contract list pagination
refactor(api): extract validation logic to decorator
```
