import { useState, useRef } from 'react';
import { useAuthStore } from '../../state/auth.state';
import {
  useParseContractWithLlmMutation,
  useCheckContractDuplicateLazyQuery,
  useCreateOrUpdateContractMutation,
} from '@i-clms/shared/generated/graphql';

interface ContractUploadProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ExtractedData {
  contractType: string;
  basicInfo: {
    contractNo?: string | null;
    contractName?: string | null;
    ourEntity?: string | null;
    customerName?: string | null;
    status?: string | null;
  } | null;
  financialInfo?: {
    amountWithTax?: string | null;
    amountWithoutTax?: string | null;
    taxRate?: string | null;
    currency?: string | null;
    paymentMethod?: string | null;
    paymentTerms?: string | null;
  } | null;
  timeInfo?: {
    signedAt?: string | null;
    effectiveAt?: string | null;
    expiresAt?: string | null;
    duration?: string | null;
  } | null;
  otherInfo?: {
    salesPerson?: string | null;
    industry?: string | null;
    signLocation?: string | null;
    copies?: number | null;
  } | null;
  typeSpecificDetails?: any;
  metadata?: {
    overallConfidence?: number;
  } | null;
}

interface DuplicateContract {
  id: string;
  contractNo: string;
  name: string;
  amountWithTax: string;
  signedAt: string;
  status: string;
  customer: {
    name: string;
  };
}

