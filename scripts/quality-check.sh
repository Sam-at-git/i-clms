#!/bin/bash
# 质量出口检测脚本 - 在提交/部署前运行

set -e

echo "=========================================="
echo "  i-CLMS 质量出口检测"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
  echo -e "${GREEN}✓ $1${NC}"
}

check_fail() {
  echo -e "${RED}✗ $1${NC}"
  exit 1
}

check_warn() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

# 1. TypeScript 类型检查
echo ""
echo "1/6 TypeScript 类型检查..."
if pnpm nx run-many -t typecheck --parallel=4 > /dev/null 2>&1; then
  check_pass "TypeScript 类型检查通过"
else
  check_fail "TypeScript 类型检查失败"
fi

# 2. ESLint 代码规范
echo ""
echo "2/6 ESLint 代码规范检查..."
if pnpm nx run-many -t lint --parallel=4 > /dev/null 2>&1; then
  check_pass "ESLint 检查通过"
else
  check_fail "ESLint 检查失败"
fi

# 3. GraphQL Schema 一致性检查
echo ""
echo "3/6 GraphQL Schema 一致性检查..."
# 重新生成并比较
if pnpm graphql-codegen > /dev/null 2>&1; then
  # 检查是否有未提交的生成文件变更
  if git diff --quiet libs/shared/src/generated/; then
    check_pass "GraphQL Schema 一致"
  else
    check_warn "GraphQL 生成文件有变更，请检查并提交"
    git diff --stat libs/shared/src/generated/
  fi
else
  check_fail "GraphQL codegen 失败"
fi

# 4. 单元测试
echo ""
echo "4/6 单元测试..."
if pnpm nx run-many -t test --parallel=4 -- --passWithNoTests > /dev/null 2>&1; then
  check_pass "单元测试通过"
else
  check_fail "单元测试失败"
fi

# 5. 构建检查
echo ""
echo "5/6 构建检查..."
if pnpm nx run-many -t build --parallel=4 > /dev/null 2>&1; then
  check_pass "构建成功"
else
  check_fail "构建失败"
fi

# 6. 前端功能完整性检查
echo ""
echo "6/6 前端功能完整性检查..."

# 检查必要的路由是否存在
REQUIRED_ROUTES=(
  "/contracts"
  "/finance"
  "/delivery"
  "/sales"
  "/market"
  "/legal"
  "/executive"
  "/users"
  "/login"
)

APP_FILE="apps/web/src/app/app.tsx"
MISSING_ROUTES=()

for route in "${REQUIRED_ROUTES[@]}"; do
  if ! grep -q "path=\"$route\"" "$APP_FILE"; then
    MISSING_ROUTES+=("$route")
  fi
done

if [ ${#MISSING_ROUTES[@]} -eq 0 ]; then
  check_pass "所有必要路由已配置"
else
  check_fail "缺少路由: ${MISSING_ROUTES[*]}"
fi

# 检查内联 GraphQL 是否使用了正确的字段（抽样检查）
echo ""
echo "检查 GraphQL 查询字段..."

# 检查是否有使用已废弃字段的情况
DEPRECATED_PATTERNS=(
  "textContent"  # 应使用 text
  "sourceFile"   # 应使用 fileUrl
)

FOUND_DEPRECATED=false
for pattern in "${DEPRECATED_PATTERNS[@]}"; do
  if grep -r "$pattern" apps/web/src --include="*.tsx" --include="*.ts" | grep -v "node_modules" | grep -q .; then
    check_warn "发现可能废弃的字段使用: $pattern"
    FOUND_DEPRECATED=true
  fi
done

if [ "$FOUND_DEPRECATED" = false ]; then
  check_pass "未发现废弃字段使用"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  质量检测完成${NC}"
echo "=========================================="
