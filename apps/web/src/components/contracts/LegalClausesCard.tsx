import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';

// Note: This will be available after API restart includes the new modules
const GET_CONTRACT_LEGAL_CLAUSES = gql`
  query GetContractLegalClauses($contractId: String!) {
    contractLegalClauses(contractId: $contractId) {
      id
      contractId
      clauseType
      licenseType
      licenseFee
      guarantor
      guaranteeType
      guaranteeAmount
      guaranteePeriod
      liabilityLimit
      exclusions
      compensationMethod
      terminationNotice
      breachLiability
      disputeResolution
      disputeLocation
      confidence
      originalText
    }
    contractDataProtection(contractId: $contractId) {
      id
      contractId
      involvesPersonalData
      personalDataType
      processingLocation
      crossBorderTransfer
      securityMeasures
      dataRetention
      riskLevel
      confidence
      originalText
    }
  }
`;

type ClauseType = 'INTELLECTUAL_PROPERTY' | 'GUARANTEE' | 'LIABILITY_LIMITATION' | 'TERMINATION_DISPUTE';

// Temporary types until graphql-codegen runs with updated schema
interface LegalClause {
  id: string | number;
  contractId: string;
  clauseType: ClauseType;
  licenseType?: string | null;
  licenseFee?: string | null;
  guarantor?: string | null;
  guaranteeType?: string | null;
  guaranteeAmount?: string | null;
  guaranteePeriod?: string | null;
  liabilityLimit?: string | null;
  exclusions?: string | null;
  compensationMethod?: string | null;
  terminationNotice?: string | null;
  breachLiability?: string | null;
  disputeResolution?: string | null;
  disputeLocation?: string | null;
  confidence?: number | null;
  originalText?: string | null;
}

interface DataProtection {
  id: string | number;
  contractId: string;
  involvesPersonalData: boolean;
  personalDataType?: string | null;
  processingLocation?: string | null;
  crossBorderTransfer?: string | null;
  securityMeasures?: string | null;
  dataRetention?: string | null;
  riskLevel: string;
  confidence?: number | null;
  originalText?: string | null;
}

interface LegalClausesCardProps {
  contractId: string;
}

