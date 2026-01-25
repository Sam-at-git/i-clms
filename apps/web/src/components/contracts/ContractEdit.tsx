import { useState, useEffect, useCallback } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  useRagCorrectFieldMutation,
  useRagBatchCorrectStartMutation,
  useGetRagCorrectionProgressLazyQuery,
  useApplyCorrectionMutation,
  useGetContractFieldConfigsQuery,
} from '@i-clms/shared/generated/graphql';

const UPDATE_CONTRACT = gql`
  mutation UpdateContract($id: ID!, $input: UpdateContractInput!) {
    updateContract(id: $id, input: $input) {
      id
      contractNo
      name
      type
      status
      ourEntity
      amountWithTax
      signedAt
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
  currency: string;
  signedAt: string | null;
  effectiveAt: string | null;
  expiresAt: string | null;
  paymentMethod: string | null;
  paymentTerms: string | null;
  taxRate: string | null;
  amountWithoutTax: string | null;
  industry: string | null;
  salesPerson: string | null;
  signLocation: string | null;
  copies: number | null;
  duration: string | null;
  isVectorized?: boolean;
}

interface CorrectionSuggestion {
  fieldName: string;
  fieldDisplayName: string;
  originalValue?: string | null;
  suggestedValue?: string | null;
  shouldChange: boolean;
  confidence: number;
  evidence: string;
  reasoning?: string | null;
}

interface ContractEditProps {
  contract: Contract | any;
  onClose: () => void;
  onSuccess: () => void;
}

const CONTRACT_TYPES = [
  { value: 'STAFF_AUGMENTATION', label: '人力框架' },
  { value: 'PROJECT_OUTSOURCING', label: '项目外包' },
  { value: 'PRODUCT_SALES', label: '产品购销' },
];

const CONTRACT_STATUSES = [
  { value: 'DRAFT', label: '草拟' },
  { value: 'PENDING_APPROVAL', label: '审批中' },
  { value: 'ACTIVE', label: '已生效' },
  { value: 'EXECUTING', label: '执行中' },
  { value: 'COMPLETED', label: '已完结' },
  { value: 'TERMINATED', label: '已终止' },
  { value: 'EXPIRED', label: '已过期' },
];

export function ContractEdit({ contract, onClose, onSuccess }: ContractEditProps) {
  const [formData, setFormData] = useState({
    contractNo: contract.contractNo,
    name: contract.name,
    type: contract.type,
    status: contract.status,
    ourEntity: contract.ourEntity || '',
    amountWithTax: contract.amountWithTax || '',
    amountWithoutTax: contract.amountWithoutTax || '',
    taxRate: contract.taxRate || '',
    signedAt: contract.signedAt?.split('T')[0] || '',
    effectiveAt: contract.effectiveAt?.split('T')[0] || '',
    expiresAt: contract.expiresAt?.split('T')[0] || '',
    paymentMethod: contract.paymentMethod || '',
    paymentTerms: contract.paymentTerms || '',
    industry: contract.industry || '',
    salesPerson: contract.salesPerson || '',
    signLocation: contract.signLocation || '',
    copies: contract.copies?.toString() || '',
    duration: contract.duration || '',
  });
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<Record<string, CorrectionSuggestion>>({});
  const [loadingField, setLoadingField] = useState<string | null>(null);
  const [batchSessionId, setBatchSessionId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{
    status: string;
    totalFields: number;
    completedFields: number;
    currentField?: string;
  } | null>(null);

  // GraphQL hooks
  const [updateContract, { loading: updateLoading }] = useMutation(UPDATE_CONTRACT, {
    onCompleted: () => {
      onSuccess();
    },
    onError: (err) => {
      setError(err.message || '更新失败');
    },
  });

  const { data: fieldConfigsData } = useGetContractFieldConfigsQuery();
  const [ragCorrectField] = useRagCorrectFieldMutation();
  const [ragBatchCorrectStart] = useRagBatchCorrectStartMutation();
  const [fetchProgress] = useGetRagCorrectionProgressLazyQuery();
  const [applyCorrection] = useApplyCorrectionMutation();

  // Build field config lookup
  const fieldConfigs = fieldConfigsData?.contractFieldConfigs || [];
  const fieldConfigMap = Object.fromEntries(
    fieldConfigs.map((f) => [f.fieldName, f])
  );

  // Check if RAG is available for this contract
  const isRagAvailable = contract.isVectorized;

  // Get display name for field
  const getDisplayName = (fieldName: string) => {
    return fieldConfigMap[fieldName]?.displayName || fieldName;
  };

  // Check if field supports RAG
  const isRagSupported = (fieldName: string) => {
    return fieldConfigMap[fieldName]?.ragSupported && isRagAvailable;
  };

  // Handle field change
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear suggestion if value is manually changed
    if (suggestions[field]) {
      setSuggestions((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Handle single field RAG correction
  const handleRagCorrect = async (fieldName: string) => {
    if (!isRagAvailable) return;

    setLoadingField(fieldName);
    setError('');

    try {
      const { data } = await ragCorrectField({
        variables: {
          contractId: contract.id,
          fieldName,
        },
      });

      if (data?.ragCorrectField) {
        const suggestion = data.ragCorrectField;
        if (suggestion.shouldChange && suggestion.suggestedValue) {
          setSuggestions((prev) => ({
            ...prev,
            [fieldName]: suggestion as CorrectionSuggestion,
          }));
        } else {
          // Show info that no change is suggested
          setError(`${getDisplayName(fieldName)}: 当前值已正确，无需修改`);
          setTimeout(() => setError(''), 3000);
        }
      }
    } catch (err) {
      setError(`RAG修正失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setLoadingField(null);
    }
  };

  // Apply suggestion
  const handleApplySuggestion = (fieldName: string) => {
    const suggestion = suggestions[fieldName];
    if (suggestion?.suggestedValue) {
      handleChange(fieldName, suggestion.suggestedValue);
      setSuggestions((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  // Dismiss suggestion
  const handleDismissSuggestion = (fieldName: string) => {
    setSuggestions((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

  // Start batch correction
  const handleBatchCorrection = async () => {
    if (!isRagAvailable) return;

    setError('');
    try {
      const { data } = await ragBatchCorrectStart({
        variables: { contractId: contract.id },
      });

      if (data?.ragBatchCorrectStart) {
        setBatchSessionId(data.ragBatchCorrectStart);
      }
    } catch (err) {
      setError(`批量修正启动失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  // Poll batch progress
  useEffect(() => {
    if (!batchSessionId) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await fetchProgress({
          variables: { sessionId: batchSessionId },
        });

        if (data?.ragCorrectionProgress) {
          const progress = data.ragCorrectionProgress;
          setBatchProgress({
            status: progress.status,
            totalFields: progress.totalFields,
            completedFields: progress.completedFields,
            currentField: progress.currentField || undefined,
          });

          // Apply results when completed
          if (progress.status === 'completed') {
            clearInterval(interval);
            setBatchSessionId(null);

            // Add suggestions for fields with changes
            const newSuggestions: Record<string, CorrectionSuggestion> = {};
            for (const result of progress.results) {
              if (result.shouldChange) {
                newSuggestions[result.fieldName] = result as CorrectionSuggestion;
              }
            }
            setSuggestions((prev) => ({ ...prev, ...newSuggestions }));
          } else if (progress.status === 'failed') {
            clearInterval(interval);
            setBatchSessionId(null);
            setError(progress.error || '批量修正失败');
          }
        }
      } catch (err) {
        console.error('Failed to fetch progress:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [batchSessionId, fetchProgress]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.contractNo || !formData.name) {
      setError('合同编号和名称为必填项');
      return;
    }

    updateContract({
      variables: {
        id: contract.id,
        input: {
          contractNo: formData.contractNo,
          name: formData.name,
          type: formData.type,
          status: formData.status,
          ourEntity: formData.ourEntity || null,
          amountWithTax: formData.amountWithTax || null,
          amountWithoutTax: formData.amountWithoutTax || null,
          taxRate: formData.taxRate || null,
          signedAt: formData.signedAt || null,
          effectiveAt: formData.effectiveAt || null,
          expiresAt: formData.expiresAt || null,
          paymentMethod: formData.paymentMethod || null,
          paymentTerms: formData.paymentTerms || null,
          industry: formData.industry || null,
          salesPerson: formData.salesPerson || null,
          signLocation: formData.signLocation || null,
          copies: formData.copies ? parseInt(formData.copies) : null,
          duration: formData.duration || null,
        },
      },
    });
  };

  // Render a field with RAG correction support
  const renderField = (
    fieldName: string,
    type: 'text' | 'number' | 'date' | 'select' = 'text',
    options?: { value: string; label: string }[],
    required?: boolean
  ) => {
    const displayName = getDisplayName(fieldName);
    const ragSupported = isRagSupported(fieldName);
    const suggestion = suggestions[fieldName];
    const isLoading = loadingField === fieldName;

    return (
      <div style={styles.field}>
        <div style={styles.labelRow}>
          <label style={styles.label}>
            {displayName} {required && '*'}
          </label>
          {ragSupported && (
            <button
              type="button"
              onClick={() => handleRagCorrect(fieldName)}
              style={{
                ...styles.ragButton,
                opacity: isLoading ? 0.5 : 1,
              }}
              disabled={isLoading}
              title="RAG智能修正"
            >
              {isLoading ? '...' : 'AI'}
            </button>
          )}
        </div>

        {type === 'select' && options ? (
          <select
            value={(formData as any)[fieldName]}
            onChange={(e) => handleChange(fieldName, e.target.value)}
            style={styles.input}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={(formData as any)[fieldName]}
            onChange={(e) => handleChange(fieldName, e.target.value)}
            style={styles.input}
            required={required}
            step={type === 'number' ? '0.01' : undefined}
          />
        )}

        {/* RAG Suggestion Preview */}
        {suggestion && (
          <div style={styles.suggestionBox}>
            <div style={styles.suggestionHeader}>
              <span style={styles.suggestionIcon}>AI</span>
              <span style={styles.suggestionTitle}>建议修改</span>
              <span style={styles.confidenceBadge}>
                置信度: {Math.round(suggestion.confidence * 100)}%
              </span>
            </div>
            <div style={styles.suggestionContent}>
              <div style={styles.suggestionValue}>
                <span style={styles.valueLabel}>建议值:</span>
                <strong>{suggestion.suggestedValue}</strong>
              </div>
              {suggestion.evidence && (
                <div style={styles.suggestionEvidence}>
                  <span style={styles.valueLabel}>依据:</span>
                  <span>{suggestion.evidence}</span>
                </div>
              )}
            </div>
            <div style={styles.suggestionActions}>
              <button
                type="button"
                onClick={() => handleApplySuggestion(fieldName)}
                style={styles.applyButton}
              >
                采纳
              </button>
              <button
                type="button"
                onClick={() => handleDismissSuggestion(fieldName)}
                style={styles.dismissButton}
              >
                忽略
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const loading = updateLoading || !!batchSessionId;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>编辑合同</h2>
          <div style={styles.headerActions}>
            {isRagAvailable && (
              <button
                type="button"
                onClick={handleBatchCorrection}
                style={styles.smartRepairButton}
                disabled={!!batchSessionId}
              >
                {batchSessionId ? '修正中...' : '智能修复'}
              </button>
            )}
            <button onClick={onClose} style={styles.closeButton}>
              ×
            </button>
          </div>
        </div>

        {/* Batch Progress */}
        {batchProgress && batchSessionId && (
          <div style={styles.progressBar}>
            <div style={styles.progressInfo}>
              <span>正在处理: {batchProgress.currentField || '...'}</span>
              <span>
                {batchProgress.completedFields}/{batchProgress.totalFields}
              </span>
            </div>
            <div style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${
                    batchProgress.totalFields > 0
                      ? (batchProgress.completedFields / batchProgress.totalFields) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Vectorization Notice */}
        {!isRagAvailable && (
          <div style={styles.notice}>
            该合同尚未向量化，RAG智能修正功能不可用。请先完成合同向量化。
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>基本信息</h3>
            <div style={styles.formGrid}>
              {renderField('contractNo', 'text', undefined, true)}
              {renderField('name', 'text', undefined, true)}
              {renderField('type', 'select', CONTRACT_TYPES)}
              {renderField('status', 'select', CONTRACT_STATUSES)}
              {renderField('ourEntity')}
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>财务信息</h3>
            <div style={styles.formGrid}>
              {renderField('amountWithTax', 'number')}
              {renderField('amountWithoutTax', 'number')}
              {renderField('taxRate', 'number')}
              {renderField('paymentMethod')}
              {renderField('paymentTerms')}
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>时间信息</h3>
            <div style={styles.formGrid}>
              {renderField('signedAt', 'date')}
              {renderField('effectiveAt', 'date')}
              {renderField('expiresAt', 'date')}
              {renderField('duration')}
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>其他信息</h3>
            <div style={styles.formGrid}>
              {renderField('industry')}
              {renderField('salesPerson')}
              {renderField('signLocation')}
              {renderField('copies', 'number')}
            </div>
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.cancelButton}>
              取消
            </button>
            <button type="submit" style={styles.submitButton} disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
  },
  smartRepairButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#8b5cf6',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  progressBar: {
    margin: '0 24px',
    padding: '12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '13px',
    color: '#6b7280',
  },
  progressTrack: {
    height: '4px',
    backgroundColor: '#e5e7eb',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    transition: 'width 0.3s ease',
  },
  notice: {
    margin: '16px 24px',
    padding: '12px',
    backgroundColor: '#fef9c3',
    color: '#92400e',
    borderRadius: '8px',
    fontSize: '14px',
  },
  error: {
    margin: '16px 24px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
  },
  form: {
    padding: '24px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  ragButton: {
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#eef2ff',
    color: '#6366f1',
    cursor: 'pointer',
  },
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
  },
  suggestionBox: {
    marginTop: '8px',
    padding: '10px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: '6px',
    fontSize: '13px',
  },
  suggestionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  suggestionIcon: {
    padding: '2px 6px',
    fontSize: '10px',
    fontWeight: 600,
    backgroundColor: '#22c55e',
    color: '#fff',
    borderRadius: '4px',
  },
  suggestionTitle: {
    fontWeight: 500,
    color: '#166534',
  },
  confidenceBadge: {
    marginLeft: 'auto',
    fontSize: '11px',
    color: '#6b7280',
  },
  suggestionContent: {
    marginBottom: '8px',
  },
  suggestionValue: {
    marginBottom: '4px',
  },
  suggestionEvidence: {
    color: '#6b7280',
    fontSize: '12px',
  },
  valueLabel: {
    color: '#6b7280',
    marginRight: '4px',
  },
  suggestionActions: {
    display: 'flex',
    gap: '8px',
  },
  applyButton: {
    padding: '4px 12px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#22c55e',
    color: '#fff',
    cursor: 'pointer',
  },
  dismissButton: {
    padding: '4px 12px',
    fontSize: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: '#fff',
    color: '#6b7280',
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    background: '#fff',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '10px 20px',
    fontSize: '14px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    cursor: 'pointer',
  },
};

export default ContractEdit;
