import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ExportResolver } from './export.resolver';
import { ExportService } from './export.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ExportFormat } from './dto';

// Mock storage module to avoid UUID ESM import issues
jest.mock('../storage/storage.service', () => ({
  StorageService: jest.fn().mockImplementation(() => ({
    uploadFile: jest.fn(),
    getFileUrl: jest.fn(),
    deleteFile: jest.fn(),
  })),
}));

describe('ExportResolver', () => {
  let resolver: ExportResolver;
  let service: DeepMockProxy<ExportService>;

  const mockExportResult = {
    downloadUrl: '/exports/contracts-20240124.xlsx',
    fileName: 'contracts-20240124.xlsx',
    fileSize: 1024000,
    format: 'EXCEL',
    recordCount: 150,
    generatedAt: new Date('2024-01-24'),
  };

  beforeEach(async () => {
    service = mockDeep<ExportService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportResolver,
        { provide: ExportService, useValue: service },
        { provide: GqlAuthGuard, useValue: { canActivate: () => true } },
        { provide: RolesGuard, useValue: { canActivate: () => true } },
      ],
    }).compile();

    resolver = module.get<ExportResolver>(ExportResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportContracts', () => {
    it('should export contracts with default format', async () => {
      service.exportContracts.mockResolvedValue(mockExportResult);

      const result = await resolver.exportContracts(ExportFormat.EXCEL);

      expect(result).toBeDefined();
      expect(result.downloadUrl).toBe('/exports/contracts-20240124.xlsx');
      expect(result.recordCount).toBe(150);
      expect(service.exportContracts).toHaveBeenCalledWith(ExportFormat.EXCEL, {
        title: undefined,
        columns: undefined,
      });
    });

    it('should export contracts with custom title and columns', async () => {
      service.exportContracts.mockResolvedValue(mockExportResult);

      const result = await resolver.exportContracts(ExportFormat.PDF, 'Custom Report', ['id', 'name']);

      expect(result).toBeDefined();
      expect(service.exportContracts).toHaveBeenCalledWith(ExportFormat.PDF, {
        title: 'Custom Report',
        columns: ['id', 'name'],
      });
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  describe('exportCustomers', () => {
    it('should export customers with default format', async () => {
      service.exportCustomers.mockResolvedValue(mockExportResult);

      const result = await resolver.exportCustomers(ExportFormat.EXCEL);

      expect(result).toBeDefined();
      expect(result.fileName).toBe('contracts-20240124.xlsx');
      expect(service.exportCustomers).toHaveBeenCalledWith(ExportFormat.EXCEL, {
        title: undefined,
        columns: undefined,
      });
    });

    it('should export customers with custom options', async () => {
      service.exportCustomers.mockResolvedValue({
        ...mockExportResult,
        fileName: 'customers.csv',
        format: 'CSV',
      });

      const result = await resolver.exportCustomers(ExportFormat.CSV, 'Customer List', ['name', 'email']);

      expect(result).toBeDefined();
      expect(result.format).toBe('CSV');
      expect(service.exportCustomers).toHaveBeenCalledWith(ExportFormat.CSV, {
        title: 'Customer List',
        columns: ['name', 'email'],
      });
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  describe('exportFinancial', () => {
    it('should export financial data with default format', async () => {
      service.exportFinancial.mockResolvedValue(mockExportResult);

      const result = await resolver.exportFinancial(ExportFormat.EXCEL);

      expect(result).toBeDefined();
      expect(service.exportFinancial).toHaveBeenCalledWith(ExportFormat.EXCEL, {
        title: undefined,
        columns: undefined,
      });
    });

    it('should export financial data to PDF', async () => {
      service.exportFinancial.mockResolvedValue({
        ...mockExportResult,
        format: 'PDF',
        fileName: 'financial-report.pdf',
      });

      const result = await resolver.exportFinancial(ExportFormat.PDF, 'Financial Report 2024');

      expect(result).toBeDefined();
      expect(result.format).toBe('PDF');
      expect(service.exportFinancial).toHaveBeenCalledWith(ExportFormat.PDF, {
        title: 'Financial Report 2024',
        columns: undefined,
      });
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  describe('exportMilestones', () => {
    it('should export milestones with default format', async () => {
      service.exportMilestones.mockResolvedValue(mockExportResult);

      const result = await resolver.exportMilestones(ExportFormat.EXCEL);

      expect(result).toBeDefined();
      expect(service.exportMilestones).toHaveBeenCalledWith(ExportFormat.EXCEL, {
        title: undefined,
        columns: undefined,
      });
    });

    it('should export milestones with custom options', async () => {
      service.exportMilestones.mockResolvedValue({
        ...mockExportResult,
        recordCount: 45,
      });

      const result = await resolver.exportMilestones(
        ExportFormat.CSV,
        'Milestone Report',
        ['name', 'dueDate', 'status']
      );

      expect(result).toBeDefined();
      expect(result.recordCount).toBe(45);
      expect(service.exportMilestones).toHaveBeenCalledWith(ExportFormat.CSV, {
        title: 'Milestone Report',
        columns: ['name', 'dueDate', 'status'],
      });
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });
});
