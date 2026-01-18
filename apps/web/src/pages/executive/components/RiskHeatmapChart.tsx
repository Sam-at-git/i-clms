import React, { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

const RISK_HEATMAP = gql`
  query RiskHeatmap($groupBy: String) {
    riskHeatmap(groupBy: $groupBy) {
      rows
      columns
      cells {
        category
        subCategory
        riskScore
        riskLevel
        contractCount
        totalValue
      }
      summary {
        totalContracts
        highRiskCount
        criticalRiskCount
        avgRiskScore
      }
    }
  }
`;

interface RiskCell {
  category: string;
  subCategory: string;
  riskScore: number;
  riskLevel: string;
  contractCount: number;
  totalValue: number;
}

interface RiskSummary {
  totalContracts: number;
  highRiskCount: number;
  criticalRiskCount: number;
  avgRiskScore: number;
}

interface RiskHeatmapData {
  riskHeatmap: {
    rows: string[];
    columns: string[];
    cells: RiskCell[];
    summary: RiskSummary;
  };
}

const riskColors: Record<string, string> = {
  LOW: '#dcfce7',
  MEDIUM: '#fef3c7',
  HIGH: '#fed7aa',
  CRITICAL: '#fecaca',
};

const riskTextColors: Record<string, string> = {
  LOW: '#166534',
  MEDIUM: '#92400e',
  HIGH: '#c2410c',
  CRITICAL: '#dc2626',
};

export const RiskHeatmapChart: React.FC = () => {
  const [groupBy, setGroupBy] = useState('department');
  const { data, loading } = useQuery<RiskHeatmapData>(RISK_HEATMAP, {
    variables: { groupBy },
  });

  if (loading) {
    return (
      <div style={{ background: 'white', borderRadius: '8px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1a1a2e' }}>风险热力图</h3>
        <div style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
          加载中...
        </div>
      </div>
    );
  }

  const heatmap = data?.riskHeatmap;

  const getCell = (row: string, col: string): RiskCell | undefined => {
    return heatmap?.cells.find((c) => c.category === row && c.subCategory === col);
  };

  return (
    <div style={{ background: 'white', borderRadius: '8px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#1a1a2e' }}>风险热力图</h3>
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value)}
          style={{
            padding: '6px 12px',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            fontSize: '13px',
          }}
        >
          <option value="department">按部门</option>
          <option value="industry">按行业</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e' }}>
            {heatmap?.summary.totalContracts || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>合同总数</div>
        </div>
        <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626' }}>
            {heatmap?.summary.criticalRiskCount || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>严重风险</div>
        </div>
        <div style={{ padding: '12px', background: '#fff7ed', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#c2410c' }}>
            {heatmap?.summary.highRiskCount || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>高风险</div>
        </div>
        <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e' }}>
            {(heatmap?.summary.avgRiskScore || 0).toFixed(0)}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>平均风险分</div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', color: '#666', borderBottom: '1px solid #e0e0e0' }}>
                {groupBy === 'department' ? '部门' : '行业'}
              </th>
              {heatmap?.columns.map((col) => (
                <th
                  key={col}
                  style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: '#666', borderBottom: '1px solid #e0e0e0' }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmap?.rows.map((row) => (
              <tr key={row}>
                <td style={{ padding: '8px', fontSize: '13px', color: '#444', borderBottom: '1px solid #f0f0f0' }}>
                  {row}
                </td>
                {heatmap?.columns.map((col) => {
                  const cell = getCell(row, col);
                  return (
                    <td
                      key={col}
                      style={{
                        padding: '8px',
                        textAlign: 'center',
                        background: riskColors[cell?.riskLevel || 'LOW'],
                        color: riskTextColors[cell?.riskLevel || 'LOW'],
                        fontSize: '14px',
                        fontWeight: 600,
                        borderBottom: '1px solid #f0f0f0',
                      }}
                      title={`${cell?.contractCount || 0}个合同, ¥${((cell?.totalValue || 0) / 10000).toFixed(0)}万`}
                    >
                      {(cell?.riskScore || 0).toFixed(0)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
        {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((level) => (
          <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                background: riskColors[level],
                borderRadius: '3px',
              }}
            />
            <span style={{ fontSize: '11px', color: '#666' }}>
              {level === 'LOW' ? '低' : level === 'MEDIUM' ? '中' : level === 'HIGH' ? '高' : '严重'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
