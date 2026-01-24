import { useState, useCallback, useMemo } from 'react';
import { gql, useQuery, useLazyQuery } from '@apollo/client';

interface InteractiveChartsProps {
  department: string;
  onFilterChange?: (filters: Record<string, any>) => void;
  currentFilters?: Record<string, any>;
}

interface ChartDataPoint {
  x: string;
  y: number;
  category?: string;
  drillDownData?: ChartDataPoint[];
}

interface FilterState {
  dateRange?: { start: Date; end: Date };
  contractType?: string[];
  contractStatus?: string[];
  customerSegment?: string;
  valueRange?: [number, number];
}

const DRILL_DOWN_LEVELS = [
  { level: 'department', label: '部门' },
  { level: 'category', label: '分类' },
  { level: 'customer', label: '客户' },
  { level: 'contract', label: '合同' },
];

export function InteractiveCharts({ department, onFilterChange, currentFilters = {} }: InteractiveChartsProps) {
  const [drillLevel, setDrillLevel] = useState(0);
  const [drillPath, setDrillPath] = useState<Array<{ level: string; value: string }>>([]);
  const [selectedDataPoint, setSelectedDataPoint] = useState<ChartDataPoint | null>(null);

  // Query for chart data
  const GET_REVENUE_CHART = gql`
    query GetRevenueChart($department: String!, $filters: RevenueChartFilters) {
      revenueChart(department: $department, filters: $filters) {
        timeSeries {
          date
          revenue
          cost
          profit
          contracts {
            count
            amount
          }
        }
        breakdown {
          category
          revenue
          profit
          trend
        }
      }
    }
  `;

  const [getRevenueChart] = useLazyQuery(GET_REVENUE_CHART, {
    variables: { department, filters: currentFilters },
    fetchPolicy: 'cache-and-network',
  });

  const handleDataPointClick = useCallback((point: ChartDataPoint) => {
    if (point.drillDownData && point.drillDownData.length > 0) {
      // Drill down to next level
      setSelectedDataPoint(point);
      setDrillPath([...drillPath, { level: DRILL_DOWN_LEVELS[drillLevel].level, value: point.x }]);
      setDrillLevel((prev) => Math.min(prev + 1, DRILL_DOWN_LEVELS.length - 1));

      // Trigger cross-filter
      if (onFilterChange) {
        const newFilters = {
          ...currentFilters,
          category: point.category,
          dateRange: point.date,
        };
        onFilterChange(newFilters);
      }
    }
  }, [drillLevel, drillPath, currentFilters, onFilterChange]);

  const handleDrillUp = () => {
    if (drillLevel > 0) {
      setDrillLevel((prev) => prev - 1);
      setDrillPath(drillPath.slice(0, -1));

      // Clear filter when drilling up
      if (onFilterChange && drillPath.length > 1) {
        const previousLevel = drillPath[drillPath.length - 2];
        onFilterChange({
          ...currentFilters,
          category: previousLevel.category,
        });
      }
    }
  };

  const handleReset = () => {
    setDrillLevel(0);
    setDrillPath([]);
    setSelectedDataPoint(null);
    if (onFilterChange) {
      onFilterChange({});
    }
  };

  const currentLevel = DRILL_DOWN_LEVELS[drillLevel];

  return (
    <div style={styles.container}>
      {/* Header with Controls */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h3 style={styles.title}>交互式图表</h3>
          <span style={styles.drillPath}>
            {drillPath.length > 0 && (
              <>
                {drillPath.map((item, index) => (
                  <span key={index} style={styles.drillPathItem}>
                    {item.value}
                    {index < drillPath.length - 1 && ' > '}
                  </span>
                ))}
              </>
            )}
          </span>
        </div>

        <div style={styles.controls}>
          {drillLevel > 0 && (
            <button onClick={handleDrillUp} style={styles.drillUpButton}>
              ⬆️ 返回上级
            </button>
          )}
          {(drillLevel > 0 || Object.keys(currentFilters).length > 0) && (
            <button onClick={handleReset} style={styles.resetButton}>
              🔄 重置
            </button>
          )}
        </div>
      </div>

      {/* Current Level Info */}
      {drillPath.length > 0 && (
        <div style={styles.levelInfo}>
          当前层级: <strong>{currentLevel.label}</strong>
          {selectedDataPoint && (
            <span style={styles.selectedValue}>
              : {selectedDataPoint.x}
            </span>
          )}
        </div>
      )}

      {/* Interactive Chart Area */}
      <div style={styles.chartArea}>
        {selectedDataPoint && selectedDataPoint.drillDownData ? (
          <>
            {/* Drill-down Chart */}
            <div style={styles.chartTitle}>
              {selectedDataPoint.x} - 详细数据
            </div>
            <div style={styles.drillDownChart}>
              {selectedDataPoint.drillDownData.map((point) => (
                <div
                  key={point.x}
                  onClick={() => handleDataPointClick(point as any)}
                  style={styles.chartBar}
                >
                  <div style={styles.barLabel}>{point.x}</div>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${(point.y / Math.max(...selectedDataPoint.drillDownData.map((p) => p.y))) * 100}%`,
                    }}
                  />
                  <div style={styles.barValue}>{point.y}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Main Revenue Chart */}
            <div style={styles.chartTitle}>收入趋势 - {department}</div>
            <div style={styles.mainChart}>
              <div style={styles.chartPlaceholder}>
                📊 交互式收入趋势图
                <div style={styles.chartPlaceholderText}>
                  点击数据点可下钻查看详情
                </div>
                <div style={styles.chartPlaceholderNote}>
                  支持按日期/分类/客户维度交叉筛选
                </div>
              </div>
            </div>

            {/* Breakdown Chart */}
            <div style={styles.chartTitle}>收入构成</div>
            <div style={styles.breakdownChart}>
              <div style={styles.chartPlaceholder}>
                📈 收入构成饼图
                <div style={styles.chartPlaceholderText}>
                  点击扇区可筛选对应分类
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Cross-filter Indicators */}
      {Object.keys(currentFilters).length > 0 && (
        <div style={styles.activeFiltersSection}>
          <h4 style={styles.filtersTitle}>当前筛选条件</h4>
          <div style={styles.filtersList}>
            {Object.entries(currentFilters).map(([key, value]) => (
              <div key={key} style={styles.filterChip}>
                <span style={styles.filterKey}>{key}:</span>
                <span style={styles.filterValue}>
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </span>
                <button
                  onClick={() => {
                    if (onFilterChange) {
                      const { [key, ...rest } } = currentFilters;
                      onFilterChange(rest);
                    }
                  }}
                  style={styles.filterRemove}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Guide */}
      <div style={styles.usageGuide}>
        <h4 style={styles.guideTitle}>使用说明</h4>
        <ul style={styles.guideList}>
          <li>点击图表数据点可下钻到下一级明细</li>
          <li>下钻后会自动应用交叉筛选</li>
          <li>点击"返回上级"可返回上一级</li>
          <li>点击"重置"可清除所有筛选</li>
          <li>多个筛选条件会叠加生效</li>
        </ul>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '20px',
    marginBottom: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  },
  drillPath: {
    fontSize: '13px',
    color: '#6b7280',
  },
  drillPathItem: {
    color: '#3b82f6',
    fontWeight: 500,
    margin: '0 4px',
  },
  controls: {
    display: 'flex',
    gap: '8px',
  },
  drillUpButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#fff',
    backgroundColor: '#6b7280',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  resetButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  levelInfo: {
    marginBottom: '12px',
    fontSize: '13px',
    color: '#6b7280',
  },
  selectedValue: {
    fontWeight: 600,
    color: '#111827',
  },
  chartArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  chartTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '12px',
  },
  chartPlaceholder: {
    padding: '40px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px dashed #d1d5db',
    textAlign: 'center',
  },
  chartPlaceholderText: {
    fontSize: '14px',
    color: '#374151',
    fontWeight: 500,
    marginBottom: '8px',
  },
  chartPlaceholderNote: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  drillDownChart: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  mainChart: {
    height: '250px',
  },
  breakdownChart: {
    height: '200px',
  },
  chartBar: {
    position: 'relative',
    height: '40px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#e5e7eb',
    },
  },
  barLabel: {
    position: 'absolute',
    left: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '12px',
    color: '#6b7280',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: '4px',
    transition: 'width 0.3s',
    ':hover': {
      backgroundColor: '#2563eb',
    },
  },
  barValue: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '12px',
    fontWeight: 600,
    color: '#111827',
  },
  activeFiltersSection: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  filtersTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
  },
  filtersList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  filterChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    backgroundColor: '#fff',
    border: '1px solid #3b82f6',
    borderRadius: '16px',
    fontSize: '12px',
  },
  filterKey: {
    color: '#6b7280',
    fontWeight: 500,
  },
  filterValue: {
    color: '#111827',
    fontWeight: 600,
  },
  filterRemove: {
    padding: '2px 4px',
    fontSize: '14px',
    color: '#ef4444',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: '#fecaca',
    },
  },
  usageGuide: {
    padding: '16px',
    backgroundColor: '#eff6ff',
    borderRadius: '6px',
    border: '1px solid #dbeafe',
  },
  guideTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e40af',
  },
  guideList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#1e40af',
    lineHeight: '1.6',
  },
};

export default InteractiveCharts;
