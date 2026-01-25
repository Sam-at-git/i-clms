import { useQuery } from '@apollo/client';
import { GET_CUSTOMER_BY_ID } from '../../graphql/customers';
import { gql } from '@apollo/client';

interface CustomerTimelineProps {
  customerId: string;
  customerName?: string;
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  STAFF_AUGMENTATION: '人力框架',
  PROJECT_OUTSOURCING: '项目外包',
  PRODUCT_SALES: '产品购销',
};

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  DRAFT: '草拟',
  PENDING_APPROVAL: '审批中',
  ACTIVE: '已生效',
  EXECUTING: '执行中',
  COMPLETED: '已完结',
  TERMINATED: '已终止',
  EXPIRED: '已过期',
};

const CONTRACT_STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  PENDING_APPROVAL: '#f59e0b',
  ACTIVE: '#10b981',
  EXECUTING: '#3b82f6',
  COMPLETED: '#6366f1',
  TERMINATED: '#ef4444',
  EXPIRED: '#9ca3af',
};

// TODO: 合同事件查询 - milestones和auditLogs字段待后端实现
// const GET_CONTRACT_EVENTS = gql`
//   query GetContractEvents($contractId: ID!) {
//     contract(id: $contractId) {
//       id
//       createdAt
//       signedAt
//       effectiveAt
//       expiresAt
//       updatedAt
//     }
//   }
// `;

export function CustomerTimeline({
  customerId,
  customerName,
}: CustomerTimelineProps) {
  const { data, loading } = useQuery(GET_CUSTOMER_BY_ID, {
    variables: { id: customerId },
    fetchPolicy: 'cache-and-network',
  });

  const customer = data?.customer;
  const contracts = customer?.contracts || [];

  // Build timeline events from contracts
  const timelineEvents = contracts
    .map((contract: any) => {
      const events: any[] = [];

      // Contract creation
      events.push({
        id: `${contract.id}-created`,
        type: 'contract_created',
        date: new Date(contract.createdAt),
        contract,
        title: '合同创建',
        description: `创建合同 "${contract.name}"`,
        icon: '📄',
      });

      // Contract signed
      if (contract.signedAt) {
        events.push({
          id: `${contract.id}-signed`,
          type: 'contract_signed',
          date: new Date(contract.signedAt),
          contract,
          title: '合同签署',
          description: `合同 "${contract.name}" 已签署`,
          icon: '✍️',
        });
      }

      // Contract effective
      if (contract.effectiveAt) {
        events.push({
          id: `${contract.id}-effective`,
          type: 'contract_effective',
          date: new Date(contract.effectiveAt),
          contract,
          title: '合同生效',
          description: `合同 "${contract.name}" 生效`,
          icon: '✅',
        });
      }

      // Contract expires
      if (contract.expiresAt) {
        events.push({
          id: `${contract.id}-expires`,
          type: 'contract_expires',
          date: new Date(contract.expiresAt),
          contract,
          title: '合同到期',
          description: `合同 "${contract.name}" 到期`,
          icon: '⏰',
        });
      }

      return events;
    })
    .flat()
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  // Group events by date
  const groupedEvents = timelineEvents.reduce((acc: any, event: any) => {
    const dateKey = event.date.toLocaleDateString('zh-CN');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {});

  const formatCurrency = (amount: string) => {
    return `¥${parseFloat(amount || 0).toLocaleString()}`;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>加载中...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>客户未找到</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h3 style={styles.title}>合同时间线</h3>
          {customerName && <span style={styles.customerName}>{customerName}</span>}
        </div>
        <div style={styles.stats}>
          <div style={styles.stat}>
            <span style={styles.statValue}>{contracts.length}</span>
            <span style={styles.statLabel}>总合同数</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statValue}>
              {contracts
                .reduce((sum: number, c: any) => sum + parseFloat(c.amountWithTax || 0), 0)
                .toLocaleString()}
            </span>
            <span style={styles.statLabel}>总金额</span>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {timelineEvents.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📅</div>
          <div style={styles.emptyText}>暂无合同记录</div>
          <div style={styles.emptySubtext}>
            该客户还没有任何合同记录
          </div>
        </div>
      )}

      {/* Timeline */}
      {timelineEvents.length > 0 && (
        <div style={styles.timeline}>
          {Object.entries(groupedEvents).map(([dateLabel, events]: [string, any[]]) => (
            <div key={dateLabel} style={styles.timelineGroup}>
              <div style={styles.timelineDate}>{dateLabel}</div>
              {events.map((event: any) => (
                <div key={event.id} style={styles.timelineEvent}>
                  <div style={styles.timelineDot}>
                    <span style={styles.timelineIcon}>{event.icon}</span>
                  </div>
                  <div style={styles.timelineContent}>
                    <div style={styles.eventHeader}>
                      <span style={styles.eventTitle}>{event.title}</span>
                      <span style={styles.eventTime}>
                        {event.date.toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div style={styles.eventDescription}>
                      {event.description}
                    </div>
                    <div style={styles.eventContract}>
                      <div style={styles.eventContractInfo}>
                        <span style={styles.contractLabel}>合同:</span>
                        <a
                          href={`/contracts/${event.contract.id}`}
                          style={styles.contractLink}
                        >
                          {event.contract.name}
                        </a>
                      </div>
                      <div style={styles.eventContractMeta}>
                        <span style={styles.eventMeta}>
                          <span style={styles.eventContractNo}>{event.contract.contractNo}</span>
                          <span
                            style={{
                              ...styles.eventStatusBadge,
                              backgroundColor: CONTRACT_STATUS_COLORS[event.contract.status],
                            }}
                          >
                            {CONTRACT_STATUS_LABELS[event.contract.status]}
                          </span>
                        </span>
                        <span style={styles.eventMeta}>
                          <span style={styles.eventType}>
                            {CONTRACT_TYPE_LABELS[event.contract.type]}
                          </span>
                          <span style={styles.eventAmount}>
                            {formatCurrency(event.contract.amountWithTax)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '20px',
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
  },
  error: {
    padding: '40px',
    textAlign: 'center',
    color: '#ef4444',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  customerName: {
    fontSize: '14px',
    color: '#6b7280',
  },
  stats: {
    display: 'flex',
    gap: '24px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
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
  timeline: {
    position: 'relative',
  },
  timelineGroup: {
    marginBottom: '32px',
  },
  timelineDate: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: '16px',
    padding: '8px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  timelineEvent: {
    display: 'flex',
    marginBottom: '24px',
    position: 'relative',
  },
  timelineDot: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginRight: '16px',
  },
  timelineIcon: {
    fontSize: '18px',
  },
  timelineContent: {
    flex: 1,
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  eventTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#111827',
  },
  eventTime: {
    fontSize: '13px',
    color: '#6b7280',
  },
  eventDescription: {
    fontSize: '14px',
    color: '#374151',
    marginBottom: '12px',
  },
  eventContract: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    border: '1px solid #e5e7eb',
  },
  eventContractInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    fontSize: '13px',
  },
  contractLabel: {
    color: '#6b7280',
    fontWeight: 500,
  },
  contractLink: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: 500,
  },
  eventContractMeta: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  eventMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  eventContractNo: {
    fontSize: '12px',
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  eventStatusBadge: {
    padding: '2px 8px',
    fontSize: '11px',
    color: '#fff',
    borderRadius: '4px',
    fontWeight: 500,
  },
  eventType: {
    fontSize: '12px',
    color: '#6b7280',
  },
  eventAmount: {
    fontSize: '13px',
    color: '#059669',
    fontWeight: 600,
  },
};

export default CustomerTimeline;
