import React, { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

const SEARCH_CONTRACTS = gql`
  query SearchContracts($input: ContractSearchInput!) {
    searchContracts(input: $input) {
      total
      results {
        id
        contractNo
        name
        customerName
        type
        industry
        amount
        signedAt
        tags
        highlight
      }
    }
  }
`;

interface ContractSearchResult {
  id: string;
  contractNo: string;
  name: string;
  customerName: string;
  type: string;
  industry: string | null;
  amount: number;
  signedAt: string | null;
  tags: string[];
  highlight: string | null;
}

interface SearchResponse {
  searchContracts: {
    total: number;
    results: ContractSearchResult[];
  };
}

const typeLabels: Record<string, string> = {
  STAFF_AUGMENTATION: '人力框架',
  PROJECT_OUTSOURCING: '项目外包',
  PRODUCT_SALES: '产品购销',
};

export const ContractSearch: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const { data, loading } = useQuery<SearchResponse>(SEARCH_CONTRACTS, {
    variables: {
      input: {
        keyword: keyword || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
        limit: 20,
        offset: 0,
      },
    },
    skip: !keyword && selectedTags.length === 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <div style={{ background: 'white', borderRadius: '8px', padding: '24px' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#1a1a2e' }}>
        合同知识库搜索
      </h3>

      <form onSubmit={handleSearch} style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索合同名称、编号、客户..."
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
            搜索
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.entries(typeLabels).map(([type, label]) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              style={{
                padding: '6px 12px',
                border: '1px solid',
                borderColor: selectedTypes.includes(type) ? '#6366f1' : '#e0e0e0',
                background: selectedTypes.includes(type) ? '#eef2ff' : 'white',
                color: selectedTypes.includes(type) ? '#6366f1' : '#666',
                borderRadius: '16px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </form>

      {loading && (
        <div style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
          搜索中...
        </div>
      )}

      {data?.searchContracts && (
        <div>
          <div style={{ marginBottom: '12px', color: '#666', fontSize: '14px' }}>
            找到 {data.searchContracts.total} 条结果
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.searchContracts.results.map((contract) => (
              <div
                key={contract.id}
                style={{
                  padding: '16px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 500, color: '#1a1a2e' }}>
                    {contract.name}
                  </span>
                  <span style={{ color: '#6366f1', fontWeight: 600 }}>
                    ¥{(contract.amount / 10000).toFixed(1)}万
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  {contract.contractNo} | {contract.customerName} | {typeLabels[contract.type] || contract.type}
                </div>
                {contract.highlight && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#888',
                      background: '#f8f9fa',
                      padding: '8px',
                      borderRadius: '4px',
                      marginBottom: '8px',
                    }}
                  >
                    {contract.highlight}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {contract.tags.map((tag) => (
                    <span
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        padding: '2px 8px',
                        background: selectedTags.includes(tag) ? '#4338ca' : '#e0e7ff',
                        color: selectedTags.includes(tag) ? '#fff' : '#4338ca',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !data?.searchContracts && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#999' }}>
          输入关键词或选择筛选条件开始搜索
        </div>
      )}
    </div>
  );
};
