interface CleanupInfo {
  originalLength: number;
  cleanedLength: number;
  linesRemoved: number;
  corrections: string[];
  method: string;
  llmTokensUsed?: number;
}

interface MarkdownPreviewProps {
  markdown: string;
  onContinue: () => void;
  onBack?: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  fileName?: string;
  isFromCache?: boolean;
  // 清洗功能
  onCleanup?: (useLlm: boolean) => Promise<void>;
  isCleaning?: boolean;
  cleanupInfo?: CleanupInfo | null;
  onMarkdownChange?: (newMarkdown: string) => void;
}

/**
 * MarkdownPreview component
 * Displays the markdown content of a parsed document
 */
export function MarkdownPreview({
  markdown,
  onContinue,
  onBack,
  onRegenerate,
  isRegenerating,
  fileName,
  isFromCache,
  onCleanup,
  isCleaning,
  cleanupInfo,
}: MarkdownPreviewProps) {
  const totalLines = markdown.split('\n').length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <h3 style={styles.title}>文档内容预览 (Markdown格式)</h3>
          {isFromCache && (
            <span style={styles.cacheTag}>📦 来自缓存</span>
          )}
        </div>
        {fileName && <span style={styles.fileName}>{fileName}</span>}
      </div>

      <p style={styles.hint}>
        这是您的合同文件通过 Docling 转换为 Markdown 格式后的内容（共 {totalLines} 行）。
        Docling 支持 PDF 文档的 OCR 识别，可以准确提取扫描版合同的内容。
        {isFromCache && ' 此结果来自缓存，如需重新解析请点击"重新生成"按钮。'}
        如果OCR识别有误，可以点击"清洗文本"进行修正。确认无误后，点击"继续"进行AI解析。
      </p>

      {/* 清洗信息显示 */}
      {cleanupInfo && (
        <div style={styles.cleanupInfoBox}>
          <span style={styles.cleanupInfoTitle}>✅ 文本已清洗</span>
          <div style={styles.cleanupInfoDetails}>
            <span>原始长度: {cleanupInfo.originalLength.toLocaleString()} 字符</span>
            <span>清洗后: {cleanupInfo.cleanedLength.toLocaleString()} 字符</span>
            <span>移除行数: {cleanupInfo.linesRemoved}</span>
            <span>方法: {cleanupInfo.method === 'llm' ? 'LLM智能清洗' : '规则清洗'}</span>
            {cleanupInfo.llmTokensUsed && <span>Token消耗: {cleanupInfo.llmTokensUsed}</span>}
          </div>
          {cleanupInfo.corrections.length > 0 && (
            <div style={styles.correctionsBox}>
              <span style={styles.correctionsTitle}>修正内容 ({cleanupInfo.corrections.length}项):</span>
              <ul style={styles.correctionsList}>
                {cleanupInfo.corrections.slice(0, 5).map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
                {cleanupInfo.corrections.length > 5 && (
                  <li>...还有 {cleanupInfo.corrections.length - 5} 项修正</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      <div style={styles.previewContainer}>
        <pre style={styles.markdownContent}>
          <code>{markdown}</code>
        </pre>
      </div>

      <div style={styles.actions}>
        {onBack && (
          <button onClick={onBack} style={styles.cancelButton} disabled={isRegenerating || isCleaning}>
            返回
          </button>
        )}
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            style={styles.regenerateButton}
            disabled={isRegenerating || isCleaning}
          >
            {isRegenerating ? '🔄 重新生成中...' : '🔄 重新生成'}
          </button>
        )}
        {onCleanup && (
          <>
            <button
              onClick={() => onCleanup(false)}
              style={styles.cleanupButton}
              disabled={isRegenerating || isCleaning}
              title="使用规则进行快速清洗"
            >
              {isCleaning ? '🧹 清洗中...' : '🧹 快速清洗'}
            </button>
            <button
              onClick={() => onCleanup(true)}
              style={styles.cleanupLlmButton}
              disabled={isRegenerating || isCleaning}
              title="使用LLM进行智能清洗（更准确但较慢）"
            >
              {isCleaning ? '🤖 清洗中...' : '🤖 LLM清洗'}
            </button>
          </>
        )}
        <button onClick={onContinue} style={styles.submitButton} disabled={isRegenerating || isCleaning}>
          继续：AI智能解析
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
    color: '#374151',
  },
  cacheTag: {
    fontSize: '12px',
    padding: '4px 8px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '4px',
    fontWeight: 500,
  },
  fileName: {
    fontSize: '14px',
    color: '#6b7280',
  },
  hint: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px',
    lineHeight: '1.5',
  },
  previewContainer: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#f9fafb',
    marginBottom: '16px',
  },
  markdownContent: {
    margin: 0,
    padding: '16px',
    fontSize: '13px',
    lineHeight: '1.6',
    fontFamily: 'Monaco, "Lucida Console", monospace',
    color: '#1f2937',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    // 使用固定高度和滚动条，而不是限制内容
    maxHeight: '500px',
    overflow: 'auto' as const,
    overflowY: 'auto' as const,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
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
  regenerateButton: {
    padding: '10px 20px',
    fontSize: '14px',
    border: '1px solid #f59e0b',
    borderRadius: '6px',
    background: '#fffbeb',
    color: '#92400e',
    cursor: 'pointer',
    fontWeight: 500,
  },
  submitButton: {
    padding: '10px 20px',
    fontSize: '14px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 500,
  },
  cleanupButton: {
    padding: '10px 20px',
    fontSize: '14px',
    border: '1px solid #10b981',
    borderRadius: '6px',
    background: '#ecfdf5',
    color: '#065f46',
    cursor: 'pointer',
    fontWeight: 500,
  },
  cleanupLlmButton: {
    padding: '10px 20px',
    fontSize: '14px',
    border: '1px solid #8b5cf6',
    borderRadius: '6px',
    background: '#f5f3ff',
    color: '#5b21b6',
    cursor: 'pointer',
    fontWeight: 500,
  },
  cleanupInfoBox: {
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
  },
  cleanupInfoTitle: {
    fontWeight: 600,
    color: '#065f46',
    fontSize: '14px',
  },
  cleanupInfoDetails: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap' as const,
    marginTop: '8px',
    fontSize: '13px',
    color: '#047857',
  },
  correctionsBox: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #a7f3d0',
  },
  correctionsTitle: {
    fontSize: '12px',
    color: '#065f46',
    fontWeight: 500,
  },
  correctionsList: {
    margin: '4px 0 0 16px',
    padding: 0,
    fontSize: '12px',
    color: '#047857',
  },
};