export function LegalClausesCard({ contractId }: LegalClausesCardProps) {
  const { data, loading, error } = useQuery<{
    contractLegalClauses: LegalClause[];
    contractDataProtection: DataProtection;
  }>(GET_CONTRACT_LEGAL_CLAUSES, {
    variables: { contractId },
    skip: !contractId,
  });

  // Suppress error until API is restarted with new schema
  useEffect(() => {
    if (error) {
      console.warn('Legal clauses query failed (API may need restart):', error.message);
    }
  }, [error]);

  if (loading) {
    return (
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>法务条款</h2>
        <div style={styles.loading}>加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>法务条款</h2>
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>⚖️</span>
          <p style={styles.emptyText}>法务条款功能需要后端服务支持</p>
        </div>
      </div>
    );
  }

  const legalClauses: LegalClause[] = (data?.contractLegalClauses as LegalClause[]) || [];
  const dataProtection: DataProtection | undefined = data?.contractDataProtection as DataProtection | undefined;

  // 按条款类型分组
  const clausesByType: Record<ClauseType, LegalClause | null> = {
    INTELLECTUAL_PROPERTY: legalClauses.find((c) => c.clauseType === 'INTELLECTUAL_PROPERTY') || null,
    GUARANTEE: legalClauses.find((c) => c.clauseType === 'GUARANTEE') || null,
    LIABILITY_LIMITATION: legalClauses.find((c) => c.clauseType === 'LIABILITY_LIMITATION') || null,
    TERMINATION_DISPUTE: legalClauses.find((c) => c.clauseType === 'TERMINATION_DISPUTE') || null,
  };

  const hasAnyClauses =
    Object.values(clausesByType).some((c) => c !== null) || dataProtection;

  if (!hasAnyClauses) {
    return (
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>法务条款</h2>
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>⚖️</span>
          <p style={styles.emptyText}>暂未提取法务条款信息</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>法务条款</h2>
      <div style={styles.clausesGrid}>
        {/* 知识产权条款 */}
        {clausesByType.INTELLECTUAL_PROPERTY && (
          <IntellectualPropertyCard clause={clausesByType.INTELLECTUAL_PROPERTY!} />
        )}

        {/* 担保条款 */}
        {clausesByType.GUARANTEE && <GuaranteeCard clause={clausesByType.GUARANTEE!} />}

        {/* 责任限制条款 */}
        {clausesByType.LIABILITY_LIMITATION && (
          <LiabilityCard clause={clausesByType.LIABILITY_LIMITATION!} />
        )}

        {/* 终止争议条款 */}
        {clausesByType.TERMINATION_DISPUTE && (
          <TerminationCard clause={clausesByType.TERMINATION_DISPUTE!} />
        )}

        {/* 数据保护条款 */}
        {dataProtection && <DataProtectionCard clause={dataProtection} />}
      </div>
    </div>
  );
}

// 知识产权条款卡片
function IntellectualPropertyCard({ clause }: { clause: LegalClause }) {
  return (
    <div style={styles.clauseCard}>
      <div style={styles.clauseHeader}>
        <span style={styles.clauseIcon}>©</span>
        <h3 style={styles.clauseTitle}>知识产权条款</h3>
        <ConfidenceBadge confidence={clause.confidence} />
      </div>
      <div style={styles.clauseBody}>
        <Field label="许可类型" value={clause.licenseType} />
        <Field label="许可费用" value={clause.licenseFee} />
        {clause.originalText && <OriginalText text={clause.originalText} />}
      </div>
    </div>
  );
}

// 担保条款卡片
function GuaranteeCard({ clause }: { clause: LegalClause }) {
  const guarantorMap: Record<string, string> = {
    FIRST_PARTY: '甲方',
    SECOND_PARTY: '乙方',
    THIRD_PARTY: '第三方',
  };

  const typeMap: Record<string, string> = {
    GENERAL: '一般保证',
    JOINT_AND_SEVERAL: '连带责任保证',
  };

  return (
    <div style={styles.clauseCard}>
      <div style={styles.clauseHeader}>
        <span style={styles.clauseIcon}>🛡️</span>
        <h3 style={styles.clauseTitle}>担保条款</h3>
        <ConfidenceBadge confidence={clause.confidence} />
      </div>
      <div style={styles.clauseBody}>
        <Field
          label="担保方"
          value={clause.guarantor ? guarantorMap[clause.guarantor] || clause.guarantor : null}
        />
        <Field
          label="担保类型"
          value={clause.guaranteeType ? typeMap[clause.guaranteeType] || clause.guaranteeType : null}
        />
        <Field
          label="担保金额"
          value={clause.guaranteeAmount ? `¥${clause.guaranteeAmount}` : null}
        />
        <Field label="担保期限" value={clause.guaranteePeriod} />
        {clause.originalText && <OriginalText text={clause.originalText} />}
      </div>
    </div>
  );
}

// 责任限制条款卡片
function LiabilityCard({ clause }: { clause: LegalClause }) {
  return (
    <div style={styles.clauseCard}>
      <div style={styles.clauseHeader}>
        <span style={styles.clauseIcon}>⚖️</span>
        <h3 style={styles.clauseTitle}>责任限制条款</h3>
        <ConfidenceBadge confidence={clause.confidence} />
      </div>
      <div style={styles.clauseBody}>
        <Field
          label="责任上限"
          value={clause.liabilityLimit ? `¥${clause.liabilityLimit}` : null}
        />
        <Field label="除外责任" value={clause.exclusions} />
        <Field label="赔偿方式" value={clause.compensationMethod} />
        {clause.originalText && <OriginalText text={clause.originalText} />}
      </div>
    </div>
  );
}

// 终止争议条款卡片
function TerminationCard({ clause }: { clause: LegalClause }) {
  const resolutionMap: Record<string, string> = {
    ARBITRATION: '仲裁',
    LITIGATION: '诉讼',
    NEGOTIATION: '协商',
  };

  return (
    <div style={styles.clauseCard}>
      <div style={styles.clauseHeader}>
        <span style={styles.clauseIcon}>📋</span>
        <h3 style={styles.clauseTitle}>终止与争议条款</h3>
        <ConfidenceBadge confidence={clause.confidence} />
      </div>
      <div style={styles.clauseBody}>
        <Field label="便利终止通知期" value={clause.terminationNotice} />
        <Field
          label="争议解决方式"
          value={clause.disputeResolution ? resolutionMap[clause.disputeResolution] || clause.disputeResolution : null}
        />
        <Field label="争议解决地点" value={clause.disputeLocation} />
        {clause.breachLiability && (
          <div style={styles.field}>
            <label style={styles.fieldLabel}>违约责任</label>
            <p style={styles.fieldValue}>{clause.breachLiability}</p>
          </div>
        )}
        {clause.originalText && <OriginalText text={clause.originalText} />}
      </div>
    </div>
  );
}

// 数据保护条款卡片
function DataProtectionCard({ clause }: { clause: DataProtection }) {
  const riskLevelConfig: Record<string, { color: string; label: string }> = {
    NONE: { color: 'green', label: '无风险' },
    LOW: { color: 'blue', label: '低风险' },
    MEDIUM: { color: 'yellow', label: '中风险' },
    HIGH: { color: 'red', label: '高风险' },
  };

  const riskConfig = riskLevelConfig[clause.riskLevel] || riskLevelConfig.NONE;

  return (
    <div style={{ ...styles.clauseCard, ...styles.dataProtectionCard }}>
      <div style={styles.clauseHeader}>
        <span style={styles.clauseIcon}>🔒</span>
        <h3 style={styles.clauseTitle}>数据保护条款</h3>
        <span style={{ ...styles.riskBadge, ...styles[`risk${riskConfig.color}`] }}>
          {riskConfig.label}
        </span>
        <ConfidenceBadge confidence={clause.confidence} />
      </div>
      <div style={styles.clauseBody}>
        <BooleanField label="涉及个人数据" value={clause.involvesPersonalData} />
        <Field label="个人数据类型" value={clause.personalDataType} />
        <Field label="处理地点限制" value={clause.processingLocation} />
        <Field label="跨境传输要求" value={clause.crossBorderTransfer} />
        <Field label="安全措施" value={clause.securityMeasures} />
        <Field label="数据保留期限" value={clause.dataRetention} />
        {clause.originalText && <OriginalText text={clause.originalText} />}
      </div>
    </div>
  );
}

// 辅助组件
function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div style={styles.field}>
      <label style={styles.fieldLabel}>{label}</label>
      <p style={styles.fieldValue}>{value}</p>
    </div>
  );
}

