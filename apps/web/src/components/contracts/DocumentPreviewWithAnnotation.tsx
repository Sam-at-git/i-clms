import { useState, useRef, useEffect } from 'react';

interface DocumentPreviewWithAnnotationProps {
  contractId: string;
  fileUrl: string;
  fileType: 'pdf' | 'docx';
  onClose?: () => void;
}

interface Annotation {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'highlight' | 'comment' | 'text';
  content: string;
  author: string;
  createdAt: Date;
}

export function DocumentPreviewWithAnnotation({
  contractId,
  fileUrl,
  fileType,
  onClose,
}: DocumentPreviewWithAnnotationProps) {
  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [showAnnotationPanel, setShowAnnotationPanel] = useState(true);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotationType, setAnnotationType] = useState<'highlight' | 'comment'>('highlight');
  const [showAddComment, setShowAddComment] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentPosition, setCommentPosition] = useState<{ x: number; y: number } | null>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load document (simplified - in real app would use PDF.js or similar)
  useEffect(() => {
    // Simulate loading PDF/pages
    if (fileType === 'pdf') {
      setTotalPages(5); // Mock: would get from actual PDF
    }
  }, [fileUrl, fileUrl]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleAddAnnotation = (x: number, y: number) => {
    if (annotationType === 'comment') {
      setCommentPosition({ x, y });
      setShowAddComment(true);
    } else {
      // Create highlight annotation
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        pageNumber: currentPage,
        x,
        y,
        width: 100,
        height: 20,
        type: 'highlight',
        content: 'Highlighted text',
        author: 'Current User',
        createdAt: new Date(),
      };
      setAnnotations([...annotations, newAnnotation]);
    }
  };

  const handleSaveComment = () => {
    if (!commentPosition || !newComment.trim()) return;

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      pageNumber: currentPage,
      x: commentPosition.x,
      y: commentPosition.y,
      width: 20,
      height: 20,
      type: 'comment',
      content: newComment,
      author: 'Current User',
      createdAt: new Date(),
    };

    setAnnotations([...annotations, newAnnotation]);
    setShowAddComment(false);
    setNewComment('');
    setCommentPosition(null);
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(annotations.filter((a) => a.id !== id));
    setSelectedAnnotation(null);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAnnotating) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    handleAddAnnotation(x, y);
  };

  return (
    <div style={styles.container}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarGroup}>
          <button onClick={handleZoomOut} style={styles.toolButton} title="缩小">
            🔍-
          </button>
          <span style={styles.zoomLevel}>{Math.round(scale * 100)}%</span>
          <button onClick={handleZoomIn} style={styles.toolButton} title="放大">
            🔍+
          </button>
        </div>

        <div style={styles.toolbarGroup}>
          <button onClick={handleRotate} style={styles.toolButton} title="旋转">
            🔄
          </button>
        </div>

        <div style={styles.toolbarGroup}>
          <button
            onClick={() => setIsAnnotating(!isAnnotating)}
            style={{
              ...styles.toolButton,
              ...(isAnnotating && styles.toolButtonActive),
            }}
            title="添加批注"
          >
            ✏️ 批注
          </button>
          {isAnnotating && (
            <>
              <button
                onClick={() => setAnnotationType('highlight')}
                style={{
                  ...styles.toolButton,
                  ...(annotationType === 'highlight' && styles.toolButtonActive),
                }}
                title="高亮"
              >
                🖊️ 高亮
              </button>
              <button
                onClick={() => setAnnotationType('comment')}
                style={{
                  ...styles.toolButton,
                  ...(annotationType === 'comment' && styles.toolButtonActive),
                }}
                title="评论"
              >
                💬 评论
              </button>
            </>
          )}
        </div>

        <div style={styles.toolbarGroup}>
          <button
            onClick={() => setShowAnnotationPanel(!showAnnotationPanel)}
            style={styles.toolButton}
            title="切换批注面板"
          >
            📝 批注
            {annotations.length > 0 && (
              <span style={styles.badge}>{annotations.length}</span>
            )}
          </button>
        </div>

        <div style={styles.toolbarGroup}>
          {onClose && (
            <button onClick={onClose} style={styles.closeButton}>
              ✕ 关闭
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Document Viewer */}
        <div style={styles.viewer}>
          {/* Page Navigation */}
          <div style={styles.pageNavigation}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={styles.pageButton}
            >
              ◀ 上一页
            </button>
            <span style={styles.pageInfo}>
              第 {currentPage} / {totalPages} 页
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={styles.pageButton}
            >
              下一页 ▶
            </button>
          </div>

          {/* Document Canvas */}
          <div
            ref={containerRef}
            style={{
              ...styles.documentContainer,
              cursor: isAnnotating ? 'crosshair' : 'default',
            }}
            onClick={handleCanvasClick}
          >
            {fileType === 'pdf' ? (
              <canvas
                ref={pdfCanvasRef}
                style={{
                  ...styles.pdfCanvas,
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                }}
              />
            ) : (
              <div style={styles.docxPlaceholder}>
                📄 DOCX预览暂不支持，请下载后查看
              </div>
            )}

            {/* Annotations Overlay */}
            {annotations
              .filter((a) => a.pageNumber === currentPage)
              .map((annotation) => (
                <div
                  key={annotation.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAnnotation(annotation);
                  }}
                  style={{
                    position: 'absolute',
                    left: annotation.x,
                    top: annotation.y,
                    width: annotation.width,
                    height: annotation.height,
                    backgroundColor:
                      annotation.type === 'highlight'
                        ? 'rgba(255, 255, 0, 0.3)'
                        : 'transparent',
                    border:
                      annotation.type === 'comment'
                        ? '2px solid #3b82f6'
                        : 'none',
                    borderRadius: annotation.type === 'comment' ? '50%' : '2px',
                    cursor: 'pointer',
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  {annotation.type === 'comment' && (
                    <span style={styles.commentIcon}>💬</span>
                  )}
                </div>
              ))}
          </div>

          {/* Add Comment Modal */}
          {showAddComment && commentPosition && (
            <div
              style={{
                ...styles.commentModal,
                left: commentPosition.x,
                top: commentPosition.y,
              }}
            >
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="输入评论..."
                style={styles.commentInput}
                rows={3}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <div style={styles.commentActions}>
                <button
                  onClick={() => {
                    setShowAddComment(false);
                    setNewComment('');
                    setCommentPosition(null);
                  }}
                  style={styles.cancelButton}
                >
                  取消
                </button>
                <button
                  onClick={handleSaveComment}
                  style={styles.confirmButton}
                >
                  添加
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Annotation Panel */}
        {showAnnotationPanel && (
          <div style={styles.annotationPanel}>
            <div style={styles.panelHeader}>
              <h3 style={styles.panelTitle}>批注列表</h3>
              <span style={styles.panelCount}>({annotations.length})</span>
            </div>

            {annotations.length === 0 ? (
              <div style={styles.emptyAnnotations}>
                <div style={styles.emptyIcon}>📝</div>
                <div style={styles.emptyText}>暂无批注</div>
                <div style={styles.emptySubtext}>
                  点击"批注"按钮开始添加
                </div>
              </div>
            ) : (
              <div style={styles.annotationList}>
                {annotations.map((annotation) => (
                  <div
                    key={annotation.id}
                    onClick={() => setSelectedAnnotation(annotation)}
                    style={{
                      ...styles.annotationItem,
                      ...(selectedAnnotation?.id === annotation.id &&
                        styles.annotationItemSelected),
                    }}
                  >
                    <div style={styles.annotationHeader}>
                      <span
                        style={{
                          ...styles.annotationTypeBadge,
                          backgroundColor:
                            annotation.type === 'highlight'
                              ? '#fbbf24'
                              : '#3b82f6',
                        }}
                      >
                        {annotation.type === 'highlight' ? '🖊️' : '💬'}
                      </span>
                      <span style={styles.annotationPage}>
                        第{annotation.pageNumber}页
                      </span>
                      <span style={styles.annotationAuthor}>
                        {annotation.author}
                      </span>
                      <span style={styles.annotationDate}>
                        {new Date(annotation.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <div style={styles.annotationContent}>
                      {annotation.content}
                    </div>
                    <div style={styles.annotationActions}>
                      <button
                        onClick={() => {
                          setCurrentPage(annotation.pageNumber);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        style={styles.annotationActionButton}
                      >
                        查看
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAnnotation(annotation.id);
                        }}
                        style={styles.annotationDeleteButton}
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
      </div>

      {/* Selected Annotation Detail */}
      {selectedAnnotation && (
        <div style={styles.annotationDetail}>
          <div style={styles.detailHeader}>
            <h4 style={styles.detailTitle}>批注详情</h4>
            <button
              onClick={() => setSelectedAnnotation(null)}
              style={styles.detailCloseButton}
            >
              ✕
            </button>
          </div>
          <div style={styles.detailContent}>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>类型:</span>
              <span style={styles.detailValue}>
                {selectedAnnotation.type === 'highlight' ? '高亮' : '评论'}
              </span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>页码:</span>
              <span style={styles.detailValue}>第 {selectedAnnotation.pageNumber} 页</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>作者:</span>
              <span style={styles.detailValue}>{selectedAnnotation.author}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>时间:</span>
              <span style={styles.detailValue}>
                {selectedAnnotation.createdAt.toLocaleString('zh-CN')}
              </span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>内容:</span>
              <span style={styles.detailValue}>{selectedAnnotation.content}</span>
            </div>
          </div>
          <div style={styles.detailActions}>
            <button
              onClick={() => {
                setCurrentPage(selectedAnnotation.pageNumber);
                setSelectedAnnotation(null);
              }}
              style={styles.detailActionButton}
            >
              跳转至批注
            </button>
            <button
              onClick={() => handleDeleteAnnotation(selectedAnnotation.id)}
              style={styles.detailDeleteButton}
            >
              删除批注
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f3f4f6',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e5e7eb',
    flexWrap: 'wrap',
  },
  toolbarGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '0 12px',
    borderRight: '1px solid #e5e7eb',
  },
  toolButton: {
    padding: '6px 12px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  toolButtonActive: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    borderColor: '#3b82f6',
  },
  zoomLevel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: 500,
    minWidth: '45px',
    textAlign: 'center',
  },
  badge: {
    marginLeft: '4px',
    padding: '2px 6px',
    fontSize: '11px',
    color: '#fff',
    backgroundColor: '#ef4444',
    borderRadius: '10px',
    fontWeight: 600,
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
  mainContent: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  viewer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  pageNavigation: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    padding: '12px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e5e7eb',
  },
  pageButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: 500,
  },
  documentContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'auto',
    backgroundColor: '#525659',
    display: 'flex',
    justifyContent: 'center',
    padding: '20px',
  },
  pdfCanvas: {
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    backgroundColor: '#fff',
    transition: 'transform 0.3s',
  },
  docxPlaceholder: {
    padding: '60px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '16px',
  },
  commentIcon: {
    fontSize: '16px',
  },
  commentModal: {
    position: 'absolute',
    zIndex: 1000,
    backgroundColor: '#fff',
    borderRadius: '4px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    padding: '8px',
    width: '250px',
  },
  commentInput: {
    width: '100%',
    padding: '6px',
    fontSize: '13px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
    marginBottom: '8px',
  },
  commentActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '6px',
  },
  cancelButton: {
    padding: '4px 10px',
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '3px',
    cursor: 'pointer',
  },
  confirmButton: {
    padding: '4px 10px',
    fontSize: '12px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
  },
  annotationPanel: {
    width: '300px',
    backgroundColor: '#fff',
    borderLeft: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
  },
  panelTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },
  panelCount: {
    fontSize: '13px',
    color: '#6b7280',
  },
  emptyAnnotations: {
    padding: '40px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '40px',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#374151',
    fontWeight: 500,
    marginBottom: '4px',
  },
  emptySubtext: {
    fontSize: '12px',
    color: '#6b7280',
  },
  annotationList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
  },
  annotationItem: {
    padding: '10px',
    marginBottom: '8px',
    borderRadius: '4px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  annotationItemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  annotationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px',
    flexWrap: 'wrap',
  },
  annotationTypeBadge: {
    padding: '2px 6px',
    fontSize: '11px',
    color: '#fff',
    borderRadius: '3px',
    fontWeight: 500,
  },
  annotationPage: {
    fontSize: '11px',
    color: '#6b7280',
  },
  annotationAuthor: {
    fontSize: '11px',
    color: '#6b7280',
  },
  annotationDate: {
    fontSize: '11px',
    color: '#9ca3af',
    marginLeft: 'auto',
  },
  annotationContent: {
    fontSize: '13px',
    color: '#374151',
    marginBottom: '8px',
    lineHeight: '1.4',
  },
  annotationActions: {
    display: 'flex',
    gap: '6px',
  },
  annotationActionButton: {
    padding: '3px 8px',
    fontSize: '11px',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
  },
  annotationDeleteButton: {
    padding: '3px 8px',
    fontSize: '11px',
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
  },
  annotationDetail: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    right: '340px',
    backgroundColor: '#fff',
    borderRadius: '6px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    maxHeight: '300px',
    overflow: 'auto',
    zIndex: 100,
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
  },
  detailTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },
  detailCloseButton: {
    padding: '4px 8px',
    fontSize: '16px',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  detailContent: {
    padding: '16px',
  },
  detailRow: {
    display: 'flex',
    marginBottom: '8px',
    fontSize: '13px',
  },
  detailLabel: {
    width: '60px',
    color: '#6b7280',
    fontWeight: 500,
  },
  detailValue: {
    flex: 1,
    color: '#111827',
  },
  detailActions: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '1px solid #e5e7eb',
  },
  detailActionButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  detailDeleteButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#fff',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default DocumentPreviewWithAnnotation;
