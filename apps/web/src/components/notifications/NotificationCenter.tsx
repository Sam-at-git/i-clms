import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useGetNotificationsQuery, useGetNotificationCountQuery, useMarkNotificationReadMutation, useMarkAllNotificationsReadMutation, useArchiveNotificationMutation, useDeleteNotificationMutation } from '@i-clms/shared/generated/graphql';

export type NotificationCategory = 'all' | 'CONTRACT_EXPIRY' | 'PAYMENT_OVERDUE' | 'CONTRACT_APPROVAL' | 'MILESTONE_DUE' | 'RISK_ALERT' | 'SYSTEM_ANNOUNCEMENT' | 'MENTION' | 'TASK_ASSIGNED' | 'DOCUMENT_SHARED';

export interface Notification {
  id: string;
  type: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  title: string;
  message: string;
  link?: string;
  readAt?: string;
  createdAt: string;
  expiresAt?: string;
  metadata?: any;
}

interface NotificationCenterProps {
  currentUserId: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  onNotificationClick?: (notification: Notification) => void;
}

const NOTIFICATION_TYPE_INFO = {
  CONTRACT_EXPIRY: { label: '合同到期', icon: '📅', color: '#f59e0b' },
  PAYMENT_OVERDUE: { label: '付款逾期', icon: '💰', color: '#ef4444' },
  CONTRACT_APPROVAL: { label: '合同审批', icon: '✍️', color: '#3b82f6' },
  MILESTONE_DUE: { label: '里程碑到期', icon: '🎯', color: '#8b5cf6' },
  RISK_ALERT: { label: '风险告警', icon: '⚠️', color: '#dc2626' },
  SYSTEM_ANNOUNCEMENT: { label: '系统公告', icon: '📢', color: '#6b7280' },
  MENTION: { label: '提及', icon: '🔔', color: '#06b6d4' },
  TASK_ASSIGNED: { label: '任务分配', icon: '📋', color: '#10b981' },
  DOCUMENT_SHARED: { label: '文档共享', icon: '📄', color: '#6366f1' },
};

const PRIORITY_STYLES = {
  LOW: { label: '低', color: '#9ca3af' },
  NORMAL: { label: '普通', color: '#3b82f6' },
  HIGH: { label: '高', color: '#f59e0b' },
  URGENT: { label: '紧急', color: '#ef4444' },
};

