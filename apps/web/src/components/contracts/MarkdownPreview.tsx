import { useState } from 'react';

interface MarkdownPreviewProps {
  markdown: string;
  onContinue: () => void;
  onBack?: () => void;
  fileName?: string;
}

/**
 * MarkdownPreview component
 * Displays the markdown content of a parsed document
 */
export function MarkdownPreview({
  markdown,
  onContinue,
  onBack,
  fileName,
}: MarkdownPreviewProps) {
  const totalLines = markdown.split('\n').length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>文档内容预览 (Markdown格式)</h3>
        {fileName && <span style={styles.fileName}>{fileName}</span>}
      </div>

      <p style={styles.hint}>
        这是您的合同文件通过 Docling 转换为 Markdown 格式后的内容（共 {totalLines} 行）。
    Docling 支持 PDF 文档的 OCR 识别，可以准确提取扫描版合同的内容。
    查看确认内容无误后，点击"继续"选择解析策略。
      </p>

      <div style={styles.previewContainer}>
        <pre style={styles.markdownContent}>
          <code>{markdown}</code>
        </pre>
      </div>

      <div style={styles.actions}>
        {onBack && (
          <button onClick={onBack} style={styles.cancelButton}>
            返回
          </button>
        )}
        <button onClick={onContinue} style={styles.submitButton}>
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
  title: {
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
    color: '#374151',
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
};
