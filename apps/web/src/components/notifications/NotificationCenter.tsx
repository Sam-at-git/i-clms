import { useState, useMemo } from 'react';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';

export type NotificationCategory = 'all' | 'system' | 'contract' | 'finance' | 'delivery' | 'customer';
export type NotificationStatus = 'all' | 'unread' | 'read';

export interface Notification {
  id: string;
  title: string;
  message: string;
  category: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  actionUrl?: string;
  actionLabel?: string;
  entity?: {
    type: string;
    id: string;
    name: string;
  };
}

const GET_NOTIFICATIONS = gql`
  query GetNotifications($filter: NotificationFilterInput) {
    notifications(filter: $filter) {
      id
      title
      message
      category
      type
      isRead
      createdAt
      actionUrl
      actionLabel
      entity {
        type
        id
        name
      }
    }
  }
`;

const MARK_AS_READ = gql`
  mutation MarkAsRead($id: ID!) {
    markNotificationAsRead(id: $id) {
      id
      isRead
    }
  }
`;

const MARK_ALL_AS_READ = gql`
  mutation MarkAllAsRead {
    markAllNotificationsAsRead {
      count
    }
  }
`;

const DELETE_NOTIFICATION = gql`
  mutation DeleteNotification($id: ID!) {
    deleteNotification(id: $id) {
      id
    }
  }
`;

interface NotificationCenterProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible?: number;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

interface GetNotificationsResponse {
  notifications?: Notification[];
}

