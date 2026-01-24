/**
 * Export Service Utility
 * Provides reusable export functionality for Excel, CSV, PDF formats
 */

import { Workbook } from 'exceljs';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';

export interface ExportColumn {
  key: string;
  label: string;
  width?: number;
  formatter?: (value: any) => string | number;
}

export interface ExportData {
  columns: ExportColumn[];
  data: Record<string, any>[];
  title?: string;
  subtitle?: string;
}

export interface ExportOptions {
  fileName?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
}

/**
 * Export data to Excel (.xlsx) format
 */
export async function exportToExcel(
  exportData: ExportData,
  options: ExportOptions = {}
): Promise<void> {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet('Data');

  // Set workbook properties
  workbook.creator = options.creator || 'i-CLMS';
  workbook.lastModifiedBy = options.creator || 'i-CLMS';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Add title row if provided
  let startRow = 1;
  if (exportData.title) {
    const titleRow = worksheet.addRow([exportData.title]);
    titleRow.font = { size: 16, bold: true };
    titleRow.alignment = { horizontal: 'center' as const };
    worksheet.mergeCells('A1:' + String.fromCharCode(64 + exportData.columns.length) + '1');
    startRow++;
  }

  // Add subtitle row if provided
  if (exportData.subtitle) {
    const subtitleRow = worksheet.addRow([exportData.subtitle]);
    subtitleRow.font = { size: 12, italic: true };
    subtitleRow.alignment = { horizontal: 'center' as const };
    worksheet.mergeCells(`A${startRow}:${String.fromCharCode(64 + exportData.columns.length)}${startRow}`);
    startRow++;
  }

  // Add empty row
  if (exportData.title || exportData.subtitle) {
    worksheet.addRow([]);
    startRow++;
  }

  // Add header row
  const headerRow = worksheet.addRow(
    exportData.columns.map((col) => col.label)
  );
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Set column widths
  exportData.columns.forEach((col, index) => {
    const column = worksheet.getColumn(index + 1);
    column.width = col.width || 20;
  });

  // Add data rows
  exportData.data.forEach((row) => {
    const values = exportData.columns.map((col) => {
      const value = row[col.key];
      return col.formatter ? col.formatter(value) : value;
    });
    worksheet.addRow(values);
  });

  // Auto-filter
  const lastRow = startRow + exportData.data.length;
  const lastColumn = String.fromCharCode(64 + exportData.columns.length);
  worksheet.autoFilter = {
    from: `A${startRow}`,
    to: `${lastColumn}${lastRow}`,
  };

  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const fileName = options.fileName || `export_${Date.now()}.xlsx`;
  saveAs(blob, fileName);
}

/**
 * Export data to CSV format
 */
export function exportToCSV(
  exportData: ExportData,
  options: ExportOptions = {}
): void {
  // Build CSV content
  const rows: string[][] = [];

  // Add title if provided
  if (exportData.title) {
    rows.push([exportData.title]);
  }

  // Add subtitle if provided
  if (exportData.subtitle) {
    rows.push([exportData.subtitle]);
  }

  // Add empty row
  if (exportData.title || exportData.subtitle) {
    rows.push([]);
  }

  // Add header row
  rows.push(exportData.columns.map((col) => col.label));

  // Add data rows
  exportData.data.forEach((row) => {
    const values = exportData.columns.map((col) => {
      const value = row[col.key];
      const formatted = col.formatter ? col.formatter(value) : value;

      // Escape quotes and wrap in quotes if contains comma or quote
      const stringValue = String(formatted ?? '');
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    rows.push(values);
  });

  // Convert to CSV string
  const csvContent = rows.map((row) => row.join(',')).join('\n');

  // Add BOM for UTF-8 (Excel compatibility)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], {
    type: 'text/csv;charset=utf-8',
  });

  const fileName = options.fileName || `export_${Date.now()}.csv`;
  saveAs(blob, fileName);
}

/**
 * Export data to PDF format
 */
