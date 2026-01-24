import { useState, useCallback } from 'react';
import { useQuery } from '@apollo/client';

interface ExportRecord {
  id: string;
  fileName: string;
  fileType: 'PDF' | 'EXCEL' | 'CSV' | 'JSON';
  fileSize: number;
  downloadUrl: string;
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
  status: 'completed' | 'failed' | 'expired';
  recordCount?: number;
}

interface ExportHistoryProps {
  userId: string;
  limit?: number;
  showFilters?: boolean;
  onDownload?: (record: ExportRecord) => void;
}

// Mock GraphQL query
const GET_EXPORT_HISTORY = `
  query GetExportHistory($userId: String!, $limit: Int, $offset: Int) {
    exportHistory(userId: $userId, limit: $limit, offset: $offset) {
      id
      fileName
      fileType
      fileSize
      downloadUrl
      createdBy
      createdAt
      expiresAt
      status
      recordCount
    }
  }
`;

const FILE_TYPES = [
  { value: 'all', label: '全部类型' },
  { value: 'PDF', label: 'PDF' },
  { value: 'EXCEL', label: 'Excel' },
  { value: 'CSV', label: 'CSV' },
  { value: 'JSON', label: 'JSON' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
  { value: 'expired', label: '已过期' },
];

export function ExportHistory({
  userId,
  limit = 20,
  showFilters = true,
  onDownload,
}: ExportHistoryProps) {
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Query
  const { data, loading, refetch } = useQuery(GET_EXPORT_HISTORY, {
    variables: { userId, limit, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });

  let exportRecords = data?.exportHistory || [];

  // Apply filters
  const filteredRecords = exportRecords.filter((record: ExportRecord) => {
    if (fileTypeFilter !== 'all' && record.fileType !== fileTypeFilter) return false;
    if (statusFilter !== 'all' && record.status !== statusFilter) return false;

    if (dateFilter === 'today') {
      const today = new Date().toDateString();
      if (new Date(record.createdAt).toDateString() !== today) return false;
    } else if (dateFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      if (new Date(record.createdAt) < weekAgo) return false;
    } else if (dateFilter === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      if (new Date(record.createdAt) < monthAgo) return false;
    }

    return true;
  });

  // Apply sorting
  const sortedRecords = [...filteredRecords].sort((a: ExportRecord, b: ExportRecord) => {
    let compareValue = 0;

    if (sortBy === 'date') {
      compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortBy === 'name') {
      compareValue = a.fileName.localeCompare(b.fileName);
    } else if (sortBy === 'size') {
      compareValue = a.fileSize - b.fileSize;
    }

    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  const handleDownload = useCallback(
    (record: ExportRecord) => {
      // Create download link
      const link = document.createElement('a');
      link.href = record.downloadUrl;
      link.download = record.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (onDownload) {
        onDownload(record);
      }
    },
    [onDownload]
  );

  const handleSort = useCallback((field: 'date' | 'name' | 'size') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  }, [sortBy, sortOrder]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      PDF: '📕',
      EXCEL: '📊',
      CSV: '📄',
      JSON: '🗂️',
    };
    return icons[type] || '📎';
  };

  const getStatusBadge = (status: string): { label: string; color: string } => {
    const badges: Record<string, { label: string; color: string }> = {
      completed: { label: '已完成', color: '#10b981' },
      failed: { label: '失败', color: '#ef4444' },
      expired: { label: '已过期', color: '#9ca3af' },
    };
    return badges[status] || { label: status, color: '#6b7280' };
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h3 style={styles.title}>导出历史</h3>
          <span style={styles.subtitle}>
            {sortedRecords.length} 条记录
          </span>
        </div>
        <button onClick={() => refetch()} style={styles.refreshButton}>
          🔄 刷新
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div style={styles.filtersSection}>
          <div style={styles.filterRow}>
            <label style={styles.filterLabel}>文件类型:</label>
            <div style={styles.filterOptions}>
              {FILE_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setFileTypeFilter(type.value)}
                  style={{
                    ...styles.filterButton,
                    ...(fileTypeFilter === type.value && styles.filterButtonActive),
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.filterRow}>
            <label style={styles.filterLabel}>状态:</label>
            <div style={styles.filterOptions}>
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  onClick={() => setStatusFilter(status.value)}
                  style={{
                    ...styles.filterButton,
                    ...(statusFilter === status.value && styles.filterButtonActive),
                  }}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.filterRow}>
            <label style={styles.filterLabel}>时间范围:</label>
            <div style={styles.filterOptions}>
              <button
                onClick={() => setDateFilter('all')}
                style={{
                  ...styles.filterButton,
                  ...(dateFilter === 'all' && styles.filterButtonActive),
                }}
              >
                全部
              </button>
              <button
                onClick={() => setDateFilter('today')}
                style={{
                  ...styles.filterButton,
                  ...(dateFilter === 'today' && styles.filterButtonActive),
                }}
              >
                今天
              </button>
              <button
                onClick={() => setDateFilter('week')}
                style={{
                  ...styles.filterButton,
                  ...(dateFilter === 'week' && styles.filterButtonActive),
                }}
              >
                最近7天
              </button>
              <button
                onClick={() => setDateFilter('month')}
                style={{
                  ...styles.filterButton,
                  ...(dateFilter === 'month' && styles.filterButtonActive),
                }}
              >
                最近30天
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={styles.loading}>加载中...</div>
      )}

      {/* Empty State */}
      {!loading && sortedRecords.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📂</div>
          <div style={styles.emptyText}>暂无导出记录</div>
          <div style={styles.emptySubtext}>
            导出报表后会显示在这里
          </div>
        </div>
      )}

      {/* Export List */}
      {!loading && sortedRecords.length > 0 && (
        <>
          {/* Table Header */}
          <div style={styles.tableHeader}>
            <div
              onClick={() => handleSort('name')}
              style={styles.sortableHeader}
            >
              文件名
              {sortBy === 'name' && (
                <span style={styles.sortIcon}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </div>
            <div style={styles.headerCell}>类型</div>
            <div
              onClick={() => handleSort('size')}
              style={styles.sortableHeader}
            >
              大小
              {sortBy === 'size' && (
                <span style={styles.sortIcon}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </div>
            <div
              onClick={() => handleSort('date')}
              style={styles.sortableHeader}
            >
              导出时间
              {sortBy === 'date' && (
                <span style={styles.sortIcon}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </div>
            <div style={styles.headerCell}>状态</div>
            <div style={styles.headerCell}>操作</div>
          </div>

          {/* Table Body */}
          <div style={styles.tableBody}>
            {sortedRecords.map((record: ExportRecord) => {
              const statusInfo = getStatusBadge(record.status);
              const isExpired = record.status === 'expired';
              const isFailed = record.status === 'failed';

              return (
                <div key={record.id} style={styles.tableRow}>
                  {/* File Name */}
                  <div style={styles.rowCell}>
                    <span style={styles.fileIcon}>
                      {getFileTypeIcon(record.fileType)}
                    </span>
                    <span style={styles.fileName}>{record.fileName}</span>
                    {record.recordCount && (
                      <span style={styles.recordCount}>
                        ({record.recordCount} 条记录)
                      </span>
                    )}
                  </div>

                  {/* File Type */}
                  <div style={styles.rowCell}>
                    <span style={styles.fileTypeBadge}>{record.fileType}</span>
                  </div>

                  {/* File Size */}
                  <div style={styles.rowCell}>
                    <span style={styles.fileSize}>{formatFileSize(record.fileSize)}</span>
                  </div>

                  {/* Created At */}
                  <div style={styles.rowCell}>
                    <div style={styles.dateCell}>
                      <div style={styles.dateMain}>
                        {new Date(record.createdAt).toLocaleDateString('zh-CN')}
                      </div>
                      <div style={styles.dateSub}>
                        {new Date(record.createdAt).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      {record.expiresAt && (
                        <div style={styles.expiresAt}>
                          过期: {new Date(record.expiresAt).toLocaleDateString('zh-CN')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div style={styles.rowCell}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: statusInfo.color,
                      }}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={styles.rowCell}>
                    <button
                      onClick={() => handleDownload(record)}
                      disabled={isExpired || isFailed}
                      style={{
                        ...styles.downloadButton,
                        ...(isExpired || isFailed ? styles.downloadButtonDisabled : {}),
                      }}
                    >
                      📥 下载
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Summary */}
      {!loading && sortedRecords.length > 0 && (
        <div style={styles.summary}>
          <span style={styles.summaryText}>
            共 {sortedRecords.length} 条导出记录
          </span>
          <span style={styles.summaryText}>
            总大小: {formatFileSize(sortedRecords.reduce((sum: number, r: ExportRecord) => sum + r.fileSize, 0))}
          </span>
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
  refreshButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  filtersSection: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    minWidth: '80px',
  },
  filterOptions: {
    display: 'flex',
    gap: '6px',
  },
  filterButton: {
    padding: '4px 10px',
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  filterButtonActive: {
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
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 80px 100px 150px 80px 100px',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px 6px 0 0',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
  },
  sortableHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  sortIcon: {
    fontSize: '12px',
    color: '#3b82f6',
  },
  headerCell: {
    display: 'flex',
    alignItems: 'center',
  },
  tableBody: {
    display: 'flex',
    flexDirection: 'column',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 80px 100px 150px 80px 100px',
    gap: '12px',
    padding: '12px',
    borderBottom: '1px solid #f3f4f6',
    fontSize: '13px',
    ':hover': {
      backgroundColor: '#f9fafb',
    },
  },
  rowCell: {
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fileIcon: {
    fontSize: '18px',
    marginRight: '6px',
  },
  fileName: {
    color: '#111827',
    fontWeight: 500,
  },
  recordCount: {
    fontSize: '11px',
    color: '#9ca3af',
    marginLeft: '6px',
  },
  fileTypeBadge: {
    padding: '2px 6px',
    fontSize: '11px',
    color: '#fff',
    backgroundColor: '#6b7280',
    borderRadius: '3px',
    fontWeight: 500,
  },
  fileSize: {
    color: '#6b7280',
  },
  dateCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  dateMain: {
    fontSize: '13px',
    color: '#111827',
    fontWeight: 500,
  },
  dateSub: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  expiresAt: {
    fontSize: '10px',
    color: '#f59e0b',
  },
  statusBadge: {
    padding: '3px 8px',
    fontSize: '11px',
    color: '#fff',
    borderRadius: '3px',
    fontWeight: 500,
  },
  downloadButton: {
    padding: '4px 10px',
    fontSize: '12px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  downloadButtonDisabled: {
    backgroundColor: '#d1d5db',
    cursor: 'not-allowed',
  },
  summary: {
    display: 'flex',
    gap: '16px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
    marginTop: '12px',
    fontSize: '13px',
  },
  summaryText: {
    color: '#6b7280',
  },
};

export default ExportHistory;
