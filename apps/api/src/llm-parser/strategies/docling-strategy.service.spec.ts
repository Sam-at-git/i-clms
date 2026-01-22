import { Test, TestingModule } from '@nestjs/testing';
import { DoclingStrategyService } from './docling-strategy.service';
import { DoclingService } from '../../docling/docling.service';
import { VectorStoreService } from '../../vector-store/vector-store.service';
import { CacheService } from '../../cache/cache.service';
import { LlmClientService } from '../llm-client.service';
import { ExtractTopic } from '../topics/topics.const';

describe('DoclingStrategyService', () => {
  let service: DoclingStrategyService;
  let docling: jest.Mocked<DoclingService>;
  let vectorStore: jest.Mocked<VectorStoreService>;
  let cache: jest.Mocked<CacheService>;
  let llmClient: jest.Mocked<LlmClientService>;

  const mockDoclingService = {
    isAvailable: jest.fn(),
    convertToMarkdown: jest.fn(),
    extractFields: jest.fn(),
  };

  const mockVectorStoreService = {
    storeEmbedding: jest.fn(),
    getEmbedding: jest.fn(),
    searchSimilarChunks: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    invalidate: jest.fn(),
    getDocumentFingerprint: jest.fn(),
  };

  const mockLlmClientService = {
    chat: jest.fn(),
    extractJson: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoclingStrategyService,
        {
          provide: DoclingService,
          useValue: mockDoclingService,
        },
        {
          provide: VectorStoreService,
          useValue: mockVectorStoreService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: LlmClientService,
          useValue: mockLlmClientService,
        },
      ],
    }).compile();

    service = module.get<DoclingStrategyService>(DoclingStrategyService);
    docling = module.get(DoclingService) as jest.Mocked<DoclingService>;
    vectorStore = module.get(VectorStoreService) as jest.Mocked<VectorStoreService>;
    cache = module.get(CacheService) as jest.Mocked<CacheService>;
    llmClient = module.get(LlmClientService) as jest.Mocked<LlmClientService>;

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseWithDocling', () => {
    it('should return error when Docling is not available', async () => {
      mockDoclingService.isAvailable.mockReturnValue(false);

      const result = await service.parseWithDocling('/path/to/file.pdf');

      expect(result).toEqual({
        success: false,
        error: 'Docling not available. Please install Python and docling package.',
      });
      expect(mockDoclingService.convertToMarkdown).not.toHaveBeenCalled();
    });

    it('should successfully parse document to markdown', async () => {
      mockDoclingService.isAvailable.mockReturnValue(true);
      mockDoclingService.convertToMarkdown.mockResolvedValue({
        success: true,
        markdown: '# Test Document\n\nContent here',
        pages: 1,
        tables: [],
        images: [],
      });

      const result = await service.parseWithDocling('/path/to/file.pdf');

      expect(result).toEqual({
        success: true,
        markdown: '# Test Document\n\nContent here',
        fields: {},
        tables: [],
      });
      expect(mockDoclingService.convertToMarkdown).toHaveBeenCalledWith(
        '/path/to/file.pdf',
        { ocr: undefined, withTables: true, withImages: false },
      );
    });

    it('should extract fields when topics are specified', async () => {
      mockDoclingService.isAvailable.mockReturnValue(true);
      mockDoclingService.convertToMarkdown.mockResolvedValue({
        success: true,
        markdown: '# Test Document',
        pages: 1,
        tables: [{ markdown: '| Col1 | Col2 |', rows: 1, cols: 2 }],
        images: [],
      });
      mockDoclingService.extractFields.mockResolvedValue({
        success: true,
        fields: { contractNumber: 'CONTRACT-001', amount: 100000 },
      });

      const result = await service.parseWithDocling('/path/to/file.pdf', {
        extractTopics: [ExtractTopic.BASIC_INFO, ExtractTopic.FINANCIAL],
      });

      expect(result).toEqual({
        success: true,
        markdown: '# Test Document',
        fields: { contractNumber: 'CONTRACT-001', amount: 100000 },
        tables: [{ markdown: '| Col1 | Col2 |', rows: 1, cols: 2 }],
      });
      expect(mockDoclingService.extractFields).toHaveBeenCalledWith('/path/to/file.pdf', [
        'BASIC_INFO',
        'FINANCIAL',
      ]);
    });

    it('should handle field extraction failure gracefully', async () => {
      mockDoclingService.isAvailable.mockReturnValue(true);
      mockDoclingService.convertToMarkdown.mockResolvedValue({
        success: true,
        markdown: '# Test Document',
        pages: 1,
        tables: [],
        images: [],
      });
      mockDoclingService.extractFields.mockResolvedValue({
        success: false,
        error: 'Extraction failed',
        fields: {},
      });

      const result = await service.parseWithDocling('/path/to/file.pdf', {
        extractTopics: [ExtractTopic.BASIC_INFO],
      });

      expect(result).toEqual({
        success: true,
        markdown: '# Test Document',
        fields: {},
        tables: [],
      });
    });

    it('should handle conversion errors', async () => {
      mockDoclingService.isAvailable.mockReturnValue(true);
      mockDoclingService.convertToMarkdown.mockResolvedValue({
        success: false,
        error: 'File not found',
      });

      const result = await service.parseWithDocling('/nonexistent/file.pdf');

      expect(result).toEqual({
        success: false,
        error: 'File not found',
      });
    });

    it('should handle runtime errors', async () => {
      mockDoclingService.isAvailable.mockReturnValue(true);
      mockDoclingService.convertToMarkdown.mockRejectedValue(
        new Error('Unexpected error'),
      );

      const result = await service.parseWithDocling('/path/to/file.pdf');

      expect(result).toEqual({
        success: false,
        error: 'Unexpected error',
      });
    });

    it('should support OCR when enabled', async () => {
      mockDoclingService.isAvailable.mockReturnValue(true);
      mockDoclingService.convertToMarkdown.mockResolvedValue({
        success: true,
        markdown: '# OCR Document',
        pages: 1,
        tables: [],
        images: [],
      });

      await service.parseWithDocling('/path/to/scanned.pdf', {
        enableOcr: true,
      });

      expect(mockDoclingService.convertToMarkdown).toHaveBeenCalledWith(
        '/path/to/scanned.pdf',
        { ocr: true, withTables: true, withImages: false },
      );
    });
  });

  describe('getCapabilities', () => {
    it('should return capabilities when Docling is available', () => {
      mockDoclingService.isAvailable.mockReturnValue(true);

      const capabilities = service.getCapabilities();

      expect(capabilities).toEqual({
        available: true,
        supportsOcr: true,
        supportsTables: true,
        supportedFormats: ['pdf', 'docx', 'doc', 'txt'],
      });
    });

    it('should return not available when Docling is not available', () => {
      mockDoclingService.isAvailable.mockReturnValue(false);

      const capabilities = service.getCapabilities();

      expect(capabilities).toEqual({
        available: false,
        supportsOcr: true,
        supportsTables: true,
        supportedFormats: ['pdf', 'docx', 'doc', 'txt'],
      });
    });
  });

  describe('convertToMarkdown', () => {
    it('should convert document to markdown', async () => {
      mockDoclingService.isAvailable.mockReturnValue(true);
      mockDoclingService.convertToMarkdown.mockResolvedValue({
        success: true,
        markdown: '# Document',
        pages: 1,
        tables: [],
        images: [],
      });

      const result = await service.convertToMarkdown('/path/to/file.pdf');

      expect(result).toEqual({
        success: true,
        markdown: '# Document',
        tables: [],
      });
      expect(mockDoclingService.convertToMarkdown).toHaveBeenCalledWith('/path/to/file.pdf', {
        ocr: undefined,
        withTables: true,
      });
    });

    it('should support OCR option', async () => {
      mockDoclingService.isAvailable.mockReturnValue(true);
      mockDoclingService.convertToMarkdown.mockResolvedValue({
        success: true,
        markdown: '# Document',
        pages: 1,
        tables: [],
        images: [],
      });

      await service.convertToMarkdown('/path/to/file.pdf', { ocr: true });

      expect(mockDoclingService.convertToMarkdown).toHaveBeenCalledWith('/path/to/file.pdf', {
        ocr: true,
        withTables: true,
      });
    });

    it('should handle conversion errors', async () => {
      mockDoclingService.isAvailable.mockReturnValue(true);
      mockDoclingService.convertToMarkdown.mockResolvedValue({
        success: false,
        error: 'Conversion failed',
      });

      const result = await service.convertToMarkdown('/path/to/file.pdf');

      expect(result).toEqual({
        success: false,
        error: 'Conversion failed',
      });
    });

    it('should include tables in result', async () => {
      mockDoclingService.isAvailable.mockReturnValue(true);
      mockDoclingService.convertToMarkdown.mockResolvedValue({
        success: true,
        markdown: '# Document with table',
        pages: 1,
        tables: [
          { markdown: '| A | B |', rows: 2, cols: 2 },
          { markdown: '| C | D |', rows: 3, cols: 2 },
        ],
        images: [],
      });

      const result = await service.convertToMarkdown('/path/to/file.pdf');

      expect(result.tables).toHaveLength(2);
      expect(result.tables?.[0]).toEqual({ markdown: '| A | B |', rows: 2, cols: 2 });
    });
  });
});
