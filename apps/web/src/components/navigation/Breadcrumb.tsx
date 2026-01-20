import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  homeLabel?: string;
  homePath?: string;
}

export function Breadcrumb({
  items: propItems,
  homeLabel = '首页',
  homePath = '/contracts',
}: BreadcrumbProps) {
  const location = useLocation();

  // Auto-generate breadcrumbs from pathname if not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathnames = location.pathname.split('/').filter((x) => x);

    const breadcrumbs: BreadcrumbItem[] = [
      { label: homeLabel, path: homePath },
    ];

    const routeMap: Record<string, string> = {
      contracts: '合同管理',
      customers: '客户管理',
      finance: '财务仪表盘',
      delivery: '交付管理',
      sales: '销售管理',
      market: '市场知识库',
      legal: '法务合规',
      executive: '管理驾驶舱',
      users: '用户管理',
      admin: '系统管理',
      departments: '部门管理',
      tags: '标签管理',
      'audit-logs': '审计日志',
      settings: '设置',
      profile: '个人设置',
      password: '修改密码',
    };

    let currentPath = '';
    pathnames.forEach((name, index) => {
      currentPath += `/${name}`;
      const isLast = index === pathnames.length - 1;
      const label = routeMap[name] || name;

      breadcrumbs.push({
        label,
        path: isLast ? undefined : currentPath,
      });
    });

    return breadcrumbs;
  };

  const items = propItems || generateBreadcrumbs();

  if (items.length <= 1) {
    return null;
  }

  return (
    <nav style={styles.container} aria-label="面包屑导航">
      <ol style={styles.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} style={styles.item}>
              {index > 0 && <span style={styles.separator}>/</span>}
              {item.path && !isLast ? (
                <Link to={item.path} style={styles.link}>
                  {item.label}
                </Link>
              ) : (
                <span style={styles.current}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '12px 24px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e5e7eb',
  },
  list: {
    display: 'flex',
    listStyle: 'none',
    margin: 0,
    padding: 0,
    gap: '8px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
  },
  separator: {
    color: '#9ca3af',
    margin: '0 4px',
  },
  link: {
    color: '#6b7280',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
  current: {
    color: '#1e3a5f',
    fontWeight: 500,
  },
};

export default Breadcrumb;
