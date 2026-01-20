import { useState, useMemo } from 'react';
import { useQuery, gql } from '@apollo/client/react';
import { Notification } from './NotificationCenter';

const GET_NOTIFICATION_HISTORY = gql`
  query GetNotificationHistory($filter: NotificationFilterInput) {
    notifications(filter: $filter) {
      id
      title
      message
      category
      type
      isRead
      createdAt
      readAt
      actionUrl
    }
  }
`;

interface NotificationHistoryProps {
  timeRange?: 'today' | 'week' | 'month' | 'all';
  maxItems?: number;
}

export function NotificationHistory({ timeRange = 'all', maxItems }: NotificationHistoryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const { data, loading } = useQuery(GET_NOTIFICATION_HISTORY, {
    variables: {
      filter: {
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        type: selectedType === 'all' ? undefined : selectedType,
      },
    },
    fetchPolicy: 'cache-and-network',
  });

  const notifications = useMemo(() => {
    let all = (data?.notifications || []) as Notification[];

    // Apply time range filter
    if (timeRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();

      if (timeRange === 'today') {
        cutoff.setHours(0, 0, 0, 0);
      } else if (timeRange === 'week') {
        cutoff.setDate(now.getDate() - 7);
      } else if (timeRange === 'month') {
        cutoff.setMonth(now.getMonth() - 1);
      }

      all = all.filter((n) => new Date(n.createdAt) >= cutoff);
    }

    // Apply max items limit
    if (maxItems && maxItems > 0) {
      all = all.slice(0, maxItems);
    }

    return all;
  }, [data, timeRange, maxItems]);

  const stats = useMemo(() => {
    return {
      total: notifications.length,
      read: notifications.filter((n) => n.isRead).length,
      unread: notifications.filter((n) => !n.isRead).length,
    };
  }, [notifications]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, Notification[]> = {};

    notifications.forEach((notification) => {
      const date = new Date(notification.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let key: string;
      if (date.toDateString() === today.toDateString()) {
        key = '今天';
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = '昨天';
      } else if (date.getDate() === today.getDate() - 2) {
        key = '前天';
      } else {
        key = date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(notification);
    });

    return groups;
  }, [notifications]);

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    };
    return icons[type] || '📢';
  };

  return (
    <div style={styles.container}>
      {/* Stats */}
      <div style={styles.stats}>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{stats.total}</span>
          <span style={styles.statLabel}>全部</span>
        </div>
        <div style={styles.statItem}>
          <span style={{ ...styles.statValue, color: '#10b981' }}>{stats.read}</span>
          <span style={styles.statLabel}>已读</span>
        </div>
        <div style={styles.statItem}>
          <span style={{ ...styles.statValue, color: '#3b82f6' }}>{stats.unread}</span>
          <span style={styles.statLabel}>未读</span>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">全部分类</option>
          <option value="system">系统</option>
          <option value="contract">合同</option>
          <option value="finance">财务</option>
          <option value="delivery">交付</option>
          <option value="customer">客户</option>
        </select>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">全部类型</option>
          <option value="info">信息</option>
          <option value="success">成功</option>
          <option value="warning">警告</option>
          <option value="error">错误</option>
        </select>
      </div>

      {/* History */}
      {loading ? (
        <div style={styles.loading}>加载中...</div>
      ) : notifications.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📭</div>
          <div style={styles.emptyText}>暂无历史记录</div>
        </div>
      ) : (
        <div style={styles.timeline}>
          {Object.entries(groupedByDate).map(([dateLabel, items]) => (
            <div key={dateLabel} style={styles.timelineGroup}>
              <div style={styles.timelineDate}>{dateLabel}</div>
              <div style={styles.timelineItems}>
                {items.map((notification) => (
                  <div key={notification.id} style={styles.timelineItem}>
                    <div style={styles.timelineIcon}>
                      {getTypeIcon(notification.type)}
                    </div>
                    <div style={styles.timelineContent}>
                      <div style={styles.timelineHeader}>
                        <span style={styles.timelineTitle}>{notification.title}</span>
                        <span style={styles.timelineTime}>
                          {new Date(notification.createdAt).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div style={styles.timelineMessage}>{notification.message}</div>
                      {notification.readAt && (
                        <div style={styles.timelineReadAt}>
                          已读于 {new Date(notification.readAt).toLocaleString('zh-CN')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  stats: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
  },
  statItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#111827',
  },
  statLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  filters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  filterSelect: {
    padding: '6px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fff',
  },
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#9ca3af',
  },
  empty: {
    padding: '48px 24px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  timelineGroup: {},
  timelineDate: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: '12px',
    textTransform: 'uppercase',
  },
  timelineItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingLeft: '12px',
    borderLeft: '2px solid #e5e7eb',
  },
  timelineItem: {
    display: 'flex',
    gap: '12px',
    position: 'relative' as const,
  },
  timelineIcon: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    border: '2px solid #e5e7eb',
    borderRadius: '50%',
    fontSize: '14px',
    flexShrink: 0,
    marginLeft: '-17px',
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
  },
  timelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  timelineTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  timelineTime: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  timelineMessage: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  timelineReadAt: {
    fontSize: '11px',
    color: '#9ca3af',
    fontStyle: 'italic' as const,
  },
};

export default NotificationHistory;
