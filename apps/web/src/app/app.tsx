import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import ContractsPage from '../pages/contracts';
import ContractDetailPage from '../pages/contracts/[id]';
import CustomersPage from '../pages/customers';
import CustomerDetailPage from '../pages/customers/[id]';
import LoginPage from '../pages/login';
import ForgotPasswordPage from '../pages/forgot-password';
import FinancePage from '../pages/finance';
import DeliveryPage from '../pages/delivery';
import SalesPage from '../pages/sales';
import MarketPage from '../pages/market';
import LegalPage from '../pages/legal';
import ExecutivePage from '../pages/executive';
import UsersPage from '../pages/users';
import DepartmentsPage from '../pages/admin/departments';
import TagsPage from '../pages/admin/tags';
import AuditLogsPage from '../pages/admin/audit-logs';
import PasswordPage from '../pages/settings/password';
import ProfilePage from '../pages/settings/profile';
import SystemSettingsPage from '../pages/settings/system';
import { MilestonesPage } from '../pages/milestones';
import RiskAlertsPage from '../pages/risk-alerts';
import { ProtectedRoute } from '../components/auth';
import { ForbiddenPage, RoleGuard } from '../components/errors';
import { useAuthStore } from '../state';

function Layout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    clearAuth();
  };

  const isAdmin = user?.role === 'ADMIN';
  const isDeptAdmin = user?.role === 'DEPT_ADMIN';

  return (
    <div style={styles.layout}>
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <Link to="/" style={styles.logo}>
            i-CLMS
          </Link>
          <div style={styles.navLinks}>
            <Link to="/contracts" style={styles.navLink}>
              合同管理
            </Link>
            <Link to="/customers" style={styles.navLink}>
              客户管理
            </Link>
            <Link to="/finance" style={styles.navLink}>
              财务仪表盘
            </Link>
            <Link to="/delivery" style={styles.navLink}>
              交付管理
            </Link>
            <Link to="/milestones" style={styles.navLink}>
              里程碑管理
            </Link>
            <Link to="/risk-alerts" style={styles.navLink}>
              风险预警
            </Link>
            <Link to="/sales" style={styles.navLink}>
              销售管理
            </Link>
            <Link to="/market" style={styles.navLink}>
              市场知识库
            </Link>
            <Link to="/legal" style={styles.navLink}>
              法务合规
            </Link>
            <Link to="/executive" style={styles.navLink}>
              管理驾驶舱
            </Link>
            {(isAdmin || isDeptAdmin) && (
              <div
                style={styles.dropdown}
                onMouseEnter={() => setShowAdminMenu(true)}
                onMouseLeave={() => setShowAdminMenu(false)}
              >
                <span style={styles.navLink}>系统管理 ▾</span>
                {showAdminMenu && (
                  <div style={styles.dropdownMenu}>
                    {isAdmin && (
                      <>
                        <Link to="/users" style={styles.dropdownItem}>
                          用户管理
                        </Link>
                        <Link to="/admin/departments" style={styles.dropdownItem}>
                          部门管理
                        </Link>
                      </>
                    )}
                    <Link to="/admin/tags" style={styles.dropdownItem}>
                      标签管理
                    </Link>
                    {isAdmin && (
                      <Link to="/admin/audit-logs" style={styles.dropdownItem}>
                        审计日志
                      </Link>
                    )}
                    {isAdmin && (
                      <Link to="/settings/system" style={styles.dropdownItem}>
                        系统设置
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={styles.userSection}>
            {isAuthenticated && user ? (
              <div
                style={styles.userDropdown}
                onMouseEnter={() => setShowUserMenu(true)}
                onMouseLeave={() => setShowUserMenu(false)}
              >
                <span style={styles.userName}>{user.name} ▾</span>
                {showUserMenu && (
                  <div style={styles.userDropdownMenu}>
                    <Link to="/settings/profile" style={styles.dropdownItem}>
                      个人设置
                    </Link>
                    <Link to="/settings/password" style={styles.dropdownItem}>
                      修改密码
                    </Link>
                    <button onClick={handleLogout} style={styles.dropdownButton}>
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" style={styles.loginLink}>
                登录
              </Link>
            )}
          </div>
        </div>
      </nav>
      <main style={styles.main}>{children}</main>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/403" element={<ForbiddenPage />} />
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/contracts" replace />} />
                <Route
                  path="/contracts"
                  element={
                    <ProtectedRoute>
                      <ContractsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/contracts/:id"
                  element={
                    <ProtectedRoute>
                      <ContractDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/customers"
                  element={
                    <ProtectedRoute>
                      <CustomersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/customers/:id"
                  element={
                    <ProtectedRoute>
                      <CustomerDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/finance"
                  element={
                    <ProtectedRoute>
                      <FinancePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/delivery"
                  element={
                    <ProtectedRoute>
                      <DeliveryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/milestones"
                  element={
                    <ProtectedRoute>
                      <MilestonesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/risk-alerts"
                  element={
                    <ProtectedRoute>
                      <RoleGuard requireDeptAdmin>
                        <RiskAlertsPage />
                      </RoleGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sales"
                  element={
                    <ProtectedRoute>
                      <SalesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/market"
                  element={
                    <ProtectedRoute>
                      <MarketPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/legal"
                  element={
                    <ProtectedRoute>
                      <LegalPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/executive"
                  element={
                    <ProtectedRoute>
                      <ExecutivePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute>
                      <RoleGuard requireAdmin>
                        <UsersPage />
                      </RoleGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/departments"
                  element={
                    <ProtectedRoute>
                      <RoleGuard requireAdmin>
                        <DepartmentsPage />
                      </RoleGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/tags"
                  element={
                    <ProtectedRoute>
                      <TagsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/audit-logs"
                  element={
                    <ProtectedRoute>
                      <RoleGuard requireAdmin>
                        <AuditLogsPage />
                      </RoleGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings/password"
                  element={
                    <ProtectedRoute>
                      <PasswordPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings/system"
                  element={
                    <ProtectedRoute>
                      <RoleGuard requireAdmin>
                        <SystemSettingsPage />
                      </RoleGuard>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
  },
  nav: {
    backgroundColor: '#1e3a5f',
    padding: '0 24px',
    height: '56px',
  },
  navContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    gap: '32px',
  },
  logo: {
    color: '#fff',
    fontSize: '20px',
    fontWeight: 700,
    textDecoration: 'none',
  },
  navLinks: {
    display: 'flex',
    gap: '16px',
    flex: 1,
  },
  navLink: {
    color: 'rgba(255,255,255,0.8)',
    textDecoration: 'none',
    fontSize: '14px',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  dropdown: {
    position: 'relative',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    minWidth: '160px',
    padding: '8px 0',
    zIndex: 1000,
  },
  dropdownItem: {
    display: 'block',
    padding: '10px 16px',
    color: '#374151',
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },
  dropdownButton: {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    color: '#374151',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '14px',
    textAlign: 'left',
    cursor: 'pointer',
  },
  userDropdown: {
    position: 'relative',
  },
  userDropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    minWidth: '140px',
    padding: '8px 0',
    zIndex: 1000,
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: '14px',
  },
  logoutButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  loginLink: {
    color: '#fff',
    textDecoration: 'none',
    fontSize: '14px',
    padding: '6px 12px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
  },
  main: {
    minHeight: 'calc(100vh - 56px)',
  },
};

export default App;
