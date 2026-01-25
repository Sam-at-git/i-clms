import { useState, useCallback, useRef } from 'react';
import { useMutation } from '@apollo/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface DashboardExportProps {
  dashboardRef: React.RefObject<HTMLDivElement>;
  dashboardTitle?: string;
  department?: string;
  onClose?: () => void;
}

// Mock GraphQL mutation (replace with actual)
const EXPORT_DASHBOARD = `
  mutation ExportDashboard($input: ExportDashboardInput!) {
    exportDashboard(input: $input) {
      downloadUrl
      fileName
      fileSize
    }
  }
`;

const EXPORT_FORMATS = [
  { value: 'PDF', label: 'PDF 文档', icon: '📕', extension: 'pdf' },
  { value: 'PNG', label: 'PNG 图片', icon: '🖼️', extension: 'png' },
  { value: 'JPEG', label: 'JPEG 图片', icon: '📷', extension: 'jpg' },
];

const EXPORT_QUALITIES = [
  { value: 'low', label: '低 (快速)', dpi: 72, quality: 0.7 },
  { value: 'medium', label: '中', dpi: 96, quality: 0.85 },
  { value: 'high', label: '高', label2: '高质量', dpi: 150, quality: 0.95 },
  { value: 'print', label: '打印', label2: '打印质量', dpi: 300, quality: 1.0 },
];

const PAGE_SIZES = [
  { value: 'A4', label: 'A4', width: 210, height: 297 },
  { value: 'LETTER', label: 'Letter', width: 216, height: 279 },
  { value: 'A3', label: 'A3', width: 297, height: 420 },
];

type ExportFormat = 'PDF' | 'PNG' | 'JPEG';
type ExportQuality = 'low' | 'medium' | 'high' | 'print';
type PageSize = 'A4' | 'LETTER' | 'A3';

