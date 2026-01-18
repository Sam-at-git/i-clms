import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import ContractsPage from '../pages/contracts';
import ContractDetailPage from '../pages/contracts/[id]';

function Layout({ children }: { children: React.ReactNode }) {
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
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/contracts" replace />} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/contracts/:id" element={<ContractDetailPage />} />
        </Routes>
      </Layout>
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
  },
  navLink: {
    color: 'rgba(255,255,255,0.8)',
    textDecoration: 'none',
    fontSize: '14px',
    padding: '8px 12px',
    borderRadius: '4px',
  },
  main: {
    minHeight: 'calc(100vh - 56px)',
  },
};

export default App;
