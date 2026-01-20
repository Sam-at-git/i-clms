import { useMemo } from 'react';
import { ContractType } from '@i-clms/shared/generated/graphql';
import { RateTable } from './RateTable';
import { MilestoneList } from './MilestoneList';
import { ProductList } from './ProductList';

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
        return (
          <StaffAugmentationDetails
            data={data}
            editable={editable}
            onChange={onChange}
          />
        );

      case ContractType.ProjectOutsourcing:
        return (
          <ProjectOutsourcingDetails
            data={data}
            editable={editable}
            onChange={onChange}
          />
        );

      case ContractType.ProductSales:
        return (
          <ProductSalesDetails
            data={data}
            editable={editable}
            onChange={onChange}
          />
        );

      default:
        return <div style={styles.empty}>未知合同类型</div>;
    }
  }, [contractType, data, editable, onChange]);

  return <div style={styles.container}>{content}</div>;
}

// 人力框架合同详情
function StaffAugmentationDetails({
  data,
  editable,
  onChange,
}: {
  data?: any;
  editable?: boolean;
  onChange?: (data: any) => void;
}) {
  const rates = data?.rates || [];

  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>人力框架详情</h3>
      </div>

      <RateTable
        rates={rates}
        editable={editable}
        onChange={(newRates) => onChange?.({ ...data, rates: newRates })}
      />

      <div style={styles.infoGrid}>
        <InfoItem label="结算周期" value={data?.billingCycle || '按月结算'} />
        <InfoItem label="工时统计方式" value={data?.timeTracking || '系统自动统计'} />
      </div>
    </div>
  );
}

// 项目外包合同详情
function ProjectOutsourcingDetails({
  data,
  editable,
  onChange,
}: {
  data?: any;
  editable?: boolean;
  onChange?: (data: any) => void;
}) {
  const milestones = data?.milestones || [];

  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>项目外包详情</h3>
      </div>

      <MilestoneList
        milestones={milestones}
        editable={editable}
        onChange={(newMilestones) => onChange?.({ ...data, milestones: newMilestones })}
      />

      {data?.sowDocument && (
        <div style={styles.documentSection}>
          <h4 style={styles.subTitle}>工作说明书(SOW)</h4>
          <a href={data.sowDocument} style={styles.documentLink} target="_blank" rel="noopener">
            查看SOW文档 →
          </a>
        </div>
      )}
    </div>
  );
}

// 产品购销合同详情
function ProductSalesDetails({
  data,
  editable,
  onChange,
}: {
  data?: any;
  editable?: boolean;
  onChange?: (data: any) => void;
}) {
  const products = data?.products || [];

  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>产品购销详情</h3>
      </div>

      <ProductList
        products={products}
        editable={editable}
        onChange={(newProducts) => onChange?.({ ...data, products: newProducts })}
      />

      <div style={styles.infoGrid}>
        <InfoItem label="交付方式" value={data?.deliveryMethod || '物流配送'} />
        <InfoItem label="验收标准" value={data?.acceptanceCriteria || '符合产品规格'} />
      </div>
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

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  sectionHeader: {
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
    margin: 0,
  },
  subTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 8px 0',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #f3f4f6',
  },
  documentSection: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
  },
  documentLink: {
    fontSize: '14px',
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: 500,
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
    fontSize: '14px',
  },
  label: {
    color: '#6b7280',
    minWidth: '120px',
  },
  value: {
    color: '#111827',
    fontWeight: 500,
  },
};

export default ContractTypeSpecificDetails;
