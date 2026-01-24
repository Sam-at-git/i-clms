import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';

interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  size: 'small' | 'medium' | 'large' | 'wide';
  position: { row: number; col: number };
  minimized?: boolean;
}

interface DashboardPreset {
  id: string;
  name: string;
  description?: string;
  layout: DashboardWidget[];
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface DashboardPresetsProps {
  currentLayout: DashboardWidget[];
  onApplyPreset: (layout: DashboardWidget[]) => void;
  currentUserId: string;
  department?: string;
}

// Mock GraphQL operations (replace with actual queries/mutations)
const GET_PRESETS = `
  query GetDashboardPresets($userId: String!, $department: String) {
    dashboardPresets(userId: $userId, department: $department) {
      id
      name
      description
      layout
      isDefault
      createdAt
      updatedAt
    }
  }
`;

const SAVE_PRESET = `
  mutation SaveDashboardPreset($input: SaveDashboardPresetInput!) {
    saveDashboardPreset(input: $input) {
      id
      name
      description
      layout
      isDefault
      createdAt
      updatedAt
    }
  }
`;

const DELETE_PRESET = `
  mutation DeleteDashboardPreset($id: ID!) {
    deleteDashboardPreset(id: $id)
  }
`;

const SET_DEFAULT_PRESET = `
  mutation SetDefaultPreset($id: ID!) {
    setDefaultPreset(id: $id) {
      id
      name
      isDefault
    }
  }
`;

export function DashboardPresets({
  currentLayout,
  onApplyPreset,
  currentUserId,
  department,
}: DashboardPresetsProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showPresetsPanel, setShowPresetsPanel] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<DashboardPreset | null>(null);
  const [previewPreset, setPreviewPreset] = useState<DashboardPreset | null>(null);

  // Query presets
  const { data, loading, refetch } = useQuery(GET_PRESETS, {
    variables: { userId: currentUserId, department },
    fetchPolicy: 'cache-and-network',
  });

  // Mutations
  const [savePreset, { loading: saving }] = useMutation(SAVE_PRESET, {
    onCompleted: (data) => {
      alert(`预设 "${data.saveDashboardPreset.name}" 保存成功`);
      setShowSaveDialog(false);
      setPresetName('');
      setPresetDescription('');
      refetch();
    },
    onError: (error) => {
      alert(`保存失败: ${error.message}`);
    },
  });

  const [deletePresetMutation] = useMutation(DELETE_PRESET, {
    onCompleted: () => {
      alert('预设已删除');
      refetch();
      setSelectedPreset(null);
    },
    onError: (error) => {
      alert(`删除失败: ${error.message}`);
    },
  });

  const [setDefaultPreset] = useMutation(SET_DEFAULT_PRESET, {
    onCompleted: () => {
      refetch();
    },
    onError: (error) => {
      alert(`设置失败: ${error.message}`);
    },
  });

  const presets = data?.dashboardPresets || [];

