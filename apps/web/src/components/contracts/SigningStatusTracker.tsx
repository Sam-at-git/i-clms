// TODO: 签署记录功能待后端实现
// import { useQuery } from '@apollo/client';
// import { gql } from '@apollo/client';

// const GET_CONTRACT_SIGNING = gql`
//   query GetContractSigning($contractId: ID!) {
//     contractSigningRecords(contractId: $contractId) {
//       id
//       signerName
//       signerTitle
//       signerEmail
//       signerCompany
//       signerType
//       status
//       signedAt
//       signatureUrl
//       sequence
//       isCurrentSigner
//       rejectedAt
//       rejectedReason
//     }
//   }
// `;

interface SigningStatusTrackerProps {
  contractId: string;
  contractNo?: string;
}

const SIGNER_TYPE_LABELS: Record<string, string> = {
  FIRST_PARTY: '甲方',
  SECOND_PARTY: '乙方',
  WITNESS: '见证人',
  GUARANTOR: '担保方',
};

const SIGNER_TYPE_COLORS: Record<string, string> = {
  FIRST_PARTY: '#3b82f6',
  SECOND_PARTY: '#10b981',
  WITNESS: '#8b5cf6',
  GUARANTOR: '#f59e0b',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: '待签署',
  SIGNED: '已签署',
  REJECTED: '已拒绝',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  SIGNED: '#10b981',
  REJECTED: '#ef4444',
};

