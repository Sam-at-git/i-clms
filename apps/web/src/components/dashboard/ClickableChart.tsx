import { useState } from 'react';
import { Link } from 'react-router-dom';

interface ClickableChartProps {
  title: string;
  data: any[];
  type: 'bar' | 'line' | 'pie' | 'number';
  drillDownPath?: string;
  drillDownKey?: string;
  onDrillDown?: (item: any) => void;
}

export function ClickableChart({
  title,
  data,
  type,
  drillDownPath,
  drillDownKey = 'id',
  onDrillDown,
}: ClickableChartProps) {
  const [hoveredItem, setHoveredItem] = useState<any>(null);

  const handleClick = (item: any) => {
    if (drillDownPath) {
      const url = drillDownPath.replace(':id', item[drillDownKey]);
      window.location.href = url;
    }
    onDrillDown?.(item);
  };

  const renderContent = () => {
    switch (type) {
      case 'number':
        return renderNumberCard();
      case 'bar':
        return renderBarChart();
      case 'line':
        return renderLineChart();
      case 'pie':
        return renderPieChart();
      default:
        return <div style={styles.empty}>未知图表类型</div>;
    }
  };

  const renderNumberCard = () => {
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    return (
      <div
        style={{
          ...styles.numberCard,
          ...(drillDownPath && styles.clickable),
        }}
        onClick={() => handleClick({ total })}
        title={drillDownPath ? '点击查看详情' : ''}
      >
        <div style={styles.numberValue}>{formatNumber(total)}</div>
        <div style={styles.numberLabel}>{title}</div>
      </div>
    );
  };

  const renderBarChart = () => {
    const maxValue = Math.max(...data.map((d) => d.value || 0));

    return (
      <div style={styles.chartContainer}>
        <div style={styles.chartHeader}>
          <h3 style={styles.chartTitle}>{title}</h3>
          {drillDownPath && (
            <span style={styles.hint}>点击条形查看详情</span>
          )}
        </div>
        <div style={styles.barChart}>
          {data.map((item, index) => (
            <div
              key={index}
              style={styles.barContainer}
              onClick={() => handleClick(item)}
              onMouseEnter={() => setHoveredItem(item)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div style={styles.barLabel}>{item.label}</div>
              <div style={styles.barTrack}>
                <div
                  style={{
                    ...styles.barFill,
                    width: `${((item.value || 0) / maxValue) * 100}%`,
                    ...(hoveredItem === item && styles.barFillHover),
                  }}
                />
              </div>
              <div style={styles.barValue}>
                {formatNumber(item.value || 0)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLineChart = () => {
    return (
      <div style={styles.chartContainer}>
        <div style={styles.chartHeader}>
          <h3 style={styles.chartTitle}>{title}</h3>
          {drillDownPath && (
            <span style={styles.hint}>点击数据点查看详情</span>
          )}
        </div>
        <div style={styles.lineChartPlaceholder}>
          {data.map((item, index) => (
            <div
              key={index}
              style={styles.dataPoint}
              onClick={() => handleClick(item)}
              title={`${item.label}: ${formatNumber(item.value || 0)}`}
            >
              <div style={styles.dataPointDot} />
              <div style={styles.dataPointLabel}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPieChart = () => {
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    const currentAngle = 0;

    return (
      <div style={styles.chartContainer}>
        <div style={styles.chartHeader}>
          <h3 style={styles.chartTitle}>{title}</h3>
          {drillDownPath && (
            <span style={styles.hint}>点击扇区查看详情</span>
          )}
        </div>
        <div style={styles.pieChart}>
          {data.map((item, index) => {
            const percentage = ((item.value || 0) / total) * 100;
            const angle = (percentage / 100) * 360;
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

            return (
              <div
                key={index}
                style={{
                  ...styles.pieSlice,
                  background: `conic-gradient(${colors[index % colors.length]} ${currentAngle}deg ${currentAngle + angle}deg)`,
                  ...(hoveredItem === item && styles.pieSliceHover),
                }}
                onClick={() => handleClick(item)}
                onMouseEnter={() => setHoveredItem(item)}
                onMouseLeave={() => setHoveredItem(null)}
                title={`${item.label}: ${percentage.toFixed(1)}%`}
              />
            );
          })}
        </div>
        <div style={styles.pieLegend}>
          {data.map((item, index) => (
            <div key={index} style={styles.legendItem}>
              <span
                style={{
                  ...styles.legendColor,
                  backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][index % 6],
                }}
              />
              <span style={styles.legendLabel}>{item.label}</span>
              <span style={styles.legendValue}>{percentage(((item.value || 0) / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const percentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  return <div style={styles.container}>{renderContent()}</div>;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  clickable: {
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  numberCard: {
    padding: '24px',
    textAlign: 'center',
  },
  numberValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '8px',
  },
  numberLabel: {
    fontSize: '14px',
    color: '#6b7280',
  },
  chartContainer: {
    width: '100%',
  },
  chartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
    margin: 0,
  },
  hint: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  barChart: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  barContainer: {
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  barLabel: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '4px',
    textAlign: 'right' as const,
  },
  barTrack: {
    height: '24px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: '4px',
    transition: 'width 0.3s, background-color 0.2s',
  },
  barFillHover: {
    backgroundColor: '#2563eb',
  },
  barValue: {
    fontSize: '13px',
    color: '#111827',
    fontWeight: 500,
    marginTop: '4px',
  },
  lineChartPlaceholder: {
    height: '200px',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    padding: '16px',
    border: '1px dashed #e5e7eb',
    borderRadius: '4px',
  },
  dataPoint: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  dataPointDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    marginBottom: '4px',
  },
  dataPointLabel: {
    fontSize: '12px',
    color: '#6b7280',
  },
  pieChart: {
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    position: 'relative' as const,
    margin: '0 auto',
  },
  pieSlice: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  pieSliceHover: {
    transform: 'scale(1.05)',
  },
  pieLegend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginTop: '16px',
    justifyContent: 'center',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
  },
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '2px',
  },
  legendLabel: {
    color: '#374151',
  },
  legendValue: {
    color: '#6b7280',
    fontWeight: 500,
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    color: '#9ca3af',
  },
};

export default ClickableChart;
