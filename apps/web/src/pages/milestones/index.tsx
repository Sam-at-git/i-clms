import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { MilestoneList, MilestoneFilter } from './components';
import { GetProjectMilestonesDocument } from '@i-clms/shared/generated/graphql';
import { MilestoneStatus as GraphqlMilestoneStatus } from '@i-clms/shared/generated/graphql';

// Export local enum for compatibility
export enum MilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DELIVERED = 'DELIVERED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

interface Milestone {
  id: string;
  sequence: number;
  name: string;
  deliverables: string | null;
  amount: string | null;
  paymentPercentage: string | null;
  plannedDate: string | null;
  actualDate: string | null;
  acceptanceCriteria: string | null;
  status: GraphqlMilestoneStatus;
  deliverableFileUrl: string | null;
  deliverableFileName: string | null;
  deliverableUploadedAt: string | null;
  acceptedAt: string | null;
  acceptedBy: string | null;
  acceptedByName: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  rejectedByName: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  contract: {
    id: string;
    contractNo: string;
    name: string;
    customerId: string;
    customer: {
      id: string;
      name: string;
    };
  };
  // For milestone overview items
  contractNo?: string;
  customerName?: string;
  daysOverdue?: number | null;
}

interface FilterState {
  status: GraphqlMilestoneStatus | '';
  searchTerm: string;
}

export function MilestonesPage() {
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    searchTerm: '',
  });
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  const { data, loading, error, refetch } = useQuery(GetProjectMilestonesDocument, {
    fetchPolicy: 'network-only',
  });

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  // Placeholder functions for milestone actions
  // GitHub Issue: Implement milestone status update and accept mutations
  // Backend mutations (updateMilestoneStatus, acceptMilestone) exist in DeliveryService
  // These handlers should use useUpdateMilestoneStatusMutation and useAcceptMilestoneMutation
  const handleStatusUpdate = async (_id: string, _status: GraphqlMilestoneStatus, _notes?: string) => {
    // Placeholder: Backend mutations need to be wired up via graphql-codegen
    alert('里程碑状态更新功能开发中');
  };

  const handleAcceptMilestone = async (_id: string, _notes?: string) => {
    // Placeholder: Backend mutations need to be wired up via graphql-codegen
    alert('里程碑验收功能开发中');
  };

  const milestones: Milestone[] = (data as any)?.projectMilestones || [];

  // Filter by status
  const statusFiltered = filters.status
    ? milestones.filter((m) => m.status === filters.status)
    : milestones;

  // Filter by search term
  const filteredMilestones = statusFiltered.filter((m) => {
    if (!filters.searchTerm) return true;
    const term = filters.searchTerm.toLowerCase();
    return (
      m.name.toLowerCase().includes(term) ||
      (m.contract?.name?.toLowerCase().includes(term)) ||
      (m.contract?.contractNo?.toLowerCase().includes(term)) ||
      (m.contract?.customer?.name?.toLowerCase().includes(term))
    );
  });

  // Statistics
  const stats = {
    total: milestones.length,
    pending: milestones.filter((m) => m.status === GraphqlMilestoneStatus.Pending).length,
    inProgress: milestones.filter((m) => m.status === GraphqlMilestoneStatus.InProgress).length,
    delivered: milestones.filter((m) => m.status === GraphqlMilestoneStatus.Delivered).length,
    accepted: milestones.filter((m) => m.status === GraphqlMilestoneStatus.Accepted).length,
    rejected: milestones.filter((m) => m.status === GraphqlMilestoneStatus.Rejected).length,
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <p>加载数据时出错</p>
          <p style={styles.errorDetail}>{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>里程碑管理</h1>
          <p style={styles.subtitle}>管理项目里程碑、交付物和验收流程</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.total}</div>
          <div style={styles.statLabel}>总里程碑</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#6b7280' }}>{stats.pending}</div>
          <div style={styles.statLabel}>待开始</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#3b82f6' }}>{stats.inProgress}</div>
          <div style={styles.statLabel}>进行中</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#f59e0b' }}>{stats.delivered}</div>
          <div style={styles.statLabel}>已交付</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#10b981' }}>{stats.accepted}</div>
          <div style={styles.statLabel}>已验收</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#ef4444' }}>{stats.rejected}</div>
          <div style={styles.statLabel}>被拒绝</div>
        </div>
      </div>

      {/* Filters */}
      <MilestoneFilter filters={filters as any} onFilterChange={handleFilterChange} />

      {/* Milestone List */}
      <MilestoneList
        milestones={filteredMilestones as any}
        onSelectMilestone={(milestone) => setSelectedMilestone(milestone as unknown as Milestone)}
        onStatusUpdate={handleStatusUpdate as any}
        onAcceptMilestone={handleAcceptMilestone}
        MilestoneStatus={MilestoneStatus}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1f2937',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1f2937',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    color: '#6b7280',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  error: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    color: '#dc2626',
  },
  errorDetail: {
    fontSize: '12px',
    color: '#6b7280',
  },
};

export default MilestonesPage;