export async function exportToPDF(
  exportData: ExportData,
  options: ExportOptions = {}
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // Add title
  if (exportData.title) {
    pdf.setFontSize(16);
    pdf.setTextColor(37, 99, 235);
    pdf.text(exportData.title, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
  }

  // Add subtitle
  if (exportData.subtitle) {
    pdf.setFontSize(10);
    pdf.setTextColor(107, 114, 128);
    pdf.text(exportData.subtitle, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
  }

  // Add date
  pdf.setFontSize(9);
  pdf.setTextColor(156, 163, 175);
  const dateStr = new Date().toLocaleString('zh-CN');
  pdf.text(`导出时间: ${dateStr}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 10;

  // Calculate column widths
  const totalWidth = exportData.columns.reduce((sum, col) => sum + (col.width || 80), 0);
  const scaleFactor = contentWidth / totalWidth;

  // Add headers
  pdf.setFontSize(10);
  pdf.setTextColor(37, 99, 235);
  pdf.setFont(undefined, 'bold');

  let xPos = margin;
  exportData.columns.forEach((col) => {
    const colWidth = (col.width || 80) * scaleFactor;
    const text = col.label;
    pdf.text(text, xPos, yPos);
    xPos += colWidth;
  });

  yPos += 7;
  xPos = margin;

  // Draw header line
  pdf.setDrawColor(229, 231, 235);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  // Add data rows
  pdf.setTextColor(55, 65, 81);
  pdf.setFont(undefined, 'normal');

  const rowsPerPage = Math.floor((pageHeight - yPos - 20) / 7);
  let rowCount = 0;

  exportData.data.forEach((row, rowIndex) => {
    // Check for new page
    if (rowCount > 0 && rowCount % rowsPerPage === 0) {
      pdf.addPage();
      yPos = margin;

      // Redraw headers on new page
      pdf.setFontSize(10);
      pdf.setTextColor(37, 99, 235);
      pdf.setFont(undefined, 'bold');

      xPos = margin;
      exportData.columns.forEach((col) => {
        const colWidth = (col.width || 80) * scaleFactor;
        pdf.text(col.label, xPos, yPos);
        xPos += colWidth;
      });

      yPos += 7;
      xPos = margin;

      pdf.setDrawColor(229, 231, 235);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;

      pdf.setTextColor(55, 65, 81);
      pdf.setFont(undefined, 'normal');
    }

    xPos = margin;
    exportData.columns.forEach((col) => {
      const colWidth = (col.width || 80) * scaleFactor;
      const value = row[col.key];
      const formatted = col.formatter ? col.formatter(value) : value;
      const text = String(formatted ?? '');

      // Truncate text if too long
      const maxChars = Math.floor(colWidth / 3);
      const truncated = text.length > maxChars ? text.substring(0, maxChars - 3) + '...' : text;

      pdf.text(truncated, xPos, yPos);
      xPos += colWidth;
    });

    yPos += 7;
    rowCount++;

    // Draw row border
    if (rowIndex < exportData.data.length - 1) {
      pdf.setDrawColor(243, 244, 246);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
    }
  });

  // Add footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setTextColor(156, 163, 175);
    pdf.text(
      `第 ${i} / ${totalPages} 页`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save PDF
  const fileName = options.fileName || `export_${Date.now()}.pdf`;
  pdf.save(fileName);
}

/**
 * Export data to JSON format
 */
export function exportToJSON(
  exportData: ExportData,
  options: ExportOptions = {}
): void {
  const json = JSON.stringify(exportData.data, null, 2);
  const blob = new Blob([json], {
    type: 'application/json',
  });

  const fileName = options.fileName || `export_${Date.now()}.json`;
  saveAs(blob, fileName);
}

/**
 * Generate export filename with timestamp
 */
export function generateExportFileName(
  baseName: string,
  extension: 'xlsx' | 'csv' | 'pdf' | 'json'
): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = date.toTimeString().slice(0, 5).replace(':', '');
  return `${baseName}_${dateStr}_${timeStr}.${extension}`;
}
