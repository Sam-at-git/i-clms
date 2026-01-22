import { useMemo } from 'react';
import { ContractType } from '@i-clms/shared/generated/graphql';
import { MilestoneList } from './MilestoneList';

interface ContractTypeSpecificDetailsProps {
  contractType: ContractType;
  data?: any;
  editable?: boolean;
  onChange?: (data: any) => void;
}

export function ContractTypeSpecificDetails({
  contractType,
  data,
  editable = false,
  onChange,
}: ContractTypeSpecificDetailsProps) {
  const content = useMemo(() => {
    switch (contractType) {
      case ContractType.StaffAugmentation:
        return <StaffAugmentationDetails data={data} />;

      case ContractType.ProjectOutsourcing:
        return <ProjectOutsourcingDetails data={data} />;

      case ContractType.ProductSales:
        return <ProductSalesDetails data={data} />;

      default:
        return <div style={styles.empty}>暂无类型特定详情</div>;
    }
  }, [contractType, data]);

  return <div style={styles.card}>{content}</div>;
}

// 人力框架合同详情
function StaffAugmentationDetails({ data }: { data?: any }) {
  const rateItems = data?.rateItems || [];
  const hasContent = rateItems.length > 0 ||
                     data?.estimatedTotalHours ||
                     data?.monthlyHoursCap ||
                     data?.yearlyHoursCap ||
                     data?.settlementCycle ||
                     data?.staffReplacement ||
                     data?.priceAdjustment ||
                     data?.timesheetApprovalFlow ||
                     data?.adjustmentMechanism;

  if (!hasContent) {
    return <div style={styles.empty}>暂无人力框架详情信息</div>;
  }

  // 计算费率统计
  const rateCount = rateItems.length;
  const avgRate = rateCount > 0
    ? rateItems.reduce((sum: number, item: any) => sum + parseFloat(item.rate || 0), 0) / rateCount
    : 0;

  return (
    <div>
      <h3 style={styles.cardTitle}>人力框架详情</h3>

      {/* 合同参数 */}
      <div style={styles.section}>
        <h4 style={styles.subTitle}>合同参数</h4>
        <div style={styles.infoGrid}>
          <InfoItem label="预计总工时" value={data?.estimatedTotalHours ? `${data.estimatedTotalHours} 小时` : null} />
          <InfoItem label="月度工时上限" value={data?.monthlyHoursCap ? `${data.monthlyHoursCap} 小时` : null} />
          <InfoItem label="年度工时上限" value={data?.yearlyHoursCap ? `${data.yearlyHoursCap} 小时` : null} />
          <InfoItem label="结算周期" value={data?.settlementCycle} />
          <InfoItem label="工时审批流程" value={data?.timesheetApprovalFlow} />
          <InfoItem label="调整机制" value={data?.adjustmentMechanism} />
        </div>
      </div>

      {/* 费率表 */}
      {rateItems.length > 0 && (
        <div style={styles.section}>
          <div style={styles.tableHeader}>
            <h4 style={styles.subTitle}>费率表</h4>
            <div style={styles.tableStats}>
              <span style={styles.statItem}>
                共 <strong>{rateCount}</strong> 个费率项
              </span>
              <span style={styles.statItem}>
                平均 ¥<strong>{avgRate.toFixed(2)}</strong>
              </span>
            </div>
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>角色</th>
                <th style={styles.th}>级别</th>
                <th style={styles.th}>单位</th>
                <th style={styles.thAmount}>费率</th>
                <th style={styles.th}>有效期</th>
              </tr>
            </thead>
            <tbody>
              {rateItems.map((item: any, index: number) => {
                const unitMap: Record<string, string> = {
                  HOUR: '小时',
                  DAY: '天',
                  MONTH: '月',
                };
                const unitLabel = unitMap[item.unit] || item.unit || '-';

                return (
                  <tr key={item.id || index}>
                    <td style={styles.td}>{item.role}</td>
                    <td style={styles.td}>{item.level || '-'}</td>
                    <td style={styles.td}>{unitLabel}</td>
                    <td style={styles.tdAmount}>
                      {item.rate ? `¥${parseFloat(item.rate).toLocaleString()}` : '-'}
                    </td>
                    <td style={styles.td}>
                      {item.rateEffectiveFrom && item.rateEffectiveTo
                        ? `${item.rateEffectiveFrom} ~ ${item.rateEffectiveTo}`
                        : item.rateEffectiveFrom || item.rateEffectiveTo || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 人员更换与调价条款 */}
      {(data?.staffReplacement || data?.priceAdjustment) && (
        <div style={styles.section}>
          <h4 style={styles.subTitle}>合同条款</h4>
          <div style={styles.termsContainer}>
            {data?.staffReplacement && (
              <div style={styles.termSection}>
                <h5 style={styles.termTitle}>人员更换条款</h5>
                <p style={styles.termContent}>{data.staffReplacement}</p>
              </div>
            )}
            {data?.priceAdjustment && (
              <div style={styles.termSection}>
                <h5 style={styles.termTitle}>调价机制</h5>
                <p style={styles.termContent}>{data.priceAdjustment}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 项目外包合同详情
function ProjectOutsourcingDetails({ data }: { data?: any }) {
  const milestones = data?.milestones || [];
  const hasContent = milestones.length > 0 ||
                     data?.sowSummary ||
                     data?.deliverables ||
                     data?.acceptanceCriteria;

  if (!hasContent) {
    return <div style={styles.empty}>暂无项目外包详情信息</div>;
  }

  // 计算里程碑总金额和完成进度
  const totalAmount = milestones.reduce((sum: number, m: any) => sum + parseFloat(m.amount || 0), 0);
  const completedCount = milestones.filter((m: any) => m.status === 'ACCEPTED').length;
  const completedAmount = milestones
    .filter((m: any) => m.status === 'ACCEPTED')
    .reduce((sum: number, m: any) => sum + parseFloat(m.amount || 0), 0);

  return (
    <div>
      <h3 style={styles.cardTitle}>项目外包详情</h3>

      {/* 项目概述 */}
      {(data?.sowSummary || data?.deliverables || data?.acceptanceCriteria) && (
        <div style={styles.section}>
          <h4 style={styles.subTitle}>项目概述</h4>
          <div style={styles.infoGrid}>
            <InfoItem label="工作范围" value={data?.sowSummary} />
            <InfoItem label="交付物" value={data?.deliverables} />
            <InfoItem label="验收标准" value={data?.acceptanceCriteria} />
          </div>
        </div>
      )}

      {/* 里程碑列表 */}
      {milestones.length > 0 && (
        <div style={styles.section}>
          <div style={styles.milestoneHeader}>
            <h4 style={styles.subTitle}>付款里程碑</h4>
            <div style={styles.milestoneSummary}>
              <span style={styles.summaryItem}>
                共 <strong>{milestones.length}</strong> 个里程碑
              </span>
              <span style={styles.summaryItem}>
                已完成 <strong>{completedCount}</strong> 个
              </span>
              <span style={styles.summaryItem}>
                总金额 <strong>¥{totalAmount.toLocaleString()}</strong>
              </span>
              {completedAmount > 0 && (
                <span style={styles.summaryItem}>
                  已收 <strong>¥{completedAmount.toLocaleString()}</strong>
                </span>
              )}
            </div>
          </div>

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.thNo}>#</th>
                <th style={styles.th}>里程碑</th>
                <th style={styles.th}>交付物</th>
                <th style={styles.thAmount}>金额</th>
                <th style={styles.th}>比例</th>
                <th style={styles.th}>计划日期</th>
                <th style={styles.th}>状态</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map((m: any, index: number) => (
                <tr key={m.id || index}>
                  <td style={styles.tdNo}>{m.sequence}</td>
                  <td style={styles.td}>
                    <div style={styles.milestoneName}>{m.name}</div>
                  </td>
                  <td style={styles.td}>{m.deliverables || '-'}</td>
                  <td style={styles.tdAmount}>
                    {m.amount ? `¥${parseFloat(m.amount).toLocaleString()}` : '-'}
                  </td>
                  <td style={styles.td}>{m.paymentPercentage ? `${m.paymentPercentage}%` : '-'}</td>
                  <td style={styles.td}>{m.plannedDate || '-'}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusColor(m.status),
                    }}>
                      {getStatusLabel(m.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// 产品购销合同详情
function ProductSalesDetails({ data }: { data?: any }) {
  const lineItems = data?.lineItems || [];
  const hasContent = lineItems.length > 0 ||
                     data?.deliveryContent ||
                     data?.deliveryDate ||
                     data?.warrantyPeriod;

  if (!hasContent) {
    return <div style={styles.empty}>暂无产品购销详情信息</div>;
  }

  // 计算总金额
  const totalAmount = lineItems.reduce((sum: number, item: any) => {
    const price = parseFloat(item.unitPriceWithTax || 0);
    const qty = parseInt(item.quantity || 0);
    return sum + (price * qty);
  }, 0);

  return (
    <div>
      <h3 style={styles.cardTitle}>产品购销详情</h3>

      {/* 交付信息 */}
      {(data?.deliveryContent || data?.deliveryDate || data?.warrantyPeriod) && (
        <div style={styles.section}>
          <h4 style={styles.subTitle}>交付信息</h4>
          <div style={styles.infoGrid}>
            <InfoItem label="交付内容" value={data?.deliveryContent} />
            <InfoItem label="交付日期" value={data?.deliveryDate} />
            <InfoItem label="交付地点" value={data?.deliveryLocation} />
            <InfoItem label="保修期" value={data?.warrantyPeriod} />
          </div>
        </div>
      )}

      {/* 产品清单 */}
      {lineItems.length > 0 && (
        <div style={styles.section}>
          <h4 style={styles.subTitle}>产品清单 <span style={styles.totalAmount}>(合计: ¥{totalAmount.toLocaleString()})</span></h4>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.thNo}>#</th>
                <th style={styles.th}>产品名称</th>
                <th style={styles.th}>规格</th>
                <th style={styles.thQty}>数量</th>
                <th style={styles.th}>单位</th>
                <th style={styles.thAmount}>含税单价</th>
                <th style={styles.thAmount}>小计</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item: any, index: number) => {
                const price = parseFloat(item.unitPriceWithTax || 0);
                const qty = parseInt(item.quantity || 0);
                const subtotal = price * qty;
                return (
                  <tr key={item.id || index}>
                    <td style={styles.tdNo}>{index + 1}</td>
                    <td style={styles.td}>
                      <div style={styles.productName}>{item.productName}</div>
                      {item.specification && (
                        <div style={styles.specification}>{item.specification}</div>
                      )}
                    </td>
                    <td style={styles.td}>{item.specification || '-'}</td>
                    <td style={styles.tdQty}>{qty}</td>
                    <td style={styles.td}>{item.unit}</td>
                    <td style={styles.tdAmount}>¥{price.toLocaleString()}</td>
                    <td style={styles.tdAmount}>¥{subtotal.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div style={infoItemStyles.container}>
      <span style={infoItemStyles.label}>{label}：</span>
      <span style={infoItemStyles.value}>{value}</span>
    </div>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: '待开始',
    IN_PROGRESS: '进行中',
    DELIVERED: '已交付',
    ACCEPTED: '已验收',
    REJECTED: '已拒绝',
  };
  return labels[status] || status;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: '#e5e7eb',
    IN_PROGRESS: '#dbeafe',
    DELIVERED: '#fef3c7',
    ACCEPTED: '#dcfce7',
    REJECTED: '#fecaca',
  };
  return colors[status] || '#e5e7eb';
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 16px 0',
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
  },
  subTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 12px 0',
  },
  section: {
    marginBottom: '20px',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  tableStats: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#6b7280',
  },
  statItem: {
    display: 'flex',
    gap: '4px',
  },
  termsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
  },
  termSection: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  termTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 8px 0',
  },
  termContent: {
    fontSize: '13px',
    color: '#4b5563',
    lineHeight: '1.6',
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  milestoneHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  milestoneSummary: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#6b7280',
  },
  summaryItem: {
    display: 'flex',
    gap: '4px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    padding: '8px 12px',
    textAlign: 'left',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    color: '#374151',
    fontWeight: 500,
  },
  thNo: {
    padding: '8px 12px',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    color: '#6b7280',
    fontWeight: 500,
    width: '40px',
  },
  thQty: {
    padding: '8px 12px',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    color: '#374151',
    fontWeight: 500,
    width: '60px',
  },
  thAmount: {
    padding: '8px 12px',
    textAlign: 'right',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    color: '#374151',
    fontWeight: 500,
    width: '100px',
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #f3f4f6',
    color: '#374151',
  },
  tdNo: {
    padding: '10px 12px',
    textAlign: 'center',
    borderBottom: '1px solid #f3f4f6',
    color: '#6b7280',
  },
  tdQty: {
    padding: '10px 12px',
    textAlign: 'center',
    borderBottom: '1px solid #f3f4f6',
    color: '#374151',
  },
  tdAmount: {
    padding: '10px 12px',
    textAlign: 'right',
    borderBottom: '1px solid #f3f4f6',
    color: '#374151',
    fontFamily: 'monospace',
  },
  milestoneName: {
    fontWeight: 500,
    color: '#111827',
  },
  productName: {
    fontWeight: 500,
    color: '#111827',
  },
  specification: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  totalAmount: {
    fontSize: '13px',
    fontWeight: 'normal',
    color: '#6b7280',
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '14px',
  },
};

const infoItemStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    fontSize: '13px',
  },
  label: {
    color: '#6b7280',
    minWidth: '80px',
  },
  value: {
    color: '#111827',
    fontWeight: 500,
  },
};

export default ContractTypeSpecificDetails;