export function SigningStatusTracker({
  contractId,
  contractNo,
}: SigningStatusTrackerProps) {
  // TODO: 签署记录功能待后端实现
  // const { data, loading, refetch } = useQuery(GET_CONTRACT_SIGNING, {
  //   variables: { contractId },
  //   fetchPolicy: 'cache-and-network',
  // });
  // const signingRecords = data?.contractSigningRecords || [];

  const loading = false;
  const signingRecords: any[] = [];

  // Sort by sequence
  const sortedRecords = [...signingRecords].sort((a: any, b: any) => a.sequence - b.sequence);

  // Calculate overall progress
  const signedCount = signingRecords.filter((r: any) => r.status === 'SIGNED').length;
  const totalCount = signingRecords.length;
  const progressPercentage = totalCount > 0 ? (signedCount / totalCount) * 100 : 0;

  // Find current signer
  const currentSigner = signingRecords.find((r: any) => r.isCurrentSigner);
  const allSigned = signingRecords.length > 0 && signedCount === totalCount;
  const anyRejected = signingRecords.some((r: any) => r.status === 'REJECTED');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SIGNED':
        return '✓';
      case 'REJECTED':
        return '✕';
      default:
        return '⏳';
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>签署状态追踪</h3>
        {contractNo && <span style={styles.contractNo}>{contractNo}</span>}
      </div>

      {/* Loading */}
      {loading && (
        <div style={styles.loading}>加载中...</div>
      )}

      {/* Empty State */}
      {!loading && signingRecords.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>✍️</div>
          <div style={styles.emptyText}>暂无签署记录</div>
          <div style={styles.emptySubtext}>
            合同尚未配置签署流程
          </div>
        </div>
      )}

      {/* Progress Overview */}
      {!loading && signingRecords.length > 0 && (
        <>
          <div style={styles.progressSection}>
            <div style={styles.progressHeader}>
              <span style={styles.progressLabel}>签署进度</span>
              <span style={styles.progressValue}>
                {signedCount}/{totalCount} ({Math.round(progressPercentage)}%)
              </span>
            </div>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${progressPercentage}%`,
                  backgroundColor: anyRejected
                    ? '#ef4444'
                    : allSigned
                    ? '#10b981'
                    : '#3b82f6',
                }}
              />
            </div>
            <div style={styles.progressStatus}>
              {allSigned && <span style={styles.statusComplete}>✓ 全部签署完成</span>}
              {anyRejected && <span style={styles.statusRejected}>✕ 有签署方拒绝签署</span>}
              {!allSigned && !anyRejected && currentSigner && (
                <span style={styles.statusPending}>
                  当前待签署: {currentSigner.signerName}
                </span>
              )}
              {!allSigned && !anyRejected && !currentSigner && (
                <span style={styles.statusPending}>等待签署中...</span>
              )}
            </div>
          </div>

          {/* Signing Timeline */}
          <div style={styles.timelineSection}>
            <h4 style={styles.timelineTitle}>签署时间线</h4>
            <div style={styles.timeline}>
              {sortedRecords.map((record: any, index: number) => {
                const isLast = index === sortedRecords.length - 1;
                const isCurrent = record.isCurrentSigner;
                const isCompleted = record.status === 'SIGNED';
                const isRejected = record.status === 'REJECTED';

                return (
                  <div key={record.id} style={styles.timelineItem}>
                    <div style={styles.timelineDotWrapper}>
                      <div
                        style={{
                          ...styles.timelineDot,
                          ...(isCompleted && styles.timelineDotCompleted),
                          ...(isRejected && styles.timelineDotRejected),
                          ...(isCurrent && styles.timelineDotCurrent),
                        }}
                      >
                        {getStatusIcon(record.status)}
                      </div>
                      {!isLast && (
                        <div
                          style={{
                            ...styles.timelineLine,
                            ...(isCompleted && styles.timelineLineCompleted),
                          }}
                        />
                      )}
                    </div>

                    <div
                      style={{
                        ...styles.timelineContent,
                        ...(isCurrent && styles.timelineContentCurrent),
                      }}
                    >
                      <div style={styles.timelineHeader}>
                        <span style={styles.signerName}>{record.signerName}</span>
                        <span
                          style={{
                            ...styles.signerTypeBadge,
                            backgroundColor: SIGNER_TYPE_COLORS[record.signerType],
                          }}
                        >
                          {SIGNER_TYPE_LABELS[record.signerType]}
                        </span>
                        <span
                          style={{
                            ...styles.statusBadge,
                            backgroundColor: STATUS_COLORS[record.status],
                          }}
                        >
                          {STATUS_LABELS[record.status]}
                        </span>
                      </div>

                      <div style={styles.timelineDetails}>
                        {record.signerTitle && (
                          <div style={styles.detail}>
                            <span style={styles.detailLabel}>职务:</span>
                            {record.signerTitle}
                          </div>
                        )}
                        <div style={styles.detail}>
                          <span style={styles.detailLabel}>公司:</span>
                          {record.signerCompany}
                        </div>
                        {record.signerEmail && (
                          <div style={styles.detail}>
                            <span style={styles.detailLabel}>邮箱:</span>
                            {record.signerEmail}
                          </div>
                        )}
                      </div>

                      {/* Signing Info */}
                      {record.status === 'SIGNED' && record.signedAt && (
                        <div style={styles.signingInfo}>
                          <div style={styles.signingInfoItem}>
                            <span style={styles.signingInfoIcon}>✓</span>
                            <span>签署时间: {new Date(record.signedAt).toLocaleString('zh-CN')}</span>
                          </div>
                          {record.signatureUrl && (
                            <div style={styles.signaturePreview}>
                              <a
                                href={record.signatureUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={styles.signatureLink}
                              >
                                查看签名
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rejection Info */}
                      {record.status === 'REJECTED' && (
                        <div style={styles.rejectionInfo}>
                          <div style={styles.rejectionInfoItem}>
                            <span style={styles.rejectionIcon}>✕</span>
                            <span>拒绝时间: {new Date(record.rejectedAt).toLocaleString('zh-CN')}</span>
                          </div>
                          {record.rejectedReason && (
                            <div style={styles.rejectionReason}>
                              <div style={styles.rejectionReasonLabel}>拒绝原因:</div>
                              <div style={styles.rejectionReasonText}>{record.rejectedReason}</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Current Signer Indicator */}
                      {isCurrent && record.status === 'PENDING' && (
                        <div style={styles.currentSignerNotice}>
                          <span style={styles.currentSignerIcon}>⏳</span>
                          <span>当前签署人</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, backgroundColor: '#10b981' }} />
              <span style={styles.legendLabel}>已签署</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, backgroundColor: '#f59e0b' }} />
              <span style={styles.legendLabel}>待签署</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, backgroundColor: '#ef4444' }} />
              <span style={styles.legendLabel}>已拒绝</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, backgroundColor: '#3b82f6', border: '2px solid #3b82f6' }} />
              <span style={styles.legendLabel}>当前签署人</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  contractNo: {
    fontSize: '14px',
    color: '#6b7280',
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
  progressSection: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
  },
  progressLabel: {
    color: '#374151',
    fontWeight: 500,
  },
  progressValue: {
    color: '#111827',
    fontWeight: 600,
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s',
  },
  progressStatus: {
    fontSize: '13px',
    fontWeight: 500,
  },
  statusComplete: {
    color: '#10b981',
  },
  statusRejected: {
    color: '#ef4444',
  },
  statusPending: {
    color: '#f59e0b',
  },
  timelineSection: {
    marginBottom: '20px',
  },
  timelineTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  },
  timeline: {
    position: 'relative',
  },
  timelineItem: {
    display: 'flex',
    marginBottom: '24px',
  },
  timelineDotWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: '16px',
  },
  timelineDot: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 600,
    zIndex: 1,
    flexShrink: 0,
  },
  timelineDotCompleted: {
    backgroundColor: '#10b981',
    color: '#fff',
  },
  timelineDotRejected: {
    backgroundColor: '#ef4444',
    color: '#fff',
  },
  timelineDotCurrent: {
    border: '3px solid #3b82f6',
    backgroundColor: '#fff',
    color: '#3b82f6',
  },
  timelineLine: {
    width: '2px',
    flex: 1,
    backgroundColor: '#e5e7eb',
    marginTop: '4px',
    minHeight: '40px',
  },
  timelineLineCompleted: {
    backgroundColor: '#10b981',
  },
  timelineContent: {
    flex: 1,
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#fff',
  },
  timelineContentCurrent: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  timelineHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  signerName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#111827',
  },
  signerTypeBadge: {
    padding: '2px 8px',
    fontSize: '11px',
    color: '#fff',
    borderRadius: '4px',
    fontWeight: 500,
  },
  statusBadge: {
    padding: '2px 8px',
    fontSize: '11px',
    color: '#fff',
    borderRadius: '4px',
    fontWeight: 500,
  },
  timelineDetails: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  detail: {
    marginBottom: '2px',
  },
  detailLabel: {
    color: '#9ca3af',
    marginRight: '4px',
  },
  signingInfo: {
    marginTop: '8px',
    padding: '8px',
    backgroundColor: '#f0fdf4',
    borderRadius: '4px',
    fontSize: '13px',
  },
  signingInfoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#15803d',
    marginBottom: '6px',
  },
  signingInfoIcon: {
    color: '#10b981',
  },
  signaturePreview: {
    marginTop: '4px',
  },
  signatureLink: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '12px',
  },
  rejectionInfo: {
    marginTop: '8px',
    padding: '8px',
    backgroundColor: '#fef2f2',
    borderRadius: '4px',
    fontSize: '13px',
  },
  rejectionInfoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#b91c1c',
    marginBottom: '6px',
  },
  rejectionIcon: {
    color: '#ef4444',
  },
  rejectionReason: {
    marginTop: '4px',
  },
  rejectionReasonLabel: {
    fontSize: '12px',
    color: '#991b1b',
    fontWeight: 500,
    marginBottom: '2px',
  },
  rejectionReasonText: {
    fontSize: '12px',
    color: '#7f1d1d',
    fontStyle: 'italic',
  },
  currentSignerNotice: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '8px',
    padding: '4px 8px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    fontSize: '12px',
    borderRadius: '4px',
    fontWeight: 500,
  },
  currentSignerIcon: {
    fontSize: '14px',
  },
  legend: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#6b7280',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  legendLabel: {
    fontSize: '12px',
  },
};

export default SigningStatusTracker;
