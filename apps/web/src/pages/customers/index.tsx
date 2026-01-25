import { useState } from 'react';
import { CustomerList } from '../../components/customers';
import { CustomerFormModal } from '../../components/customers/CustomerFormModal';

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [status, setStatus] = useState<any>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateClick = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (customer: any) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleModalSuccess = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>客户管理</h1>
        <button onClick={handleCreateClick} style={styles.createButton}>
          + 新建客户
        </button>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <input
          type="text"
          placeholder="搜索客户名称..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          style={styles.select}
        >
          <option value="">全部行业</option>
          <option value="IT/互联网">IT/互联网</option>
          <option value="金融">金融</option>
          <option value="制造业">制造业</option>
          <option value="教育">教育</option>
          <option value="医疗">医疗</option>
          <option value="政府">政府</option>
          <option value="其他">其他</option>
        </select>
        <select
          value={status || ''}
          onChange={(e) => setStatus(e.target.value || undefined)}
          style={styles.select}
        >
          <option value="">全部状态</option>
          <option value="ACTIVE">活跃</option>
          <option value="INACTIVE">非活跃</option>
          <option value="ARCHIVED">已归档</option>
        </select>
        {(search || industry || status) && (
          <button
            onClick={() => {
              setSearch('');
              setIndustry('');
              setStatus(undefined);
            }}
            style={styles.clearButton}
          >
            清除筛选
          </button>
        )}
      </div>

      {/* List */}
      <CustomerList
        search={search}
        industry={industry}
        status={status}
        refreshKey={refreshKey}
        onEdit={handleEditClick}
      />

      {/* Modal */}
      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        customer={editingCustomer}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  createButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  filters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    maxWidth: '400px',
    padding: '8px 12px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
  },
  select: {
    padding: '8px 12px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  clearButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

export default CustomersPage;
