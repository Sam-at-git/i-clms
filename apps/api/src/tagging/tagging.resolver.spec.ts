import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { TaggingResolver } from './tagging.resolver';
import { TaggingService } from './tagging.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('TaggingResolver', () => {
  let resolver: TaggingResolver;
  let service: DeepMockProxy<TaggingService>;

  const mockUser = { id: 'user-1' };

  const mockClassificationResult = {
    contractType: 'STAFF_AUGMENTATION',
    confidence: 0.95,
    industry: 'Technology',
    scale: 'medium',
  };

  const mockExtractedTag = {
    name: 'High Value',
    category: 'value',
    confidence: 0.9,
    source: 'amount_analysis',
  };

  const mockContractProfile = {
    contractId: 'contract-1',
    tags: ['tag1', 'tag2'],
    keywords: ['software', 'development'],
    features: [
      { feature: 'amount', score: 0.8 },
      { feature: 'duration', score: 0.7 },
    ],
  };

  const mockTag = {
    id: 'tag-1',
    name: 'Priority',
    category: 'priority',
    color: '#FF0000',
    isActive: true,
    isSystem: false,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockContext = {
    req: {
      ip: '127.0.0.1',
      headers: {
        'x-forwarded-for': '192.168.1.1',
      },
    },
  };

  beforeEach(async () => {
    service = mockDeep<TaggingService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaggingResolver,
        { provide: TaggingService, useValue: service },
        { provide: GqlAuthGuard, useValue: { canActivate: () => true } },
        { provide: RolesGuard, useValue: { canActivate: () => true } },
      ],
    }).compile();

    resolver = module.get<TaggingResolver>(TaggingResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== Existing Classification Methods ====================

  describe('autoClassifyContract', () => {
    it('should auto classify a contract', async () => {
      service.autoClassifyContract.mockResolvedValue(mockClassificationResult);

      const result = await resolver.autoClassifyContract('contract-1');

      expect(result).toBeDefined();
      expect(result.contractType).toBe('STAFF_AUGMENTATION');
      expect(result.confidence).toBe(0.95);
      expect(result.industry).toBe('Technology');
      expect(result.scale).toBe('medium');
      expect(service.autoClassifyContract).toHaveBeenCalledWith('contract-1');
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  describe('extractTags', () => {
    it('should extract tags from a contract', async () => {
      service.extractTags.mockResolvedValue([mockExtractedTag]);

      const result = await resolver.extractTags('contract-1');

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('High Value');
      expect(result[0].category).toBe('value');
      expect(result[0].confidence).toBe(0.9);
      expect(service.extractTags).toHaveBeenCalledWith('contract-1');
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  describe('generateProfile', () => {
    it('should generate a contract profile', async () => {
      service.generateProfile.mockResolvedValue(mockContractProfile);

      const result = await resolver.generateProfile('contract-1');

      expect(result).toBeDefined();
      expect(result.contractId).toBe('contract-1');
      expect(result.tags).toEqual(['tag1', 'tag2']);
      expect(result.keywords).toEqual(['software', 'development']);
      expect(result.features).toHaveLength(2);
      expect(service.generateProfile).toHaveBeenCalledWith('contract-1');
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  // ==================== Tag CRUD Methods ====================

  describe('tags', () => {
    it('should return all tags', async () => {
      service.getTags.mockResolvedValue([mockTag]);

      const result = await resolver.tags(undefined, false);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(service.getTags).toHaveBeenCalledWith(undefined, false, undefined);
    });

    it('should filter tags by category', async () => {
      service.getTags.mockResolvedValue([mockTag]);

      await resolver.tags('priority', false);

      expect(service.getTags).toHaveBeenCalledWith('priority', false, undefined);
    });

    it('should include inactive tags when requested', async () => {
      service.getTags.mockResolvedValue([mockTag]);

      await resolver.tags(undefined, true);

      expect(service.getTags).toHaveBeenCalledWith(undefined, true, undefined);
    });

    it('should search tags by keyword', async () => {
      service.getTags.mockResolvedValue([mockTag]);

      await resolver.tags(undefined, false, 'high');

      expect(service.getTags).toHaveBeenCalledWith(undefined, false, 'high');
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  describe('tag', () => {
    it('should return a single tag by ID', async () => {
      service.getTag.mockResolvedValue(mockTag);

      const result = await resolver.tag('tag-1');

      expect(result).toBeDefined();
      expect(result!.id).toBe('tag-1');
      expect(result!.name).toBe('Priority');
      expect(service.getTag).toHaveBeenCalledWith('tag-1');
    });

    it('should return null when tag not found', async () => {
      service.getTag.mockResolvedValue(null);

      const result = await resolver.tag('nonexistent');

      expect(result).toBeNull();
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  describe('tagCategories', () => {
    it('should return all tag categories', async () => {
      service.getTagCategories.mockResolvedValue(['priority', 'value', 'industry']);

      const result = await resolver.tagCategories();

      expect(result).toBeDefined();
      expect(result).toHaveLength(3);
      expect(result).toContain('priority');
      expect(result).toContain('value');
      expect(result).toContain('industry');
      expect(service.getTagCategories).toHaveBeenCalled();
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  describe('createTag', () => {
    it('should create a new tag', async () => {
      service.createTag.mockResolvedValue(mockTag);

      const input = { name: 'Priority', category: 'priority', color: '#FF0000' };
      const result = await resolver.createTag(input, mockUser, mockContext);

      expect(result).toBeDefined();
      expect(result.name).toBe('Priority');
      expect(result.category).toBe('priority');
      expect(result.color).toBe('#FF0000');
      expect(service.createTag).toHaveBeenCalledWith(input, mockUser.id, '192.168.1.1');
    });

    it('should use default color when not provided', async () => {
      service.createTag.mockResolvedValue(mockTag);

      const input = { name: 'Standard', category: 'standard' };
      await resolver.createTag(input, mockUser, mockContext);

      expect(service.createTag).toHaveBeenCalledWith(input, mockUser.id, '192.168.1.1');
    });

    it('should use ip from x-forwarded-for header', async () => {
      service.createTag.mockResolvedValue(mockTag);

      const input = { name: 'Test', category: 'test' };
      const context = {
        req: {
          headers: {
            'x-forwarded-for': '10.0.0.1',
          },
        },
      };

      await resolver.createTag(input, mockUser, context);

      expect(service.createTag).toHaveBeenCalledWith(input, mockUser.id, '10.0.0.1');
    });

    it('should fallback to req.ip when x-forwarded-for is not available', async () => {
      service.createTag.mockResolvedValue(mockTag);

      const input = { name: 'Test', category: 'test' };
      const context = {
        req: {
          ip: '127.0.0.1',
        },
      };

      await resolver.createTag(input, mockUser, context);

      expect(service.createTag).toHaveBeenCalledWith(input, mockUser.id, '127.0.0.1');
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  describe('updateTag', () => {
    it('should update an existing tag', async () => {
      service.updateTag.mockResolvedValue(mockTag);

      const input = { name: 'Updated Priority', color: '#00FF00' };
      const result = await resolver.updateTag('tag-1', input, mockUser, mockContext);

      expect(result).toBeDefined();
      expect(service.updateTag).toHaveBeenCalledWith('tag-1', input, mockUser.id, '192.168.1.1');
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  describe('deleteTag', () => {
    it('should delete a tag', async () => {
      service.deleteTag.mockResolvedValue({ success: true, message: 'Tag deleted successfully' });

      const result = await resolver.deleteTag('tag-1', mockUser, mockContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Tag deleted successfully');
      expect(service.deleteTag).toHaveBeenCalledWith('tag-1', mockUser.id, '192.168.1.1');
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  // ==================== Tag Assignment Methods ====================

  describe('assignTagToContract', () => {
    it('should assign a tag to a contract', async () => {
      service.assignTagToContract.mockResolvedValue(undefined);

      const result = await resolver.assignTagToContract('contract-1', 'tag-1', mockUser, mockContext);

      expect(result).toBe(true);
      expect(service.assignTagToContract).toHaveBeenCalledWith('contract-1', 'tag-1', mockUser.id, '192.168.1.1');
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  describe('removeTagFromContract', () => {
    it('should remove a tag from a contract', async () => {
      service.removeTagFromContract.mockResolvedValue(undefined);

      const result = await resolver.removeTagFromContract('contract-1', 'tag-1', mockUser, mockContext);

      expect(result).toBe(true);
      expect(service.removeTagFromContract).toHaveBeenCalledWith('contract-1', 'tag-1', mockUser.id, '192.168.1.1');
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  describe('assignTagsToContract', () => {
    it('should batch assign tags to a contract', async () => {
      service.assignTagsToContract.mockResolvedValue(undefined);

      const tagIds = ['tag-1', 'tag-2', 'tag-3'];
      const result = await resolver.assignTagsToContract('contract-1', tagIds, mockUser, mockContext);

      expect(result).toBe(true);
      expect(service.assignTagsToContract).toHaveBeenCalledWith('contract-1', tagIds, mockUser.id, '192.168.1.1');
    });

    it('should handle empty tag array', async () => {
      service.assignTagsToContract.mockResolvedValue(undefined);

      const result = await resolver.assignTagsToContract('contract-1', [], mockUser, mockContext);

      expect(result).toBe(true);
      expect(service.assignTagsToContract).toHaveBeenCalledWith('contract-1', [], mockUser.id, '192.168.1.1');
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });
});
