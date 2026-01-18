# 07-auth-rbac.md

## 概述
实现JWT认证和基于角色的访问控制（RBAC），包括后端认证服务和前端登录状态管理。

## 依赖
- 02-database-schema.md (User/Department模型)
- 03-graphql-foundation.md (GraphQL基础设施)
- 06-contract-crud.md (需要保护的API)

## 技术选型
- **认证**: @nestjs/passport + passport-jwt + passport-local
- **密码**: bcrypt
- **前端状态**: Recoil
- **Token存储**: localStorage (开发) / httpOnly cookie (生产)

## 目录结构
```
apps/api/src/
├── auth/
│   ├── index.ts
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.resolver.ts
│   ├── strategies/
│   │   ├── index.ts
│   │   ├── jwt.strategy.ts
│   │   └── local.strategy.ts
│   ├── guards/
│   │   ├── index.ts
│   │   ├── gql-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── decorators/
│   │   ├── index.ts
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   └── dto/
│       ├── index.ts
│       ├── login.input.ts
│       ├── register.input.ts
│       └── auth-response.dto.ts

apps/web/src/
├── pages/
│   └── login.tsx
├── components/
│   └── auth/
│       ├── LoginForm.tsx
│       └── ProtectedRoute.tsx
└── state/
    ├── index.ts
    └── auth.state.ts
```

## 实现内容

### 1. 依赖安装
```bash
pnpm add -w @nestjs/passport passport passport-jwt passport-local bcrypt
pnpm add -wD @types/passport-jwt @types/passport-local @types/bcrypt
pnpm add -w recoil
```

### 2. JWT策略 (jwt.strategy.ts)
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    return this.prisma.user.findUnique({ where: { id: payload.sub } });
  }
}
```

### 3. Auth Service
```typescript
@Injectable()
export class AuthService {
  async validateUser(email: string, password: string): Promise<User | null>
  async login(user: User): Promise<AuthResponse>
  async register(input: RegisterInput): Promise<User>
  async hashPassword(password: string): Promise<string>
  async comparePassword(password: string, hash: string): Promise<boolean>
}
```

### 4. GraphQL Operations
```graphql
type AuthResponse {
  accessToken: String!
  user: User!
}

type Mutation {
  login(input: LoginInput!): AuthResponse!
  register(input: RegisterInput!): User!
}

type Query {
  me: User!  # 需要认证
}
```

### 5. GQL Auth Guard
```typescript
@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}
```

### 6. Roles Guard
```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRole[]>('roles', context.getHandler());
    if (!requiredRoles) return true;
    const user = GqlExecutionContext.create(context).getContext().req.user;
    return requiredRoles.includes(user.role);
  }
}
```

### 7. 前端Recoil状态
```typescript
// auth.state.ts
export const userState = atom<User | null>({
  key: 'userState',
  default: null,
});

export const isAuthenticatedState = selector({
  key: 'isAuthenticatedState',
  get: ({ get }) => get(userState) !== null,
});
```

### 8. 前端登录页
- 邮箱/密码输入
- 登录按钮
- 错误提示
- 登录成功后跳转

## 验收标准

### AC-01: 依赖安装
- [ ] @nestjs/passport安装成功
- [ ] passport-jwt安装成功
- [ ] bcrypt安装成功
- [ ] recoil安装成功

### AC-02: JWT认证
- [ ] JwtStrategy实现正确
- [ ] Token生成正确
- [ ] Token验证正确

### AC-03: Auth Service
- [ ] 用户注册功能
- [ ] 用户登录功能
- [ ] 密码哈希正确

### AC-04: GraphQL Guard
- [ ] GqlAuthGuard保护需要认证的查询
- [ ] RolesGuard实现角色检查
- [ ] @CurrentUser装饰器工作正常

### AC-05: 前端登录
- [ ] 登录页面渲染
- [ ] 登录表单提交
- [ ] Token存储
- [ ] Recoil状态更新

### AC-06: 背压检查
- [ ] pnpm nx affected -t lint 通过
- [ ] pnpm nx affected -t build 通过

## 注意事项
1. JWT_SECRET必须在环境变量中配置
2. 密码使用bcrypt哈希，salt rounds=10
3. Token过期时间设为24h
4. 开发环境使用localStorage，生产考虑httpOnly cookie
5. 注册功能暂时开放，后续可能改为仅管理员可用

## 预估工作量
- 代码量: ~600行
- 新文件: 18个
- 修改文件: 5个
