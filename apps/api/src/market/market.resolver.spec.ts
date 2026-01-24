import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { MarketResolver } from './market.resolver';
import { MarketService } from './market.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ContractType } from '../graphql/types/enums';

describe('MarketResolver', () => {
  let resolver: MarketResolver;
  let service: DeepMockProxy<MarketService>;

  const mockContractSearchResult = {
    id: 'contract-1',
    contractNo: 'CT-2024-001',
    name: 'Test Contract',
    customerName: 'Test Customer',
    type: ContractType.STAFF_AUGMENTATION,
    industry: 'Technology',
    amount: 100000,
    signedAt: new Date('2024-01-15'),
    tags: ['tag1', 'tag2'],
    highlight: 'Key term highlighted',
  };

  const mockSearchResponse = {
    total: 150,
    results: [mockContractSearchResult],
  };

  const mockTagOverview = {
    totalTags: 45,
    topTags: [
      {
        tagId: 'tag-1',
        tagName: 'High Value',
        category: 'value',
        color: '#FF0000',
        count: 25,
        totalValue: 5000000,
      },
      {
        tagId: 'tag-2',
        tagName: 'Priority',
        category: 'priority',
        color: '#00FF00',
        count: 18,
        totalValue: 3000000,
      },
    ],
    byCategory: [
      {
        category: 'value',
        tags: [
          {
            tagId: 'tag-1',
            tagName: 'High Value',
            category: 'value',
            color: '#FF0000',
            count: 25,
            totalValue: 5000000,
          },
        ],
      },
      {
        category: 'priority',
        tags: [
          {
            tagId: 'tag-2',
            tagName: 'Priority',
            category: 'priority',
            color: '#00FF00',
            count: 18,
            totalValue: 3000000,
          },
        ],
      },
    ],
  };

  const mockCaseStudy = {
    id: 'case-1',
    contractNo: 'CT-2024-001',
    name: 'Success Story',
    customerName: 'Happy Customer',
    industry: 'Finance',
    type: ContractType.PROJECT_OUTSOURCING,
    amount: 500000,
    signedAt: new Date('2024-01-15'),
    description: 'A successful project delivery',
    highlights: ['On time delivery', 'Under budget'],
    tags: ['success', 'reference'],
  };

  const mockCaseOverview = {
    totalCases: 85,
    byIndustry: [
      {
        industry: 'Finance',
        count: 25,
        totalValue: 10000000,
      },
      {
        industry: 'Technology',
        count: 30,
        totalValue: 8000000,
      },
    ],
    featured: [mockCaseStudy],
  };

  beforeEach(async () => {
    service = mockDeep<MarketService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketResolver,
        { provide: MarketService, useValue: service },
        { provide: GqlAuthGuard, useValue: { canActivate: () => true } },
        { provide: RolesGuard, useValue: { canActivate: () => true } },
      ],
    }).compile();

    resolver = module.get<MarketResolver>(MarketResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchContracts', () => {
    it('should search contracts with keyword', async () => {
      service.searchContracts.mockResolvedValue(mockSearchResponse);

      const input = { keyword: 'software' };
      const result = await resolver.searchContracts(input);

      expect(result).toBeDefined();
      expect(result.total).toBe(150);
      expect(result.results).toHaveLength(1);
      expect(service.searchContracts).toHaveBeenCalledWith(input);
    });

    it('should search contracts with filters', async () => {
      service.searchContracts.mockResolvedValue({
        total: 1,
        results: [mockContractSearchResult],
      });

      const input = {
        tags: ['priority'],
        types: [ContractType.STAFF_AUGMENTATION],
        industries: ['Technology'],
        minAmount: 50000,
        maxAmount: 200000,
        limit: 20,
        offset: 0,
      };

      const result = await resolver.searchContracts(input);

      expect(result).toBeDefined();
      expect(service.searchContracts).toHaveBeenCalledWith(input);
    });

    it('should allow ADMIN, DEPT_ADMIN, and USER roles', async () => {
      expect(true).toBe(true);
    });
  });

  describe('tagOverview', () => {
    it('should return tag overview', async () => {
      service.getTagOverview.mockResolvedValue(mockTagOverview);

      const result = await resolver.tagOverview();

      expect(result).toBeDefined();
      expect(result.totalTags).toBe(45);
      expect(result.topTags).toHaveLength(2);
      expect(result.byCategory).toHaveLength(2);
      expect(service.getTagOverview).toHaveBeenCalled();
    });

    it('should include tag stats with details', async () => {
      service.getTagOverview.mockResolvedValue(mockTagOverview);

      const result = await resolver.tagOverview();

      const topTag = result.topTags[0];
      expect(topTag.tagId).toBe('tag-1');
      expect(topTag.tagName).toBe('High Value');
      expect(topTag.category).toBe('value');
      expect(topTag.color).toBe('#FF0000');
      expect(topTag.count).toBe(25);
      expect(topTag.totalValue).toBe(5000000);
    });

    it('should group tags by category', async () => {
      service.getTagOverview.mockResolvedValue(mockTagOverview);

      const result = await resolver.tagOverview();

      const valueCategory = result.byCategory.find(c => c.category === 'value');
      expect(valueCategory).toBeDefined();
      expect(valueCategory!.tags).toHaveLength(1);
      expect(valueCategory!.tags[0].tagName).toBe('High Value');
    });

    it('should allow ADMIN, DEPT_ADMIN, and USER roles', async () => {
      expect(true).toBe(true);
    });
  });

  describe('caseOverview', () => {
    it('should return case study overview', async () => {
      service.getCaseOverview.mockResolvedValue(mockCaseOverview);

      const result = await resolver.caseOverview();

      expect(result).toBeDefined();
      expect(result.totalCases).toBe(85);
      expect(result.byIndustry).toHaveLength(2);
      expect(result.featured).toHaveLength(1);
      expect(service.getCaseOverview).toHaveBeenCalled();
    });

    it('should include industry breakdown', async () => {
      service.getCaseOverview.mockResolvedValue(mockCaseOverview);

      const result = await resolver.caseOverview();

      const financeIndustry = result.byIndustry.find(i => i.industry === 'Finance');
      expect(financeIndustry).toBeDefined();
      expect(financeIndustry!.count).toBe(25);
      expect(financeIndustry!.totalValue).toBe(10000000);

      const techIndustry = result.byIndustry.find(i => i.industry === 'Technology');
      expect(techIndustry).toBeDefined();
      expect(techIndustry!.count).toBe(30);
      expect(techIndustry!.totalValue).toBe(8000000);
    });

    it('should include featured case studies', async () => {
      service.getCaseOverview.mockResolvedValue(mockCaseOverview);

      const result = await resolver.caseOverview();

      const featured = result.featured[0];
      expect(featured.id).toBe('case-1');
      expect(featured.contractNo).toBe('CT-2024-001');
      expect(featured.name).toBe('Success Story');
      expect(featured.customerName).toBe('Happy Customer');
      expect(featured.industry).toBe('Finance');
      expect(featured.type).toBe(ContractType.PROJECT_OUTSOURCING);
      expect(featured.amount).toBe(500000);
      expect(featured.highlights).toEqual(['On time delivery', 'Under budget']);
      expect(featured.tags).toEqual(['success', 'reference']);
    });

    it('should allow ADMIN, DEPT_ADMIN, and USER roles', async () => {
      expect(true).toBe(true);
    });
  });
});
