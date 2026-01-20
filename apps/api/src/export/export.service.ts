import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import * as ExcelJS from 'exceljs';
import PDFKit from 'pdfkit';
import { ExportEntityType, ExportFormat, ExportResult } from './dto';
import { StorageService } from '../storage';

interface ExportColumn {
  key: string;
  header: string;
  width?: number;
}

interface ExportData {
  columns: ExportColumn[];
  data: Record<string, unknown>[];
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * 导出合同列表到Excel或PDF
   */
  async exportContracts(
    format: ExportFormat = ExportFormat.EXCEL,
    options?: { title?: string; columns?: string[] },
  ): Promise<ExportResult> {
    const contracts = await this.prisma.contract.findMany({
      include: {
        customer: true,
        department: true,
        tags: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const exportData = this.transformContractsForExport(contracts as unknown as Record<string, unknown>[]);
    return this.generateExport(ExportEntityType.CONTRACTS, exportData, format, options);
  }

  /**
   * 导出客户列表到Excel或PDF
   */
  async exportCustomers(
    format: ExportFormat = ExportFormat.EXCEL,
    options?: { title?: string; columns?: string[] },
  ): Promise<ExportResult> {
    const customers = await this.prisma.customer.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    const exportData = this.transformCustomersForExport(customers as unknown as Record<string, unknown>[]);
    return this.generateExport(ExportEntityType.CUSTOMERS, exportData, format, options);
  }

  /**
   * 导出财务数据到Excel或PDF
   */
  async exportFinancial(
    format: ExportFormat = ExportFormat.EXCEL,
    options?: { title?: string; columns?: string[] },
  ): Promise<ExportResult> {
    const contracts = await this.prisma.contract.findMany({
      where: {
        status: {
          not: 'DRAFT',
        },
      },
      include: {
        customer: true,
        department: true,
      },
    });

    const exportData = this.transformFinancialForExport(contracts as unknown as Record<string, unknown>[]);
    return this.generateExport(ExportEntityType.FINANCIAL, exportData, format, options);
  }

  /**
   * 导出里程碑数据到Excel或PDF
   */
  async exportMilestones(
    format: ExportFormat = ExportFormat.EXCEL,
    options?: { title?: string; columns?: string[] },
  ): Promise<ExportResult> {
    const milestones = await this.prisma.projectMilestone.findMany({
      include: {
        detail: {
          include: {
            contract: {
              include: {
                customer: true,
              },
            },
          },
        },
      },
      orderBy: {
        plannedDate: 'asc',
      },
    });

    const exportData = this.transformMilestonesForExport(milestones as unknown as Record<string, unknown>[]);
    return this.generateExport(ExportEntityType.MILESTONES, exportData, format, options);
  }

  /**
   * 生成Excel文件
   */
  private async generateExcel(
    entityType: ExportEntityType,
    data: ExportData,
    title?: string,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title || 'Data');

    // Set column headers
    worksheet.columns = data.columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 20,
    }));