export function NotificationCenter({
  currentUserId,
  position = 'top-right',
  onNotificationClick,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  const { data, loading, refetch } = useGetNotificationsQuery({
    variables: {
      unreadOnly: showUnreadOnly,
      type: selectedCategory === 'all' ? undefined : selectedCategory,
      limit: 50,
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: 30000, // Auto-refresh every 30 seconds
  });

  const { data: countData } = useGetNotificationCountQuery({
    fetchPolicy: 'cache-and-network',
    pollInterval: 15000, // Auto-refresh count every 15 seconds
  });

  const [markRead] = useMarkNotificationReadMutation({
    onCompleted: () => refetch(),
  });

  const [markAllRead] = useMarkAllNotificationsReadMutation({
    onCompleted: () => refetch(),
  });

  const [archive] = useArchiveNotificationMutation({
    onCompleted: () => refetch(),
  });

  const [deleteNotif] = useDeleteNotificationMutation({
    onCompleted: () => refetch(),
  });

  const notifications = data?.notifications?.items || [];
  const totalCount = data?.notifications?.total || 0;
  const unreadCount = countData?.notificationCount || 0;

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.readAt) {
      await markRead({ variables: { id: notification.id } });
    }

    // Call custom click handler
    if (onNotificationClick && notification.link) {
      onNotificationClick(notification);
    }

    // Close panel
    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  const handleArchive = async (notification: Notification, event: React.MouseEvent) => {
    event.stopPropagation();
    await archive({ variables: { id: notification.id } });
  };

  const handleDelete = async (notification: Notification, event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirm('确定要删除此通知吗？')) {
      await deleteNotif({ variables: { id: notification.id } });
    }
  };

  const handleBatchMarkAsRead = async () => {
    for (const id of selectedIds) {
      await markRead({ variables: { id } });
    }
    setSelectedIds(new Set());
  };

  const handleBatchDelete = async () => {
    for (const id of selectedIds) {
      await deleteNotif({ variables: { id } });
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

  const getTypeInfo = (type: string) => {
    return NOTIFICATION_TYPE_INFO[type as keyof typeof NOTIFICATION_TYPE_INFO] || NOTIFICATION_TYPE_INFO.SYSTEM_ANNOUNCEMENT;
  };

  const getPriorityStyle = (priority: string) => {
    return PRIORITY_STYLES[priority as keyof typeof PRIORITY_STYLES] || PRIORITY_STYLES.NORMAL;
  };

  const getRelativeTime = (date: string): string => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;

    return notificationDate.toLocaleDateString('zh-CN');
  };

  return (
    <>
      {/* Notification Bell */}
      <div style={styles.bellContainer}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={styles.bellButton}
          title="通知中心"
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
          ref={panelRef}
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
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as NotificationCategory)}
                style={styles.categorySelect}
              >
                <option value="all">全部类型</option>
                {Object.entries(NOTIFICATION_TYPE_INFO).map(([value, info]) => (
                  <option key={value} value={value}>
                    {info.icon} {info.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.statusFilter}>
              <button
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                style={{
                  ...styles.filterButton,
                  ...(showUnreadOnly && styles.filterButtonActive),
                }}
              >
                {showUnreadOnly ? '仅未读' : '全部'}
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
                  <button onClick={handleMarkAllRead} style={styles.markAllButton}>
                    全部标记为已读
                  </button>
                )}
                {notifications.map((notification) => {
                  const typeInfo = getTypeInfo(notification.type);
                  const priorityStyle = getPriorityStyle(notification.priority);
                  const isUnread = !notification.readAt;
                  const isSelected = selectedIds.has(notification.id);

                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      style={{
                        ...styles.item,
                        ...(isUnread && styles.itemUnread),
                        ...(isSelected && styles.itemSelected),
                      }}
                    >
                      <div style={styles.itemCheckbox}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
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
                          backgroundColor: `${typeInfo.color}20`,
                          color: typeInfo.color,
                        }}
                      >
                        {typeInfo.icon}
                      </div>
                      <div style={styles.itemContent}>
                        <div style={styles.itemHeader}>
                          <span style={styles.itemTitle}>{notification.title}</span>
                          <div style={styles.itemBadges}>
                            <span
                              style={{
                                ...styles.priorityBadge,
                                color: priorityStyle.color,
                                borderColor: priorityStyle.color,
                              }}
                            >
                              {priorityStyle.label}
                            </span>
                            {isUnread && <span style={styles.unreadDot} />}
                          </div>
                        </div>
                        <div style={styles.itemMessage}>{notification.message}</div>
                        <div style={styles.itemMeta}>
                          <span style={styles.itemTime}>{getRelativeTime(notification.createdAt)}</span>
                          {notification.expiresAt && (
                            <span style={styles.expiresAt}>
                              过期: {new Date(notification.expiresAt).toLocaleDateString('zh-CN')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={styles.itemActions}>
                        <button
                          onClick={(e) => handleArchive(notification, e)}
                          style={styles.actionButton}
                          title="归档"
                        >
                          📁
                        </button>
                        <button
                          onClick={(e) => handleDelete(notification, e)}
                          style={styles.actionButton}
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer */}
          {totalCount > 0 && (
            <div style={styles.footer}>
              <span style={styles.footerText}>
                共 {totalCount} 条通知
              </span>
              {notifications.length < totalCount && (
                <button
                  onClick={() => refetch()}
                  style={styles.loadMoreButton}
                >
                  加载更多
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bellContainer: {
    position: 'relative',
  },
  bellButton: {
    position: 'relative',
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
    position: 'absolute',
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
    position: 'absolute',
    width: '420px',
    maxHeight: '600px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
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
    fontWeight: 500,
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
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
  },
  categoryFilter: {
    flex: 1,
  },
  categorySelect: {
    width: '100%',
    padding: '6px 8px',
    fontSize: '13px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  statusFilter: {},
  filterButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
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
    overflowY: 'auto',
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
    width: 'calc(100% - 16px)',
    margin: '8px 8px 12px 8px',
    padding: '8px',
    fontSize: '13px',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
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
    transition: 'all 0.2s',
  },
  itemUnread: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  itemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#dbeafe',
  },
  itemCheckbox: {
    display: 'flex',
    alignItems: 'flex-start',
    paddingTop: '2px',
  },
  checkbox: {
    cursor: 'pointer',
    width: '16px',
    height: '16px',
  },
  itemIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  itemTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  itemBadges: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  priorityBadge: {
    padding: '2px 6px',
    fontSize: '10px',
    border: '1px solid',
    borderRadius: '3px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
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
    color: '#4b5563',
    marginBottom: '6px',
    lineHeight: '1.4',
  },
  itemMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '11px',
    color: '#9ca3af',
  },
  itemTime: {},
  expiresAt: {},
  itemActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  actionButton: {
    padding: '2px',
    fontSize: '14px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    opacity: 0.5,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderTop: '1px solid #e5e7eb',
  },
  footerText: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  loadMoreButton: {
    padding: '4px 10px',
    fontSize: '12px',
    color: '#3b82f6',
    backgroundColor: 'transparent',
    border: '1px solid #3b82f6',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default NotificationCenter;
