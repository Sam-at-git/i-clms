import { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuthStore } from '../../state/auth.state';

const GET_TAGS = gql`
  query GetTagsAdmin($includeInactive: Boolean!, $category: String) {
    tags(includeInactive: $includeInactive, category: $category) {
      id
      name
      category
      color
      isActive
      isSystem
      createdAt
      updatedAt
    }
    tagCategories
  }
`;

const CREATE_TAG = gql`
  mutation CreateTag($input: CreateTagInput!) {
    createTag(input: $input) {
      id
      name
      category
      color
    }
  }
`;

const UPDATE_TAG = gql`
  mutation UpdateTag($id: String!, $input: UpdateTagInput!) {
    updateTag(id: $id, input: $input) {
      id
      name
      category
      color
    }
  }
`;

const DELETE_TAG = gql`
  mutation DeleteTag($id: String!) {
    deleteTag(id: $id) {
      success
      message
    }
  }
`;

interface Tag {
  id: string;
  name: string;
  category: string;
  color: string;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TagsQueryResult {
  tags: Tag[];
  tagCategories: string[];
}

interface DeleteTagResult {
  deleteTag: {
    success: boolean;
    message: string;
  };
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export function TagsPage() {
  const { user: currentUser } = useAuthStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const { data, loading, error, refetch } = useQuery<TagsQueryResult>(GET_TAGS, {
    variables: { includeInactive: showInactive, category: categoryFilter || null },
  });

  const [createTag] = useMutation(CREATE_TAG, {
    onCompleted: () => {
      setShowCreateModal(false);
      refetch();
    },
  });

  const [updateTag] = useMutation(UPDATE_TAG, {
    onCompleted: () => {
      setEditingTag(null);
      refetch();
    },
  });

  const [deleteTag] = useMutation<DeleteTagResult>(DELETE_TAG, {
    onCompleted: (result) => {
      if (!result.deleteTag.success) {
        alert(result.deleteTag.message || '删除失败');
      }
      refetch();
    },
  });

  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'DEPT_ADMIN') {
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          <h2>访问受限</h2>
          <p>只有管理员可以访问标签管理功能</p>
        </div>
      </div>
    );
  }

  if (loading) return <div style={styles.loading}>加载中...</div>;
  if (error) return <div style={styles.error}>错误: {error.message}</div>;

  const tags = data?.tags || [];
  const categories = data?.tagCategories || [];

