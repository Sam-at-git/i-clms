import { useState } from 'react';

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
  customer: {
    name: string;
    shortName: string | null;
    creditCode: string | null;
    address: string | null;
    contactPerson: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
  };
  department: {
    name: string;
    code: string;
  };
  uploadedBy: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ContractPrintProps {
  contract: Contract;
}

export function ContractPrint({ contract }: ContractPrintProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <button onClick={handlePrint} style={styles.printButton}>
        🖨 打印
      </button>

      <div style={styles.printContainer}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>{contract.name}</h1>
          <div style={styles.subtitle}>
            <span style={styles.contractNo}>合同编号：{contract.contractNo}</span>
            <span style={styles.divider}>|</span>
            <span style={styles.type}>{formatType(contract.type)}</span>
            <span style={styles.divider}>|</span>
            <span style={styles.status}>{formatStatus(contract.status)}</span>
          </div>
        </div>

        {/* Print Date */}
        <div style={styles.printInfo}>
          打印时间：{new Date().toLocaleString('zh-CN')}
        </div>

        {/* Divider */}
        <div style={styles.dividerLine}></div>

        {/* Sections */}
        <div style={styles.sections}>
          {/* Basic Info */}
          <Section title="基本信息">
            <InfoRow label="我方主体" value={contract.ourEntity} />
            <InfoRow label="所属部门" value={contract.department.name} />
          </Section>

          {/* Customer Info */}
          <Section title="客户信息">
            <InfoRow label="客户名称" value={contract.customer.name} />
            <InfoRow label="客户简称" value={contract.customer.shortName} />
            <InfoRow label="统一信用代码" value={contract.customer.creditCode} />
            <InfoRow label="客户地址" value={contract.customer.address} />
            <InfoRow label="联系人" value={contract.customer.contactPerson} />
            <InfoRow label="联系电话" value={contract.customer.contactPhone} />
            <InfoRow label="联系邮箱" value={contract.customer.contactEmail} />
          </Section>

          {/* Financial Info */}
          <Section title="财务信息">
            <InfoRow
              label="含税金额"
              value={formatAmount(contract.amountWithTax, contract.currency)}
            />
            <InfoRow
              label="不含税金额"
              value={formatAmount(contract.amountWithoutTax, contract.currency)}
            />
            <InfoRow label="税率" value={contract.taxRate ? `${contract.taxRate}%` : null} />
            <InfoRow
              label="税额"
              value={formatAmount(contract.taxAmount, contract.currency)}
            />
            <InfoRow label="付款方式" value={contract.paymentMethod} />
            <InfoRow label="付款条件" value={contract.paymentTerms} />
          </Section>

          {/* Time Info */}
          <Section title="时间信息">
            <InfoRow label="签订日期" value={formatDate(contract.signedAt)} />
            <InfoRow label="生效日期" value={formatDate(contract.effectiveAt)} />
            <InfoRow label="终止日期" value={formatDate(contract.expiresAt)} />
            <InfoRow label="合同期限" value={contract.duration} />
          </Section>

          {/* System Info */}
          <Section title="系统信息">
            <InfoRow label="上传人" value={contract.uploadedBy.name} />
            <InfoRow label="创建时间" value={formatDateTime(contract.createdAt)} />
            <InfoRow label="更新时间" value={formatDateTime(contract.updatedAt)} />
          </Section>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerSection}>
            <div style={styles.footerLabel}>打印人：</div>
            <div style={styles.footerLine}></div>
          </div>
          <div style={styles.footerSection}>
            <div style={styles.footerLabel}>打印日期：</div>
            <div style={styles.footerLine}>{new Date().toLocaleDateString('zh-CN')}</div>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={sectionStyles.container}>
      <h2 style={sectionStyles.title}>{title}</h2>
      <div style={sectionStyles.content}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div style={rowStyles.container}>
      <div style={rowStyles.label}>{label}</div>
      <div style={rowStyles.value}>{value}</div>
    </div>
  );
}

function formatType(type: string): string {
  const typeMap: Record<string, string> = {
    STAFF_AUGMENTATION: '人力框架合同',
    PROJECT_OUTSOURCING: '项目外包合同',
    PRODUCT_SALES: '产品购销合同',
  };
  return typeMap[type] || type;
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    DRAFT: '草拟',
    PENDING_APPROVAL: '审批中',
    ACTIVE: '已生效',
    EXECUTING: '执行中',
    COMPLETED: '已完结',
    TERMINATED: '已终止',
    EXPIRED: '已过期',
  };
  return statusMap[status] || status;
}

function formatAmount(amount: string | null, currency: string): string {
  if (!amount) return '-';
  const num = parseFloat(amount);
  if (isNaN(num)) return '-';
  return `${currency === 'CNY' ? '¥' : currency} ${num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN');
}

const styles: Record<string, React.CSSProperties> = {
  printButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    marginBottom: '16px',
  },
  printContainer: {},
  header: {
    marginBottom: '24px',
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
    fontSize: '14px',
    color: '#6b7280',
  },
  contractNo: {
    fontWeight: 500,
  },
  divider: {
    color: '#d1d5db',
  },
  type: {
    color: '#3b82f6',
  },
  status: {
    color: '#10b981',
  },
  printInfo: {
    fontSize: '12px',
    color: '#9ca3af',
    marginBottom: '16px',
  },
  dividerLine: {
    height: '1px',
    backgroundColor: '#e5e7eb',
    marginBottom: '24px',
  },
  sections: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  footer: {
    marginTop: '48px',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '24px',
  },
  footerSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  footerLabel: {
    fontSize: '14px',
    color: '#374151',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  footerLine: {
    flex: 1,
    borderBottom: '1px solid #d1d5db',
  },
};

const sectionStyles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '16px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 12px 0',
    paddingBottom: '6px',
    borderBottom: '2px solid #e5e7eb',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px 24px',
  },
};

const rowStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: '12px',
  },
  label: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: 500,
    minWidth: '120px',
  },
  value: {
    fontSize: '13px',
    color: '#111827',
    flex: 1,
  },
};

export default ContractPrint;
