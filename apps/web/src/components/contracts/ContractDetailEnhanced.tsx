import { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useParams, Link } from 'react-router-dom';
import { GetContractWithTagsQuery, useVectorizeContractMutation } from '@i-clms/shared/generated/graphql';
import { ContractEdit } from './ContractEdit';
import { ContractDelete } from './ContractDelete';
import { ContractTags } from './ContractTags';
import { ContractHistory } from './ContractHistory';
import { ContractRelated } from './ContractRelated';
import { SimilarContracts } from './SimilarContracts';
import { ContractPrint } from './ContractPrint';
import { ContractTypeSpecificDetails } from './ContractTypeSpecificDetails';
import { LegalClausesCard } from './LegalClausesCard';
import { Breadcrumb } from '../navigation/Breadcrumb';

const GET_CONTRACT = gql`
  query GetContractWithTags($id: ID!) {
    contract(id: $id) {
      id
      contractNo
      name
      type
      status
      ourEntity
      amountWithTax
      amountWithoutTax
      currency
      taxRate
      taxAmount
      paymentMethod
      paymentTerms
      signedAt
      effectiveAt
      expiresAt
      duration
      fileUrl
      fileType
      industry
      salesPerson
      parseStatus
      parsedAt
      parseConfidence
      needsManualReview
      isVectorized
      vectorizedAt
      vectorizationMethod
      chunkCount
      createdAt
      updatedAt
      tags {
        id
        name
        category
        color
        isActive
        isSystem
      }
      staffAugmentationDetail {
        id
        estimatedTotalHours
        monthlyHoursCap
        yearlyHoursCap
        settlementCycle
        timesheetApprovalFlow
        adjustmentMechanism
        rateItems {
          id
          role
          rateType
          rate
          rateEffectiveFrom
          rateEffectiveTo
        }
      }
      projectOutsourcingDetail {
        id
        sowSummary
        deliverables
        acceptanceCriteria
        acceptanceFlow
        changeManagementFlow
        milestones {
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
        }
      }
      productSalesDetail {
        id
        deliveryContent
        deliveryDate
        deliveryLocation
        shippingResponsibility
        ipOwnership
        warrantyPeriod
        afterSalesTerms
        lineItems {
          id
          productName
          specification
          quantity
          unit
          unitPriceWithTax
          unitPriceWithoutTax
          subtotal
        }
      }
      customer {
        id
        name
        shortName
        creditCode
        industry
        address
        contactPerson
        contactPhone
        contactEmail
      }
      department {
        id
        name
        code
      }
      uploadedBy {
        id
        name
        email
      }
    }
  }
`;

interface Contract {
  id: string;
  contractNo: string;
  name: string;
  type: string;
  status: string;
  ourEntity: string;
  amountWithTax: string;
  amountWithoutTax: string | null;
  currency: string;
  taxRate: string | null;
  taxAmount: string | null;
  paymentMethod: string | null;
  paymentTerms: string | null;
  signedAt: string | null;
  effectiveAt: string | null;
  expiresAt: string | null;
  duration: string | null;
  fileUrl: string | null;
  fileType: string | null;
  industry: string | null;
  salesPerson: string | null;
  parseStatus: string;
  parsedAt: string | null;
  parseConfidence: number | null;
  needsManualReview: boolean;
  isVectorized: boolean;
  vectorizedAt: string | null;
  vectorizationMethod: string | null;
  chunkCount: number | null;
  createdAt: string;
  updatedAt: string;
  tags: Array<{
    id: string;
    name: string;
    category: string;
    color: string;
    isActive: boolean;
    isSystem: boolean;
  }>;
  customer: {
    id: string;
    name: string;
    shortName: string | null;
    creditCode: string | null;
    industry: string | null;
    address: string | null;
    contactPerson: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
  };
  department: {
    id: string;
    name: string;
    code: string;
  };
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
}