    // Add header row styling
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Add data rows
    worksheet.addRows(data.data);

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      if (column.eachCell) {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell: ExcelJS.Cell) => {
          const value = cell.value;
          const length = value ? String(value).length : 10;
          if (length > maxLength) {
            maxLength = length;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `${entityType}_${Date.now()}.xlsx`;

    return { buffer: Buffer.from(buffer), fileName };
  }

  /**
   * 生成PDF文件
   */
  private async generatePDF(
    entityType: ExportEntityType,
    data: ExportData,
    title?: string,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFKit({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const fileName = `${entityType}_${Date.now()}.pdf`;
          resolve({ buffer, fileName });
        });
        doc.on('error', reject);

        // Title
        doc.fontSize(18).font('Helvetica-Bold').text(title || entityType, { align: 'center' });
        doc.moveDown();

        // Table calculation
        const pageWidth = doc.page.width - 100;
        const columnCount = data.columns.length;
        const columnWidth = pageWidth / columnCount;
        const rowHeight = 25;
        const startY = doc.y;

        // Header row
        doc.fontSize(10).font('Helvetica-Bold');
        data.columns.forEach((col, i: number) => {
          doc.rect(50 + i * columnWidth, startY, columnWidth, rowHeight).fillAndStroke('#E0E0E0', '#CCCCCC');
          doc.fillColor('black').text(col.header, 50 + i * columnWidth + 5, startY + 8, {
            width: columnWidth - 10,
            align: 'left',
          });
        });

        // Data rows
        doc.fontSize(9).font('Helvetica');
        let y = startY + rowHeight;
        const maxRowsPerPage = Math.floor((doc.page.height - 100 - y) / rowHeight);
        let rowCount = 0;

        for (const row of data.data) {
          if (rowCount > 0 && rowCount % maxRowsPerPage === 0) {
            doc.addPage();
            y = 50;
          }

          data.columns.forEach((col, i: number) => {
            const value = row[col.key] || '';
            doc.rect(50 + i * columnWidth, y, columnWidth, rowHeight).stroke();
            doc.text(String(value).substring(0, 30), 50 + i * columnWidth + 5, y + 8, {
              width: columnWidth - 10,
              align: 'left',
            });
          });
          y += rowHeight;
          rowCount++;
        }

        // Footer - add to current page
        doc.fontSize(8).text(`Generated: ${new Date().toLocaleString('zh-CN')}`, 50, doc.page.height - 20, {
          align: 'center',
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 生成导出文件并上传到存储
   */
  private async generateExport(
    entityType: ExportEntityType,
    data: ExportData,
    format: ExportFormat,
    options?: { title?: string; columns?: string[] },
  ): Promise<ExportResult> {
    // Filter columns if specified
    if (options?.columns && options.columns.length > 0) {
      data.columns = data.columns.filter((col) => options.columns!.includes(col.key));
      data.data = data.data.map((row) => {
        const filtered: Record<string, unknown> = {};
        options.columns!.forEach((key) => {
          if (key in row) {
            filtered[key] = row[key];
          }
        });
        return filtered;
      });
    }

    let buffer: Buffer;
    let fileName: string;

    if (format === ExportFormat.EXCEL) {
      const result = await this.generateExcel(entityType, data, options?.title);
      buffer = result.buffer;
      fileName = result.fileName;
    } else if (format === ExportFormat.PDF) {
      const result = await this.generatePDF(entityType, data, options?.title);
      buffer = result.buffer;
      fileName = result.fileName;
    } else {
      throw new BadRequestException(`Unsupported export format: ${format}`);
    }

    // Upload to storage
    const uploadResult = await this.storage.uploadBuffer(buffer, fileName, `exports/${fileName}`);

    this.logger.log(
      `Exported ${data.data.length} records of ${entityType} as ${format} (${buffer.length} bytes)`,
    );

    return {
      downloadUrl: uploadResult.url,
      fileName: fileName,
      fileSize: buffer.length,
      format: format.toString(),
      recordCount: data.data.length,
      generatedAt: new Date(),
    };
  }

  /**
   * Transform contracts for export
   */
  private transformContractsForExport(contracts: Record<string, unknown>[]): ExportData {
    return {
      columns: [
        { key: 'contractNo', header: '合同编号', width: 25 },
        { key: 'name', header: '合同名称', width: 35 },
        { key: 'type', header: '合同类型', width: 15 },
        { key: 'status', header: '状态', width: 15 },
        { key: 'customerName', header: '客户名称', width: 25 },
        { key: 'departmentName', header: '部门', width: 20 },
        { key: 'amount', header: '金额(元)', width: 18 },
        { key: 'signedDate', header: '签署日期', width: 15 },
        { key: 'startDate', header: '开始日期', width: 15 },
        { key: 'endDate', header: '结束日期', width: 15 },
        { key: 'tags', header: '标签', width: 20 },
        { key: 'createdAt', header: '创建时间', width: 20 },
      ],
      data: contracts.map((c: Record<string, unknown>) => {
        const customer = c.customer as Record<string, unknown> | null;
        const department = c.department as Record<string, unknown> | null;
        const tags = c.tags as Array<Record<string, unknown>> | null;
        const amount = c.amount as { toNumber(): number } | null;

        return {
          contractNo: (c.contractNo as string) || '',
          name: (c.name as string) || '',
          type: (c.type as string) || '',
          status: (c.status as string) || '',
          customerName: (customer?.fullName as string) || '',
          departmentName: (department?.name as string) || '',
          amount: amount?.toString() || '0',
          signedDate: this.formatDate(c.signedDate as Date | null),
          startDate: this.formatDate(c.startDate as Date | null),
          endDate: this.formatDate(c.endDate as Date | null),
          tags: tags?.map((t) => t.name).join(', ') || '',
          createdAt: this.formatDate(c.createdAt as Date | null),
        };
      }),
    };
  }

  /**
   * Transform customers for export
   */
  private transformCustomersForExport(customers: Record<string, unknown>[]): ExportData {
    return {
      columns: [
        { key: 'fullName', header: '客户全称', width: 35 },
        { key: 'shortName', header: '客户简称', width: 20 },
        { key: 'creditCode', header: '统一社会信用代码', width: 25 },
        { key: 'industry', header: '行业', width: 15 },
        { key: 'address', header: '地址', width: 30 },
        { key: 'contactCount', header: '联系人数量', width: 15 },
        { key: 'contractCount', header: '合同数量', width: 15 },
        { key: 'createdAt', header: '创建时间', width: 20 },
      ],
      data: customers.map((c: Record<string, unknown>) => ({
        fullName: (c.fullName as string) || '',
        shortName: (c.shortName as string) || '',
        creditCode: (c.creditCode as string) || '',
        industry: (c.industry as string) || '',
        address: (c.address as string) || '',
        contactCount: '0',
        contractCount: '0',
        createdAt: this.formatDate(c.createdAt as Date | null),
      })),
    };
  }

  /**
   * Transform financial data for export
   */
  private transformFinancialForExport(contracts: Record<string, unknown>[]): ExportData {
    return {
      columns: [
        { key: 'contractNo', header: '合同编号', width: 25 },
        { key: 'name', header: '合同名称', width: 35 },
        { key: 'type', header: '合同类型', width: 15 },
        { key: 'status', header: '状态', width: 15 },
        { key: 'customerName', header: '客户名称', width: 25 },
        { key: 'amount', header: '合同金额(元)', width: 18 },
        { key: 'paidAmount', header: '已收金额(元)', width: 18 },
        { key: 'outstandingAmount', header: '应收金额(元)', width: 18 },
        { key: 'paymentProgress', header: '收款进度(%)', width: 15 },
      ],
      data: contracts.map((c: Record<string, unknown>) => {
        const customer = c.customer as Record<string, unknown> | null;
        const amount = c.amount as { toNumber(): number } | null;

        const paidAmount = 0;
        const outstandingAmount = (amount?.toNumber() || 0) - paidAmount;
        const paymentProgress =
          amount && amount.toNumber() > 0
            ? ((paidAmount / amount.toNumber()) * 100).toFixed(2)
            : '0.00';

        return {
          contractNo: (c.contractNo as string) || '',
          name: (c.name as string) || '',
          type: (c.type as string) || '',
          status: (c.status as string) || '',
          customerName: (customer?.fullName as string) || '',
          amount: amount?.toString() || '0',
          paidAmount: paidAmount.toString(),
          outstandingAmount: outstandingAmount.toString(),
          paymentProgress: paymentProgress,
        };
      }),
    };
  }

  /**
   * Transform milestones for export
   */
  private transformMilestonesForExport(milestones: Record<string, unknown>[]): ExportData {
    return {
      columns: [
        { key: 'contractNo', header: '合同编号', width: 20 },
        { key: 'contractName', header: '合同名称', width: 25 },
        { key: 'customerName', header: '客户名称', width: 20 },
        { key: 'milestoneName', header: '里程碑名称', width: 25 },
        { key: 'status', header: '状态', width: 12 },
        { key: 'plannedDate', header: '计划日期', width: 15 },
        { key: 'actualDate', header: '实际日期', width: 15 },
        { key: 'amount', header: '金额(元)', width: 15 },
        { key: 'progress', header: '进度(%)', width: 12 },
      ],
      data: milestones.map((m: Record<string, unknown>) => {
        const detail = m.detail as Record<string, unknown> | null;
        const contract = detail?.contract as Record<string, unknown> | null;
        const customer = contract?.customer as Record<string, unknown> | null;
        const amount = m.amount as { toString(): string } | null;
        const progress = m.paymentPercentage as { toString(): string } | null;

        return {
          contractNo: (contract?.contractNo as string) || '',
          contractName: (contract?.name as string) || '',
          customerName: (customer?.name as string) || '',
          milestoneName: (m.name as string) || '',
          status: (m.status as string) || '',
          plannedDate: this.formatDate(m.plannedDate as Date | null),
          actualDate: this.formatDate(m.actualDate as Date | null),
          amount: amount?.toString() || '0',
          progress: progress?.toString() || '0',
        };
      }),
    };
  }

  /**
   * Format date to string
   */
  private formatDate(date: Date | null): string {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  }
}
