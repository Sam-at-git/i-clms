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
                     data?.acceptanceCriteria ||
                     data?.acceptanceFlow ||
                     data?.changeManagementFlow;

  if (!hasContent) {
    return <div style={styles.empty}>暂无项目外包详情信息</div>;
  }

  // 计算里程碑总金额和完成进度
  const totalAmount = milestones.reduce((sum: number, m: any) => sum + parseFloat(m.amount || 0), 0);
  const completedCount = milestones.filter((m: any) => m.status === 'ACCEPTED').length;
  const inProgressCount = milestones.filter((m: any) => m.status === 'IN_PROGRESS' || m.status === 'DELIVERED').length;
  const completedAmount = milestones
    .filter((m: any) => m.status === 'ACCEPTED')
    .reduce((sum: number, m: any) => sum + parseFloat(m.amount || 0), 0);
  const progressPercentage = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

  // 解析交付物（可能是JSON数组字符串或普通文本）
  const parseDeliverables = (deliverables: string | null | undefined): string[] => {
    if (!deliverables) return [];
    try {
      const parsed = JSON.parse(deliverables);
      return Array.isArray(parsed) ? parsed : [deliverables];
    } catch {
      // 不是JSON，按行或分隔符拆分
      return deliverables.split(/[,\n;]/).filter(d => d.trim());
    }
  };

  return (
    <div>
      <h3 style={styles.cardTitle}>项目外包详情</h3>

      {/* 统计卡片 */}
      {milestones.length > 0 && (
        <div style={styles.statsCards}>
          <div style={styles.statsCard}>
            <div style={styles.statsValue}>{milestones.length}</div>
            <div style={styles.statsLabel}>总里程碑数</div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsValue}>{completedCount}</div>
            <div style={styles.statsLabel}>已完成</div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsValue}>{inProgressCount}</div>
            <div style={styles.statsLabel}>进行中</div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsValue}>¥{totalAmount.toLocaleString()}</div>
            <div style={styles.statsLabel}>合同总金额</div>
          </div>
          <div style={{ ...styles.statsCard, ...styles.progressCard }}>
            <div style={styles.statsValue}>{progressPercentage}%</div>
            <div style={styles.statsLabel}>完成进度</div>
            <div style={{ ...styles.progressBar, width: `${progressPercentage}%` }} />
          </div>
        </div>
      )}

      {/* 项目概述 */}
      {(data?.sowSummary || data?.deliverables || data?.acceptanceCriteria) && (
        <div style={styles.section}>
          <h4 style={styles.subTitle}>项目概述</h4>
          <div style={styles.projectOverviewContainer}>
            {data?.sowSummary && (
              <div style={styles.overviewSection}>
                <label style={infoItemStyles.label}>工作范围</label>
                <div style={styles.overviewContent}>{data.sowSummary}</div>
              </div>
            )}
            {data?.deliverables && (
              <div style={styles.overviewSection}>
                <label style={infoItemStyles.label}>交付物清单</label>
                <div style={styles.deliverablesList}>
                  {parseDeliverables(data.deliverables).map((item, idx) => (
                    <span key={idx} style={styles.deliverableTag}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {data?.acceptanceCriteria && (
              <div style={styles.overviewSection}>
                <label style={infoItemStyles.label}>验收标准</label>
                <div style={styles.overviewContent}>{data.acceptanceCriteria}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 流程信息 */}
      {(data?.acceptanceFlow || data?.changeManagementFlow) && (
        <div style={styles.section}>
          <h4 style={styles.subTitle}>流程管理</h4>
          <div style={styles.flowContainer}>
            {data?.acceptanceFlow && (
              <div style={styles.flowSection}>
                <h5 style={styles.flowTitle}>验收流程</h5>
                <div style={styles.flowContent}>{data.acceptanceFlow}</div>
              </div>
            )}
            {data?.changeManagementFlow && (
              <div style={styles.flowSection}>
                <h5 style={styles.flowTitle}>变更管理流程</h5>
                <div style={styles.flowContent}>{data.changeManagementFlow}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 里程碑时间线 */}
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

          {/* 时间线可视化 */}
          <div style={styles.timeline}>
            {milestones.map((m: any, index: number) => {
              const isCompleted = m.status === 'ACCEPTED';
              const isInProgress = m.status === 'IN_PROGRESS' || m.status === 'DELIVERED';
              const isPending = m.status === 'PENDING';

              return (
                <div key={m.id || index} style={styles.timelineItem}>
                  <div style={styles.timelineDotWrapper}>
                    <div style={{
                      ...styles.timelineDot,
                      ...(isCompleted && styles.timelineDotCompleted),
                      ...(isInProgress && styles.timelineDotInProgress),
                      ...(isPending && styles.timelineDotPending),
                    }} />
                    {index < milestones.length - 1 && (
                      <div style={{
                        ...styles.timelineLine,
                        ...(isCompleted && styles.timelineLineCompleted),
                      }} />
                    )}
                  </div>
                  <div style={styles.timelineContent}>
                    <div style={styles.timelineHeader}>
                      <span style={styles.timelineSequence}>M{m.sequence || index + 1}</span>
                      <span style={styles.timelineName}>{m.name}</span>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(m.status),
                      }}>
                        {getStatusLabel(m.status)}
                      </span>
                    </div>
                    <div style={styles.timelineDetails}>
                      <span style={styles.timelineAmount}>¥{parseFloat(m.amount || 0).toLocaleString()}</span>
                      <span style={styles.timelineDate}>{m.plannedDate || '日期待定'}</span>
                    </div>
                    {m.deliverables && (
                      <div style={styles.timelineDeliverables}>
                        {parseDeliverables(m.deliverables).slice(0, 3).map((d, idx) => (
                          <span key={idx} style={styles.miniTag}>{d}</span>
                        ))}
                        {parseDeliverables(m.deliverables).length > 3 && (
                          <span style={styles.moreIndicator}>+{parseDeliverables(m.deliverables).length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 表格视图 */}
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
                  <td style={styles.td}>
                    {m.deliverables ? (
                      <div style={styles.cellDeliverables}>
                        {parseDeliverables(m.deliverables).slice(0, 2).map((d, idx) => (
                          <span key={idx} style={styles.miniTag}>{d}</span>
                        ))}
                        {parseDeliverables(m.deliverables).length > 2 && (
                          <span style={styles.moreIndicator}>+{parseDeliverables(m.deliverables).length - 2}</span>
                        )}
                      </div>
                    ) : '-'}
                  </td>
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
                     data?.warrantyPeriod ||
                     data?.shippingResponsibility ||
                     data?.ipOwnership ||
                     data?.afterSalesTerms;

  if (!hasContent) {
    return <div style={styles.empty}>暂无产品购销详情信息</div>;
  }

  // 计算统计数据
  const totalAmount = lineItems.reduce((sum: number, item: any) => {
    const price = parseFloat(item.unitPriceWithTax || 0);
    const qty = parseInt(item.quantity || 0);
    return sum + (price * qty);
  }, 0);

  const totalQuantity = lineItems.reduce((sum: number, item: any) => sum + parseInt(item.quantity || 0), 0);
  const avgPrice = lineItems.length > 0 ? totalAmount / lineItems.length : 0;
  const uniqueProducts = new Set(lineItems.map((item: any) => item.productName)).size;

  // 计算含税/不含税金额对比
  const totalAmountWithTax = totalAmount;
  const totalAmountWithoutTax = lineItems.reduce((sum: number, item: any) => {
    const price = parseFloat(item.unitPriceWithoutTax || 0);
    const qty = parseInt(item.quantity || 0);
    return sum + (price * qty);
  }, 0);
  const totalTaxAmount = totalAmountWithTax - totalAmountWithoutTax;

  // 按产品分组统计
  const productGroups = lineItems.reduce((acc: Record<string, any>, item: any) => {
    const name = item.productName;
    if (!acc[name]) {
      acc[name] = {
        name,
        count: 0,
        quantity: 0,
        amount: 0,
      };
    }
    acc[name].count += 1;
    acc[name].quantity += parseInt(item.quantity || 0);
    acc[name].amount += parseFloat(item.unitPriceWithTax || 0) * parseInt(item.quantity || 0);
    return acc;
  }, {});

  const shippingResponsibilityMap: Record<string, string> = {
    SELLER: '卖方负责',
    BUYER: '买方负责',
    SHARED: '双方协商',
  };

  const ipOwnershipMap: Record<string, string> = {
    SELLER: '卖方所有',
    BUYER: '买方所有',
    SHARED: '双方共有',
    LICENSED: '授权使用',
  };

  return (
    <div>
      <h3 style={styles.cardTitle}>产品购销详情</h3>

      {/* 统计卡片 */}
      {lineItems.length > 0 && (
        <div style={styles.statsCards}>
          <div style={styles.statsCard}>
            <div style={styles.statsValue}>{lineItems.length}</div>
            <div style={styles.statsLabel}>产品条目数</div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsValue}>{uniqueProducts}</div>
            <div style={styles.statsLabel}>产品种类数</div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsValue}>{totalQuantity}</div>
            <div style={styles.statsLabel}>总数量</div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsValue}>¥{totalAmount.toLocaleString()}</div>
            <div style={styles.statsLabel}>合同总金额</div>
          </div>
          <div style={styles.statsCard}>
            <div style={styles.statsValue}>¥{avgPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <div style={styles.statsLabel}>平均单价</div>
          </div>
        </div>
      )}

      {/* 交付与保修信息 */}
      {(data?.deliveryContent || data?.deliveryDate || data?.deliveryLocation ||
        data?.shippingResponsibility || data?.warrantyPeriod) && (
        <div style={styles.section}>
          <h4 style={styles.subTitle}>交付与保修</h4>
          <div style={styles.infoGrid}>
            <InfoItem label="交付内容" value={data?.deliveryContent} fullWidth />
            <InfoItem label="交付日期" value={data?.deliveryDate} />
            <InfoItem label="交付地点" value={data?.deliveryLocation} />
            <InfoItem
              label="运输责任"
              value={data?.shippingResponsibility ? shippingResponsibilityMap[data.shippingResponsibility] || data.shippingResponsibility : null}
            />
            <InfoItem label="保修期限" value={data?.warrantyPeriod} fullWidth />
          </div>
        </div>
      )}

      {/* 知识产权与售后 */}
      {(data?.ipOwnership || data?.afterSalesTerms) && (
        <div style={styles.section}>
          <h4 style={styles.subTitle}>知识产权与售后</h4>
          <div style={styles.termsContainer}>
            {data?.ipOwnership && (
              <div style={styles.termSection}>
                <h5 style={styles.termTitle}>知识产权归属</h5>
                <p style={styles.termContent}>
                  <strong>归属方式：</strong>
                  {ipOwnershipMap[data.ipOwnership] || data.ipOwnership}
                </p>
              </div>
            )}
            {data?.afterSalesTerms && (
              <div style={styles.termSection}>
                <h5 style={styles.termTitle}>售后服务条款</h5>
                <p style={styles.termContent}>{data.afterSalesTerms}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 税费分析 */}
      {lineItems.length > 0 && totalTaxAmount > 0 && (
        <div style={styles.section}>
          <h4 style={styles.subTitle}>税费分析</h4>
          <div style={styles.taxAnalysis}>
            <div style={styles.taxRow}>
              <span style={styles.taxLabel}>不含税总额</span>
              <span style={styles.taxValue}>¥{totalAmountWithoutTax.toLocaleString()}</span>
            </div>
            <div style={styles.taxRow}>
              <span style={styles.taxLabel}>税额</span>
              <span style={styles.taxValueAccent}>¥{totalTaxAmount.toLocaleString()}</span>
            </div>
            <div style={{ ...styles.taxRow, ...styles.taxRowTotal }}>
              <span style={styles.taxLabel}>含税总额</span>
              <span style={styles.taxValueTotal}>¥{totalAmountWithTax.toLocaleString()}</span>
            </div>
            <div style={styles.taxRate}>
              税率约 {((totalTaxAmount / totalAmountWithoutTax) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* 产品清单 */}
      {lineItems.length > 0 && (
        <div style={styles.section}>
          <div style={styles.milestoneHeader}>
            <h4 style={styles.subTitle}>产品清单</h4>
            <div style={styles.milestoneSummary}>
              <span style={styles.summaryItem}>
                共 <strong>{lineItems.length}</strong> 个条目
              </span>
              <span style={styles.summaryItem}>
                合计 <strong>¥{totalAmount.toLocaleString()}</strong>
              </span>
            </div>
          </div>

          {/* 产品分组统计 */}
          {Object.keys(productGroups).length > 1 && (
            <div style={styles.productGroups}>
              {Object.entries(productGroups).map(([name, group]: [string, any]) => (
                <div key={name} style={styles.productGroupTag}>
                  <span style={styles.productGroupName}>{name}</span>
                  <span style={styles.productGroupCount}>×{group.quantity}</span>
                </div>
              ))}
            </div>
          )}

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.thNo}>#</th>
                <th style={styles.th}>产品名称</th>
                <th style={styles.th}>规格型号</th>
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
                const priceWithoutTax = parseFloat(item.unitPriceWithoutTax || 0);
                const taxPerUnit = price - priceWithoutTax;

                return (
                  <tr key={item.id || index}>
                    <td style={styles.tdNo}>{index + 1}</td>
                    <td style={styles.td}>
                      <div style={styles.productName}>{item.productName}</div>
                    </td>
                    <td style={styles.td}>
                      {item.specification ? (
                        <span style={styles.specificationTag}>{item.specification}</span>
                      ) : '-'}
                    </td>
                    <td style={styles.tdQty}>{qty}</td>
                    <td style={styles.td}>{item.unit || '-'}</td>
                    <td style={styles.tdAmount}>
                      <div style={styles.priceCell}>
                        <div>¥{price.toLocaleString()}</div>
                        {priceWithoutTax > 0 && (
                          <div style={styles.priceWithoutTax}>
                            (不含税 ¥{priceWithoutTax.toLocaleString()})
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={styles.tdAmount}>¥{subtotal.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={styles.tfootRow}>
                <td colSpan={4} style={styles.tfootLabel}>合计</td>
                <td style={styles.tfootQty}>{totalQuantity}</td>
                <td style={styles.tfootValue}>-</td>
                <td style={styles.tfootValue}>¥{totalAmount.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value, fullWidth }: { label: string; value: string | null | undefined; fullWidth?: boolean }) {
  if (!value) return null;
  return (
    <div style={fullWidth ? { ...infoItemStyles.container, ...styles.infoItemFull } : infoItemStyles.container}>
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
  // 统计卡片
  statsCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
  },
  statsCard: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  progressCard: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: '3px',
    backgroundColor: '#10b981',
    transition: 'width 0.3s ease',
  },
  statsValue: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '4px',
  },
  statsLabel: {
    fontSize: '12px',
    color: '#6b7280',
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
  // 交付物显示
  deliverablesList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  deliverableTag: {
    display: 'inline-block',
    padding: '4px 10px',
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    borderRadius: '4px',
    fontSize: '12px',
    border: '1px solid #bae6fd',
  },
  // 流程容器
  flowContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  flowSection: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  flowTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 8px 0',
  },
  flowContent: {
    fontSize: '13px',
    color: '#4b5563',
    lineHeight: '1.6',
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  // 时间线
  timeline: {
    marginBottom: '20px',
  },
  timelineItem: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    position: 'relative',
  },
  timelineDotWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  timelineDot: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: '#d1d5db',
    border: '3px solid #fff',
    boxShadow: '0 0 0 2px #d1d5db',
    flexShrink: 0,
    zIndex: 1,
  },
  timelineDotCompleted: {
    backgroundColor: '#10b981',
    boxShadow: '0 0 0 2px #10b981',
  },
  timelineDotInProgress: {
    backgroundColor: '#3b82f6',
    boxShadow: '0 0 0 2px #3b82f6',
  },
  timelineDotPending: {
    backgroundColor: '#d1d5db',
    boxShadow: '0 0 0 2px #d1d5db',
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
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  timelineHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  timelineSequence: {
    display: 'inline-block',
    padding: '2px 6px',
    backgroundColor: '#374151',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 600,
    borderRadius: '4px',
  },
  timelineName: {
    fontWeight: 500,
    color: '#111827',
    fontSize: '14px',
  },
  timelineDetails: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  timelineAmount: {
    fontWeight: 600,
    color: '#059669',
  },
  timelineDate: {
    display: 'flex',
    alignItems: 'center',
  },
  timelineDeliverables: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  // 单元格内交付物
  cellDeliverables: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  miniTag: {
    display: 'inline-block',
    padding: '2px 6px',
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    borderRadius: '3px',
    fontSize: '11px',
  },
  moreIndicator: {
    fontSize: '11px',
    color: '#6b7280',
    padding: '2px 4px',
  },
  infoItemFull: {
    gridColumn: '1 / -1',
  },
  // 项目概述容器样式
  projectOverviewContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  overviewSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  overviewContent: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  // 产品相关样式
  taxAnalysis: {
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #bbf7d0',
  },
  taxRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
  },
  taxRowTotal: {
    paddingTop: '8px',
    borderTop: '1px solid #bbf7d0',
    marginTop: '4px',
    fontWeight: 600,
  },
  taxLabel: {
    color: '#374151',
  },
  taxValue: {
    color: '#6b7280',
  },
  taxValueAccent: {
    color: '#059669',
  },
  taxValueTotal: {
    color: '#047857',
    fontWeight: 600,
  },
  taxRate: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#059669',
    textAlign: 'right',
  },
  productGroups: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px',
  },
  productGroupTag: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    backgroundColor: '#f0f9ff',
    borderRadius: '6px',
    border: '1px solid #bae6fd',
  },
  productGroupName: {
    fontSize: '13px',
    color: '#0369a1',
    marginRight: '8px',
  },
  productGroupCount: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: 500,
  },
  specificationTag: {
    display: 'inline-block',
    padding: '2px 6px',
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
    borderRadius: '3px',
    fontSize: '11px',
    border: '1px solid #e5e7eb',
  },
  priceCell: {
    textAlign: 'right',
  },
  priceWithoutTax: {
    fontSize: '11px',
    color: '#9ca3af',
    marginTop: '2px',
  },
  tfootRow: {
    backgroundColor: '#f9fafb',
    fontWeight: 600,
  },
  tfootLabel: {
    padding: '12px',
    textAlign: 'right',
    color: '#374151',
    borderRight: '1px solid #e5e7eb',
  },
  tfootQty: {
    padding: '12px',
    textAlign: 'center',
    color: '#111827',
    borderRight: '1px solid #e5e7eb',
  },
  tfootValue: {
    padding: '12px',
    textAlign: 'right',
    color: '#059669',
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
