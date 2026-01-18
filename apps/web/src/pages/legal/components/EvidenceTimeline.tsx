import React, { useState } from 'react';
import { gql } from '@apollo/client';
import { useLazyQuery } from '@apollo/client/react';

const EVIDENCE_CHAIN = gql`
  query EvidenceChain($contractId: String!) {
    evidenceChain(contractId: $contractId) {
      contractId
      contractNo
      contractName
      customerName
      evidences {
        id
        eventType
        eventDate
        description
        fileUrl
        createdAt
      }
      completenessScore
      milestonesCovered
      totalMilestones
    }
  }
`;

interface Evidence {
  id: string;
  eventType: string;
  eventDate: string;
  description: string;
  fileUrl: string | null;
  createdAt: string;
}

interface EvidenceChainData {
  evidenceChain: {
    contractId: string;
    contractNo: string;
    contractName: string;
    customerName: string;
    evidences: Evidence[];
    completenessScore: number;
    milestonesCovered: number;
    totalMilestones: number;
  };
}

const eventTypeColors: Record<string, string> = {
  '合同签署': '#6366f1',
  '合同生效': '#10b981',
  '里程碑完成': '#f59e0b',
  '付款确认': '#8b5cf6',
  '验收通过': '#14b8a6',
};

export const EvidenceTimeline: React.FC = () => {
  const [contractId, setContractId] = useState('');
  const [fetchEvidence, { data, loading }] = useLazyQuery<EvidenceChainData>(EVIDENCE_CHAIN);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (contractId.trim()) {
      fetchEvidence({ variables: { contractId: contractId.trim() } });
    }
  };

  const chain = data?.evidenceChain;

  return (
    <div style={{ background: 'white', borderRadius: '8px', padding: '24px' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#1a1a2e' }}>履约证据链</h3>

      {/* Search Form */}
      <form onSubmit={handleSearch} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={contractId}
            onChange={(e) => setContractId(e.target.value)}
            placeholder="输入合同ID查看证据链..."
            style={{
              flex: 1,
              padding: '10px 16px',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '10px 24px',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            查询
          </button>
        </div>
      </form>

      {loading && (
        <div style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
          查询中...
        </div>
      )}

      {chain && (
        <div>
          {/* Contract Info */}
          <div style={{ marginBottom: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 500, color: '#1a1a2e' }}>{chain.contractName}</span>
              <span
                style={{
                  padding: '4px 12px',
                  background: chain.completenessScore >= 80 ? '#dcfce7' : '#fef3c7',
                  color: chain.completenessScore >= 80 ? '#166534' : '#92400e',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              >
                完整性: {chain.completenessScore.toFixed(0)}%
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {chain.contractNo} | {chain.customerName}
            </div>
            {chain.totalMilestones > 0 && (
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                里程碑: {chain.milestonesCovered}/{chain.totalMilestones} 已完成
              </div>
            )}
          </div>

          {/* Timeline */}
          <div style={{ position: 'relative', paddingLeft: '24px' }}>
            {/* Vertical Line */}
            <div
              style={{
                position: 'absolute',
                left: '8px',
                top: '8px',
                bottom: '8px',
                width: '2px',
                background: '#e0e0e0',
              }}
            />

            {chain.evidences.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#999' }}>
                暂无履约证据记录
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {chain.evidences.map((evidence) => (
                  <div key={evidence.id} style={{ position: 'relative' }}>
                    {/* Dot */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '-20px',
                        top: '4px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: eventTypeColors[evidence.eventType] || '#9ca3af',
                        border: '2px solid white',
                        boxShadow: '0 0 0 2px ' + (eventTypeColors[evidence.eventType] || '#9ca3af'),
                      }}
                    />

                    {/* Content */}
                    <div
                      style={{
                        padding: '12px 16px',
                        background: '#fff',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            background: eventTypeColors[evidence.eventType] || '#e5e7eb',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '11px',
                          }}
                        >
                          {evidence.eventType}
                        </span>
                        <span style={{ fontSize: '11px', color: '#999' }}>
                          {new Date(evidence.eventDate).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#444' }}>
                        {evidence.description}
                      </div>
                      {evidence.fileUrl && (
                        <a
                          href={evidence.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block',
                            marginTop: '8px',
                            fontSize: '12px',
                            color: '#6366f1',
                          }}
                        >
                          查看证据文件 →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !chain && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#999' }}>
          输入合同ID查看履约证据链
        </div>
      )}
    </div>
  );
};