  // Group tags by category
  const tagsByCategory = tags.reduce((acc: Record<string, Tag[]>, tag: Tag) => {
    const cat = tag.category || '未分类';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tag);
    return acc;
  }, {});

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>标签管理</h1>
        <div style={styles.headerRight}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="">全部分类</option>
            {categories.map((cat: string) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <label style={styles.checkbox}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            显示已禁用
          </label>
          <span style={styles.stats}>共 {tags.length} 个标签</span>
          <button onClick={() => setShowCreateModal(true)} style={styles.createButton}>
            + 新建标签
          </button>
        </div>
      </div>

      {categoryFilter ? (
        // Flat list when filtered by category
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>标签</th>
                <th style={styles.th}>分类</th>
                <th style={styles.th}>来源</th>
                <th style={styles.th}>状态</th>
                <th style={styles.th}>创建时间</th>
                <th style={styles.th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag: Tag) => (
                <TagRow
                  key={tag.id}
                  tag={tag}
                  onEdit={() => setEditingTag(tag)}
                  onDelete={() => {
                    if (window.confirm(`确定要删除标签 ${tag.name} 吗？`)) {
                      deleteTag({ variables: { id: tag.id } });
                    }
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // Grouped by category
        Object.entries(tagsByCategory).map(([category, categoryTags]) => (
          <div key={category} style={styles.categorySection}>
            <h2 style={styles.categoryTitle}>{category}</h2>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>标签</th>
                    <th style={styles.th}>来源</th>
                    <th style={styles.th}>状态</th>
                    <th style={styles.th}>创建时间</th>
                    <th style={styles.th}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {(categoryTags as Tag[]).map((tag: Tag) => (
                    <TagRow
                      key={tag.id}
                      tag={tag}
                      hideCategory
                      onEdit={() => setEditingTag(tag)}
                      onDelete={() => {
                        if (window.confirm(`确定要删除标签 ${tag.name} 吗？`)) {
                          deleteTag({ variables: { id: tag.id } });
                        }
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {showCreateModal && (
        <TagModal
          categories={categories}
          onClose={() => setShowCreateModal(false)}
          onSubmit={async (data) => {
            await createTag({ variables: { input: data } });
          }}
        />
      )}

      {editingTag && (
        <TagModal
          tag={editingTag}
          categories={categories}
          onClose={() => setEditingTag(null)}
          onSubmit={async (data) => {
            await updateTag({ variables: { id: editingTag.id, input: data } });
          }}
        />
      )}
    </div>
  );
}

interface TagRowProps {
  tag: Tag;
  hideCategory?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function TagRow({ tag, hideCategory, onEdit, onDelete }: TagRowProps) {
  return (
    <tr style={styles.tr}>
      <td style={styles.td}>
        <span
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 500,
            backgroundColor: tag.color + '20',
            color: tag.color,
            border: `1px solid ${tag.color}40`,
          }}
        >
          {tag.name}
        </span>
      </td>
      {!hideCategory && <td style={styles.td}>{tag.category}</td>}
      <td style={styles.td}>
        <span style={tag.isSystem ? styles.systemBadge : styles.manualBadge}>
          {tag.isSystem ? '系统' : '手动'}
        </span>
      </td>
      <td style={styles.td}>
        <span
          style={{
            ...styles.statusBadge,
            backgroundColor: tag.isActive ? '#dcfce7' : '#fee2e2',
            color: tag.isActive ? '#166534' : '#dc2626',
          }}
        >
          {tag.isActive ? '启用' : '禁用'}
        </span>
      </td>
      <td style={styles.td}>{new Date(tag.createdAt).toLocaleDateString('zh-CN')}</td>
      <td style={styles.td}>
        <div style={styles.actions}>
          <button onClick={onEdit} style={styles.editLink}>
            编辑
          </button>
          <button onClick={onDelete} style={{ ...styles.editLink, color: '#dc2626' }}>
            删除
          </button>
        </div>
      </td>
    </tr>
  );
}

interface TagModalProps {
  tag?: Tag;
  categories: string[];
  onClose: () => void;
  onSubmit: (data: { name: string; category: string; color: string }) => Promise<void>;
}

function TagModal({ tag, categories, onClose, onSubmit }: TagModalProps) {
  const [formData, setFormData] = useState({
    name: tag?.name || '',
    category: tag?.category || '',
    color: tag?.color || PRESET_COLORS[0],
  });
  const [newCategory, setNewCategory] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const category = newCategory || formData.category;
    if (!formData.name || !category) {
      setError('请填写所有必填项');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ ...formData, category });
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
          <h2 style={modalStyles.title}>{tag ? '编辑标签' : '新建标签'}</h2>
          <button onClick={onClose} style={modalStyles.closeButton}>
            ×
          </button>
        </div>

        {error && <div style={modalStyles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={modalStyles.form}>
          <div style={modalStyles.field}>
            <label style={modalStyles.label}>标签名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              style={modalStyles.input}
              placeholder="如：高优先级"
              required
            />
          </div>

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>分类 *</label>
            <select
              value={formData.category}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, category: e.target.value }));
                setNewCategory('');
              }}
              style={modalStyles.input}
            >
              <option value="">选择分类或新建</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newCategory}
              onChange={(e) => {
                setNewCategory(e.target.value);
                setFormData((prev) => ({ ...prev, category: '' }));
              }}
              style={{ ...modalStyles.input, marginTop: '8px' }}
              placeholder="或输入新分类名称"
            />
          </div>

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>颜色</label>
            <div style={styles.colorPicker}>
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, color }))}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px',
                    backgroundColor: color,
                    border: formData.color === color ? '3px solid #1f2937' : '1px solid #d1d5db',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            <div style={{ marginTop: '12px' }}>
              <span style={modalStyles.hint}>预览：</span>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 500,
                  backgroundColor: formData.color + '20',
                  color: formData.color,
                  border: `1px solid ${formData.color}40`,
                  marginLeft: '8px',
                }}
              >
                {formData.name || '标签名称'}
              </span>
            </div>
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
  categorySection: {
    marginBottom: '32px',
  },
  categoryTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '2px solid #e5e7eb',
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
  systemBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '11px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
  },
  manualBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '11px',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    borderRadius: '4px',
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
  colorPicker: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
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
    fontSize: '12px',
    color: '#6b7280',
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

export default TagsPage;
