import { useState, useCallback, useRef, useEffect } from 'react';

interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  size: 'small' | 'medium' | 'large' | 'wide';
  position: { row: number; col: number };
  minimized?: boolean;
}

interface DashboardCustomizerProps {
  widgets: DashboardWidget[];
  layout: DashboardWidget[];
  onLayoutChange: (layout: DashboardWidget[]) => void;
  onSave?: (layout: DashboardWidget[]) => void;
  maxColumns?: number;
  enabled?: boolean;
}

const WIDGET_SIZES = {
  small: { width: 1, height: 1, label: '小' },
  medium: { width: 2, height: 2, label: '中' },
  large: { width: 2, height: 3, label: '大' },
  wide: { width: 3, height: 1, label: '宽' },
};

const AVAILABLE_WIDGETS = [
  { id: 'revenue-chart', type: 'chart', title: '收入趋势', defaultSize: 'wide' as const },
  { id: 'contract-status', type: 'stats', title: '合同状态', defaultSize: 'medium' as const },
  { id: 'upcoming-milestones', type: 'list', title: '即将到期里程碑', defaultSize: 'medium' as const },
  { id: 'recent-activities', type: 'list', title: '最近动态', defaultSize: 'medium' as const },
  { id: 'team-performance', type: 'chart', title: '团队绩效', defaultSize: 'large' as const },
  { id: 'customer-rankings', type: 'table', title: '客户排行', defaultSize: 'large' as const },
  { id: 'payment-summary', type: 'stats', title: '付款汇总', defaultSize: 'small' as const },
  { id: 'risk-alerts', type: 'alert', title: '风险告警', defaultSize: 'small' as const },
];