  // Handle save preset
  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) {
      alert('请输入预设名称');
      return;
    }

    savePreset({
      variables: {
        input: {
          name: presetName,
          description: presetDescription,
          layout: currentLayout,
          userId: currentUserId,
          department,
        },
      },
    });
  }, [presetName, presetDescription, currentLayout, currentUserId, department, savePreset]);

  // Handle apply preset
  const handleApplyPreset = useCallback(
    (preset: DashboardPreset) => {
      if (
        confirm(
          `应用预设 "${preset.name}" 将替换当前布局。确定要继续吗？`
        )
      ) {
        onApplyPreset(preset.layout);
        setShowPresetsPanel(false);
        alert(`已应用预设 "${preset.name}"`);
      }
    },
    [onApplyPreset]
  );

  // Handle delete preset
  const handleDeletePreset = useCallback(
    (preset: DashboardPreset) => {
      if (
        confirm(`确定要删除预设 "${preset.name}" 吗？此操作不可撤销。`)
      ) {
        deletePresetMutation({ variables: { id: preset.id } });
      }
    },
    [deletePresetMutation]
  );

  // Handle set default
  const handleSetDefault = useCallback(
    (preset: DashboardPreset) => {
      setDefaultPreset({ variables: { id: preset.id } });
    },
    [setDefaultPreset]
  );

  // Handle preview preset
  const handlePreviewPreset = useCallback((preset: DashboardPreset) => {
    setPreviewPreset(preset);
  }, []);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h3 style={styles.title}>仪表盘预设</h3>
          <span style={styles.subtitle}>
            {presets.length} 个可用预设
          </span>
        </div>

        <div style={styles.headerActions}>
          <button
            onClick={() => setShowPresetsPanel(!showPresetsPanel)}
            style={styles.presetsButton}
          >
            {showPresetsPanel ? '隐藏预设' : '管理预设'}
          </button>
          <button
            onClick={() => setShowSaveDialog(true)}
            style={styles.saveButton}
          >
            + 保存当前布局
          </button>
        </div>
      </div>

      {/* Save Preset Dialog */}
      {showSaveDialog && (
        <div
          style={styles.modalOverlay}
          onClick={() => setShowSaveDialog(false)}
        >
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>保存当前布局为预设</h3>

            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  预设名称 <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  style={styles.input}
                  placeholder="例如：销售仪表盘布局"
                  maxLength={50}
                />
                <div style={styles.charCount}>{presetName.length}/50</div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>描述</label>
                <textarea
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  style={styles.textarea}
                  placeholder="简要描述此预设的用途和特点"
                  rows={3}
                  maxLength={200}
                />
                <div style={styles.charCount}>{presetDescription.length}/200</div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>当前布局信息</label>
                <div style={styles.layoutInfo}>
                  <span style={styles.layoutInfoItem}>
                    组件数量: {currentLayout.length}
                  </span>
                  <span style={styles.layoutInfoItem}>
                    部门: {department || '全局'}
                  </span>
                </div>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                onClick={() => setShowSaveDialog(false)}
                style={styles.cancelButton}
              >
                取消
              </button>
              <button
                onClick={handleSavePreset}
                disabled={saving || !presetName.trim()}
                style={{
                  ...styles.confirmButton,
                  ((saving || !presetName.trim()) && styles.buttonDisabled),
                }}
              >
                {saving ? '保存中...' : '保存预设'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Presets Panel */}
      {showPresetsPanel && (
        <div style={styles.presetsPanel}>
          {loading && (
            <div style={styles.loading}>加载中...</div>
          )}

          {!loading && presets.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📋</div>
              <div style={styles.emptyText}>暂无保存的预设</div>
              <div style={styles.emptySubtext}>
                点击"保存当前布局"创建第一个预设
              </div>
            </div>
          )}

          {!loading && presets.length > 0 && (
            <div style={styles.presetsList}>
              {presets.map((preset: DashboardPreset) => (
                <div
                  key={preset.id}
                  style={{
                    ...styles.presetCard,
                    ...(selectedPreset?.id === preset.id && styles.presetCardSelected),
                  }}
                  onClick={() => setSelectedPreset(preset)}
                >
                  {/* Preset Header */}
                  <div style={styles.presetHeader}>
                    <div style={styles.presetTitleRow}>
                      <h4 style={styles.presetName}>{preset.name}</h4>
                      {preset.isDefault && (
                        <span style={styles.defaultBadge}>默认</span>
                      )}
                    </div>
                    <div style={styles.presetMeta}>
                      <span style={styles.presetMetaItem}>
                        {preset.layout?.length || 0} 个组件
                      </span>
                      <span style={styles.presetMetaItem}>
                        {new Date(preset.updatedAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>

                  {/* Preset Description */}
                  {preset.description && (
                    <div style={styles.presetDescription}>
                      {preset.description}
                    </div>
                  )}

                  {/* Preset Actions */}
                  <div style={styles.presetActions}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyPreset(preset);
                      }}
                      style={styles.applyButton}
                    >
                      应用此预设
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewPreset(preset);
                      }}
                      style={styles.previewButton}
                    >
                      预览
                    </button>
                    {!preset.isDefault && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(preset);
                        }}
                        style={styles.setDefaultButton}
                      >
                        设为默认
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`确定要删除预设 "${preset.name}" 吗？`)) {
                          handleDeletePreset(preset);
                        }
                      }}
                      style={styles.deleteButton}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewPreset && (
        <div
          style={styles.modalOverlay}
          onClick={() => setPreviewPreset(null)}
        >
          <div
            style={{ ...styles.modal, ...styles.previewModal }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.previewHeader}>
              <h3 style={styles.previewTitle}>
                预览: {previewPreset.name}
              </h3>
              <button
                onClick={() => setPreviewPreset(null)}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>

            <div style={styles.previewContent}>
              <div style={styles.previewInfo}>
                <div style={styles.previewInfoItem}>
                  <span style={styles.previewLabel}>组件数量:</span>
                  <span style={styles.previewValue}>
                    {previewPreset.layout?.length || 0}
                  </span>
                </div>
                {previewPreset.description && (
                  <div style={styles.previewInfoItem}>
                    <span style={styles.previewLabel}>描述:</span>
                    <span style={styles.previewValue}>
                      {previewPreset.description}
                    </span>
                  </div>
                )}
                <div style={styles.previewInfoItem}>
                  <span style={styles.previewLabel}>最后更新:</span>
                  <span style={styles.previewValue}>
                    {new Date(previewPreset.updatedAt).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>

              <div style={styles.previewLayout}>
                <h4 style={styles.previewSectionTitle}>布局预览</h4>
                <div style={styles.previewGrid}>
                  {previewPreset.layout?.map((widget) => (
                    <div
                      key={widget.id}
                      style={{
                        ...styles.previewWidget,
                        width: `${WIDGET_SIZES[widget.size].width * 80 - 16}px`,
                        height: `${WIDGET_SIZES[widget.size].height * 60 - 16}px`,
                      }}
                    >
                      <div style={styles.previewWidgetTitle}>
                        {widget.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={styles.previewActions}>
              <button
                onClick={() => {
                  handleApplyPreset(previewPreset);
                  setPreviewPreset(null);
                }}
                style={styles.applyButton}
              >
                应用此预设
              </button>
              <button
                onClick={() => setPreviewPreset(null)}
                style={styles.cancelButton}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const WIDGET_SIZES = {
  small: { width: 1, height: 1 },
  medium: { width: 2, height: 2 },
  large: { width: 2, height: 3 },
  wide: { width: 3, height: 1 },
};

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
  headerActions: {
    display: 'flex',
    gap: '8px',
  },
  presetsButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
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
  },
  previewModal: {
    minWidth: '700px',
    maxWidth: '900px',
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
  charCount: {
    fontSize: '12px',
    color: '#9ca3af',
    textAlign: 'right',
  },
  layoutInfo: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
    display: 'flex',
    gap: '16px',
  },
  layoutInfoItem: {
    fontSize: '13px',
    color: '#6b7280',
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
  presetsPanel: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
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
  presetsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  presetCard: {
    padding: '16px',
    backgroundColor: '#fff',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  presetCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  presetHeader: {
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #f3f4f6',
  },
  presetTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  presetName: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  },
  defaultBadge: {
    padding: '2px 8px',
    fontSize: '11px',
    color: '#fff',
    backgroundColor: '#10b981',
    borderRadius: '3px',
    fontWeight: 500,
  },
  presetMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: '#6b7280',
  },
  presetMetaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  presetDescription: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '12px',
    lineHeight: '1.5',
  },
  presetActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  applyButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  previewButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  setDefaultButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#059669',
    backgroundColor: '#ecfdf5',
    border: '1px solid #10b981',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    border: '1px solid #ef4444',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  previewTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  closeButton: {
    padding: '6px 12px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  previewContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '20px',
  },
  previewInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
  },
  previewInfoItem: {
    fontSize: '13px',
    display: 'flex',
    gap: '8px',
  },
  previewLabel: {
    color: '#6b7280',
    fontWeight: 500,
  },
  previewValue: {
    color: '#111827',
  },
  previewLayout: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
  },
  previewSectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
  },
  previewGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  previewWidget: {
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewWidgetTitle: {
    fontSize: '11px',
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: 500,
  },
  previewActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
};

export default DashboardPresets;
