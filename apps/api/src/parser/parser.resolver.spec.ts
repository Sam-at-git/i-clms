import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ParserResolver } from './parser.resolver';
import { ParserService } from './parser.service';
import { FieldExtractorService } from './extractors/field-extractor.service';

// Mock storage module to avoid UUID ESM import issues
jest.mock('../storage/storage.service', () => ({
  StorageService: jest.fn().mockImplementation(() => ({
    uploadFile: jest.fn(),
    getFileUrl: jest.fn(),
    deleteFile: jest.fn(),
  })),
}));

// Mock file-type to avoid ESM import issues
jest.mock('file-type', () => ({
  fileTypeFromBuffer: jest.fn(),
}));

describe('ParserResolver', () => {
  let resolver: ParserResolver;
  let parserService: DeepMockProxy<ParserService>;
  let fieldExtractorService: DeepMockProxy<FieldExtractorService>;

  const mockParseResult = {
    success: true,
    text: 'This is the extracted text from the document.',
    pageCount: 5,
    extractedFields: {
      contractNumber: 'CT-2024-001',
      contractName: 'Test Contract',
      partyA: 'Company A',
      partyB: 'Company B',
      signDate: '2024-01-15',
      amount: '100000',
      validPeriod: '12 months',
      rawMatches: [
        {
          field: 'contractNumber',
          value: 'CT-2024-001',
          confidence: 0.95,
        },
      ],
    },
  };

  const mockExtractedFields = {
    contractNumber: 'CT-2024-001',
    contractName: 'Service Agreement',
    partyA: 'Client Corp',
    partyB: 'Provider LLC',
    signDate: '2024-01-15',
    amount: '50000 USD',
    validPeriod: '24 months',
    rawMatches: [],
  };

  const mockBasicExtractedFields = {
    identification: {
      contractNumber: 'CT-2024-001',
      contractTitle: 'Software Development Agreement',
      contractType: 'Service Agreement',
      subType: 'Development Services',
      versionNumber: '1.0',
      effectiveLanguage: 'Chinese',
    },
    parties: {
      firstParty: {
        name: 'Client Corporation',
        legalEntityType: 'Limited Liability Company',
        registrationNumber: '123456789',
        registeredAddress: '123 Main St',
        operationalAddress: '123 Main St',
        contactPerson: {
          name: 'John Doe',
          title: 'Manager',
          phone: '+86-13800138000',
          email: 'john@example.com',
        },
        authorizedSignatory: {
          name: 'Jane Smith',
          title: 'CEO',
          signatureDate: '2024-01-15',
        },
      },
      secondParty: {
        name: 'Provider LLC',
        legalEntityType: 'Limited Liability Company',
        registrationNumber: '987654321',
        registeredAddress: '456 Oak Ave',
        operationalAddress: '456 Oak Ave',
        contactPerson: {
          name: 'Bob Johnson',
          title: 'Project Manager',
          phone: '+86-13900139000',
          email: 'bob@example.com',
        },
        authorizedSignatory: {
          name: 'Alice Brown',
          title: 'Director',
          signatureDate: '2024-01-15',
        },
      },
      additionalParties: [],
    },
    term: {
      executionDate: '2024-01-15',
      effectiveDate: '2024-01-20',
      commencementDate: '2024-02-01',
      terminationDate: '2025-01-31',
      duration: {
        value: 12,
        unit: 'months',
      },
      renewal: {
        automaticRenewal: true,
        renewalTerm: '12 months',
        noticePeriod: {
          value: 30,
          unit: 'days',
        },
      },
    },
    extractionConfidence: 0.85,
  };

  beforeEach(async () => {
    parserService = mockDeep<ParserService>();
    fieldExtractorService = mockDeep<FieldExtractorService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParserResolver,
        { provide: ParserService, useValue: parserService },
        { provide: FieldExtractorService, useValue: fieldExtractorService },
      ],
    }).compile();

    resolver = module.get<ParserResolver>(ParserResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseDocument', () => {
    it('should parse a document from storage', async () => {
      parserService.parseDocument.mockResolvedValue(mockParseResult);

      const result = await resolver.parseDocument('contract-123.pdf');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.text).toBe('This is the extracted text from the document.');
      expect(result.pageCount).toBe(5);
      expect(result.extractedFields).toBeDefined();
      expect(parserService.parseDocument).toHaveBeenCalledWith('contract-123.pdf');
    });

    it('should handle parse errors', async () => {
      const errorResult = {
        success: false,
        error: 'Failed to parse document',
      };
      parserService.parseDocument.mockResolvedValue(errorResult);

      const result = await resolver.parseDocument('invalid.pdf');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to parse document');
    });

    it('should handle missing extracted fields', async () => {
      const resultWithoutFields = {
        success: true,
        text: 'Some text',
        pageCount: 1,
      };
      parserService.parseDocument.mockResolvedValue(resultWithoutFields);

      const result = await resolver.parseDocument('simple.pdf');

      expect(result.success).toBe(true);
      expect(result.extractedFields).toBeUndefined();
    });
  });

  describe('parseAndExtract', () => {
    it('should parse and extract fields from document', async () => {
      parserService.parseDocument.mockResolvedValue(mockParseResult);

      const result = await resolver.parseAndExtract('contract-456.pdf');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.extractedFields).toBeDefined();
      expect(result.extractedFields!.contractNumber).toBe('CT-2024-001');
      expect(result.extractedFields!.partyA).toBe('Company A');
      expect(result.extractedFields!.partyB).toBe('Company B');
      expect(parserService.parseDocument).toHaveBeenCalledWith('contract-456.pdf');
    });

    it('should return raw matches with confidence scores', async () => {
      parserService.parseDocument.mockResolvedValue(mockParseResult);

      const result = await resolver.parseAndExtract('contract-456.pdf');

      expect(result.extractedFields).toBeDefined();
      expect(result.extractedFields!.rawMatches).toHaveLength(1);
      expect(result.extractedFields!.rawMatches[0].field).toBe('contractNumber');
      expect(result.extractedFields!.rawMatches[0].value).toBe('CT-2024-001');
      expect(result.extractedFields!.rawMatches[0].confidence).toBe(0.95);
    });
  });

  describe('extractFieldsFromText', () => {
    it('should extract fields from provided text', () => {
      const text = 'Contract No: CT-2024-001 between Client Corp and Provider LLC';
      parserService.extractFields.mockReturnValue(mockExtractedFields);

      const result = resolver.extractFieldsFromText(text);

      expect(result).toBeDefined();
      expect(result.contractNumber).toBe('CT-2024-001');
      expect(result.contractName).toBe('Service Agreement');
      expect(result.partyA).toBe('Client Corp');
      expect(result.partyB).toBe('Provider LLC');
      expect(parserService.extractFields).toHaveBeenCalledWith(text);
    });

    it('should handle empty or invalid text', () => {
      const emptyFields = {
        rawMatches: [],
      };
      parserService.extractFields.mockReturnValue(emptyFields);

      const result = resolver.extractFieldsFromText('');

      expect(result).toBeDefined();
      expect(result.rawMatches).toHaveLength(0);
    });

    it('should return all extracted fields when available', () => {
      parserService.extractFields.mockReturnValue(mockExtractedFields);

      const result = resolver.extractFieldsFromText('sample contract text');

      expect(result.contractNumber).toBe('CT-2024-001');
      expect(result.contractName).toBe('Service Agreement');
      expect(result.partyA).toBe('Client Corp');
      expect(result.partyB).toBe('Provider LLC');
      expect(result.signDate).toBe('2024-01-15');
      expect(result.amount).toBe('50000 USD');
      expect(result.validPeriod).toBe('24 months');
    });
  });

  describe('extractBasicFields', () => {
    it('should extract basic contract fields', () => {
      const textContent = 'Contract CT-2024-001 between Client Corp and Provider LLC';
      fieldExtractorService.extractBasicFields.mockReturnValue(mockBasicExtractedFields as any);

      const result = resolver.extractBasicFields(textContent);

      expect(result).toBeDefined();
      expect(result.identification).toBeDefined();
      expect(result.parties).toBeDefined();
      expect(result.term).toBeDefined();
      expect(result.extractionConfidence).toBeDefined();
      expect(fieldExtractorService.extractBasicFields).toHaveBeenCalledWith(textContent);
    });

    it('should return complete identification information', () => {
      fieldExtractorService.extractBasicFields.mockReturnValue(mockBasicExtractedFields as any);

      const result = resolver.extractBasicFields('contract text');

      expect(result.identification.contractNumber).toBe('CT-2024-001');
      expect(result.identification.contractTitle).toBe('Software Development Agreement');
      expect(result.identification.contractType).toBe('Service Agreement');
      expect(result.identification.subType).toBe('Development Services');
      expect(result.identification.versionNumber).toBe('1.0');
      expect(result.identification.effectiveLanguage).toBe('Chinese');
    });

    it('should return complete parties information', () => {
      fieldExtractorService.extractBasicFields.mockReturnValue(mockBasicExtractedFields as any);

      const result = resolver.extractBasicFields('contract text');

      expect(result.parties.firstParty.name).toBe('Client Corporation');
      expect(result.parties.firstParty.legalEntityType).toBe('Limited Liability Company');
      expect(result.parties.firstParty.registrationNumber).toBe('123456789');
      expect(result.parties.firstParty.contactPerson).toBeDefined();
      expect(result.parties.firstParty.contactPerson?.name).toBe('John Doe');
      expect(result.parties.firstParty.authorizedSignatory).toBeDefined();
      expect(result.parties.firstParty.authorizedSignatory?.name).toBe('Jane Smith');

      expect(result.parties.secondParty.name).toBe('Provider LLC');
      expect(result.parties.secondParty.contactPerson?.name).toBe('Bob Johnson');
      expect(result.parties.secondParty.authorizedSignatory?.name).toBe('Alice Brown');

      expect(result.parties.additionalParties).toHaveLength(0);
    });

    it('should return complete term information', () => {
      fieldExtractorService.extractBasicFields.mockReturnValue(mockBasicExtractedFields as any);

      const result = resolver.extractBasicFields('contract text');

      expect(result.term.executionDate).toBe('2024-01-15');
      expect(result.term.effectiveDate).toBe('2024-01-20');
      expect(result.term.commencementDate).toBe('2024-02-01');
      expect(result.term.terminationDate).toBe('2025-01-31');
      expect(result.term.duration).toBeDefined();
      expect(result.term.duration?.value).toBe(12);
      expect(result.term.duration?.unit).toBe('months');
      expect(result.term.renewal).toBeDefined();
      expect(result.term.renewal?.automaticRenewal).toBe(true);
      expect(result.term.renewal?.noticePeriod).toBeDefined();
      expect(result.term.renewal?.noticePeriod?.value).toBe(30);
      expect(result.term.renewal?.noticePeriod?.unit).toBe('days');
    });

    it('should return extraction confidence score', () => {
      fieldExtractorService.extractBasicFields.mockReturnValue(mockBasicExtractedFields as any);

      const result = resolver.extractBasicFields('contract text');

      expect(result.extractionConfidence).toBe(0.85);
    });
  });
});