interface ContractData {
  contract?: GetContractWithTagsQuery['contract'] | null;
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  STAFF_AUGMENTATION: '人力框架合同',
  PROJECT_OUTSOURCING: '项目外包合同',
  PRODUCT_SALES: '产品购销合同',
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

const PARSE_STATUS_LABELS: Record<string, string> = {
  PENDING: '待解析',
  PROCESSING: '解析中',
  COMPLETED: '解析完成',
  FAILED: '解析失败',
  MANUAL_REVIEW: '人工审核中',
};

export function ContractDetailEnhanced() {
  const { id } = useParams<{ id: string }>();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const { loading, error, data, refetch } = useQuery<ContractData>(GET_CONTRACT, {
    variables: { id },
    skip: !id,
  });

  const [vectorizeContract, { loading: vectorizing }] = useVectorizeContractMutation({
    onCompleted: (data) => {
      if (data.vectorizeContract?.success) {
        alert(`向量化成功！创建了 ${data.vectorizeContract.chunkCount} 个分块`);
        refetch(); // 刷新合同详情以显示向量化状态
      } else {
        alert(`向量化失败: ${data.vectorizeContract?.message || '未知错误'}`);
      }
    },
    onError: (error) => {
      alert(`向量化出错: ${error.message}`);
    },
  });

  if (loading) return <div style={styles.loading}>加载中...</div>;
  if (error) return <div style={styles.error}>错误: {error.message}</div>;
  if (!data?.contract) return <div style={styles.notFound}>合同不存在</div>;

  const contract = data.contract;

  const formatAmount = (amount: string | null | undefined, currency: string) => {
    if (!amount) return '-';
    const num = parseFloat(amount);
    if (isNaN(num)) return '-';
    return `${currency === 'CNY' ? '¥' : currency} ${num.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const handleVectorize = async (contractId: string) => {
    if (vectorizing) return;
    const confirmed = window.confirm('确定要对合同执行向量化吗？');
    if (confirmed) {
      await vectorizeContract({ variables: { id: contractId, method: 'MANUAL' } });
    }
  };

  return (
    <div style={styles.container}>
      {/* Breadcrumb */}
      <Breadcrumb />

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{contract.name}</h1>
          <div style={styles.subtitle}>
            <span style={styles.contractNo}>{contract.contractNo}</span>
            <span style={styles.typeBadge}>
              {CONTRACT_TYPE_LABELS[contract.type] || contract.type}
            </span>
            <span style={styles.statusBadge}>
              {CONTRACT_STATUS_LABELS[contract.status] || contract.status}
            </span>
          </div>
        </div>
        <div style={styles.headerActions}>
          <Link to="/contracts" style={styles.backButton}>
            ← 返回列表
          </Link>
          <button onClick={() => setShowPrint(!showPrint)} style={styles.printButton}>
            🖨 打印
          </button>
          <button onClick={() => setShowEdit(true)} style={styles.editButton}>
            编辑
          </button>
          <button onClick={() => setShowDelete(true)} style={styles.deleteButton}>
            删除
          </button>
        </div>
      </div>

      {/* Print View */}
      {showPrint && (
        <div style={styles.printSection}>
          <ContractPrint contract={contract} />
        </div>
      )}

      <div style={styles.mainGrid}>
        {/* Left Column - Main Info */}
        <div style={styles.leftColumn}>
          {/* Tags */}
          <div style={styles.card}>
            <ContractTags
              contractId={contract.id}
              tags={contract.tags}
              onUpdate={() => refetch()}
            />
          </div>

          {/* Basic Info */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>基本信息</h2>
            <div style={styles.fieldGrid}>
              <Field label="供应商" value={contract.ourEntity} />
              <Field label="所属部门" value={contract.department.name} />
              <Field label="销售负责人" value={contract.salesPerson} />
              <Field label="所属行业" value={contract.industry} />
            </div>
          </div>

          {/* Contract Type-Specific Details */}
          <ContractTypeSpecificDetails
            contractType={contract.type}
            data={
              contract.staffAugmentationDetail ||
              contract.projectOutsourcingDetail ||
              contract.productSalesDetail
            }
          />

          {/* Customer Info */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>客户信息</h2>
            <div style={styles.fieldGrid}>
              <Field label="客户名称" value={contract.customer.name} />
              <Field label="客户简称" value={contract.customer.shortName} />
              <Field label="统一信用代码" value={contract.customer.creditCode} />
              <Field label="联系人" value={contract.customer.contactPerson} />
              <Field label="联系电话" value={contract.customer.contactPhone} />
              <Field label="联系邮箱" value={contract.customer.contactEmail} />
            </div>
          </div>

          {/* Financial Info */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>财务信息</h2>
            <div style={styles.fieldGrid}>
              <Field
                label="含税金额"
                value={formatAmount(contract.amountWithTax, contract.currency)}
              />
              <Field
                label="不含税金额"
                value={formatAmount(contract.amountWithoutTax, contract.currency)}
              />
              <Field label="税率" value={contract.taxRate ? `${contract.taxRate}%` : null} />
              <Field
                label="税额"
                value={formatAmount(contract.taxAmount, contract.currency)}
              />
              <Field label="付款方式" value={contract.paymentMethod} />
              <Field label="付款条件" value={contract.paymentTerms} />
            </div>
          </div>

          {/* Time Info */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>时间周期</h2>
            <div style={styles.fieldGrid}>
              <Field label="签订日期" value={formatDate(contract.signedAt)} />
              <Field label="生效日期" value={formatDate(contract.effectiveAt)} />
              <Field label="终止日期" value={formatDate(contract.expiresAt)} />
              <Field label="合同期限" value={contract.duration} />
            </div>
          </div>

          {/* Parse Status */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>解析状态</h2>
            <div style={styles.fieldGrid}>
              <Field
                label="解析状态"
                value={PARSE_STATUS_LABELS[contract.parseStatus] || contract.parseStatus}
              />
              <Field label="解析时间" value={formatDateTime(contract.parsedAt)} />
              <Field
                label="解析置信度"
                value={contract.parseConfidence ? `${(contract.parseConfidence * 100).toFixed(1)}%` : null}
              />
              <Field
                label="需人工审核"
                value={contract.needsManualReview ? '是' : '否'}
              />
            </div>
          </div>

          {/* Vectorization Status */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>向量化状态</h2>
            {contract.isVectorized ? (
              <div style={styles.fieldGrid}>
                <div style={styles.vectorizedStatusBadge}>
                  ✅ 已向量化
                </div>
                <Field
                  label="向量化方式"
                  value={contract.vectorizationMethod === 'AUTO' ? '自动（RAG解析时）' : '手动触发'}
                />
                <Field label="向量化时间" value={formatDateTime(contract.vectorizedAt)} />
                <Field label="分块数量" value={contract.chunkCount?.toString() || '0'} />
              </div>
            ) : (
              <div style={styles.fieldGrid}>
                <div style={styles.unvectorizedStatusBadge}>
                  ⚪ 未向量化
                </div>
                <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                  <button
                    onClick={() => handleVectorize(contract.id)}
                    disabled={vectorizing}
                    style={{
                      ...styles.vectorizeButton,
                      ...(vectorizing ? styles.vectorizeButtonDisabled : {}),
                    }}
                  >
                    {vectorizing ? '向量化中...' : '执行向量化'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Legal Clauses */}
          <LegalClausesCard contractId={contract.id} />

          {/* System Info */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>系统信息</h2>
            <div style={styles.fieldGrid}>
              <Field label="上传人" value={contract.uploadedBy.name} />
              <Field label="创建时间" value={formatDateTime(contract.createdAt)} />
              <Field label="更新时间" value={formatDateTime(contract.updatedAt)} />
              <Field label="文件类型" value={contract.fileType} />
            </div>
          </div>
        </div>

        {/* Right Column - Related Info */}
        <div style={styles.rightColumn}>
          {/* Related Contracts */}
          <ContractRelated
            customerId={contract.customer.id}
            departmentId={contract.department.id}
            currentContractId={contract.id}
          />

          {/* Similar Contracts by Semantic Search */}
          <SimilarContracts contractId={contract.id} limit={5} />

          {/* Change History */}
          <ContractHistory contractId={contract.id} limit={10} />
        </div>
      </div>

      {/* Modals */}
      {showEdit && (
        <ContractEdit
          contract={contract}
          onClose={() => setShowEdit(false)}
          onSuccess={() => {
            setShowEdit(false);
            refetch();
          }}
        />
      )}

      {showDelete && (
        <ContractDelete
          contractId={contract.id}
          contractNo={contract.contractNo}
          contractName={contract.name}
          onClose={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={fieldStyles.field}>
      <dt style={fieldStyles.label}>{label}</dt>
      <dd style={fieldStyles.value}>{value || '-'}</dd>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  backButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  printButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  editButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: '1px solid #3b82f6',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    border: '1px solid #dc2626',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 8px 0',
  },
  subtitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  contractNo: {
    fontSize: '14px',
    color: '#6b7280',
  },
  typeBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '12px',
    backgroundColor: '#dbeafe',
    borderRadius: '4px',
    color: '#1e40af',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '12px',
    backgroundColor: '#dcfce7',
    borderRadius: '4px',
    color: '#166534',
  },
  printSection: {
    marginBottom: '24px',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '24px',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
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
  fieldGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#6b7280',
  },
  error: {
    padding: '48px',
    textAlign: 'center',
    color: '#ef4444',
  },
  notFound: {
    padding: '48px',
    textAlign: 'center',
    color: '#6b7280',
  },
};

const fieldStyles: Record<string, React.CSSProperties> = {
  field: {
    margin: 0,
  },
  label: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  value: {
    fontSize: '14px',
    color: '#111827',
    margin: 0,
  },
};

// 向量化状态样式
const vectorizedStatusBadge: React.CSSProperties = {
  display: 'inline-block',
  padding: '4px 12px',
  borderRadius: '6px',
  backgroundColor: '#dcfce7',
  color: '#166534',
  fontSize: '14px',
  fontWeight: 500,
};

const unvectorizedStatusBadge: React.CSSProperties = {
  display: 'inline-block',
  padding: '4px 12px',
  borderRadius: '6px',
  backgroundColor: '#f3f4f6',
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: 500,
};

const vectorizeButton: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: '14px',
  color: '#3b82f6',
  backgroundColor: '#eff6ff',
  border: '1px solid #3b82f6',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'background 0.2s',
};

const vectorizeButtonDisabled: React.CSSProperties = {
  opacity: 0.6,
  cursor: 'not-allowed',
};

// 将样式添加到styles对象中
Object.assign(styles, {
  vectorizedStatusBadge,
  unvectorizedStatusBadge,
  vectorizeButton,
  vectorizeButtonDisabled,
});

export default ContractDetailEnhanced;
