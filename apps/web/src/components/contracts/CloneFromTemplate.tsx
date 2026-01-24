import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { GET_CONTRACT_TEMPLATE } from '../../graphql/contract-templates';
import { CLONE_FROM_TEMPLATE } from '../../graphql/contract-templates';
import { GET_CUSTOMERS } from '../../graphql/customers';

interface CloneFromTemplateProps {
  templateId: string;
  onClose: () => void;
  onComplete?: (contractId: string) => void;
  currentUserId: string;
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  STAFF_AUGMENTATION: '人力框架',
  PROJECT_OUTSOURCING: '项目外包',
  PRODUCT_SALES: '产品购销',
};

export function CloneFromTemplate({
  templateId,
  onClose,
  onComplete,
  currentUserId,
}: CloneFromTemplateProps) {
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    contractNo: '',
    name: '',
    customerId: '',
    departmentId: '',
    ourEntity: '',
    salesPerson: '',
    parameterValues: {} as Record<string, any>,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);

  // Queries
  const { data: templateData, loading: templateLoading } = useQuery(GET_CONTRACT_TEMPLATE, {
    variables: { id: templateId },
    fetchPolicy: 'cache-and-network',
  });

  const { data: customersData } = useQuery(GET_CUSTOMERS);

  // Mutation
  const [cloneContract, { loading: cloning }] = useMutation(CLONE_FROM_TEMPLATE, {
    onCompleted: (data) => {
      const contractId = data.cloneFromTemplate.id;
      alert('合同创建成功');
      if (onComplete) {
        onComplete(contractId);
      } else {
        navigate(`/contracts/${contractId}`);
      }
      onClose();
    },
    onError: (error) => {
      alert(`创建失败: ${error.message}`);
    },
  });

  const template = templateData?.contractTemplate;
  const customers = customersData?.customers || [];
  const parameters = template?.parameters as any[] || [];
  const defaultValues = template?.defaultValues as Record<string, any> || {};

  // Initialize form with template defaults
  useEffect(() => {
    if (template && defaultValues) {
      setFormData((prev) => ({
        ...prev,
        name: `${template.displayName || template.name} - 副本`,
        ourEntity: defaultValues.ourEntity || '',
        salesPerson: defaultValues.salesPerson || '',
        parameterValues: { ...defaultValues },
      }));
    }
  }, [template, defaultValues]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!formData.contractNo.trim()) {
        newErrors.contractNo = '请输入合同编号';
      }
      if (!formData.name.trim()) {
        newErrors.name = '请输入合同名称';
      }
      if (!formData.customerId) {
        newErrors.customerId = '请选择客户';
      }
      if (!formData.departmentId) {
        newErrors.departmentId = '请选择部门';
      }
    }

    if (step === 1) {
      parameters.forEach((param) => {
        if (param.required && !formData.parameterValues[param.name]) {
          newErrors[param.name] = `请输入${param.label}`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = () => {
    if (validateStep(currentStep)) {
      cloneContract({
        variables: {
          input: {
            templateId,
            contractNo: formData.contractNo,
            name: formData.name,
            customerId: formData.customerId,
            departmentId: formData.departmentId,
            ourEntity: formData.ourEntity || undefined,
            salesPerson: formData.salesPerson || undefined,
            parameterValues: formData.parameterValues,
          },
        },
      });
    }
  };

  if (templateLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>加载模板中...</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>模板未找到</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>从模板创建合同</h2>
        <button onClick={onClose} style={styles.closeButton}>
          ✕
        </button>
      </div>

      {/* Template Info */}
      <div style={styles.templateInfo}>
        <div style={styles.templateName}>{template.displayName || template.name}</div>
        <div style={styles.templateMeta}>
          <span style={styles.templateType}>
            {CONTRACT_TYPE_LABELS[template.type]}
          </span>
          <span style={styles.templateVersion}>版本 {template.version}</span>
          {template.category && (
            <span style={styles.templateCategory}>{template.category}</span>
          )}
        </div>
        {template.description && (
          <div style={styles.templateDescription}>{template.description}</div>
        )}
      </div>

      {/* Progress Steps */}
      <div style={styles.progressSteps}>
        <div
          style={{
            ...styles.step,
            ...(currentStep === 0 && styles.stepActive),
            ...(currentStep > 0 && styles.stepCompleted),
          }}
        >
          <div style={styles.stepNumber}>1</div>
          <div style={styles.stepLabel}>基本信息</div>
        </div>
        <div style={styles.stepLine} />
        <div
          style={{
            ...styles.step,
            ...(currentStep === 1 && styles.stepActive),
            ...(currentStep > 1 && styles.stepCompleted),
          }}
        >
          <div style={styles.stepNumber}>2</div>
          <div style={styles.stepLabel}>模板参数</div>
        </div>
        <div style={styles.stepLine} />
        <div
          style={{
            ...styles.step,
            ...(currentStep === 2 && styles.stepActive),
          }}
        >
          <div style={styles.stepNumber}>3</div>
          <div style={styles.stepLabel}>确认</div>
        </div>
      </div>

      {/* Step 0: Basic Info */}
      {currentStep === 0 && (
        <div style={styles.stepContent}>
          <h3 style={styles.stepTitle}>基本信息</h3>

          <div style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                合同编号 <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={formData.contractNo}
                onChange={(e) => setFormData({ ...formData, contractNo: e.target.value })}
                style={styles.input}
                placeholder="CT-YYYY-XXX"
              />
              {errors.contractNo && (
                <div style={styles.error}>{errors.contractNo}</div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                合同名称 <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={styles.input}
              />
              {errors.name && <div style={styles.error}>{errors.name}</div>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                客户 <span style={styles.required}>*</span>
              </label>
              <select
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                style={styles.input}
              >
                <option value="">请选择客户</option>
                {customers.map((customer: any) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              {errors.customerId && (
                <div style={styles.error}>{errors.customerId}</div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                所属部门 <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                style={styles.input}
                placeholder="部门ID"
              />
              {errors.departmentId && (
                <div style={styles.error}>{errors.departmentId}</div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>我方主体</label>
              <input
                type="text"
                value={formData.ourEntity}
                onChange={(e) => setFormData({ ...formData, ourEntity: e.target.value })}
                style={styles.input}
                placeholder="合同签约主体"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>销售人员</label>
              <input
                type="text"
                value={formData.salesPerson}
                onChange={(e) => setFormData({ ...formData, salesPerson: e.target.value })}
                style={styles.input}
                placeholder="负责销售人员"
              />
            </div>
          </div>

          <div style={styles.stepActions}>
            <button onClick={onClose} style={styles.cancelButton}>
              取消
            </button>
            <button onClick={handleNext} style={styles.primaryButton}>
              下一步
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Template Parameters */}
      {currentStep === 1 && (
        <div style={styles.stepContent}>
          <h3 style={styles.stepTitle}>模板参数</h3>

          {parameters.length === 0 ? (
            <div style={styles.noParams}>
              此模板没有可配置参数
            </div>
          ) : (
            <div style={styles.form}>
              {parameters.map((param) => (
                <div key={param.name} style={styles.formGroup}>
                  <label style={styles.label}>
                    {param.label}
                    {param.required && <span style={styles.required}> *</span>}
                  </label>
                  <div style={styles.paramDescription}>
                    变量名: <code style={styles.code}>{param.name}</code>
                    {param.defaultValue && (
                      <span style={styles.defaultInfo}>
                        , 默认值: <code style={styles.code}>{param.defaultValue}</code>
                      </span>
                    )}
                  </div>

                  {param.type === 'select' ? (
                    <select
                      value={formData.parameterValues[param.name] || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          parameterValues: {
                            ...formData.parameterValues,
                            [param.name]: e.target.value,
                          },
                        })
                      }
                      style={styles.input}
                    >
                      <option value="">请选择</option>
                      {param.options?.map((option: string) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : param.type === 'textarea' ? (
                    <textarea
                      value={formData.parameterValues[param.name] || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          parameterValues: {
                            ...formData.parameterValues,
                            [param.name]: e.target.value,
                          },
                        })
                      }
                      style={styles.textarea}
                      rows={3}
                    />
                  ) : (
                    <input
                      type={param.type === 'number' ? 'number' : 'text'}
                      value={formData.parameterValues[param.name] || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          parameterValues: {
                            ...formData.parameterValues,
                            [param.name]: e.target.value,
                          },
                        })
                      }
                      style={styles.input}
                    />
                  )}

                  {errors[param.name] && (
                    <div style={styles.error}>{errors[param.name]}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={styles.stepActions}>
            <button onClick={handlePrevious} style={styles.cancelButton}>
              上一步
            </button>
            <button onClick={handleNext} style={styles.primaryButton}>
              下一步
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Confirmation */}
      {currentStep === 2 && (
        <div style={styles.stepContent}>
          <h3 style={styles.stepTitle}>确认信息</h3>

          <div style={styles.confirmSection}>
            <h4 style={styles.confirmSectionTitle}>合同信息</h4>
            <div style={styles.confirmField}>
              <span style={styles.confirmLabel}>合同编号:</span>
              <span style={styles.confirmValue}>{formData.contractNo}</span>
            </div>
            <div style={styles.confirmField}>
              <span style={styles.confirmLabel}>合同名称:</span>
              <span style={styles.confirmValue}>{formData.name}</span>
            </div>
            <div style={styles.confirmField}>
              <span style={styles.confirmLabel}>合同类型:</span>
              <span style={styles.confirmValue}>
                {CONTRACT_TYPE_LABELS[template.type]}
              </span>
            </div>
            <div style={styles.confirmField}>
              <span style={styles.confirmLabel}>客户:</span>
              <span style={styles.confirmValue}>
                {customers.find((c: any) => c.id === formData.customerId)?.name}
              </span>
            </div>
          </div>

          {Object.keys(formData.parameterValues).length > 0 && (
            <div style={styles.confirmSection}>
              <h4 style={styles.confirmSectionTitle}>模板参数值</h4>
              {Object.entries(formData.parameterValues).map(([key, value]) => (
                <div key={key} style={styles.confirmField}>
                  <span style={styles.confirmLabel}>{key}:</span>
                  <span style={styles.confirmValue}>{String(value)}</span>
                </div>
              ))}
            </div>
          )}

          <div style={styles.notice}>
            <strong style={styles.noticeTitle}>注意:</strong>
            创建后可在合同详情页继续编辑和完善合同信息
          </div>

          <div style={styles.stepActions}>
            <button onClick={handlePrevious} style={styles.cancelButton}>
              上一步
            </button>
            <button
              onClick={handleSubmit}
              disabled={cloning}
              style={styles.primaryButton}
            >
              {cloning ? '创建中...' : '创建合同'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    maxWidth: '800px',
    margin: '0 auto',
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
  },
  error: {
    padding: '40px',
    textAlign: 'center',
    color: '#ef4444',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  closeButton: {
    padding: '4px 8px',
    fontSize: '18px',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  templateInfo: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  templateName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '8px',
  },
  templateMeta: {
    display: 'flex',
    gap: '12px',
    marginBottom: '8px',
  },
  templateType: {
    padding: '4px 8px',
    fontSize: '12px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    borderRadius: '4px',
  },
  templateVersion: {
    fontSize: '13px',
    color: '#6b7280',
  },
  templateCategory: {
    fontSize: '13px',
    color: '#6b7280',
  },
  templateDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  progressSteps: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  stepActive: {
    color: '#3b82f6',
  },
  stepCompleted: {
    color: '#10b981',
  },
  stepNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
  },
  stepActive: {
    backgroundColor: '#3b82f6',
    color: '#fff',
  },
  stepCompleted: {
    backgroundColor: '#10b981',
    color: '#fff',
  },
  stepLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  stepLine: {
    width: '60px',
    height: '2px',
    backgroundColor: '#e5e7eb',
    margin: '0 8px',
  },
  stepContent: {
    padding: '24px',
  },
  stepTitle: {
    margin: '0 0 20px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    outline: 'none',
  },
  textarea: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  paramDescription: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  code: {
    padding: '2px 4px',
    backgroundColor: '#f3f4f6',
    borderRadius: '3px',
    fontSize: '12px',
    color: '#6b7280',
  },
  defaultInfo: {
    marginLeft: '4px',
  },
  error: {
    fontSize: '12px',
    color: '#ef4444',
  },
  noParams: {
    padding: '20px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
  },
  stepActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
  cancelButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  primaryButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  confirmSection: {
    marginBottom: '20px',
  },
  confirmSectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
  },
  confirmField: {
    display: 'flex',
    marginBottom: '8px',
    fontSize: '14px',
  },
  confirmLabel: {
    width: '120px',
    color: '#6b7280',
  },
  confirmValue: {
    flex: 1,
    color: '#111827',
  },
  notice: {
    padding: '12px',
    backgroundColor: '#fef3c7',
    border: '1px solid #fde68a',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#92400e',
  },
  noticeTitle: {
    color: '#78350f',
  },
};

export default CloneFromTemplate;
