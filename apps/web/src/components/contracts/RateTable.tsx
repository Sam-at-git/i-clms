import { useState } from 'react';

interface Rate {
  position: string;
  level: string;
  rate: number;
  maxHours?: number;
}

interface RateTableProps {
  rates: Rate[];
  editable?: boolean;
  onChange?: (rates: Rate[]) => void;
}

export function RateTable({ rates, editable = false, onChange }: RateTableProps) {
  const [localRates, setLocalRates] = useState<Rate[]>(rates);

  const handleRateChange = (index: number, field: keyof Rate, value: any) => {
    const newRates = [...localRates];
    newRates[index] = { ...newRates[index], [field]: value };
    setLocalRates(newRates);
    onChange?.(newRates);
  };

  const handleAddRate = () => {
    const newRate: Rate = {
      position: '',
      level: '',
      rate: 0,
      maxHours: 160,
    };
    const newRates = [...localRates, newRate];
    setLocalRates(newRates);
    onChange?.(newRates);
  };

  const handleRemoveRate = (index: number) => {
    const newRates = localRates.filter((_, i) => i !== index);
    setLocalRates(newRates);
    onChange?.(newRates);
  };

  const totalMonthlyCost = localRates.reduce((sum, rate) => {
    return sum + (rate.rate * (rate.maxHours || 160));
  }, 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>费率表</h3>
        {editable && (
          <button onClick={handleAddRate} style={styles.addButton}>
            + 添加费率
          </button>
        )}
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>岗位</th>
              <th style={styles.th}>级别</th>
              <th style={styles.th}>费率(¥/h)</th>
              <th style={styles.th}>工时上限/月</th>
              <th style={styles.th}>月度成本</th>
              {editable && <th style={styles.th}>操作</th>}
            </tr>
          </thead>
          <tbody>
            {localRates.map((rate, index) => (
              <tr key={index} style={styles.tr}>
                <td style={styles.td}>
                  {editable ? (
                    <input
                      type="text"
                      value={rate.position}
                      onChange={(e) => handleRateChange(index, 'position', e.target.value)}
                      style={styles.input}
                      placeholder="岗位名称"
                    />
                  ) : (
                    rate.position
                  )}
                </td>
                <td style={styles.td}>
                  {editable ? (
                    <input
                      type="text"
                      value={rate.level}
                      onChange={(e) => handleRateChange(index, 'level', e.target.value)}
                      style={styles.input}
                      placeholder="级别"
                    />
                  ) : (
                    rate.level
                  )}
                </td>
                <td style={styles.td}>
                  {editable ? (
                    <input
                      type="number"
                      value={rate.rate}
                      onChange={(e) => handleRateChange(index, 'rate', parseFloat(e.target.value) || 0)}
                      style={styles.input}
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    `¥${rate.rate.toFixed(2)}`
                  )}
                </td>
                <td style={styles.td}>
                  {editable ? (
                    <input
                      type="number"
                      value={rate.maxHours || 160}
                      onChange={(e) => handleRateChange(index, 'maxHours', parseFloat(e.target.value) || 0)}
                      style={styles.input}
                      min="0"
                      step="8"
                    />
                  ) : (
                    `${rate.maxHours || 160}h`
                  )}
                </td>
                <td style={styles.td}>
                  ¥{((rate.rate * (rate.maxHours || 160))).toLocaleString('zh-CN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                {editable && (
                  <td style={styles.td}>
                    <button
                      onClick={() => handleRemoveRate(index)}
                      style={styles.removeButton}
                    >
                      删除
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {localRates.length === 0 && (
              <tr>
                <td colSpan={editable ? 6 : 5} style={styles.emptyTd}>
                  暂无费率配置
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {localRates.length > 0 && (
        <div style={styles.summary}>
          <span style={styles.summaryLabel}>月度总成本：</span>
          <span style={styles.summaryValue}>
            ¥{totalMonthlyCost.toLocaleString('zh-CN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
    margin: 0,
  },
  addButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  tableContainer: {
    overflowX: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 500,
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  tr: {
    borderBottom: '1px solid #e5e7eb',
  },
  td: {
    padding: '10px 12px',
    fontSize: '14px',
    color: '#374151',
  },
  emptyTd: {
    padding: '24px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '6px 8px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
  },
  removeButton: {
    padding: '4px 8px',
    fontSize: '12px',
    color: '#ef4444',
    backgroundColor: 'transparent',
    border: '1px solid #fecaca',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  summary: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '12px',
    marginTop: '12px',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
  },
  summaryLabel: {
    fontSize: '14px',
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
};

export default RateTable;