export function DashboardExport({
  dashboardRef,
  dashboardTitle = '仪表盘',
  department = '全部',
  onClose,
}: DashboardExportProps) {
  const [format, setFormat] = useState<ExportFormat>('PDF');
  const [quality, setQuality] = useState<ExportQuality>('high');
  const [pageSize, setPageSize] = useState<PageSize>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includeFooter, setIncludeFooter] = useState(true);
  const [includeDate, setIncludeDate] = useState(true);
  const [addWatermark, setAddWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState('内部资料');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const [exportDashboard] = useMutation(EXPORT_DASHBOARD, {
    onError: (error) => {
      console.error('Export failed:', error);
      setIsExporting(false);
    },
  });

  // Generate filename with timestamp
  const generateFileName = (extension: string) => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = date.toTimeString().slice(0, 5).replace(':', '');
    return `${dashboardTitle}_${department}_${dateStr}_${timeStr}.${extension}`;
  };

  // Export to PDF
  const exportToPDF = useCallback(async () => {
    if (!dashboardRef.current) return;

    setIsExporting(true);
    setExportProgress(10);

    try {
      const element = dashboardRef.current;
      const qualityConfig = EXPORT_QUALITIES.find((q) => q.value === quality)!;

      // Configure canvas options
      setExportProgress(30);
      const canvas = await html2canvas(element, {
        scale: qualityConfig.dpi / 96,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      setExportProgress(50);

      // Calculate PDF dimensions
      const pageSizeConfig = PAGE_SIZES.find((s) => s.value === pageSize)!;
      let pdfWidth = pageSizeConfig.width;
      let pdfHeight = pageSizeConfig.height;

      if (orientation === 'landscape') {
        [pdfWidth, pdfHeight] = [pdfHeight, pdfWidth];
      }

      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: pageSize,
      });

      const imgWidth = pdfWidth - 20; // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      setExportProgress(70);

      // Add header
      if (includeHeader) {
        pdf.setFontSize(16);
        pdf.setTextColor(37, 99, 235); // Blue color
        pdf.text(dashboardTitle, 10, 15);

        pdf.setFontSize(10);
        pdf.setTextColor(107, 114, 128); // Gray color
        pdf.text(`部门: ${department}`, 10, 22);

        if (includeDate) {
          const dateStr = new Date().toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });
          pdf.text(`导出时间: ${dateStr}`, 10, 28);
        }
      }

      // Add dashboard image
      let yPos = includeHeader ? 35 : 10;

      // Handle multi-page if content is too tall
      const maxHeight = pdfHeight - (includeFooter ? 20 : 10) - yPos;

      if (imgHeight > maxHeight) {
        // Split into multiple pages
        const pageCount = Math.ceil(imgHeight / maxHeight);
        const pageHeight = imgHeight / pageCount;

        for (let i = 0; i < pageCount; i++) {
          if (i > 0) {
            pdf.addPage();
            yPos = 10;
          }

          const canvasY = i * pageHeight;
          const sourceY = (canvas.height * canvasY) / imgHeight;

          // Create temporary canvas for page
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = (canvas.height * pageHeight) / imgHeight;
          const pageCtx = pageCanvas.getContext('2d')!;

          pageCtx.drawImage(
            canvas,
            0,
            sourceY,
            canvas.width,
            canvas.height * pageHeight / imgHeight,
            0,
            0,
            pageCanvas.width,
            pageCanvas.height
          );

          const pageImgData = pageCanvas.toDataURL('image/png', qualityConfig.quality);
          pdf.addImage(pageImgData, 'PNG', 10, yPos, imgWidth, pageHeight * imgWidth / canvas.width);

          // Add footer
          if (includeFooter) {
            pdf.setFontSize(9);
            pdf.setTextColor(156, 163, 175);
            pdf.text(
              `第 ${i + 1} / ${pageCount} 页`,
              pdfWidth / 2,
              pdfHeight - 10,
              { align: 'center' }
            );
          }
        }
      } else {
        // Single page
        const imgData = canvas.toDataURL('image/jpeg', qualityConfig.quality);
        pdf.addImage(imgData, 'JPEG', 10, yPos, imgWidth, imgHeight);

        // Add watermark
        if (addWatermark && watermarkText) {
          pdf.setTextColor(200, 200, 200);
          pdf.setFontSize(40);
          pdf.text(watermarkText, pdfWidth / 2, pdfHeight / 2, {
            align: 'center',
            angle: 45,
          });
        }

        // Add footer
        if (includeFooter) {
          pdf.setFontSize(9);
          pdf.setTextColor(156, 163, 175);
          pdf.text(
            '本报告由智能合同全生命周期管理系统生成',
            pdfWidth / 2,
            pdfHeight - 10,
            { align: 'center' }
          );
        }
      }

      setExportProgress(90);

      // Save PDF
      const fileName = generateFileName('pdf');
      pdf.save(fileName);

      setExportProgress(100);

      // Log export (optional backend mutation)
      await exportDashboard({
        variables: {
          input: {
            format: 'PDF',
            fileName,
            department,
            pageSize,
            quality,
          },
        },
      });

      alert(`PDF导出成功: ${fileName}`);

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('PDF export failed:', error);
      alert(`PDF导出失败: ${error}`);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [
    dashboardRef,
    dashboardTitle,
    department,
    format,
    quality,
    pageSize,
    orientation,
    includeHeader,
    includeFooter,
    includeDate,
    addWatermark,
    watermarkText,
    exportDashboard,
    onClose,
  ]);

  // Export to Image
  const exportToImage = useCallback(async () => {
    if (!dashboardRef.current) return;

    setIsExporting(true);
    setExportProgress(10);

    try {
      const element = dashboardRef.current;
      const qualityConfig = EXPORT_QUALITIES.find((q) => q.value === quality)!;
      const formatConfig = EXPORT_FORMATS.find((f) => f.value === format)!;

      setExportProgress(30);

      const canvas = await html2canvas(element, {
        scale: qualityConfig.dpi / 96,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      setExportProgress(70);

      // Convert to blob
      const mimeType = format === 'PNG' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            alert('图片生成失败');
            setIsExporting(false);
            return;
          }

          setExportProgress(90);

          // Download
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = generateFileName(formatConfig.extension);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          setExportProgress(100);
          alert(`${formatConfig.label}导出成功`);

          setIsExporting(false);
          if (onClose) {
            onClose();
          }
        },
        mimeType,
        qualityConfig.quality
      );
    } catch (error) {
      console.error('Image export failed:', error);
      alert(`图片导出失败: ${error}`);
      setIsExporting(false);
    }
  }, [dashboardRef, format, quality, dashboardTitle, department, onClose]);

  // Handle export
  const handleExport = useCallback(async () => {
    if (format === 'PDF') {
      await exportToPDF();
    } else {
      await exportToImage();
    }
  }, [format, exportToPDF, exportToImage]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h3 style={styles.title}>导出仪表盘</h3>
          <span style={styles.subtitle}>
            {dashboardTitle} - {department}
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} style={styles.closeButton}>
            ✕ 关闭
          </button>
        )}
      </div>

      {/* Format Selection */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>选择导出格式</h4>
        <div style={styles.formatGrid}>
          {EXPORT_FORMATS.map((fmt) => (
            <button
              key={fmt.value}
              onClick={() => setFormat(fmt.value as ExportFormat)}
              disabled={isExporting}
              style={{
                ...styles.formatButton,
                ...(format === fmt.value && styles.formatButtonSelected),
              }}
            >
              <span style={styles.formatIcon}>{fmt.icon}</span>
              <span style={styles.formatLabel}>{fmt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quality Selection */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>选择质量</h4>
        <div style={styles.qualityGrid}>
          {EXPORT_QUALITIES.map((q) => (
            <button
              key={q.value}
              onClick={() => setQuality(q.value as ExportQuality)}
              disabled={isExporting}
              style={{
                ...styles.qualityButton,
                ...(quality === q.value && styles.qualityButtonSelected),
              }}
            >
              <span style={styles.qualityLabel}>{q.label}</span>
              {q.label2 && (
                <span style={styles.qualityLabel2}>{q.label2}</span>
              )}
              <span style={styles.qualityInfo}>{q.dpi} DPI</span>
            </button>
          ))}
        </div>
      </div>

      {/* PDF-specific options */}
      {format === 'PDF' && (
        <>
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>页面设置</h4>
            <div style={styles.pageSettings}>
              <div style={styles.settingRow}>
                <label style={styles.settingLabel}>页面大小</label>
                <div style={styles.settingButtons}>
                  {PAGE_SIZES.map((size) => (
                    <button
                      key={size.value}
                      onClick={() => setPageSize(size.value as PageSize)}
                      style={{
                        ...styles.settingButton,
                        ...(pageSize === size.value && styles.settingButtonSelected),
                      }}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.settingRow}>
                <label style={styles.settingLabel}>页面方向</label>
                <div style={styles.settingButtons}>
                  <button
                    onClick={() => setOrientation('portrait')}
                    style={{
                      ...styles.settingButton,
                      ...(orientation === 'portrait' && styles.settingButtonSelected),
                    }}
                  >
                    纵向
                  </button>
                  <button
                    onClick={() => setOrientation('landscape')}
                    style={{
                      ...styles.settingButton,
                      ...(orientation === 'landscape' && styles.settingButtonSelected),
                    }}
                  >
                    横向
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Content Options */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>内容选项</h4>
        <div style={styles.optionsList}>
          <label style={styles.optionRow}>
            <input
              type="checkbox"
              checked={includeHeader}
              onChange={(e) => setIncludeHeader(e.target.checked)}
              disabled={isExporting}
              style={styles.checkbox}
            />
            <span style={styles.optionLabel}>包含标题和部门信息</span>
          </label>

          <label style={styles.optionRow}>
            <input
              type="checkbox"
              checked={includeFooter}
              onChange={(e) => setIncludeFooter(e.target.checked)}
              disabled={isExporting}
              style={styles.checkbox}
            />
            <span style={styles.optionLabel}>包含页脚</span>
          </label>

          <label style={styles.optionRow}>
            <input
              type="checkbox"
              checked={includeDate}
              onChange={(e) => setIncludeDate(e.target.checked)}
              disabled={isExporting}
              style={styles.checkbox}
            />
            <span style={styles.optionLabel}>包含导出时间</span>
          </label>

          <label style={styles.optionRow}>
            <input
              type="checkbox"
              checked={addWatermark}
              onChange={(e) => setAddWatermark(e.target.checked)}
              disabled={isExporting}
              style={styles.checkbox}
            />
            <span style={styles.optionLabel}>添加水印</span>
          </label>
        </div>

        {addWatermark && (
          <div style={styles.watermarkInput}>
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="输入水印文字"
              style={styles.input}
              disabled={isExporting}
            />
          </div>
        )}
      </div>

      {/* Export Preview */}
      <div style={styles.previewSection}>
        <h4 style={styles.previewTitle}>导出预览</h4>
        <div style={styles.previewInfo}>
          <span style={styles.previewItem}>
            格式: <strong>{EXPORT_FORMATS.find((f) => f.value === format)?.label}</strong>
          </span>
          <span style={styles.previewItem}>
            质量: <strong>{EXPORT_QUALITIES.find((q) => q.value === quality)?.label}</strong>
          </span>
          {format === 'PDF' && (
            <span style={styles.previewItem}>
              页面: <strong>{pageSize} ({orientation === 'portrait' ? '纵向' : '横向'})</strong>
            </span>
          )}
        </div>
      </div>

      {/* Export Button */}
      <div style={styles.actions}>
        <button
          onClick={handleExport}
          disabled={isExporting}
          style={{
            ...styles.exportButton,
            ...(isExporting && styles.exportButtonDisabled),
          }}
        >
          {isExporting ? `导出中... ${exportProgress}%` : '开始导出'}
        </button>
      </div>

      {/* Progress Bar */}
      {isExporting && (
        <div style={styles.progressSection}>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${exportProgress}%`,
              }}
            />
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
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '20px',
    minWidth: '500px',
    maxWidth: '600px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  subtitle: {
    fontSize: '13px',
    color: '#6b7280',
  },
  closeButton: {
    padding: '6px 12px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  },
  formatGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  formatButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    backgroundColor: '#fff',
    border: '2px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  formatButtonSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  formatIcon: {
    fontSize: '32px',
  },
  formatLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  qualityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
  },
  qualityButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '12px 8px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  qualityButtonSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  qualityLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#111827',
  },
  qualityLabel2: {
    fontSize: '11px',
    color: '#6b7280',
  },
  qualityInfo: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  pageSettings: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  settingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: '14px',
    color: '#374151',
    fontWeight: 500,
  },
  settingButtons: {
    display: 'flex',
    gap: '8px',
  },
  settingButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  settingButtonSelected: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    borderColor: '#3b82f6',
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  optionLabel: {
    fontSize: '14px',
    color: '#374151',
  },
  watermarkInput: {
    marginTop: '8px',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    outline: 'none',
  },
  previewSection: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    marginBottom: '20px',
  },
  previewTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
  },
  previewInfo: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#6b7280',
  },
  previewItem: {
    display: 'flex',
    gap: '4px',
  },
  actions: {
    marginTop: '20px',
  },
  exportButton: {
    width: '100%',
    padding: '12px 20px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  exportButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  progressSection: {
    marginTop: '16px',
  },
  progressBar: {
    height: '6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    transition: 'width 0.3s',
  },
};

export default DashboardExport;
