import { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useAuthStore } from '../../state/auth.state';

const GET_AUDIT_LOGS = gql`
  query GetAuditLogs($page: Int!, $pageSize: Int!, $filter: AuditLogFilterInput) {
    auditLogs(page: $page, pageSize: $pageSize, filter: $filter) {
      items {
        id
        action
        entityType
        entityId
        entityName
        oldValue
        newValue
        operator {
          id
          name
          email
        }
        ipAddress
        createdAt
      }
      total
      page
      pageSize
    }
    auditActions
    auditEntityTypes
  }
`;

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  operator: {
    id: string;
    name: string;
    email: string;
  };
  ipAddress: string | null;
  createdAt: string;
}

interface AuditLogsQueryResult {
  auditLogs: {
    items: AuditLog[];
    total: number;
    page: number;
    pageSize: number;
  };
  auditActions: string[];
  auditEntityTypes: string[];
}

const ACTION_LABELS: Record<string, string> = {
  CREATE_USER: '创建用户',
  UPDATE_USER: '更新用户',
  TOGGLE_USER_STATUS: '切换用户状态',
  RESET_USER_PASSWORD: '重置用户密码',
  CHANGE_PASSWORD: '修改密码',
  CREATE_DEPARTMENT: '创建部门',
  UPDATE_DEPARTMENT: '更新部门',
  DELETE_DEPARTMENT: '删除部门',
  CREATE_TAG: '创建标签',
  UPDATE_TAG: '更新标签',
  DELETE_TAG: '删除标签',
  ASSIGN_TAG: '指派标签',
  REMOVE_TAG: '移除标签',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  USER: '用户',
  DEPARTMENT: '部门',
  TAG: '标签',
  CONTRACT: '合同',
};

export function AuditLogsPage() {
  const { user: currentUser } = useAuthStore();
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const filter: Record<string, unknown> = {};
  if (actionFilter) filter.action = actionFilter;
  if (entityTypeFilter) filter.entityType = entityTypeFilter;
  if (startDate) filter.startDate = startDate;
  if (endDate) filter.endDate = endDate;

  const { data, loading, error } = useQuery<AuditLogsQueryResult>(GET_AUDIT_LOGS, {
    variables: {
      page,
      pageSize: 50,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    },
  });

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          <h2>访问受限</h2>
          <p>只有系统管理员可以访问审计日志</p>
        </div>
      </div>
    );
  }

  if (loading) return <div style={styles.loading}>加载中...</div>;
  if (error) return <div style={styles.error}>错误: {error.message}</div>;

  const logs = data?.auditLogs?.items || [];
  const total = data?.auditLogs?.total || 0;
  const totalPages = Math.ceil(total / 50);
  const actions = data?.auditActions || [];
  const entityTypes = data?.auditEntityTypes || [];

  const clearFilters = () => {
    setActionFilter('');
    setEntityTypeFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>审计日志</h1>
        <span style={styles.stats}>共 {total} 条记录</span>
      </div>

      <div style={styles.filters}>
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          style={styles.filterSelect}
        >
          <option value="">全部操作</option>
          {actions.map((action: string) => (
            <option key={action} value={action}>
              {ACTION_LABELS[action] || action}
            </option>
          ))}
        </select>

        <select
          value={entityTypeFilter}
          onChange={(e) => {
            setEntityTypeFilter(e.target.value);
            setPage(1);
          }}
          style={styles.filterSelect}
        >
          <option value="">全部类型</option>
          {entityTypes.map((type: string) => (
            <option key={type} value={type}>
              {ENTITY_TYPE_LABELS[type] || type}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setPage(1);
          }}
          style={styles.filterInput}
          placeholder="开始日期"
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setPage(1);
          }}
          style={styles.filterInput}
          placeholder="结束日期"
        />

        {(actionFilter || entityTypeFilter || startDate || endDate) && (
          <button onClick={clearFilters} style={styles.clearButton}>
            清除筛选
          </button>
        )}
      </div>

      <div style={styles.timeline}>
        {logs.map((log: AuditLog) => (
          <div key={log.id} style={styles.logItem}>
            <div style={styles.logHeader}>
              <div style={styles.logMeta}>
                <span style={styles.logTime}>
                  {new Date(log.createdAt).toLocaleString('zh-CN')}
                </span>
                <span style={styles.logOperator}>{log.operator.name}</span>
                {log.ipAddress && <span style={styles.logIp}>{log.ipAddress}</span>}
              </div>
              <div style={styles.logBadges}>
                <span style={styles.actionBadge}>{ACTION_LABELS[log.action] || log.action}</span>
                <span style={styles.typeBadge}>
                  {ENTITY_TYPE_LABELS[log.entityType] || log.entityType}
                </span>
              </div>
            </div>

            <div style={styles.logContent}>
              <p style={styles.logDescription}>
                <strong>{log.operator.name}</strong> {ACTION_LABELS[log.action] || log.action}
                {log.entityName && (
                  <>
                    {' '}
                    <span style={styles.entityName}>{log.entityName}</span>
                  </>
                )}
              </p>

              {(log.oldValue || log.newValue) && (
                <button
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  style={styles.detailsButton}
                >
                  {expandedLog === log.id ? '收起详情' : '查看详情'}
                </button>
              )}

              {expandedLog === log.id && (
                <div style={styles.changes}>
                  {log.oldValue && (
                    <div style={styles.changeBlock}>
                      <span style={styles.changeLabel}>变更前：</span>
                      <pre style={styles.json}>{JSON.stringify(log.oldValue, null, 2)}</pre>
                    </div>
                  )}
                  {log.newValue && (
                    <div style={styles.changeBlock}>
                      <span style={styles.changeLabel}>变更后：</span>
                      <pre style={styles.json}>{JSON.stringify(log.newValue, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {logs.length === 0 && (
        <div style={styles.empty}>
          <p>没有找到符合条件的日志记录</p>
        </div>
      )}

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
  stats: {
    color: '#6b7280',
    fontSize: '14px',
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
  filters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  filterSelect: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    minWidth: '150px',
  },
  filterInput: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
  },
  clearButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  logItem: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    borderLeft: '4px solid #3b82f6',
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  logMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  logTime: {
    fontSize: '13px',
    color: '#6b7280',
  },
  logOperator: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
  },
  logIp: {
    fontSize: '12px',
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
  logBadges: {
    display: 'flex',
    gap: '8px',
  },
  actionBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '12px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
  },
  typeBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '12px',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    borderRadius: '4px',
  },
  logContent: {},
  logDescription: {
    fontSize: '14px',
    color: '#374151',
    margin: 0,
  },
  entityName: {
    color: '#3b82f6',
    fontWeight: 500,
  },
  detailsButton: {
    marginTop: '12px',
    padding: '4px 8px',
    fontSize: '13px',
    color: '#3b82f6',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  changes: {
    marginTop: '12px',
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  changeBlock: {
    flex: '1',
    minWidth: '200px',
  },
  changeLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: '#6b7280',
    marginBottom: '4px',
  },
  json: {
    fontSize: '12px',
    backgroundColor: '#f9fafb',
    padding: '12px',
    borderRadius: '4px',
    overflow: 'auto',
    maxHeight: '200px',
    margin: 0,
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  empty: {
    padding: '48px',
    textAlign: 'center',
    color: '#6b7280',
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

export default AuditLogsPage;
