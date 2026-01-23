import { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useParams, Link } from 'react-router-dom';
import { ContractEdit } from './ContractEdit';
import { ContractDelete } from './ContractDelete';

const GET_CONTRACT = gql`
  query GetContract($id: ID!) {
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
      createdAt
      updatedAt
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
  createdAt: string;
  updatedAt: string;
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
  contract: Contract | null;
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

export function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const { loading, error, data, refetch } = useQuery<ContractData>(GET_CONTRACT, {
    variables: { id },
    skip: !id,
  });

  if (loading) return <div style={styles.loading}>加载中...</div>;
  if (error) return <div style={styles.error}>错误: {error.message}</div>;
  if (!data?.contract) return <div style={styles.notFound}>合同不存在</div>;

  const contract = data.contract;

  const formatAmount = (amount: string | null, currency: string) => {
    if (!amount) return '-';
    const num = parseFloat(amount);
    if (isNaN(num)) return '-';
    return `${currency === 'CNY' ? '¥' : currency} ${num.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  return (
    <div style={styles.container}>
      <div style={styles.breadcrumb}>
        <Link to="/contracts" style={styles.breadcrumbLink}>
          合同列表
        </Link>
        <span style={styles.breadcrumbSeparator}>/</span>
        <span style={styles.breadcrumbCurrent}>{contract.contractNo}</span>
      </div>

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
          <button onClick={() => setShowEdit(true)} style={styles.editButton}>
            编辑
          </button>
          <button onClick={() => setShowDelete(true)} style={styles.deleteButton}>
            删除
          </button>
        </div>
      </div>

      <div style={styles.grid}>
        {/* 基本信息 */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>基本信息</h2>
          <div style={styles.fieldGrid}>
            <Field label="供应商" value={contract.ourEntity} />
            <Field label="所属部门" value={contract.department.name} />
            <Field label="销售负责人" value={contract.salesPerson} />
            <Field label="所属行业" value={contract.industry} />
          </div>
        </div>

        {/* 客户信息 */}
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

        {/* 财务信息 */}
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

        {/* 时间信息 */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>时间周期</h2>
          <div style={styles.fieldGrid}>
            <Field label="签订日期" value={formatDate(contract.signedAt)} />
            <Field label="生效日期" value={formatDate(contract.effectiveAt)} />
            <Field label="终止日期" value={formatDate(contract.expiresAt)} />
            <Field label="合同期限" value={contract.duration} />
          </div>
        </div>

        {/* 解析状态 */}
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

        {/* 系统信息 */}
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
    maxWidth: '1200px',
    margin: '0 auto',
  },
  breadcrumb: {
    marginBottom: '16px',
    fontSize: '14px',
  },
  breadcrumbLink: {
    color: '#3b82f6',
    textDecoration: 'none',
  },
  breadcrumbSeparator: {
    margin: '0 8px',
    color: '#9ca3af',
  },
  breadcrumbCurrent: {
    color: '#6b7280',
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
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

export default ContractDetail;
