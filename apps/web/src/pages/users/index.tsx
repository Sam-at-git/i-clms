import { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuthStore } from '../../state/auth.state';

const GET_USERS = gql`
  query GetUsers($page: Int!, $pageSize: Int!, $filter: UserFilterInput) {
    users(page: $page, pageSize: $pageSize, filter: $filter) {
      items {
        id
        name
        email
        role
        isActive
        mustChangePassword
        createdAt
        department {
          id
          name
          code
        }
      }
      total
      page
      pageSize
    }
  }
`;

const GET_DEPARTMENTS = gql`
  query GetDepartments {
    departments {
      id
      name
      code
    }
  }
`;

const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
    }
  }
`;

const UPDATE_USER = gql`
  mutation UpdateUser($id: String!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      name
      email
    }
  }
`;

const TOGGLE_USER_STATUS = gql`
  mutation ToggleUserStatus($id: String!) {
    toggleUserStatus(id: $id) {
      id
      isActive
    }
  }
`;

const RESET_USER_PASSWORD = gql`
  mutation ResetUserPassword($id: String!) {
    resetUserPassword(id: $id) {
      success
      temporaryPassword
    }
  }
`;

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  department: {
    id: string;
    name: string;
    code: string;
  };
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface UsersQueryResult {
  users: {
    items: User[];
    total: number;
    page: number;
    pageSize: number;
  };
}

interface DepartmentsQueryResult {
  departments: Department[];
}

interface ResetPasswordResult {
  resetUserPassword: {
    success: boolean;
    temporaryPassword: string;
  };
}

const ROLE_LABELS: Record<string, string> = {
  USER: '普通用户',
  DEPT_ADMIN: '部门管理员',
  ADMIN: '系统管理员',
};

export function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [resetPasswordResult, setResetPasswordResult] = useState<{ userId: string; password: string } | null>(null);

  const { data, loading, error, refetch } = useQuery<UsersQueryResult>(GET_USERS, {
    variables: {
      page,
      pageSize: 20,
      filter: departmentFilter ? { departmentId: departmentFilter } : undefined,
    },
  });

  const { data: deptData } = useQuery<DepartmentsQueryResult>(GET_DEPARTMENTS);

  const [createUser] = useMutation(CREATE_USER, {
    onCompleted: () => {
      setShowCreateModal(false);
      refetch();
    },
  });

  const [updateUser] = useMutation(UPDATE_USER, {
    onCompleted: () => {
      setEditingUser(null);
      refetch();
    },
  });

  const [toggleUserStatus] = useMutation(TOGGLE_USER_STATUS, {
    onCompleted: () => {
      refetch();
    },
  });

  const [resetUserPassword] = useMutation<ResetPasswordResult>(RESET_USER_PASSWORD, {
    onCompleted: (result) => {
      if (result.resetUserPassword.success) {
        setResetPasswordResult({
          userId: '',
          password: result.resetUserPassword.temporaryPassword,
        });
      }
      refetch();
    },
  });

  // Only ADMIN can access this page
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          <h2>访问受限</h2>
          <p>只有系统管理员可以访问用户管理功能</p>
        </div>
      </div>
    );
  }

  if (loading) return <div style={styles.loading}>加载中...</div>;
  if (error) return <div style={styles.error}>错误: {error.message}</div>;

  const users = data?.users?.items || [];
  const total = data?.users?.total || 0;
  const totalPages = Math.ceil(total / 20);
  const departments = deptData?.departments || [];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>用户管理</h1>
        <div style={styles.headerRight}>
          <select
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e.target.value);
              setPage(1);
            }}
            style={styles.filterSelect}
          >
            <option value="">全部部门</option>
            {departments.map((dept: Department) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
          <span style={styles.stats}>共 {total} 个用户</span>
          <button onClick={() => setShowCreateModal(true)} style={styles.createButton}>
            + 新建用户
          </button>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>姓名</th>
              <th style={styles.th}>邮箱</th>
              <th style={styles.th}>部门</th>
              <th style={styles.th}>角色</th>
              <th style={styles.th}>状态</th>
              <th style={styles.th}>创建时间</th>
              <th style={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user: User) => (
              <tr key={user.id} style={styles.tr}>
                <td style={styles.td}>{user.name}</td>
                <td style={styles.td}>{user.email}</td>
                <td style={styles.td}>{user.department.name}</td>
                <td style={styles.td}>
                  <span style={styles.roleBadge}>{ROLE_LABELS[user.role] || user.role}</span>
                </td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: user.isActive ? '#dcfce7' : '#fee2e2',
                      color: user.isActive ? '#166534' : '#dc2626',
                    }}
                  >
                    {user.isActive ? '启用' : '禁用'}
                  </span>
                </td>
                <td style={styles.td}>{new Date(user.createdAt).toLocaleDateString('zh-CN')}</td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button onClick={() => setEditingUser(user)} style={styles.editLink}>
                      编辑
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`确定要${user.isActive ? '禁用' : '启用'}用户 ${user.name} 吗？`)) {
                          toggleUserStatus({ variables: { id: user.id } });
                        }
                      }}
                      style={{
                        ...styles.editLink,
                        color: user.isActive ? '#dc2626' : '#16a34a',
                      }}
                    >
                      {user.isActive ? '禁用' : '启用'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`确定要重置用户 ${user.name} 的密码吗？`)) {
                          resetUserPassword({ variables: { id: user.id } });
                        }
                      }}
                      style={styles.editLink}
                    >
                      重置密码
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={styles.pageButton}
          >
            上一页
          </button>
          <span style={styles.pageInfo}>
            第 {page} / {totalPages} 页
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={styles.pageButton}
          >
            下一页
          </button>
        </div>
      )}

      {showCreateModal && (
        <UserModal
          departments={departments}
          onClose={() => setShowCreateModal(false)}
          onSubmit={async (data) => {
            await createUser({ variables: { input: data } });
          }}
        />
      )}

      {editingUser && (
        <UserModal
          user={editingUser}
          departments={departments}
          onClose={() => setEditingUser(null)}
          onSubmit={async (data) => {
            await updateUser({ variables: { id: editingUser.id, input: data } });
          }}
        />
      )}

      {resetPasswordResult && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.modal}>
            <div style={modalStyles.header}>
              <h2 style={modalStyles.title}>密码已重置</h2>
              <button onClick={() => setResetPasswordResult(null)} style={modalStyles.closeButton}>
                ×
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ marginBottom: '16px', color: '#374151' }}>
                用户密码已重置成功。请将以下临时密码告知用户：
              </p>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '18px',
                  textAlign: 'center',
                  color: '#1f2937',
                }}
              >
                {resetPasswordResult.password}
              </div>
              <p style={{ marginTop: '16px', color: '#6b7280', fontSize: '14px' }}>
                用户下次登录时将被强制修改密码。
              </p>
              <div style={{ marginTop: '24px', textAlign: 'right' }}>
                <button
                  onClick={() => setResetPasswordResult(null)}
                  style={modalStyles.submitButton}
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface UserModalProps {
  user?: User;
  departments: Department[];
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    email: string;
    role: string;
    departmentId: string;
  }) => Promise<void>;
}

function UserModal({ user, departments, onClose, onSubmit }: UserModalProps) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'USER',
    departmentId: user?.department.id || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.departmentId) {
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
          <h2 style={modalStyles.title}>{user ? '编辑用户' : '新建用户'}</h2>
          <button onClick={onClose} style={modalStyles.closeButton}>
            ×
          </button>
        </div>

        {error && <div style={modalStyles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={modalStyles.form}>
          <div style={modalStyles.field}>
            <label style={modalStyles.label}>姓名 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              style={modalStyles.input}
              required
            />
          </div>

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>邮箱 *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              style={modalStyles.input}
              required
              disabled={!!user}
            />
            {!user && (
              <span style={modalStyles.hint}>初始密码为: password123</span>
            )}
          </div>

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>部门 *</label>
            <select
              value={formData.departmentId}
              onChange={(e) => setFormData((prev) => ({ ...prev, departmentId: e.target.value }))}
              style={modalStyles.input}
              required
            >
              <option value="">请选择部门</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>角色 *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
              style={modalStyles.input}
              required
            >
              <option value="USER">普通用户</option>
              <option value="DEPT_ADMIN">部门管理员</option>
              <option value="ADMIN">系统管理员</option>
            </select>
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
  filterSelect: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
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
  roleBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '12px',
    backgroundColor: '#dbeafe',
    borderRadius: '4px',
    color: '#1e40af',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '12px',
    borderRadius: '4px',
  },
  editLink: {
    color: '#3b82f6',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    padding: '24px',
  },
  pageButton: {
    padding: '8px 16px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    background: '#fff',
    cursor: 'pointer',
  },
  pageInfo: {
    color: '#6b7280',
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

export default UsersPage;
