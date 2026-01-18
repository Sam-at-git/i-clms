import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import ContractsPage from '../pages/contracts';
import ContractDetailPage from '../pages/contracts/[id]';
import LoginPage from '../pages/login';
import FinancePage from '../pages/finance';
import DeliveryPage from '../pages/delivery';
import SalesPage from '../pages/sales';
import { ProtectedRoute } from '../components/auth';
import { userState, authTokenState, clearAuthState, isAuthenticatedState } from '../state';

function Layout({ children }: { children: React.ReactNode }) {
  const user = useRecoilValue(userState);
  const isAuthenticated = useRecoilValue(isAuthenticatedState);
  const setUser = useSetRecoilState(userState);
  const setToken = useSetRecoilState(authTokenState);

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    clearAuthState();
  };

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
            <Link to="/finance" style={styles.navLink}>
              财务仪表盘
            </Link>
            <Link to="/delivery" style={styles.navLink}>
              交付管理
            </Link>
            <Link to="/sales" style={styles.navLink}>
              销售管理
            </Link>
          </div>
          <div style={styles.userSection}>
            {isAuthenticated && user ? (
              <>
                <span style={styles.userName}>{user.name}</span>
                <button onClick={handleLogout} style={styles.logoutButton}>
                  退出
                </button>
              </>
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
                  path="/sales"
                  element={
                    <ProtectedRoute>
                      <SalesPage />
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