export function DashboardCustomizer({
  widgets,
  layout,
  onLayoutChange,
  onSave,
  maxColumns = 4,
  enabled = true,
}: DashboardCustomizerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<DashboardWidget | null>(null);
  const [dragOverWidget, setDragOverWidget] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingWidget, setResizingWidget] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);

  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef<{ x: number; y: number } | null>(null);

  // Calculate grid layout
  const calculateGridPosition = useCallback(
    (widget: DashboardWidget, index: number) => {
      const size = WIDGET_SIZES[widget.size];
      return {
        gridRow: `${widget.position.row} / span ${size.height}`,
        gridColumn: `${widget.position.col} / span ${size.width}`,
      };
    },
    []
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (e: React.DragEvent, widget: DashboardWidget) => {
      if (!enabled) return;

      setIsDragging(true);
      setDraggedWidget(widget);
      dragStartPos.current = { x: e.clientX, y: e.clientY };

      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', widget.id);
    },
    [enabled]
  );

  // Handle drag over
  const handleDragOver = useCallback(
    (e: React.DragEvent, targetWidget: DashboardWidget) => {
      if (!enabled || !draggedWidget) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      if (targetWidget.id !== draggedWidget.id) {
        setDragOverWidget(targetWidget.id);
      }
    },
    [enabled, draggedWidget]
  );

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setDragOverWidget(null);
  }, []);

  // Handle drop
  const handleDrop = useCallback(
    (e: React.DragEvent, targetWidget: DashboardWidget) => {
      e.preventDefault();
      if (!enabled || !draggedWidget || draggedWidget.id === targetWidget.id) {
        setDragOverWidget(null);
        setIsDragging(false);
        setDraggedWidget(null);
        return;
      }

      // Swap positions
      const newLayout = layout.map((w) => {
        if (w.id === draggedWidget.id) {
          return { ...w, position: { ...targetWidget.position } };
        }
        if (w.id === targetWidget.id) {
          return { ...w, position: { ...draggedWidget.position } };
        }
        return w;
      });

      onLayoutChange(newLayout);
      setDragOverWidget(null);
      setIsDragging(false);
      setDraggedWidget(null);
    },
    [enabled, draggedWidget, layout, onLayoutChange]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggedWidget(null);
    setDragOverWidget(null);
  }, []);

  // Handle resize
  const handleResize = useCallback(
    (widgetId: string, newSize: 'small' | 'medium' | 'large' | 'wide') => {
      const newLayout = layout.map((w) => {
        if (w.id === widgetId) {
          return { ...w, size: newSize };
        }
        return w;
      });
      onLayoutChange(newLayout);
    },
    [layout, onLayoutChange]
  );

  // Handle toggle minimize
  const handleToggleMinimize = useCallback(
    (widgetId: string) => {
      const newLayout = layout.map((w) => {
        if (w.id === widgetId) {
          return { ...w, minimized: !w.minimized };
        }
        return w;
      });
      onLayoutChange(newLayout);
    },
    [layout, onLayoutChange]
  );

  // Handle remove widget
  const handleRemoveWidget = useCallback(
    (widgetId: string) => {
      const newLayout = layout.filter((w) => w.id !== widgetId);
      onLayoutChange(newLayout);
      setSelectedWidget(null);
    },
    [layout, onLayoutChange]
  );

  // Handle add widget
  const handleAddWidget = useCallback(
    (widgetTemplate: { id: string; type: string; title: string; defaultSize: 'small' | 'medium' | 'large' | 'wide' }) => {
      // Find first available position
      const maxRow = Math.max(...layout.map((w) => w.position.row), 0);
      const newWidget: DashboardWidget = {
        id: `${widgetTemplate.id}-${Date.now()}`,
        type: widgetTemplate.type,
        title: widgetTemplate.title,
        size: widgetTemplate.defaultSize,
        position: { row: maxRow + 1, col: 1 },
        minimized: false,
      };

      onLayoutChange([...layout, newWidget]);
      setShowAddPanel(false);
    },
    [layout, onLayoutChange]
  );

  // Handle save
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(layout);
    }
  }, [layout, onSave]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h3 style={styles.title}>仪表盘自定义</h3>
          <span style={styles.subtitle}>
            拖拽组件调整布局，点击组件右上角按钮调整大小
          </span>
        </div>

        <div style={styles.headerActions}>
          {showAddPanel ? (
            <>
              <button onClick={() => setShowAddPanel(false)} style={styles.cancelButton}>
                取消
              </button>
              <button onClick={handleSave} style={styles.saveButton}>
                保存布局
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setShowAddPanel(true)} style={styles.addButton}>
                + 添加组件
              </button>
              <button onClick={handleSave} style={styles.saveButton}>
                保存
              </button>
            </>
          )}
        </div>
      </div>

      {/* Add Widget Panel */}
      {showAddPanel && (
        <div style={styles.addWidgetPanel}>
          <h4 style={styles.panelTitle}>选择要添加的组件</h4>
          <div style={styles.widgetGrid}>
            {AVAILABLE_WIDGETS.filter((aw) => !layout.some((w) => w.type === aw.type)).map((widget) => (
              <button
                key={widget.id}
                onClick={() => handleAddWidget(widget)}
                style={styles.widgetCard}
              >
                <div style={styles.widgetIcon}>
                  {widget.type === 'chart' && '📊'}
                  {widget.type === 'stats' && '📈'}
                  {widget.type === 'list' && '📋'}
                  {widget.type === 'table' && '📑'}
                  {widget.type === 'alert' && '🔔'}
                </div>
                <div style={styles.widgetCardTitle}>{widget.title}</div>
                <div style={styles.widgetSizeLabel}>{WIDGET_SIZES[widget.defaultSize].label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard Grid */}
      <div
        style={{
          ...styles.dashboardGrid,
          opacity: isDragging ? 0.8 : 1,
        }}
      >
        {layout.map((widget, index) => {
          const gridPos = calculateGridPosition(widget, index);
          const isDragTarget = dragOverWidget === widget.id;
          const isSelected = selectedWidget === widget.id;

          return (
            <div
              key={widget.id}
              draggable={enabled}
              onDragStart={(e) => handleDragStart(e, widget)}
              onDragOver={(e) => handleDragOver(e, widget)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, widget)}
              onDragEnd={handleDragEnd}
              style={{
                ...styles.widgetCard,
                ...gridPos,
                ...(isDragTarget && styles.widgetCardDragTarget),
                ...(isSelected && styles.widgetCardSelected),
                ...(widget.minimized && styles.widgetCardMinimized),
              }}
              onClick={() => setSelectedWidget(widget.id)}
            >
              {/* Widget Header */}
              <div style={styles.widgetHeader}>
                <span style={styles.widgetTitle}>{widget.title}</span>
                <div style={styles.widgetActions}>
                  {/* Minimize Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMinimize(widget.id);
                    }}
                    style={styles.widgetActionButton}
                  >
                    {widget.minimized ? '＋' : '－'}
                  </button>

                  {/* Resize */}
                  {!widget.minimized && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={styles.resizeMenu}
                    >
                      <select
                        value={widget.size}
                        onChange={(e) => handleResize(widget.id, e.target.value as any)}
                        style={styles.resizeSelect}
                      >
                        <option value="small">小</option>
                        <option value="medium">中</option>
                        <option value="large">大</option>
                        <option value="wide">宽</option>
                      </select>
                    </div>
                  )}

                  {/* Remove */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`确定要移除 "${widget.title}" 吗？`)) {
                        handleRemoveWidget(widget.id);
                      }
                    }}
                    style={styles.widgetActionButton}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Widget Content Preview */}
              {!widget.minimized && (
                <div style={styles.widgetContent}>
                  <div style={styles.widgetPlaceholder}>
                    {widget.type === 'chart' && '📊 图表占位'}
                    {widget.type === 'stats' && '📈 统计数据'}
                    {widget.type === 'list' && '📋 列表内容'}
                    {widget.type === 'table' && '📑 表格数据'}
                    {widget.type === 'alert' && '🔔 告警信息'}
                  </div>
                </div>
              )}

              {/* Drag Handle */}
              {enabled && !widget.minimized && (
                <div style={styles.dragHandle}>
                  ⋮⋮
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Layout Info */}
      <div style={styles.layoutInfo}>
        <span style={styles.layoutInfoText}>
          当前布局: {layout.length} 个组件
        </span>
        <span style={styles.layoutInfoText}>
          网格: {maxColumns} 列
        </span>
        {!enabled && (
          <span style={styles.layoutWarning}>编辑模式已禁用</span>
        )}
      </div>
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
    alignItems: 'flex-start',
    marginBottom: '20px',
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
  addButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
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
  saveButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  addWidgetPanel: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    marginBottom: '20px',
  },
  panelTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  },
  widgetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '12px',
  },
  widgetCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'move',
    transition: 'all 0.2s',
  },
  widgetIcon: {
    fontSize: '32px',
  },
  widgetCardTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
    textAlign: 'center',
  },
  widgetSizeLabel: {
    fontSize: '12px',
    color: '#6b7280',
  },
  dashboardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gridAutoRows: 'minmax(100px, auto)',
    gap: '16px',
    minHeight: '400px',
  },
  widgetCardDragTarget: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    boxShadow: '0 0 0 2px #3b82f6',
  },
  widgetCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  widgetCardMinimized: {
    gridRow: 'auto !important',
    height: 'auto',
  },
  widgetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #f3f4f6',
  },
  widgetTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },
  widgetActions: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  widgetActionButton: {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '3px',
    ':hover': {
      backgroundColor: '#f3f4f6',
    },
  },
  resizeMenu: {
    position: 'relative' as const,
  },
  resizeSelect: {
    padding: '2px 6px',
    fontSize: '11px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '3px',
    cursor: 'pointer',
  },
  widgetContent: {
    minHeight: '80px',
  },
  widgetPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: '80px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#9ca3af',
  },
  dragHandle: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    fontSize: '12px',
    color: '#d1d5db',
    cursor: 'move',
    userSelect: 'none',
  },
  layoutInfo: {
    display: 'flex',
    gap: '16px',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  layoutInfoText: {
    fontSize: '13px',
    color: '#6b7280',
  },
  layoutWarning: {
    fontSize: '13px',
    color: '#f59e0b',
    fontWeight: 500,
  },
};

export default DashboardCustomizer;
