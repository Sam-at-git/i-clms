import { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuthStore } from '../../state/auth.state';

const GET_DEPARTMENTS = gql`
  query GetDepartmentsAdmin($includeInactive: Boolean!) {
    departments(includeInactive: $includeInactive) {
      id
      name
      code
      isActive
      createdAt
      updatedAt
    }
  }
`;

const CREATE_DEPARTMENT = gql`
  mutation CreateDepartment($input: CreateDepartmentInput!) {
    createDepartment(input: $input) {
      id
      name
      code
    }
  }
`;

const UPDATE_DEPARTMENT = gql`
  mutation UpdateDepartment($id: String!, $input: UpdateDepartmentInput!) {
    updateDepartment(id: $id, input: $input) {
      id
      name
      code
    }
  }
`;

const DELETE_DEPARTMENT = gql`
  mutation DeleteDepartment($id: String!) {
    deleteDepartment(id: $id) {
      success
      message
    }
  }
`;

interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DepartmentsQueryResult {
  departments: Department[];
}

interface DeleteDepartmentResult {
  deleteDepartment: {
    success: boolean;
    message: string;
  };
}

export function DepartmentsPage() {
  const { user: currentUser } = useAuthStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data, loading, error, refetch } = useQuery<DepartmentsQueryResult>(GET_DEPARTMENTS, {
    variables: { includeInactive: showInactive },
  });

  const [createDepartment] = useMutation(CREATE_DEPARTMENT, {
    onCompleted: () => {
      setShowCreateModal(false);
      refetch();
    },
  });

  const [updateDepartment] = useMutation(UPDATE_DEPARTMENT, {
    onCompleted: () => {
      setEditingDepartment(null);
      refetch();
    },
  });

  const [deleteDepartment] = useMutation<DeleteDepartmentResult>(DELETE_DEPARTMENT, {
    onCompleted: (result) => {
      if (!result.deleteDepartment.success) {
        alert(result.deleteDepartment.message || '删除失败');
      }
      refetch();
    },
  });

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          <h2>访问受限</h2>
          <p>只有系统管理员可以访问部门管理功能</p>
        </div>
      </div>
    );
  }

  if (loading) return <div style={styles.loading}>加载中...</div>;
  if (error) return <div style={styles.error}>错误: {error.message}</div>;

  const departments = data?.departments || [];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>部门管理</h1>
        <div style={styles.headerRight}>
          <label style={styles.checkbox}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            显示已禁用部门
          </label>
          <span style={styles.stats}>共 {departments.length} 个部门</span>
          <button onClick={() => setShowCreateModal(true)} style={styles.createButton}>
            + 新建部门
          </button>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>部门名称</th>
              <th style={styles.th}>部门代码</th>
              <th style={styles.th}>状态</th>
              <th style={styles.th}>创建时间</th>
              <th style={styles.th}>更新时间</th>
              <th style={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept: Department) => (
              <tr key={dept.id} style={styles.tr}>
                <td style={styles.td}>{dept.name}</td>
                <td style={styles.td}>
                  <span style={styles.codeBadge}>{dept.code}</span>
                </td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: dept.isActive ? '#dcfce7' : '#fee2e2',
                      color: dept.isActive ? '#166534' : '#dc2626',
                    }}
                  >
                    {dept.isActive ? '启用' : '禁用'}
                  </span>
                </td>
                <td style={styles.td}>{new Date(dept.createdAt).toLocaleDateString('zh-CN')}</td>
                <td style={styles.td}>{new Date(dept.updatedAt).toLocaleDateString('zh-CN')}</td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button onClick={() => setEditingDepartment(dept)} style={styles.editLink}>
                      编辑
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`确定要删除部门 ${dept.name} 吗？\n注意：只有没有关联用户的部门才能删除。`)) {
                          deleteDepartment({ variables: { id: dept.id } });
                        }
                      }}
                      style={{ ...styles.editLink, color: '#dc2626' }}
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <DepartmentModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={async (data) => {
            await createDepartment({ variables: { input: data } });
          }}
        />
      )}

      {editingDepartment && (
        <DepartmentModal
          department={editingDepartment}
          onClose={() => setEditingDepartment(null)}
          onSubmit={async (data) => {
            await updateDepartment({ variables: { id: editingDepartment.id, input: data } });
          }}
        />
      )}
    </div>
  );
}

interface DepartmentModalProps {
  department?: Department;
  onClose: () => void;
  onSubmit: (data: { name: string; code: string }) => Promise<void>;
}

function DepartmentModal({ department, onClose, onSubmit }: DepartmentModalProps) {
  const [formData, setFormData] = useState({
    name: department?.name || '',
    code: department?.code || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.code) {
      setError('请填写所有必填项');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>{department ? '编辑部门' : '新建部门'}</h2>
          <button onClick={onClose} style={modalStyles.closeButton}>
            ×
          </button>
        </div>

        {error && <div style={modalStyles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={modalStyles.form}>
          <div style={modalStyles.field}>
            <label style={modalStyles.label}>部门名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              style={modalStyles.input}
              placeholder="如：财务部"
              required
            />
          </div>

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>部门代码 *</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
              style={modalStyles.input}
              placeholder="如：FINANCE"
              required
            />
            <span style={modalStyles.hint}>部门代码将自动转为大写，需唯一</span>
          </div>

          <div style={modalStyles.actions}>
            <button type="button" onClick={onClose} style={modalStyles.cancelButton}>
              取消
            </button>
            <button type="submit" style={modalStyles.submitButton} disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
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
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#6b7280',
  },
  stats: {
    color: '#6b7280',
    fontSize: '14px',
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
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#6b7280',
  },
  error: {
    padding: '48px',
    textAlign: 'center',
    color: '#ef4444',
  },
  accessDenied: {
    padding: '48px',
    textAlign: 'center',
    color: '#6b7280',
  },
  tableContainer: {
    overflowX: 'auto',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: 500,
    fontSize: '12px',
    textTransform: 'uppercase',
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  tr: {
    borderBottom: '1px solid #e5e7eb',
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#374151',
  },
  codeBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    fontFamily: 'monospace',
    color: '#374151',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '12px',
    borderRadius: '4px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  editLink: {
    color: '#3b82f6',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
  },
  error: {
    margin: '16px 24px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
  },
  form: {
    padding: '24px',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  hint: {
    display: 'block',
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    background: '#fff',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '10px 20px',
    fontSize: '14px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    cursor: 'pointer',
  },
};

export default DepartmentsPage;
