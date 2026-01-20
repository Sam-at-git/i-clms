import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { MilestoneList, MilestoneFilter } from './components';

// Use milestoneOverview query from the delivery module
const MILESTONE_OVERVIEW_QUERY = gql`
  query MilestoneOverview {
    milestoneOverview {
      totalMilestones
      completedCount
      pendingCount
      overdueCount
      upcomingMilestones {
        id
        name
        contractNo
        customerName
        plannedDate
        actualDate
        status
        amount
        daysOverdue
      }
      overdueMilestones {
        id
        name
        contractNo
        customerName
        plannedDate
        actualDate
        status
        amount
        daysOverdue
      }
    }
  }
`;

// Get all project milestones (this will need to be added to backend if not exists)
const ALL_MILESTONES_QUERY = gql`
  query GetAllMilestones {
    projectMilestones(
      orderBy: { plannedDate: asc }
      include: {
        detail: {
          include: {
            contract: {
              include: {
                customer: true
              }
            }
          }
        }
      }
    ) {
      id
      sequence
      name
      deliverables
      amount
      paymentPercentage
      plannedDate
      actualDate
      acceptanceCriteria
      status
      deliverableFileUrl
      deliverableFileName
      deliverableUploadedAt
      acceptedAt
      acceptedBy
      rejectedAt
      rejectedBy
      rejectionReason
      createdAt
      updatedAt
      detail {
        contract {
          id
          contractNo
          name
          customer {
            id
            fullName
          }
        }
      }
    }
  }
`;

const UPDATE_MILESTONE_STATUS = gql`
  mutation UpdateMilestoneStatus($id: String!, $status: MilestoneStatus!, $notes: String) {
    updateMilestoneStatus(input: { id: $id, status: $status, notes: $notes }) {
      id
      status
      actualDate
      updatedAt
    }
  }
`;

const UPLOAD_DELIVERABLE = gql`
  mutation UploadDeliverable($milestoneId: String!, $fileUrl: String!, $fileName: String!, $description: String) {
    uploadDeliverable(input: { milestoneId: $milestoneId, fileUrl: $fileUrl, fileName: $fileName, description: $description }) {
      id
      status
      deliverableFileUrl
      deliverableFileName
      deliverableUploadedAt
      actualDate
      updatedAt
    }
  }
`;

const ACCEPT_MILESTONE = gql`
  mutation AcceptMilestone($id: String!, $notes: String) {
    acceptMilestone(input: { id: $id, notes: $notes }) {
      id
      status
      acceptedAt
      acceptedBy
      rejectedAt
      rejectedBy
      rejectionReason
      updatedAt
    }
  }
`;

const REJECT_MILESTONE = gql`
  mutation RejectMilestone($id: String!, $reason: String!) {
    rejectMilestone(input: { id: $id, reason: $reason }) {
      id
      status
      rejectedAt
      rejectedBy
      rejectionReason
      acceptedAt
      acceptedBy
      updatedAt
    }
  }
`;

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
  amount: { toString: () => string } | null;
  paymentPercentage: { toString: () => string } | null;
  plannedDate: Date | null;
  actualDate: Date | null;
  acceptanceCriteria: string | null;
  status: MilestoneStatus;
  deliverableFileUrl: string | null;
  deliverableFileName: string | null;
  deliverableUploadedAt: Date | null;
  acceptedAt: Date | null;
  acceptedBy: string | null;
  rejectedAt: Date | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  detail?: {
    contract: {
      id: string;
      contractNo: string;
      name: string;
      customer: {
        id: string;
        fullName: string;
      };
    };
  };
  // For milestone overview items
  contractNo?: string;
  customerName?: string;
  daysOverdue?: number | null;
}

interface FilterState {
  status: MilestoneStatus | '';
  searchTerm: string;
}

export function MilestonesPage() {
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    searchTerm: '',
  });
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  const { data, loading, error, refetch } = useQuery(ALL_MILESTONES_QUERY, {
    fetchPolicy: 'network-only',
  });

  const [updateStatus] = useMutation(UPDATE_MILESTONE_STATUS);
  const [uploadDeliverable] = useMutation(UPLOAD_DELIVERABLE);
  const [acceptMilestone] = useMutation(ACCEPT_MILESTONE);
  const [rejectMilestone] = useMutation(REJECT_MILESTONE);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleStatusUpdate = async (id: string, status: MilestoneStatus, notes?: string) => {
    try {
      await updateStatus({
        variables: { id, status, notes },
      });
      refetch();
    } catch (err) {
      console.error('Failed to update milestone status:', err);
      throw err;
    }
  };

  const handleUploadDeliverable = async (
    milestoneId: string,
    fileUrl: string,
    fileName: string,
    description?: string
  ) => {
    try {
      await uploadDeliverable({
        variables: { milestoneId, fileUrl, fileName, description },
      });
      refetch();
    } catch (err) {
      console.error('Failed to upload deliverable:', err);
      throw err;
    }
  };

  const handleAcceptMilestone = async (id: string, notes?: string) => {
    try {
      await acceptMilestone({
        variables: { id, notes },
      });
      refetch();
    } catch (err) {
      console.error('Failed to accept milestone:', err);
      throw err;
    }
  };

  const handleRejectMilestone = async (id: string, reason: string) => {
    try {
      await rejectMilestone({
        variables: { id, reason },
      });
      refetch();
    } catch (err) {
      console.error('Failed to reject milestone:', err);
      throw err;
    }
  };

  const milestones: Milestone[] = data?.projectMilestones || [];

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
      (m.detail?.contract.name?.toLowerCase().includes(term)) ||
      (m.detail?.contract.contractNo?.toLowerCase().includes(term)) ||
      (m.detail?.contract.customer.fullName?.toLowerCase().includes(term))
    );
  });

  // Statistics
  const stats = {
    total: milestones.length,
    pending: milestones.filter((m) => m.status === MilestoneStatus.PENDING).length,
    inProgress: milestones.filter((m) => m.status === MilestoneStatus.IN_PROGRESS).length,
    delivered: milestones.filter((m) => m.status === MilestoneStatus.DELIVERED).length,
    accepted: milestones.filter((m) => m.status === MilestoneStatus.ACCEPTED).length,
    rejected: milestones.filter((m) => m.status === MilestoneStatus.REJECTED).length,
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
      <MilestoneFilter filters={filters} onFilterChange={handleFilterChange} />

      {/* Milestone List */}
      <MilestoneList
        milestones={filteredMilestones}
        onSelectMilestone={setSelectedMilestone}
        onStatusUpdate={handleStatusUpdate}
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
