import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useParams } from 'react-router-dom';

const GET_CONTRACT_COMPARISON = gql`
  query GetContractComparison($id1: ID!, $id2: ID!) {
    contract1: contract(id: $id1) {
      id
      contractNo
      name
      type
      status
      amountWithTax
      currency
      signedAt
      effectiveAt
      expiresAt
      paymentTerms
      ourEntity
      customer {
        id
        name
      }
      # Type-specific details
      staffAugmentationDetail {
        estimatedTotalHours
        monthlyHoursCap
        settlementCycle
      }
      projectOutsourcingDetail {
        sowSummary
        deliverables
      }
      productSalesDetail {
        deliveryContent
        warrantyPeriod
      }
    }
    contract2: contract(id: $id2) {
      id
      contractNo
      name
      type
      status
      amountWithTax
      currency
      signedAt
      effectiveAt
      expiresAt
      paymentTerms
      ourEntity
      customer {
        id
        name
      }
      # Type-specific details
      staffAugmentationDetail {
        estimatedTotalHours
        monthlyHoursCap
        settlementCycle
      }
      projectOutsourcingDetail {
        sowSummary
        deliverables
      }
      productSalesDetail {
        deliveryContent
        warrantyPeriod
      }
    }
  }
`;

interface ContractComparisonData {
  contract1: any;
  contract2: any;
}

interface Contract {
  id: string;
  contractNo: string;
  name: string;
  type: string;
  status: string;
  amountWithTax: string;
  currency: string;
  signedAt: string | null;
  effectiveAt: string | null;
  expiresAt: string | null;
  paymentTerms: string | null;
  ourEntity: string;
  customer: {
    id: string;
    name: string;
  };
  staffAugmentationDetail?: any;
  projectOutsourcingDetail?: any;
  productSalesDetail?: any;
}

interface ComparisonProps {
  contractId1?: string;
  contractId2?: string;
}

