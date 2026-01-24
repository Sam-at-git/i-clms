import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@apollo/client';

interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  config: {
    fields: string[];
    filters: any[];
    chart: {
      type: string;
      xAxis?: string;
      yAxis?: string;
    };
    sortBy?: { field: string; order: string };
  };
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  usageCount?: number;
}

interface ReportTemplateManagerProps {
  onLoadTemplate?: (template: ReportTemplate) => void;
  currentUserId: string;
}

// Mock GraphQL operations
const GET_TEMPLATES = `
  query GetReportTemplates($userId: String!) {
    reportTemplates(userId: $userId) {
      id
      name
      description
      config
      isPublic
      createdBy
      createdAt
      usageCount
    }
  }
`;

const SAVE_TEMPLATE = `
  mutation SaveReportTemplate($input: SaveReportTemplateInput!) {
    saveReportTemplate(input: $input) {
      id
      name
      description
    }
  }
`;

const UPDATE_TEMPLATE = `
  mutation UpdateReportTemplate($id: ID!, $input: UpdateReportTemplateInput!) {
    updateReportTemplate(id: $id, input: $input) {
      id
      name
    }
  }
`;

const DELETE_TEMPLATE = `
  mutation DeleteReportTemplate($id: ID!) {
    deleteReportTemplate(id: $id)
  }
`;

const CLONE_TEMPLATE = `
  mutation CloneReportTemplate($id: ID!) {
    cloneReportTemplate(id: $id) {
      id
      name
    }
  }
`;