function BooleanField({ label, value }: { label: string; value: boolean | null | undefined }) {
  if (value === null || value === undefined) return null;
  return (
    <div style={styles.field}>
      <label style={styles.fieldLabel}>{label}</label>
      <p style={styles.fieldValue}>{value ? '是' : '否'}</p>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number | null | undefined }) {
  const percentage = Math.round((confidence || 0) * 100);
  const color = percentage >= 80 ? 'green' : percentage >= 60 ? 'yellow' : 'red';
  return (
    <span style={{ ...styles.confidenceBadge, ...styles[`confidence${color}`] }}>
      AI {percentage}%
    </span>
  );
}

function OriginalText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={styles.originalText}>
      <button onClick={() => setExpanded(!expanded)} style={styles.expandButton}>
        {expanded ? '收起' : '查看原文'}
      </button>
      {expanded && (
        <div style={styles.originalTextContent}>
          <pre style={styles.pre}>{text}</pre>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '16px',
    color: '#1f2937',
  },
  loading: {
    padding: '20px',
    textAlign: 'center',
    color: '#6b7280',
  },
  error: {
    padding: '20px',
    textAlign: 'center',
    color: '#dc2626',
  },
  emptyState: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#9ca3af',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
  },
  emptyText: {
    margin: 0,
    fontSize: '14px',
  },
  clausesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
  },
  clauseCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    backgroundColor: '#fff',
    transition: 'box-shadow 0.2s',
  },
  dataProtectionCard: {
    borderLeftWidth: '4px',
    borderLeftColor: '#8b5cf6',
  },
  clauseHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #f3f4f6',
  },
  clauseIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },
  clauseTitle: {
    fontSize: '14px',
    fontWeight: 600,
    margin: 0,
    color: '#1f2937',
  },
  clauseBody: {
    fontSize: '13px',
  },
  field: {
    marginBottom: '12px',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  fieldValue: {
    margin: 0,
    fontSize: '13px',
    color: '#1f2937',
    lineHeight: '1.5',
  },
  riskBadge: {
    marginLeft: 'auto',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  riskgreen: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  riskblue: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  riskyellow: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  riskred: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  confidenceBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  confidencegreen: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  confidenceyellow: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  confidencered: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  originalText: {
    marginTop: '12px',
  },
  expandButton: {
    padding: '4px 12px',
    fontSize: '12px',
    color: '#6366f1',
    backgroundColor: 'transparent',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  originalTextContent: {
    marginTop: '8px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
    border: '1px solid #e5e7eb',
  },
  pre: {
    margin: 0,
    fontSize: '12px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    color: '#4b5563',
  },
};