export function NotificationCenter({
  position = 'top-right',
  maxVisible = 5,
  autoClose = true,
  autoCloseDelay = 5000,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('all');
  const [statusFilter, setStatusFilter] = useState<NotificationStatus>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, loading, refetch } = useQuery<GetNotificationsResponse>(GET_NOTIFICATIONS, {
    variables: {
      filter: {
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        isRead: statusFilter === 'all' ? undefined : statusFilter === 'read',
      },
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: 30000, // Poll every 30 seconds
  });

  const [markAsReadMutation] = useMutation(MARK_AS_READ);

  const [markAllAsReadMutation] = useMutation(MARK_ALL_AS_READ);

  const [deleteNotificationMutation] = useMutation(DELETE_NOTIFICATION);

  const notifications = useMemo(() => {
    return (data?.notifications || []) as Notification[];
  }, [data]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsReadMutation({ variables: { id } });
      refetch();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation();
      refetch();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotificationMutation({ variables: { id } });
      refetch();
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleBatchMarkAsRead = async () => {
    for (const id of selectedIds) {
      await handleMarkAsRead(id);
    }
    setSelectedIds(new Set());
  };

  const handleBatchDelete = async () => {
    for (const id of selectedIds) {
      await handleDelete(id);
    }
    setSelectedIds(new Set());
  };

  const handleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  };

  const getCategoryLabel = (category: NotificationCategory) => {
    const labels: Record<NotificationCategory, string> = {
      all: '全部',
      system: '系统',
      contract: '合同',
      finance: '财务',
      delivery: '交付',
      customer: '客户',
    };
    return labels[category];
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    };
    return icons[type] || '📢';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      info: '#3b82f6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
    };
    return colors[type] || '#6b7280';
  };

  return (
    <>
      {/* Notification Bell */}
      <div style={styles.bellContainer}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={styles.bellButton}
        >
          <span style={styles.bellIcon}>🔔</span>
          {unreadCount > 0 && (
            <span style={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>
      </div>

      {/* Notification Panel */}
      {isOpen && (
        <div
          style={{
            ...styles.panel,
            ...(position === 'top-right' && styles.panelTopRight),
            ...(position === 'top-left' && styles.panelTopLeft),
            ...(position === 'bottom-right' && styles.panelBottomRight),
            ...(position === 'bottom-left' && styles.panelBottomLeft),
          }}
        >
          {/* Header */}
          <div style={styles.header}>
            <h3 style={styles.title}>通知中心</h3>
            <div style={styles.headerActions}>
              <span style={styles.unreadCount}>{unreadCount} 未读</span>
              <button
                onClick={() => setIsOpen(false)}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Filters */}
          <div style={styles.filters}>
            <div style={styles.categoryFilter}>
              {(['all', 'system', 'contract', 'finance', 'delivery', 'customer'] as NotificationCategory[]).map(
                (category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    style={{
                      ...styles.filterButton,
                      ...(selectedCategory === category && styles.filterButtonActive),
                    }}
                  >
                    {getCategoryLabel(category)}
                  </button>
                )
              )}
            </div>
            <div style={styles.statusFilter}>
              <button
                onClick={() => setStatusFilter('all')}
                style={{
                  ...styles.filterButton,
                  ...(statusFilter === 'all' && styles.filterButtonActive),
                }}
              >
                全部
              </button>
              <button
                onClick={() => setStatusFilter('unread')}
                style={{
                  ...styles.filterButton,
                  ...(statusFilter === 'unread' && styles.filterButtonActive),
                }}
              >
                未读
              </button>
              <button
                onClick={() => setStatusFilter('read')}
                style={{
                  ...styles.filterButton,
                  ...(statusFilter === 'read' && styles.filterButtonActive),
                }}
              >
                已读
              </button>
            </div>
          </div>

          {/* Batch Actions */}
          {selectedIds.size > 0 && (
            <div style={styles.batchBar}>
              <span style={styles.batchCount}>已选择 {selectedIds.size} 项</span>
              <div style={styles.batchActions}>
                <button onClick={handleBatchMarkAsRead} style={styles.batchActionButton}>
                  标记已读
                </button>
                <button onClick={handleBatchDelete} style={styles.batchDeleteButton}>
                  删除
                </button>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div style={styles.list}>
            {loading ? (
              <div style={styles.loading}>加载中...</div>
            ) : notifications.length === 0 ? (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}>📭</div>
                <div style={styles.emptyText}>暂无通知</div>
              </div>
            ) : (
              <>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllAsRead} style={styles.markAllButton}>
                    全部标记为已读
                  </button>
                )}
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    style={{
                      ...styles.item,
                      ...(notification.isRead && styles.itemRead),
                    }}
                  >
                    <div style={styles.itemCheckbox}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(notification.id)}
                        onChange={() => {
                          const newSelected = new Set(selectedIds);
                          if (newSelected.has(notification.id)) {
                            newSelected.delete(notification.id);
                          } else {
                            newSelected.add(notification.id);
                          }
                          setSelectedIds(newSelected);
                        }}
                        style={styles.checkbox}
                      />
                    </div>
                    <div
                      style={{
                        ...styles.itemIcon,
                        backgroundColor: `${getTypeColor(notification.type)}20`,
                      }}
                    >
                      {getTypeIcon(notification.type)}
                    </div>
                    <div style={styles.itemContent}>
                      <div style={styles.itemHeader}>
                        <span style={styles.itemTitle}>{notification.title}</span>
                        {!notification.isRead && <span style={styles.unreadDot} />}
                      </div>
                      <div style={styles.itemMessage}>{notification.message}</div>
                      <div style={styles.itemMeta}>
                        <span style={styles.itemTime}>
                          {new Date(notification.createdAt).toLocaleString('zh-CN')}
                        </span>
                        {notification.entity && (
                          <span style={styles.itemEntity}>
                            {notification.entity.type}: {notification.entity.name}
                          </span>
                        )}
                      </div>
                      {notification.actionUrl && (
                        <a
                          href={notification.actionUrl}
                          style={styles.actionLink}
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          {notification.actionLabel || '查看详情'}
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(notification.id)}
                      style={styles.deleteButton}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bellContainer: {
    position: 'relative' as const,
  },
  bellButton: {
    position: 'relative' as const,
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  bellIcon: {
    fontSize: '18px',
  },
  badge: {
    position: 'absolute' as const,
    top: '-4px',
    right: '-4px',
    minWidth: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#ef4444',
    borderRadius: '9px',
    border: '2px solid #fff',
  },
  panel: {
    position: 'absolute' as const,
    width: '400px',
    maxHeight: '600px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
  },
  panelTopRight: {
    top: '50px',
    right: 0,
  },
  panelTopLeft: {
    top: '50px',
    left: 0,
  },
  panelBottomRight: {
    bottom: '50px',
    right: 0,
  },
  panelBottomLeft: {
    bottom: '50px',
    left: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  unreadCount: {
    fontSize: '13px',
    color: '#6b7280',
  },
  closeButton: {
    fontSize: '18px',
    color: '#9ca3af',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  },
  filters: {
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
  },
  categoryFilter: {
    display: 'flex',
    gap: '6px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  statusFilter: {
    display: 'flex',
    gap: '6px',
  },
  filterButton: {
    padding: '4px 10px',
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    borderColor: '#3b82f6',
  },
  batchBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: '#eff6ff',
    borderBottom: '1px solid #bfdbfe',
  },
  batchCount: {
    fontSize: '13px',
    color: '#1e40af',
    fontWeight: 500,
  },
  batchActions: {
    display: 'flex',
    gap: '8px',
  },
  batchActionButton: {
    padding: '4px 10px',
    fontSize: '12px',
    color: '#3b82f6',
    backgroundColor: '#fff',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  batchDeleteButton: {
    padding: '4px 10px',
    fontSize: '12px',
    color: '#ef4444',
    backgroundColor: '#fff',
    border: '1px solid #fecaca',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  list: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '8px',
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
  markAllButton: {
    width: '100%',
    padding: '8px',
    marginBottom: '8px',
    fontSize: '13px',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  item: {
    display: 'flex',
    gap: '10px',
    padding: '12px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  itemRead: {
    opacity: 0.6,
  },
  itemCheckbox: {
    display: 'flex',
    alignItems: 'flex-start',
    paddingTop: '2px',
  },
  checkbox: {
    cursor: 'pointer',
  },
  itemIcon: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    fontSize: '16px',
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
  },
  itemTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  unreadDot: {
    width: '6px',
    height: '6px',
    backgroundColor: '#3b82f6',
    borderRadius: '50%',
    flexShrink: 0,
  },
  itemMessage: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '6px',
    lineHeight: 1.4,
  },
  itemMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: '#9ca3af',
  },
  itemTime: {},
  itemEntity: {},
  actionLink: {
    display: 'inline-block',
    marginTop: '4px',
    fontSize: '13px',
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: 500,
  },
  deleteButton: {
    padding: '4px',
    fontSize: '14px',
    color: '#9ca3af',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
  },
};

export default NotificationCenter;