export function ReportTemplateManager({
  onLoadTemplate,
  currentUserId,
}: ReportTemplateManagerProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false,
  });

  const [currentConfig, setCurrentConfig] = useState<any>(null);

  // Query
  const { data, loading, refetch } = useQuery(GET_TEMPLATES, {
    variables: { userId: currentUserId },
    fetchPolicy: 'cache-and-network',
  });

  // Mutations
  const [saveTemplate, { loading: saving }] = useMutation(SAVE_TEMPLATE, {
    onCompleted: () => {
      alert('模板保存成功');
      setShowSaveDialog(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      alert(`保存失败: ${error.message}`);
    },
  });

  const [updateTemplate, { loading: updating }] = useMutation(UPDATE_TEMPLATE, {
    onCompleted: () => {
      alert('模板更新成功');
      setEditingTemplate(null);
      refetch();
    },
    onError: (error) => {
      alert(`更新失败: ${error.message}`);
    },
  });

  const [deleteTemplate] = useMutation(DELETE_TEMPLATE, {
    onCompleted: () => {
      alert('模板已删除');
      refetch();
    },
    onError: (error) => {
      alert(`删除失败: ${error.message}`);
    },
  });

  const [cloneTemplate] = useMutation(CLONE_TEMPLATE, {
    onCompleted: () => {
      alert('模板已复制');
      refetch();
    },
    onError: (error) => {
      alert(`复制失败: ${error.message}`);
    },
  });

  const templates = data?.reportTemplates || [];

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      isPublic: false,
    });
    setCurrentConfig(null);
  };

  const handleSaveNew = useCallback(() => {
    if (!formData.name.trim()) {
      alert('请输入模板名称');
      return;
    }
    if (!currentConfig) {
      alert('没有可保存的配置');
      return;
    }

    saveTemplate({
      variables: {
        input: {
          name: formData.name,
          description: formData.description,
          config: currentConfig,
          isPublic: formData.isPublic,
        },
      },
    });
  }, [formData, currentConfig, saveTemplate]);

  const handleUpdate = useCallback(() => {
    if (!editingTemplate) return;

    updateTemplate({
      variables: {
        id: editingTemplate.id,
        input: {
          name: formData.name,
          description: formData.description,
          isPublic: formData.isPublic,
        },
      },
    });
  }, [editingTemplate, formData, updateTemplate]);

  const handleLoad = useCallback(
    (template: ReportTemplate) => {
      if (onLoadTemplate) {
        onLoadTemplate(template);
        alert(`已加载模板: ${template.name}`);
      }
    },
    [onLoadTemplate]
  );

  const handleDelete = useCallback(
    (template: ReportTemplate) => {
      const canDelete = template.createdBy === currentUserId;
      if (!canDelete) {
        alert('您只能删除自己创建的模板');
        return;
      }

      if (confirm(`确定要删除模板 "${template.name}" 吗？`)) {
        deleteTemplate({ variables: { id: template.id } });
      }
    },
    [currentUserId, deleteTemplate]
  );

  const handleClone = useCallback(
    (template: ReportTemplate) => {
      cloneTemplate({ variables: { id: template.id } });
    },
    [cloneTemplate]
  );

  const handleEdit = useCallback((template: ReportTemplate) => {
    const canEdit = template.createdBy === currentUserId || template.isPublic;
    if (!canEdit) {
      alert('您只能编辑自己创建的模板或公开模板');
      return;
    }

    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      isPublic: template.isPublic,
    });
  }, [currentUserId]);

  const handleSetCurrentConfig = (config: any) => {
    setCurrentConfig(config);
    setShowSaveDialog(true);
  };

  // Expose method to save current config (can be called from parent)
  (window as any).saveReportAsTemplate = handleSetCurrentConfig;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h3 style={styles.title}>报表模板</h3>
          <span style={styles.subtitle}>{templates.length} 个可用模板</span>
        </div>
        <button onClick={() => setShowSaveDialog(true)} style={styles.saveButton}>
          + 保存当前为模板
        </button>
      </div>

      {/* Template Categories */}
      <div style={styles.categories}>
        <button style={{ ...styles.categoryButton, ...styles.categoryButtonActive }}>
          全部 ({templates.length})
        </button>
        <button style={styles.categoryButton}>
          我的模板 ({templates.filter((t: ReportTemplate) => t.createdBy === currentUserId).length})
        </button>
        <button style={styles.categoryButton}>
          公共模板 ({templates.filter((t: ReportTemplate) => t.isPublic).length})
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={styles.loading}>加载中...</div>
      )}

      {/* Empty State */}
      {!loading && templates.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📋</div>
          <div style={styles.emptyText}>暂无报表模板</div>
          <div style={styles.emptySubtext}>
            生成报表后可保存为模板以便重复使用
          </div>
        </div>
      )}

      {/* Template List */}
      {!loading && templates.length > 0 && (
        <div style={styles.templateGrid}>
          {templates.map((template: ReportTemplate) => {
            const isOwner = template.createdBy === currentUserId;

            return (
              <div
                key={template.id}
                style={{
                  ...styles.templateCard,
                  ...(selectedTemplate?.id === template.id && styles.templateCardSelected),
                }}
              >
                {/* Template Header */}
                <div style={styles.templateHeader}>
                  <div style={styles.templateTitleRow}>
                    <h4 style={styles.templateName}>{template.name}</h4>
                    {template.isPublic && (
                      <span style={styles.publicBadge}>公开</span>
                    )}
                  </div>
                  {template.description && (
                    <div style={styles.templateDescription}>{template.description}</div>
                  )}
                </div>

                {/* Template Info */}
                <div style={styles.templateInfo}>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>字段数:</span>
                    <span style={styles.infoValue}>{template.config.fields?.length || 0}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>图表:</span>
                    <span style={styles.infoValue}>{template.config.chart?.type || 'table'}</span>
                  </div>
                  {template.usageCount !== undefined && (
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>使用次数:</span>
                      <span style={styles.infoValue}>{template.usageCount}</span>
                    </div>
                  )}
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>创建者:</span>
                    <span style={styles.infoValue}>
                      {isOwner ? '我' : template.createdBy}
                    </span>
                  </div>
                </div>

                {/* Template Actions */}
                <div style={styles.templateActions}>
                  <button
                    onClick={() => handleLoad(template)}
                    style={styles.loadButton}
                  >
                    📂 加载
                  </button>
                  <button
                    onClick={() => handleEdit(template)}
                    style={styles.editButton}
                    disabled={!isOwner && !template.isPublic}
                  >
                    ✏️ 编辑
                  </button>
                  <button
                    onClick={() => handleClone(template)}
                    style={styles.cloneButton}
                  >
                    📋 复制
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => handleDelete(template)}
                      style={styles.deleteButton}
                    >
                      🗑️ 删除
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && !editingTemplate && (
        <div style={styles.modalOverlay} onClick={() => setShowSaveDialog(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>保存为报表模板</h3>

            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  模板名称 <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={styles.input}
                  placeholder="例如：月度销售分析模板"
                  maxLength={50}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={styles.textarea}
                  rows={3}
                  placeholder="简要描述此模板的用途和特点"
                  maxLength={200}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.switchRow}>
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                    style={styles.checkbox}
                  />
                  <span style={styles.switchLabel}>公开模板（其他用户可见）</span>
                </label>
              </div>

              {currentConfig && (
                <div style={styles.configPreview}>
                  <div style={styles.previewTitle}>配置预览:</div>
                  <div style={styles.previewContent}>
                    <span>字段: {currentConfig.fields?.length || 0} 个</span>
                    <span>图表: {currentConfig.chart?.type || 'table'}</span>
                    {currentConfig.filters && currentConfig.filters.length > 0 && (
                      <span>筛选: {currentConfig.filters.length} 个</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={styles.modalActions}>
              <button onClick={() => setShowSaveDialog(false)} style={styles.cancelButton}>
                取消
              </button>
              <button
                onClick={handleSaveNew}
                disabled={saving || !formData.name.trim()}
                style={{
                  ...styles.confirmButton,
                  ((saving || !formData.name.trim()) && styles.buttonDisabled),
                }}
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editingTemplate && (
        <div style={styles.modalOverlay} onClick={() => setEditingTemplate(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>编辑模板</h3>

            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  模板名称 <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={styles.input}
                  maxLength={50}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={styles.textarea}
                  rows={3}
                  maxLength={200}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.switchRow}>
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                    style={styles.checkbox}
                  />
                  <span style={styles.switchLabel}>公开模板</span>
                </label>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button onClick={() => setEditingTemplate(null)} style={styles.cancelButton}>
                取消
              </button>
              <button
                onClick={handleUpdate}
                disabled={updating || !formData.name.trim()}
                style={{
                  ...styles.confirmButton,
                  ((updating || !formData.name.trim()) && styles.buttonDisabled),
                }}
              >
                {updating ? '更新中...' : '更新'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '20px',
    marginBottom: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  subtitle: {
    fontSize: '13px',
    color: '#6b7280',
  },
  saveButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  categories: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e5e7eb',
  },
  categoryButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  categoryButtonActive: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    borderColor: '#3b82f6',
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
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  templateCard: {
    padding: '16px',
    backgroundColor: '#fff',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  templateCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  templateHeader: {
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #f3f4f6',
  },
  templateTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  templateName: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 600,
    color: '#111827',
  },
  publicBadge: {
    padding: '2px 6px',
    fontSize: '10px',
    color: '#fff',
    backgroundColor: '#10b981',
    borderRadius: '3px',
    fontWeight: 500,
  },
  templateDescription: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: '1.4',
  },
  templateInfo: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '12px',
    fontSize: '12px',
  },
  infoItem: {
    display: 'flex',
    gap: '4px',
  },
  infoLabel: {
    color: '#9ca3af',
  },
  infoValue: {
    color: '#374151',
    fontWeight: 500,
  },
  templateActions: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  loadButton: {
    padding: '6px 10px',
    fontSize: '12px',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  editButton: {
    padding: '6px 10px',
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cloneButton: {
    padding: '6px 10px',
    fontSize: '12px',
    color: '#059669',
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '6px 10px',
    fontSize: '12px',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '4px',
    cursor: 'pointer',
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
    minWidth: '450px',
    maxWidth: '550px',
  },
  modalTitle: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
  },
  textarea: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  switchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  switchLabel: {
    fontSize: '14px',
    color: '#374151',
  },
  configPreview: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
    border: '1px solid #e5e7eb',
  },
  previewTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: '6px',
  },
  previewContent: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: '#374151',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
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
    fontWeight: 500,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
};

export default ReportTemplateManager;
