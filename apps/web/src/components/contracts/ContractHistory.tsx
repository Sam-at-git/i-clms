import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Timeline } from '../ui/Timeline';

const GET_AUDIT_LOGS = gql`
  query GetContractAuditLogs($contractId: String!, $page: Int, $pageSize: Int) {
    auditLogs(
      filter: { entityType: "Contract", entityId: $contractId }
      page: $page
      pageSize: $pageSize
    ) {
      items {
        id
        action
        createdAt
        operator {
          id
          name
          email
        }
        newValue
        oldValue
      }
      total
    }
  }
`;

interface ContractHistoryProps {
  contractId: string;
  limit?: number;
}

export function ContractHistory({ contractId, limit = 10 }: ContractHistoryProps) {
  const { loading, error, data } = useQuery(GET_AUDIT_LOGS, {
    variables: {
      contractId,
      page: 1,
      pageSize: limit,
    },
    fetchPolicy: 'cache-and-network',
  });

  if (loading) return <div style={styles.loading}>加载中...</div>;
  if (error) return <div style={styles.error}>加载失败: {error.message}</div>;
  const auditData = data as any;

  if (!auditData?.auditLogs?.items?.length) {
    return <div style={styles.empty}>暂无变更记录</div>;
  }

  const timelineItems = auditData.auditLogs.items.map((log: any) => ({
    title: formatAction(log.action),
    description: formatChangeDescription(log.oldValue, log.newValue),
    timestamp: formatTimestamp(log.createdAt),
    status: 'completed' as const,
  }));

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>变更历史</h3>
      <Timeline items={timelineItems} />
      {auditData.auditLogs.total > limit && (
        <div style={styles.moreInfo}>
          共 {auditData.auditLogs.total} 条记录，仅显示最近 {limit} 条
        </div>
      )}
    </div>
  );
}

function formatAction(action: string): string {
  const actionMap: Record<string, string> = {
    CREATE: '创建合同',
    UPDATE: '更新合同',
    DELETE: '删除合同',
    STATUS_CHANGE: '状态变更',
    PARSE: '合同解析',
    REVIEW: '人工审核',
    APPROVE: '审批通过',
    REJECT: '审批拒绝',
    TAG_ADD: '添加标签',
    TAG_REMOVE: '移除标签',
  };
  return actionMap[action] || action;
}

function formatChangeDescription(oldValue: any, newValue: any): string {
  if (!oldValue && !newValue) return '';

  try {
    const oldObj = typeof oldValue === 'string' ? JSON.parse(oldValue) : oldValue;
    const newObj = typeof newValue === 'string' ? JSON.parse(newValue) : newValue;

    const changes: string[] = [];

    // Compare fields
    if (oldObj && newObj) {
      for (const key in newObj) {
        if (oldObj[key] !== newObj[key]) {
          changes.push(`${key}: ${oldObj[key]} → ${newObj[key]}`);
        }
      }
    } else if (newObj) {
      // New object created
      const keys = Object.keys(newObj).slice(0, 3);
      keys.forEach((key) => {
        changes.push(`${key}: ${newObj[key]}`);
      });
    }

    return changes.join('\n');
  } catch {
    // If parsing fails, return simple message
    return newValue ? '数据已更新' : '';
  }
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;

  return date.toLocaleDateString('zh-CN');
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 16px 0',
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
  },
  loading: {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
  },
  error: {
    padding: '24px',
    textAlign: 'center',
    color: '#ef4444',
    fontSize: '14px',
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '14px',
  },
  moreInfo: {
    marginTop: '12px',
    fontSize: '12px',
    color: '#9ca3af',
    textAlign: 'center',
  },
};

export default ContractHistory;