export function ContractComparison({ contractId1, contractId2 }: ComparisonProps) {
  const [id1, setId1] = useState(contractId1 || '');
  const [id2, setId2] = useState(contractId2 || '');
  const [showDiffOnly, setShowDiffOnly] = useState(false);

  const { loading, error, data } = useQuery<ContractComparisonData>(
    GET_CONTRACT_COMPARISON,
    {
      variables: { id1, id2 },
      skip: !id1 || !id2,
      fetchPolicy: 'cache-and-network',
    }
  );

  const contract1: Contract = data?.contract1;
  const contract2: Contract = data?.contract2;

  // Compare values and determine if they differ
  const compareFields = (field: string, value1: any, value2: any) => {
    const isDifferent = String(value1 || '') !== String(value2 || '');
    return { isDifferent, value1, value2 };
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const formatAmount = (amount: string, currency: string) => {
    if (!amount) return '-';
    const num = parseFloat(amount);
    return `${currency || 'CNY'} ${num.toLocaleString()}`;
  };

  // Generate comparison sections
  const getComparisonSections = () => {
    if (!contract1 || !contract2) return [];

    return [
      {
        title: '基本信息',
        fields: [
          { label: '合同编号', key: 'contractNo' },
          { label: '合同名称', key: 'name' },
          { label: '合同类型', key: 'type', format: (v: string) => {
            const types: Record<string, string> = {
              STAFF_AUGMENTATION: '人力框架',
              PROJECT_OUTSOURCING: '项目外包',
              PRODUCT_SALES: '产品购销',
            };
            return types[v] || v;
          }},
          { label: '合同状态', key: 'status', format: (v: string) => {
            const statuses: Record<string, string> = {
              DRAFT: '草拟',
              ACTIVE: '已生效',
              EXECUTING: '执行中',
              COMPLETED: '已完结',
            };
            return statuses[v] || v;
          }},
          { label: '客户', key: 'customer', format: (v: any) => v?.name || '-' },
          { label: '我方主体', key: 'ourEntity' },
        ],
      },
      {
        title: '财务信息',
        fields: [
          { label: '合同金额', key: 'amountWithTax', format: (v: string) => formatAmount(v, contract1.currency) },
          { label: '币种', key: 'currency' },
          { label: '付款条件', key: 'paymentTerms' },
        ],
      },
      {
        title: '时间信息',
        fields: [
          { label: '签订日期', key: 'signedAt', format: formatDate },
          { label: '生效日期', key: 'effectiveAt', format: formatDate },
          { label: '到期日期', key: 'expiresAt', format: formatDate },
        ],
      },
      {
        title: '类型特定详情',
        fields: getTypeSpecificFields(),
      },
    ];
  };

  const getTypeSpecificFields = () => {
    // Only show type-specific fields if both contracts have the same type
    if (contract1.type !== contract2.type) {
      return [{ label: '合同类型不同', key: '_typeMismatch', customRender: () => '合同类型不同，无法比较详细字段' }];
    }

    switch (contract1.type) {
      case 'STAFF_AUGMENTATION':
        return [
          { label: '预计总工时', key: 'staffAugmentationDetail.estimatedTotalHours', format: (v: any) => v ? `${v} 小时` : '-' },
          { label: '月度工时上限', key: 'staffAugmentationDetail.monthlyHoursCap', format: (v: any) => v ? `${v} 小时` : '-' },
          { label: '结算周期', key: 'staffAugmentationDetail.settlementCycle' },
        ];
      case 'PROJECT_OUTSOURCING':
        return [
          { label: '工作范围', key: 'projectOutsourcingDetail.sowSummary' },
          { label: '交付物', key: 'projectOutsourcingDetail.deliverables' },
        ];
      case 'PRODUCT_SALES':
        return [
          { label: '交付内容', key: 'productSalesDetail.deliveryContent' },
          { label: '保修期限', key: 'productSalesDetail.warrantyPeriod' },
        ];
      default:
        return [];
    }
  };

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // Count differences
  const countDifferences = () => {
    if (!contract1 || !contract2) return 0;

    let count = 0;
    getComparisonSections().forEach(section => {
      section.fields.forEach(field => {
        const value1 = field.customRender ? '' : getNestedValue(contract1, field.key);
        const value2 = field.customRender ? '' : getNestedValue(contract2, field.key);
        if (String(value1 || '') !== String(value2 || '')) {
          count++;
        }
      });
    });
    return count;
  };

  const differences = countDifferences();

  return (
    <div style={styles.container}>
      {/* Contract Selection */}
      <div style={styles.selectionPanel}>
        <h2 style={styles.title}>合同对比</h2>
        <div style={styles.selectionInputs}>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>合同1:</label>
            <input
              type="text"
              value={id1}
              onChange={(e) => setId1(e.target.value)}
              placeholder="输入合同ID"
              style={styles.input}
            />
          </div>
          <div style={styles.vsBadge}>VS</div>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>合同2:</label>
            <input
              type="text"
              value={id2}
              onChange={(e) => setId2(e.target.value)}
              placeholder="输入合同ID"
              style={styles.input}
            />
          </div>
        </div>

        {contract1 && contract2 && (
          <div style={styles.controls}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={showDiffOnly}
                onChange={(e) => setShowDiffOnly(e.target.checked)}
                style={styles.checkbox}
              />
              仅显示差异项 ({differences} 处不同)
            </label>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div style={styles.loading}>加载中...</div>
      )}

      {/* Error State */}
      {error && (
        <div style={styles.error}>
          加载失败: {(error as Error).message}
        </div>
      )}

      {/* Comparison Content */}
      {contract1 && contract2 && (
        <div style={styles.comparisonContent}>
          {/* Header Summary */}
          <div style={styles.summaryBar}>
            <div style={styles.summaryInfo}>
              <span style={styles.summaryLabel}>合同1:</span>
              <span style={styles.summaryValue}>{contract1.contractNo} - {contract1.name}</span>
            </div>
            <div style={styles.summaryInfo}>
              <span style={styles.summaryLabel}>合同2:</span>
              <span style={styles.summaryValue}>{contract2.contractNo} - {contract2.name}</span>
            </div>
            <div style={styles.summaryStats}>
              <span style={styles.differentCount}>{differences}</span> 处不同
            </div>
          </div>

          {/* Comparison Sections */}
          {getComparisonSections().map((section, sectionIndex) => {
            const sectionHasDifferences = section.fields.some(field => {
              const value1 = field.customRender ? '' : getNestedValue(contract1, field.key);
              const value2 = field.customRender ? '' : getNestedValue(contract2, field.key);
              return String(value1 || '') !== String(value2 || '');
            });

            if (showDiffOnly && !sectionHasDifferences) {
              return null;
            }

            return (
              <div key={sectionIndex} style={styles.section}>
                <h3 style={styles.sectionTitle}>{section.title}</h3>
                <table style={styles.comparisonTable}>
                  <thead>
                    <tr>
                      <th style={styles.fieldColumn}>字段</th>
                      <th style={styles.valueColumn}>合同1</th>
                      <th style={styles.valueColumn}>合同2</th>
                      <th style={styles.statusColumn}>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.fields.map((field, fieldIndex) => {
                      const rawValue1 = field.customRender ? null : getNestedValue(contract1, field.key);
                      const rawValue2 = field.customRender ? null : getNestedValue(contract2, field.key);
                      const value1 = field.format ? field.format(rawValue1) : rawValue1;
                      const value2 = field.format ? field.format(rawValue2) : rawValue2;
                      const displayValue1 = field.customRender ? field.customRender() : value1 || '-';
                      const displayValue2 = field.customRender ? field.customRender() : value2 || '-';
                      const isDifferent = String(rawValue1 || '') !== String(rawValue2 || '');

                      if (showDiffOnly && !isDifferent) {
                        return null;
                      }

                      return (
                        <tr
                          key={fieldIndex}
                          style={{
                            ...styles.row,
                            ...(isDifferent && styles.rowDifferent),
                          }}
                        >
                          <td style={styles.fieldName}>{field.label}</td>
                          <td style={styles.fieldValue}>
                            {field.customRender || displayValue1}
                          </td>
                          <td style={styles.fieldValue}>
                            {field.customRender || displayValue2}
                          </td>
                          <td style={styles.fieldStatus}>
                            {isDifferent ? (
                              <span style={styles.differentBadge}>不同</span>
                            ) : (
                              <span style={styles.sameBadge}>相同</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
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
  selectionPanel: {
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 16px 0',
  },
  selectionInputs: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  inputGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  inputLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  vsBadge: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    fontWeight: 600,
    borderRadius: '4px',
    fontSize: '14px',
  },
  controls: {
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },
  checkbox: {
    cursor: 'pointer',
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
  },
  error: {
    padding: '16px',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    borderRadius: '6px',
    border: '1px solid #fecaca',
  },
  comparisonContent: {
    marginTop: '20px',
  },
  summaryBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  summaryInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  },
  summaryLabel: {
    color: '#6b7280',
    fontWeight: 500,
  },
  summaryValue: {
    color: '#111827',
    fontWeight: 600,
  },
  summaryStats: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ef4444',
  },
  differentCount: {
    fontSize: '18px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 12px 0',
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
  },
  comparisonTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  row: {
    backgroundColor: '#fff',
    borderBottom: '1px solid #f3f4f6',
  },
  rowDifferent: {
    backgroundColor: '#fef3c7',
  },
  fieldColumn: {
    padding: '10px 12px',
    textAlign: 'left',
    backgroundColor: '#f9fafb',
    fontWeight: 500,
    color: '#374151',
    width: '150px',
    borderBottom: '1px solid #e5e7eb',
  },
  valueColumn: {
    padding: '10px 12px',
    textAlign: 'left',
    backgroundColor: '#f9fafb',
    fontWeight: 500,
    color: '#6b7280',
    width: '35%',
    borderBottom: '1px solid #e5e7eb',
  },
  statusColumn: {
    padding: '10px 12px',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    fontWeight: 500,
    color: '#6b7280',
    width: '100px',
    borderBottom: '1px solid #e5e7eb',
  },
  fieldName: {
    padding: '10px 12px',
    color: '#374151',
    fontWeight: 500,
  },
  fieldValue: {
    padding: '10px 12px',
    color: '#111827',
    wordBreak: 'break-word',
  },
  fieldStatus: {
    padding: '10px 12px',
    textAlign: 'center',
  },
  differentBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#fef3c7',
    color: '#d97706',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  sameBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#d1fae5',
    color: '#059669',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
};

export default ContractComparison;