export function ContractUploadLLM({ onClose, onSuccess }: ContractUploadProps) {
  const { user } = useAuthStore();
  const [step, setStep] = useState<'upload' | 'parsing' | 'review' | 'duplicate_check' | 'creating'>('upload');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [objectName, setObjectName] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [parseConfidence, setParseConfidence] = useState(0);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    existingContract: DuplicateContract;
    message: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    contractNo: '',
    name: '',
    type: 'PROJECT_OUTSOURCING' as any,
    ourEntity: '',
    customerName: '',
    amountWithTax: '',
    signedAt: '',
    effectiveAt: '',
    expiresAt: '',
    paymentMethod: '',
    paymentTerms: '',
    salesPerson: '',
    industry: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parseWithLlm] = useParseContractWithLlmMutation();
  const [checkDuplicate] = useCheckContractDuplicateLazyQuery();
  const [createOrUpdateContract] = useCreateOrUpdateContractMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('只支持 PDF 和 Word 文档');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('文件大小不能超过 50MB');
      return;
    }

    setUploading(true);
    setError('');
    setStep('upload');

    try {
      // 1. 上传文件
      const formData = new FormData();
      formData.append('file', file);

      const apiUrl = import.meta.env.VITE_GRAPHQL_URL?.replace('/graphql', '') || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/storage/upload?folder=contracts`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('文件上传失败');
      }

      const uploadResult = await response.json();
      setObjectName(uploadResult.objectName);

      // 2. 使用LLM解析
      setStep('parsing');
      const { data } = await parseWithLlm({
        variables: { objectName: uploadResult.objectName },
      });

      if (data?.parseContractWithLlm?.success) {
        const extracted = data.parseContractWithLlm.extractedData;
        if (!extracted) {
          setError('解析数据为空');
          setStep('upload');
          setUploading(false);
          return;
        }

        setExtractedData(extracted);
        setParseConfidence((extracted as any).metadata?.overallConfidence || 0);

        // 3. 填充表单
        setFormData({
          contractNo: extracted.basicInfo?.contractNo || '',
          name: extracted.basicInfo?.contractName || '',
          type: (extracted.contractType as any) || 'PROJECT_OUTSOURCING',
          ourEntity: extracted.basicInfo?.ourEntity || '',
          customerName: extracted.basicInfo?.customerName || '',
          amountWithTax: extracted.financialInfo?.amountWithTax || '',
          signedAt: extracted.timeInfo?.signedAt || '',
          effectiveAt: extracted.timeInfo?.effectiveAt || '',
          expiresAt: extracted.timeInfo?.expiresAt || '',
          paymentMethod: extracted.financialInfo?.paymentMethod || '',
          paymentTerms: extracted.financialInfo?.paymentTerms || '',
          salesPerson: extracted.otherInfo?.salesPerson || '',
          industry: extracted.otherInfo?.industry || '',
        });

        setStep('review');
      } else {
        setError(data?.parseContractWithLlm?.error || 'LLM解析失败');
        setStep('upload');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
      setStep('upload');
    } finally {
      setUploading(false);
    }
  };

  const handleReviewConfirm = async () => {
    if (!formData.contractNo) {
      setError('合同编号不能为空');
      return;
    }

    setError('');

    // 检查重复
    try {
      const { data } = await checkDuplicate({
        variables: { contractNo: formData.contractNo },
      });

      if (data?.checkContractDuplicate?.isDuplicate) {
        const existing = data.checkContractDuplicate.existingContract;
        if (!existing) {
          setError('重复合同信息缺失');
          return;
        }

        setDuplicateInfo({
          existingContract: {
            id: existing.id,
            contractNo: existing.contractNo || '',
            name: existing.name || '',
            amountWithTax: existing.amountWithTax || '',
            signedAt: existing.signedAt || '',
            status: existing.status || 'DRAFT',
            customer: {
              name: existing.customer?.name || '',
            },
          },
          message: data.checkContractDuplicate.message || '发现重复合同',
        });
        setStep('duplicate_check');
      } else {
        // 没有重复，直接创建
        handleCreateContract(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '重复检测失败');
    }
  };

  const handleCreateContract = async (forceUpdate: boolean) => {
    if (!user) {
      setError('用户未登录');
      return;
    }

    setStep('creating');
    setError('');

    try {
      await createOrUpdateContract({
        variables: {
          input: {
            contractNo: formData.contractNo,
            name: formData.name,
            type: formData.type,
            ourEntity: formData.ourEntity,
            customerName: formData.customerName,
            amountWithTax: formData.amountWithTax || '0',
            currency: 'CNY',
            signedAt: formData.signedAt || null,
            effectiveAt: formData.effectiveAt || null,
            expiresAt: formData.expiresAt || null,
            paymentMethod: formData.paymentMethod || null,
            paymentTerms: formData.paymentTerms || null,
            salesPerson: formData.salesPerson || null,
            industry: formData.industry || null,
            status: 'DRAFT' as any,
            fileUrl: objectName,
            departmentId: user.department.id,
            uploadedById: user.id,
          },
          forceUpdate,
          operatorId: user.id,
        },
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建合同失败');
      setStep('review');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            {step === 'upload' && '上传合同文件'}
            {step === 'parsing' && 'AI解析中...'}
            {step === 'review' && '确认合同信息'}
            {step === 'duplicate_check' && '检测到重复合同'}
            {step === 'creating' && '创建中...'}
          </h2>
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* 步骤1: 上传文件 */}
        {step === 'upload' && (
          <div style={styles.uploadArea}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <div
              style={styles.dropZone}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <p>上传中...</p>
              ) : (
                <>
                  <p style={styles.uploadIcon}>📄</p>
                  <p>点击选择文件或拖拽到此处</p>
                  <p style={styles.hint}>支持 PDF、Word 文档，最大 50MB</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* 步骤2: AI解析中 */}
        {step === 'parsing' && (
          <div style={styles.loading}>
            <p style={styles.loadingIcon}>🤖</p>
            <p>AI正在智能解析合同内容...</p>
            <p style={styles.hint}>这可能需要10-30秒</p>
          </div>
        )}

        {/* 步骤3: 审查和编辑 */}
        {step === 'review' && (
          <div style={styles.reviewContainer}>
            {parseConfidence > 0 && (
              <div style={styles.confidenceBanner}>
                <span>AI解析置信度: {(parseConfidence * 100).toFixed(1)}%</span>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleReviewConfirm(); }} style={styles.form}>
              <div style={styles.formGrid}>
                <div style={styles.field}>
                  <label style={styles.label}>合同编号 *</label>
                  <input
                    type="text"
                    value={formData.contractNo}
                    onChange={(e) => handleInputChange('contractNo', e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>合同名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>合同类型</label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    style={styles.input}
                  >
                    <option value="STAFF_AUGMENTATION">人力框架</option>
                    <option value="PROJECT_OUTSOURCING">项目外包</option>
                    <option value="PRODUCT_SALES">产品购销</option>
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>供应商</label>
                  <input
                    type="text"
                    value={formData.ourEntity}
                    onChange={(e) => handleInputChange('ourEntity', e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>客户名称</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>合同金额</label>
                  <input
                    type="number"
                    value={formData.amountWithTax}
                    onChange={(e) => handleInputChange('amountWithTax', e.target.value)}
                    style={styles.input}
                    step="0.01"
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>签订日期</label>
                  <input
                    type="date"
                    value={formData.signedAt}
                    onChange={(e) => handleInputChange('signedAt', e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>生效日期</label>
                  <input
                    type="date"
                    value={formData.effectiveAt}
                    onChange={(e) => handleInputChange('effectiveAt', e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>终止日期</label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => handleInputChange('expiresAt', e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>付款方式</label>
                  <input
                    type="text"
                    value={formData.paymentMethod}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>付款条件</label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>销售负责人</label>
                  <input
                    type="text"
                    value={formData.salesPerson}
                    onChange={(e) => handleInputChange('salesPerson', e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>所属行业</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.actions}>
                <button type="button" onClick={onClose} style={styles.cancelButton}>
                  取消
                </button>
                <button type="submit" style={styles.submitButton}>
                  下一步：检查重复
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 步骤4: 重复检测对话框 */}
        {step === 'duplicate_check' && duplicateInfo && (
          <div style={styles.duplicateContainer}>
            <div style={styles.warningBanner}>
              ⚠️ {duplicateInfo.message}
            </div>

            <div style={styles.comparisonGrid}>
              <div>
                <h3 style={styles.comparisonTitle}>现有合同</h3>
                <div style={styles.comparisonCard}>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>合同编号:</span>
                    <span>{duplicateInfo.existingContract.contractNo}</span>
                  </div>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>合同名称:</span>
                    <span>{duplicateInfo.existingContract.name}</span>
                  </div>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>客户:</span>
                    <span>{duplicateInfo.existingContract.customer?.name}</span>
                  </div>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>金额:</span>
                    <span>¥{duplicateInfo.existingContract.amountWithTax}</span>
                  </div>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>签订日期:</span>
                    <span>{duplicateInfo.existingContract.signedAt}</span>
                  </div>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>状态:</span>
                    <span>{duplicateInfo.existingContract.status}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={styles.comparisonTitle}>新上传合同</h3>
                <div style={styles.comparisonCard}>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>合同编号:</span>
                    <span>{formData.contractNo}</span>
                  </div>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>合同名称:</span>
                    <span>{formData.name}</span>
                  </div>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>客户:</span>
                    <span>{formData.customerName}</span>
                  </div>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>金额:</span>
                    <span>¥{formData.amountWithTax}</span>
                  </div>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>签订日期:</span>
                    <span>{formData.signedAt}</span>
                  </div>
                  <div style={styles.comparisonRow}>
                    <span style={styles.comparisonLabel}>状态:</span>
                    <span>DRAFT (新)</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.actions}>
              <button onClick={() => setStep('review')} style={styles.cancelButton}>
                返回修改
              </button>
              <button onClick={() => handleCreateContract(true)} style={styles.dangerButton}>
                强制更新现有合同
              </button>
            </div>
          </div>
        )}

        {/* 步骤5: 创建中 */}
        {step === 'creating' && (
          <div style={styles.loading}>
            <p>正在创建合同...</p>
          </div>
        )}
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
  error: {
    margin: '16px 24px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
  },
  uploadArea: {
    padding: '24px',
  },
  dropZone: {
    border: '2px dashed #d1d5db',
    borderRadius: '8px',
    padding: '48px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  uploadIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  hint: {
    color: '#6b7280',
    fontSize: '13px',
    marginTop: '8px',
  },
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#6b7280',
  },
  loadingIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  reviewContainer: {
    padding: '24px',
  },
  confidenceBanner: {
    padding: '12px',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
    textAlign: 'center',
    fontWeight: 500,
  },
  form: {
    marginTop: '16px',
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
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
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
  dangerButton: {
    padding: '10px 20px',
    fontSize: '14px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#ef4444',
    color: '#fff',
    cursor: 'pointer',
  },
  duplicateContainer: {
    padding: '24px',
  },
  warningBanner: {
    padding: '12px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '24px',
    fontWeight: 500,
  },
  comparisonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '24px',
    marginBottom: '24px',
  },
  comparisonTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '12px',
    color: '#374151',
  },
  comparisonCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    backgroundColor: '#f9fafb',
  },
  comparisonRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  comparisonLabel: {
    fontWeight: 500,
    color: '#6b7280',
    fontSize: '14px',
  },
};

export default ContractUploadLLM;
