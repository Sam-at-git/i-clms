import { useState, useRef } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useAuthStore } from '../../state/auth.state';

const PARSE_AND_EXTRACT = gql`
  mutation ParseAndExtract($objectName: String!) {
    parseAndExtract(objectName: $objectName) {
      success
      text
      pageCount
      extractedFields {
        contractNumber
        contractName
        partyA
        partyB
        signDate
        amount
        validPeriod
        rawMatches {
          field
          value
          confidence
        }
      }
    }
  }
`;

const CREATE_CONTRACT = gql`
  mutation CreateContract($input: CreateContractInput!) {
    createContract(input: $input) {
      id
      contractNo
      name
    }
  }
`;

interface ContractUploadProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedFields {
  contractNumber?: string;
  contractName?: string;
  partyA?: string;
  partyB?: string;
  signDate?: string;
  amount?: string;
  validPeriod?: string;
}

interface ParseAndExtractResult {
  parseAndExtract: {
    success: boolean;
    text: string;
    pageCount: number;
    extractedFields: ParsedFields;
  };
}

export function ContractUpload({ onClose, onSuccess }: ContractUploadProps) {
  const { user } = useAuthStore();
  const [step, setStep] = useState<'upload' | 'review' | 'creating'>('upload');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [objectName, setObjectName] = useState('');
  const [parsedFields, setParsedFields] = useState<ParsedFields>({});
  const [formData, setFormData] = useState({
    contractNo: '',
    name: '',
    type: 'PROJECT_OUTSOURCING',
    ourEntity: '',
    customerName: '',
    amountWithTax: '',
    signedAt: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parseAndExtract] = useMutation<ParseAndExtractResult>(PARSE_AND_EXTRACT);
  const [createContract] = useMutation(CREATE_CONTRACT);

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

    try {
      // Upload file
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

      // Parse and extract fields
      const { data } = await parseAndExtract({
        variables: { objectName: uploadResult.objectName },
      });

      if (data?.parseAndExtract?.success) {
        const fields = data.parseAndExtract.extractedFields || {};
        setParsedFields(fields);
        setFormData((prev) => ({
          ...prev,
          contractNo: fields.contractNumber || '',
          name: fields.contractName || '',
          amountWithTax: fields.amount || '',
          signedAt: fields.signDate || '',
          ourEntity: fields.partyB || '',
          customerName: fields.partyA || '',
        }));
        setStep('review');
      } else {
        setStep('review');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('creating');
    setError('');

    if (!user) {
      setError('用户未登录');
      setStep('review');
      return;
    }

    try {
      await createContract({
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
            status: 'DRAFT',
            fileUrl: objectName,
            departmentId: user.department.id,
            uploadedById: user.id,
          },
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
            {step === 'review' && '确认合同信息'}
            {step === 'creating' && '创建中...'}
          </h2>
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

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
                <p>上传解析中...</p>
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

        {step === 'review' && (
          <form onSubmit={handleSubmit} style={styles.form}>
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
                <label style={styles.label}>我方主体</label>
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
            </div>

            <div style={styles.actions}>
              <button type="button" onClick={onClose} style={styles.cancelButton}>
                取消
              </button>
              <button type="submit" style={styles.submitButton}>
                创建合同
              </button>
            </div>
          </form>
        )}

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
    maxWidth: '600px',
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
  form: {
    padding: '24px',
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
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#6b7280',
  },
};

export default ContractUpload;
