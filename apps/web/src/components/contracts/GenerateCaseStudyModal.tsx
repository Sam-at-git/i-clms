import { useState } from 'react';
import { useGenerateCaseStudyMutation } from '@i-clms/shared/generated/graphql';

interface GenerateCaseStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  contractName: string;
  customerName?: string;
  industry?: string;
  onSuccess?: () => void;
}

const WRITING_STYLES = [
  { value: 'professional', label: '专业正式', description: '适合企业官网和正式场合' },
  { value: 'casual', label: '轻松活泼', description: '适合社交媒体和内容营销' },
  { value: 'technical', label: '技术深入', description: '适合技术博客和行业报告' },
];

export function GenerateCaseStudyModal({
  isOpen,
  onClose,
  contractId,
  contractName,
  customerName,
  industry,
  onSuccess,
}: GenerateCaseStudyModalProps) {
  const [formData, setFormData] = useState({
    desensitize: true,
    customDisplayCustomerName: '',
    customDisplayAmount: '',
    customDisplayIndustry: '',
    includeChallenges: true,
    includeSolution: true,
    includeResults: true,
    includeTestimonial: true,
    writingStyle: 'professional',
    tagsInput: '',
  });

  const [error, setError] = useState<string | null>(null);

  const [generateCaseStudy, { loading }] = useGenerateCaseStudyMutation({
    onCompleted: (data) => {
      if (data?.generateCaseStudy?.success) {
        alert('案例生成成功！');
        setError(null);
        onSuccess?.();
        onClose();
      } else {
        const errorMsg = data?.generateCaseStudy?.error || '未知错误';
        setError(errorMsg);
      }
    },
    onError: (err) => {
      let errorMsg = err.message;
      // 处理常见的连接错误
      if (errorMsg.includes('Unexpected end of JSON') || errorMsg.includes('connection')) {
        errorMsg = 'LLM服务连接超时，请检查Ollama服务是否正常运行';
      } else if (errorMsg.includes('ECONNREFUSED')) {
        errorMsg = '无法连接到LLM服务，请确认Ollama服务已启动';
      } else if (errorMsg.includes('timeout')) {
        errorMsg = '请求超时，LLM服务响应过慢';
      }
      setError(errorMsg);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // 清除之前的错误

    const tags = formData.tagsInput
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    await generateCaseStudy({
      variables: {
        input: {
          contractId,
          desensitize: formData.desensitize,
          customDisplayCustomerName: formData.customDisplayCustomerName || undefined,
          customDisplayAmount: formData.customDisplayAmount || undefined,
          customDisplayIndustry: formData.customDisplayIndustry || undefined,
          includeChallenges: formData.includeChallenges,
          includeSolution: formData.includeSolution,
          includeResults: formData.includeResults,
          includeTestimonial: formData.includeTestimonial,
          writingStyle: formData.writingStyle,
          tags: tags.length > 0 ? tags : undefined,
        },
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>生成成功案例</h2>
          <button onClick={onClose} style={styles.closeButton} disabled={loading}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Contract Info */}
          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>合同名称</div>
            <div style={styles.infoValue}>{contractName}</div>
            {customerName && (
              <>
                <div style={styles.infoLabel}>客户</div>
                <div style={styles.infoValue}>{customerName}</div>
              </>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div style={styles.errorBox}>
              <strong>生成失败：</strong>{error}
            </div>
          )}

          {/* Desensitize Toggle */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>脱敏设置</h3>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.desensitize}
                onChange={(e) =>
                  setFormData({ ...formData, desensitize: e.target.checked })
                }
                style={styles.checkbox}
              />
              <span>启用数据脱敏</span>
              <span style={styles.hint}>（隐藏敏感的客户信息和金额）</span>
            </label>
          </div>

          {/* Custom Display Names (when desensitize is enabled) */}
          {formData.desensitize && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>自定义显示名称（可选）</h3>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>客户名称</label>
                  <input
                    type="text"
                    value={formData.customDisplayCustomerName}
                    onChange={(e) =>
                      setFormData({ ...formData, customDisplayCustomerName: e.target.value })
                    }
                    placeholder={`默认: "${customerName ? '某' + (industry || '企业') : '某知名企业'}"`}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>金额描述</label>
                  <input
                    type="text"
                    value={formData.customDisplayAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, customDisplayAmount: e.target.value })
                    }
                    placeholder="如: 百万级别"
                    style={styles.input}
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>行业描述</label>
                <input
                  type="text"
                  value={formData.customDisplayIndustry}
                  onChange={(e) =>
                    setFormData({ ...formData, customDisplayIndustry: e.target.value })
                  }
                  placeholder={`默认: "${industry || '互联网'}"`}
                  style={styles.input}
                />
              </div>
            </div>
          )}

          {/* Content Options */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>内容选项</h3>
            <div style={styles.checkboxGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.includeChallenges}
                  onChange={(e) =>
                    setFormData({ ...formData, includeChallenges: e.target.checked })
                  }
                  style={styles.checkbox}
                />
                <span>项目挑战</span>
              </label>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.includeSolution}
                  onChange={(e) =>
                    setFormData({ ...formData, includeSolution: e.target.checked })
                  }
                  style={styles.checkbox}
                />
                <span>解决方案</span>
              </label>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.includeResults}
                  onChange={(e) =>
                    setFormData({ ...formData, includeResults: e.target.checked })
                  }
                  style={styles.checkbox}
                />
                <span>项目成果</span>
              </label>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.includeTestimonial}
                  onChange={(e) =>
                    setFormData({ ...formData, includeTestimonial: e.target.checked })
                  }
                  style={styles.checkbox}
                />
                <span>客户评价</span>
              </label>
            </div>
          </div>

          {/* Writing Style */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>写作风格</h3>
            <div style={styles.radioGroup}>
              {WRITING_STYLES.map((style) => (
                <label key={style.value} style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="writingStyle"
                    value={style.value}
                    checked={formData.writingStyle === style.value}
                    onChange={(e) =>
                      setFormData({ ...formData, writingStyle: e.target.value })
                    }
                    style={styles.radio}
                  />
                  <div>
                    <span style={styles.radioText}>{style.label}</span>
                    <span style={styles.radioHint}>{style.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>标签（可选）</h3>
            <input
              type="text"
              value={formData.tagsInput}
              onChange={(e) => setFormData({ ...formData, tagsInput: e.target.value })}
              placeholder="输入标签，用逗号分隔，如: 数字化转型, AI应用"
              style={styles.input}
            />
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              style={loading ? styles.submitButtonDisabled : styles.submitButton}
              disabled={loading}
            >
              {loading ? '生成中（可能需要1-2分钟）...' : '生成案例'}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '560px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: 0,
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    padding: '24px',
  },
  infoBox: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: '8px 16px',
  },
  infoLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  infoValue: {
    fontSize: '14px',
    color: '#111827',
    fontWeight: 500,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
    color: '#dc2626',
    fontSize: '14px',
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 12px 0',
  },
  formRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '12px',
  },
  formGroup: {
    flex: 1,
    marginBottom: '12px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  checkboxGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  hint: {
    fontSize: '12px',
    color: '#9ca3af',
    marginLeft: '4px',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    transition: 'background 0.15s',
  },
  radio: {
    marginTop: '2px',
    cursor: 'pointer',
  },
  radioText: {
    fontWeight: 500,
    display: 'block',
  },
  radioHint: {
    fontSize: '12px',
    color: '#6b7280',
    display: 'block',
    marginTop: '2px',
  },
  footer: {
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
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#8b5cf6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  submitButtonDisabled: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#a78bfa',
    border: 'none',
    borderRadius: '6px',
    cursor: 'not-allowed',
    opacity: 0.7,
  },
};

export default GenerateCaseStudyModal;
