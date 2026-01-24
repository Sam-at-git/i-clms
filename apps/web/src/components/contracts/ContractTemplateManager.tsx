import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_CONTRACT_TEMPLATES,
  GET_CONTRACT_TEMPLATE,
  GET_TEMPLATE_CATEGORIES,
  CREATE_CONTRACT_TEMPLATE,
  UPDATE_CONTRACT_TEMPLATE,
  DELETE_CONTRACT_TEMPLATE,
} from '../../graphql/contract-templates';

interface ContractTemplateManagerProps {
  onCloneFromTemplate?: (templateId: string) => void;
  currentUserId: string;
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  STAFF_AUGMENTATION: '人力框架',
  PROJECT_OUTSOURCING: '项目外包',
  PRODUCT_SALES: '产品购销',
};

const CONTRACT_TYPE_COLORS: Record<string, string> = {
  STAFF_AUGMENTATION: '#3b82f6',
  PROJECT_OUTSOURCING: '#10b981',
  PRODUCT_SALES: '#8b5cf6',
};

export function ContractTemplateManager({
  onCloneFromTemplate,
  currentUserId,
}: ContractTemplateManagerProps) {
  // Query state
  const [filterType, setFilterType] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showInactive, setShowInactive] = useState<boolean>(false);

  // UI state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    category: '',
    type: 'STAFF_AUGMENTATION' as const,
    content: '',
    fileUrl: '',
    fileType: '',
    parameters: [] as any[],
    defaultValues: {},
    isActive: true,
    isSystem: false,
    version: '1.0',
    departmentId: '',
  });

  // Refs
  const createModalRef = useRef<HTMLDivElement>(null);
  const editModalRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: templatesData, loading, refetch } = useQuery(GET_CONTRACT_TEMPLATES, {
    variables: {
      type: filterType || undefined,
      category: filterCategory || undefined,
      isActive: showInactive ? undefined : true,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { data: categoriesData } = useQuery(GET_TEMPLATE_CATEGORIES);

  const { data: templateDetailData } = useQuery(GET_CONTRACT_TEMPLATE, {
    variables: { id: selectedTemplateId || '' },
    skip: !selectedTemplateId,
    fetchPolicy: 'cache-and-network',
  });

  // Mutations
  const [createTemplate, { loading: creating }] = useMutation(CREATE_CONTRACT_TEMPLATE, {
    onCompleted: () => {
      setShowCreateModal(false);
      resetForm();
      refetch();
      alert('模板创建成功');
    },
    onError: (error) => {
      alert(`创建失败: ${error.message}`);
    },
  });

  const [updateTemplate, { loading: updating }] = useMutation(UPDATE_CONTRACT_TEMPLATE, {
    onCompleted: () => {
      setShowEditModal(false);
      setSelectedTemplateId(null);
      resetForm();
      refetch();
      alert('模板更新成功');
    },
    onError: (error) => {
      alert(`更新失败: ${error.message}`);
    },
  });

  const [deleteTemplate, { loading: deleting }] = useMutation(DELETE_CONTRACT_TEMPLATE, {
    onCompleted: () => {
      setShowDeleteConfirm(false);
      setSelectedTemplateId(null);
      refetch();
      alert('模板删除成功');
    },
    onError: (error) => {
      alert(`删除失败: ${error.message}`);
    },
  });

  const templates = templatesData?.contractTemplates?.templates || [];
  const total = templatesData?.contractTemplates?.total || 0;
  const categories = categoriesData?.templateCategories || [];
  const selectedTemplate = templateDetailData?.contractTemplate;

  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      description: '',
      category: '',
      type: 'STAFF_AUGMENTATION',
      content: '',
      fileUrl: '',
      fileType: '',
      parameters: [],
      defaultValues: {},
      isActive: true,
      isSystem: false,
      version: '1.0',
      departmentId: '',
    });
  };

  const handleCreate = () => {
    createTemplate({
      variables: {
        input: {
          ...formData,
          parameters: formData.parameters.length > 0 ? formData.parameters : undefined,
          defaultValues: Object.keys(formData.defaultValues).length > 0 ? formData.defaultValues : undefined,
        },
      },
    });
  };

  const handleEdit = () => {
    if (!selectedTemplateId) return;

    updateTemplate({
      variables: {
        id: selectedTemplateId,
        input: {
          ...formData,
          parameters: formData.parameters.length > 0 ? formData.parameters : undefined,
          defaultValues: Object.keys(formData.defaultValues).length > 0 ? formData.defaultValues : undefined,
        },
      },
    });
  };

  const handleDelete = () => {
    if (!selectedTemplateId) return;

    deleteTemplate({
      variables: { id: selectedTemplateId },
    });
  };

  const openEditModal = (template: any) => {
    setSelectedTemplateId(template.id);
    setFormData({
      name: template.name,
      displayName: template.displayName || '',
      description: template.description || '',
      category: template.category || '',
      type: template.type,
      content: template.content || '',
      fileUrl: template.fileUrl || '',
      fileType: template.fileType || '',
      parameters: template.parameters || [],
      defaultValues: template.defaultValues || {},
      isActive: template.isActive,
      isSystem: template.isSystem,
      version: template.version || '1.0',
      departmentId: template.department?.id || '',
    });
    setShowEditModal(true);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>合同模板管理</h2>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          style={styles.createButton}
        >
          + 新建模板
        </button>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={styles.select}
        >
          <option value="">全部类型</option>
          {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={styles.select}
        >
          <option value="">全部分类</option>
          {categories.map((cat: string) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            style={styles.checkbox}
          />
          显示已停用
        </label>

        <div style={styles.stats}>
          共 {total} 个模板
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={styles.loading}>加载中...</div>
      )}

      {/* Template List */}
      {!loading && templates.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📄</div>
          <div style={styles.emptyText}>暂无模板</div>
          <div style={styles.emptySubtext}>
            点击"新建模板"创建第一个合同模板
          </div>
        </div>
      )}

      {!loading && templates.length > 0 && (
        <div style={styles.templateList}>
          {templates.map((template: any) => (
            <div key={template.id} style={styles.templateCard}>
              <div style={styles.templateHeader}>
                <div style={styles.templateTitle}>
                  {template.displayName || template.name}
                  {!template.isActive && (
                    <span style={styles.inactiveBadge}>已停用</span>
                  )}
                  {template.isSystem && (
                    <span style={styles.systemBadge}>系统</span>
                  )}
                </div>
                <div
                  style={{
                    ...styles.typeBadge,
                    backgroundColor: CONTRACT_TYPE_COLORS[template.type],
                  }}
                >
                  {CONTRACT_TYPE_LABELS[template.type]}
                </div>
              </div>

              {template.description && (
                <div style={styles.templateDescription}>
                  {template.description}
                </div>
              )}

              <div style={styles.templateMeta}>
                <span>版本: {template.version}</span>
                <span>使用次数: {template.usageCount}</span>
                {template.category && <span>分类: {template.category}</span>}
              </div>

              <div style={styles.templateFooter}>
                <div style={styles.templateAuthor}>
                  {template.createdBy?.name}
                </div>
                <div style={styles.templateActions}>
                  <button
                    onClick={() => {
                      setSelectedTemplateId(template.id);
                      setShowPreview(true);
                    }}
                    style={styles.actionButton}
                  >
                    预览
                  </button>
                  <button
                    onClick={() => openEditModal(template)}
                    style={styles.actionButton}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTemplateId(template.id);
                      if (onCloneFromTemplate) {
                        onCloneFromTemplate(template.id);
                      }
                    }}
                    style={styles.primaryActionButton}
                  >
                    使用
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTemplateId(template.id);
                      setShowDeleteConfirm(true);
                    }}
                    style={styles.deleteActionButton}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()} ref={createModalRef}>
            <h3 style={styles.modalTitle}>新建合同模板</h3>
            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>模板名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={styles.input}
                  placeholder="template-name"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>显示名称</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  style={styles.input}
                  placeholder="合同模板显示名称"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>合同类型 *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  style={styles.input}
                >
                  {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>分类</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={styles.input}
                  placeholder="例如: 标准合同、简易合同"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={styles.textarea}
                  rows={3}
                  placeholder="模板用途说明"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>模板内容 *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  style={styles.textarea}
                  rows={10}
                  placeholder="支持变量替换，如 {{contractNo}}, {{customerName}} 等"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>版本号</label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  style={styles.input}
                  placeholder="1.0"
                />
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={styles.cancelButton}
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                style={styles.confirmButton}
              >
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()} ref={editModalRef}>
            <h3 style={styles.modalTitle}>编辑合同模板</h3>
            <div style={styles.form}>
              {/* Same form fields as create modal */}
              <div style={styles.formGroup}>
                <label style={styles.label}>模板名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>显示名称</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={styles.textarea}
                  rows={3}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>模板内容</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  style={styles.textarea}
                  rows={10}
                />
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                onClick={() => setShowEditModal(false)}
                style={styles.cancelButton}
              >
                取消
              </button>
              <button
                onClick={handleEdit}
                disabled={updating}
                style={styles.confirmButton}
              >
                {updating ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div style={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>确认删除</h3>
            <p style={styles.confirmMessage}>
              确定要删除模板 "{selectedTemplate?.name}" 吗？此操作不可撤销。
            </p>
            <div style={styles.modalActions}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={styles.cancelButton}
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={styles.deleteConfirmButton}
              >
                {deleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <div style={styles.modalOverlay} onClick={() => setShowPreview(false)}>
          <div style={styles.previewModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>模板预览</h3>
              <button
                onClick={() => setShowPreview(false)}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>
            <div style={styles.previewContent}>
              <div style={styles.previewSection}>
                <h4 style={styles.previewSectionTitle}>基本信息</h4>
                <div style={styles.previewField}>
                  <span style={styles.previewLabel}>模板名称:</span>
                  <span style={styles.previewValue}>{selectedTemplate.name}</span>
                </div>
                <div style={styles.previewField}>
                  <span style={styles.previewLabel}>显示名称:</span>
                  <span style={styles.previewValue}>{selectedTemplate.displayName || '-'}</span>
                </div>
                <div style={styles.previewField}>
                  <span style={styles.previewLabel}>合同类型:</span>
                  <span style={styles.previewValue}>{CONTRACT_TYPE_LABELS[selectedTemplate.type]}</span>
                </div>
                <div style={styles.previewField}>
                  <span style={styles.previewLabel}>版本:</span>
                  <span style={styles.previewValue}>{selectedTemplate.version}</span>
                </div>
                {selectedTemplate.category && (
                  <div style={styles.previewField}>
                    <span style={styles.previewLabel}>分类:</span>
                    <span style={styles.previewValue}>{selectedTemplate.category}</span>
                  </div>
                )}
              </div>

              {selectedTemplate.description && (
                <div style={styles.previewSection}>
                  <h4 style={styles.previewSectionTitle}>描述</h4>
                  <p style={styles.previewText}>{selectedTemplate.description}</p>
                </div>
              )}

              {selectedTemplate.content && (
                <div style={styles.previewSection}>
                  <h4 style={styles.previewSectionTitle}>模板内容</h4>
                  <pre style={styles.previewCode}>{selectedTemplate.content}</pre>
                </div>
              )}

              {selectedTemplate.parameters && selectedTemplate.parameters.length > 0 && (
                <div style={styles.previewSection}>
                  <h4 style={styles.previewSectionTitle}>参数定义</h4>
                  <div style={styles.parametersList}>
                    {(selectedTemplate.parameters as any[]).map((param, idx) => (
                      <div key={idx} style={styles.parameterItem}>
                        <strong>{param.label}</strong> ({param.name})
                        {param.required && <span style={styles.requiredMark}> *</span>}
                        <div style={styles.parameterType}>类型: {param.type}</div>
                        {param.defaultValue && (
                          <div style={styles.parameterDefault}>默认值: {param.defaultValue}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={styles.previewSection}>
                <h4 style={styles.previewSectionTitle}>使用统计</h4>
                <div style={styles.previewField}>
                  <span style={styles.previewLabel}>使用次数:</span>
                  <span style={styles.previewValue}>{selectedTemplate.usageCount}</span>
                </div>
                {selectedTemplate.lastUsedAt && (
                  <div style={styles.previewField}>
                    <span style={styles.previewLabel}>最后使用:</span>
                    <span style={styles.previewValue}>
                      {new Date(selectedTemplate.lastUsedAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                )}
                <div style={styles.previewField}>
                  <span style={styles.previewLabel}>创建时间:</span>
                  <span style={styles.previewValue}>
                    {new Date(selectedTemplate.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
  },
  createButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  filters: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    flexWrap: 'wrap',
  },
  select: {
    padding: '6px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },
  checkbox: {
    cursor: 'pointer',
  },
  stats: {
    marginLeft: 'auto',
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: 500,
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#374151',
    fontWeight: 500,
    marginBottom: '8px',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#6b7280',
  },
  templateList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  templateCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '16px',
    backgroundColor: '#fff',
    transition: 'box-shadow 0.2s',
    cursor: 'pointer',
  },
  templateHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  templateTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  inactiveBadge: {
    padding: '2px 6px',
    fontSize: '11px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    borderRadius: '3px',
  },
  systemBadge: {
    padding: '2px 6px',
    fontSize: '11px',
    color: '#7c3aed',
    backgroundColor: '#ede9fe',
    borderRadius: '3px',
  },
  typeBadge: {
    padding: '4px 8px',
    fontSize: '12px',
    color: '#fff',
    borderRadius: '4px',
    fontWeight: 500,
  },
  templateDescription: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '12px',
    lineHeight: '1.5',
  },
  templateMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: '#9ca3af',
    marginBottom: '12px',
  },
  templateFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid #f3f4f6',
  },
  templateAuthor: {
    fontSize: '13px',
    color: '#6b7280',
  },
  templateActions: {
    display: 'flex',
    gap: '6px',
  },
  actionButton: {
    padding: '4px 10px',
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  primaryActionButton: {
    padding: '4px 10px',
    fontSize: '12px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  deleteActionButton: {
    padding: '4px 10px',
    fontSize: '12px',
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '24px',
    minWidth: '500px',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  modalTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    outline: 'none',
  },
  textarea: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px',
  },
  cancelButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  confirmButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  confirmModal: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '24px',
    minWidth: '400px',
    maxWidth: '500px',
  },
  confirmMessage: {
    margin: '0 0 20px 0',
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.5',
  },
  deleteConfirmButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  previewModal: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
  },
  closeButton: {
    padding: '4px 8px',
    fontSize: '18px',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  previewContent: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
  },
  previewSection: {
    marginBottom: '24px',
  },
  previewSectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
  },
  previewField: {
    display: 'flex',
    marginBottom: '8px',
    fontSize: '14px',
  },
  previewLabel: {
    width: '100px',
    color: '#6b7280',
    fontWeight: 500,
  },
  previewValue: {
    flex: 1,
    color: '#111827',
  },
  previewText: {
    margin: 0,
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.6',
  },
  previewCode: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    padding: '12px',
    fontSize: '13px',
    color: '#374151',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowX: 'auto',
  },
  parametersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  parameterItem: {
    padding: '8px 12px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
    fontSize: '13px',
  },
  requiredMark: {
    color: '#ef4444',
    marginLeft: '4px',
  },
  parameterType: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
  },
  parameterDefault: {
    fontSize: '12px',
    color: '#6b7280',
  },
};

export default ContractTemplateManager;
