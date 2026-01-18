import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { ProjectMap, MilestoneTracker, ResourceChart } from './components';

const PROJECT_OVERVIEW_QUERY = gql`
  query ProjectOverview {
    projectOverview {
      totalProjects
      byStatus {
        status
        count
      }
      byCustomer {
        customerId
        customerName
        projectCount
        activeCount
      }
      completionRate
    }
  }
`;

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

const RESOURCE_UTILIZATION_QUERY = gql`
  query ResourceUtilization {
    resourceUtilization {
      totalStaffContracts
      byRole {
        role
        count
        totalValue
      }
      monthlyTrend {
        month
        hoursAllocated
        value
      }
    }
  }
`;

export function DeliveryPage() {
  const {
    data: projectData,
    loading: projectLoading,
    error: projectError,
  } = useQuery(PROJECT_OVERVIEW_QUERY);

  const {
    data: milestoneData,
    loading: milestoneLoading,
    error: milestoneError,
  } = useQuery(MILESTONE_OVERVIEW_QUERY);

  const {
    data: resourceData,
    loading: resourceLoading,
    error: resourceError,
  } = useQuery(RESOURCE_UTILIZATION_QUERY);

  if (projectLoading || milestoneLoading || resourceLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (projectError || milestoneError || resourceError) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <p>加载数据时出错</p>
          <p style={styles.errorDetail}>
            {projectError?.message ||
              milestoneError?.message ||
              resourceError?.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>交付管理仪表盘</h1>
        <p style={styles.subtitle}>项目交付全景、里程碑跟踪、资源利用率</p>
      </div>

      <div style={styles.content}>
        <section style={styles.section}>
          <ProjectMap
            totalProjects={projectData?.projectOverview?.totalProjects || 0}
            byStatus={projectData?.projectOverview?.byStatus || []}
            byCustomer={projectData?.projectOverview?.byCustomer || []}
            completionRate={projectData?.projectOverview?.completionRate || 0}
          />
        </section>

        <section style={styles.section}>
          <MilestoneTracker
            totalMilestones={milestoneData?.milestoneOverview?.totalMilestones || 0}
            completedCount={milestoneData?.milestoneOverview?.completedCount || 0}
            pendingCount={milestoneData?.milestoneOverview?.pendingCount || 0}
            overdueCount={milestoneData?.milestoneOverview?.overdueCount || 0}
            upcomingMilestones={
              milestoneData?.milestoneOverview?.upcomingMilestones || []
            }
            overdueMilestones={
              milestoneData?.milestoneOverview?.overdueMilestones || []
            }
          />
        </section>

        <section style={styles.section}>
          <ResourceChart
            totalStaffContracts={
              resourceData?.resourceUtilization?.totalStaffContracts || 0
            }
            byRole={resourceData?.resourceUtilization?.byRole || []}
            monthlyTrend={resourceData?.resourceUtilization?.monthlyTrend || []}
          />
        </section>
      </div>
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
    marginBottom: '32px',
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
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  section: {
    flex: 1,
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

export default DeliveryPage;
