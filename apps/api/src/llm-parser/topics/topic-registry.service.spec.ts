import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TopicRegistryService } from './topic-registry.service';
import {
  ExtractTopic,
  ExtractTopicNames,
  EXTRACT_TOPICS,
} from './topics.const';
import {
  ExtractTopicDefinition,
  TopicExtractResult,
} from './topic.interface';

describe('TopicRegistryService', () => {
  let service: TopicRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TopicRegistryService],
    }).compile();

    service = module.get<TopicRegistryService>(TopicRegistryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Topic Registration', () => {
    it('TEST-001: should register a single topic', () => {
      // Arrange
      const initialCount = service.getTopicCount();
      const customTopic: ExtractTopicDefinition = {
        name: 'CUSTOM_TOPIC',
        displayName: '自定义主题',
        description: '测试用自定义主题',
        weight: 1,
        order: 100,
        fields: [
          { name: 'field1', type: 'string', required: true, description: '测试字段' },
        ],
      };

      // Act
      service.register(customTopic);

      // Assert
      expect(service.getTopicCount()).toBe(initialCount + 1);
      expect(service.hasTopic('CUSTOM_TOPIC')).toBe(true);
    });

    it('TEST-002: should throw error when registering duplicate topic', () => {
      // Arrange
      const duplicateTopic: ExtractTopicDefinition = {
        name: ExtractTopic.BASIC_INFO, // Already exists
        displayName: '重复主题',
        description: '测试重复注册',
        fields: [],
      };

      // Act & Assert
      expect(() => service.register(duplicateTopic)).toThrow(
        'Topic BASIC_INFO is already registered',
      );
    });

    it('TEST-003: should register multiple topics at once', () => {
      // Arrange
      const initialCount = service.getTopicCount();
      const newTopics: ExtractTopicDefinition[] = [
        {
          name: 'TOPIC_A',
          displayName: '主题A',
          description: '测试主题A',
          weight: 1,
          fields: [{ name: 'field1', type: 'string', required: false }],
        },
        {
          name: 'TOPIC_B',
          displayName: '主题B',
          description: '测试主题B',
          weight: 1,
          fields: [{ name: 'field2', type: 'number', required: false }],
        },
      ];

      // Act
      service.registerAll(newTopics);

      // Assert
      expect(service.getTopicCount()).toBe(initialCount + 2);
      expect(service.hasTopic('TOPIC_A')).toBe(true);
      expect(service.hasTopic('TOPIC_B')).toBe(true);
    });
  });

  describe('Topic Retrieval', () => {
    it('TEST-004: should get existing topic', () => {
      // Act
      const topic = service.getTopic(ExtractTopic.BASIC_INFO);

      // Assert
      expect(topic).toBeDefined();
      expect(topic.name).toBe(ExtractTopic.BASIC_INFO);
      expect(topic.displayName).toBe(ExtractTopicNames[ExtractTopic.BASIC_INFO]);
      expect(topic.fields.length).toBeGreaterThan(0);
    });

    it('TEST-005: should throw NotFoundException for non-existent topic', () => {
      // Act & Assert
      expect(() => service.getTopic('NON_EXISTENT')).toThrow(NotFoundException);
    });

    it('TEST-006: should get all topics sorted by order', () => {
      // Act
      const allTopics = service.getAllTopics();

      // Assert
      expect(allTopics.length).toBeGreaterThan(0);
      expect(allTopics[0].order).toBeLessThanOrEqual(allTopics[1].order || 0);
    });

    it('TEST-012: should get all topic names', () => {
      // Act
      const names = service.getTopicNames();

      // Assert
      expect(names).toContain(ExtractTopic.BASIC_INFO);
      expect(names).toContain(ExtractTopic.FINANCIAL);
      expect(names).toContain(ExtractTopic.MILESTONES);
      expect(names.length).toBe(service.getTopicCount());
    });
  });

  describe('Topic Existence Checks', () => {
    it('TEST-010: should return true for existing topic', () => {
      // Act & Assert
      expect(service.hasTopic(ExtractTopic.BASIC_INFO)).toBe(true);
      expect(service.hasTopic(ExtractTopic.FINANCIAL)).toBe(true);
    });

    it('TEST-011: should return false for non-existent topic', () => {
      // Act & Assert
      expect(service.hasTopic('NON_EXISTENT_TOPIC')).toBe(false);
    });
  });

  describe('Completeness Calculation', () => {
    it('TEST-007: should calculate 100% for complete data', () => {
      // Arrange
      const results: TopicExtractResult[] = EXTRACT_TOPICS.map(topic => ({
        topicName: topic.name,
        success: true,
        data: Object.fromEntries(
          topic.fields.map(f => [f.name, getMockValue(f.type)])
        ),
        extractedAt: new Date(),
      }));

      // Act
      const score = service.calculateCompleteness(results);

      // Assert
      expect(score.score).toBe(100);
      expect(score.total).toBe(score.maxScore);
      expect(score.topicScores).toBeDefined();
      expect(score.topicScores?.length).toBe(EXTRACT_TOPICS.length);
    });

    it('TEST-008: should calculate partial score for incomplete data', () => {
      // Arrange
      const results: TopicExtractResult[] = [
        {
          topicName: ExtractTopic.BASIC_INFO,
          success: true,
          data: {
            contractNumber: 'CTR-2024-001',
            title: '测试合同',
            // Missing other fields
          },
          extractedAt: new Date(),
        },
        {
          topicName: ExtractTopic.FINANCIAL,
          success: true,
          data: {
            totalAmount: 100000,
            currency: 'CNY',
          },
          extractedAt: new Date(),
        },
      ];

      // Act
      const score = service.calculateCompleteness(results);

      // Assert
      expect(score.score).toBeGreaterThan(0);
      expect(score.score).toBeLessThan(100);
      expect(score.topicScores?.[0].percentage).toBeLessThan(100);
    });

    it('TEST-009: should calculate 0 for empty data', () => {
      // Arrange
      const results: TopicExtractResult[] = [
        {
          topicName: ExtractTopic.BASIC_INFO,
          success: true,
          data: {},
          extractedAt: new Date(),
        },
      ];

      // Act
      const score = service.calculateCompleteness(results);

      // Assert
      expect(score.score).toBe(0);
    });

    it('should include topics with zero score when not in results', () => {
      // Arrange - Only provide results for BASIC_INFO
      const results: TopicExtractResult[] = [
        {
          topicName: ExtractTopic.BASIC_INFO,
          success: true,
          data: {
            contractNumber: 'CTR-2024-001',
            title: '测试合同',
          },
          extractedAt: new Date(),
        },
      ];

      // Act
      const score = service.calculateCompleteness(results);

      // Assert
      // Should have entries for all topics, including those not in results
      expect(score.topicScores?.length).toBe(EXTRACT_TOPICS.length);
      expect(score.score).toBeGreaterThan(0);
      expect(score.score).toBeLessThan(100);
    });
  });

  describe('Topic Field Operations', () => {
    it('should get fields for a topic', () => {
      // Act
      const fields = service.getTopicFields(ExtractTopic.BASIC_INFO);

      // Assert
      expect(fields.length).toBeGreaterThan(0);
      expect(fields[0].name).toBeDefined();
      expect(fields[0].type).toBeDefined();
      expect(fields[0].required).toBeDefined();
    });

    it('should get specific field from topic', () => {
      // Act
      const field = service.getField(ExtractTopic.BASIC_INFO, 'contractNumber');

      // Assert
      expect(field).toBeDefined();
      expect(field?.name).toBe('contractNumber');
      expect(field?.type).toBe('string');
    });

    it('should return undefined for non-existent field', () => {
      // Act
      const field = service.getField(ExtractTopic.BASIC_INFO, 'nonExistentField');

      // Assert
      expect(field).toBeUndefined();
    });

    it('should get topic field values with metadata', () => {
      // Arrange
      const data = {
        contractNumber: 'CTR-2024-001',
        title: '测试合同',
        contractType: 'STAFF_AUGMENTATION',
      };

      // Act
      const fieldValues = service.getTopicFieldValues(ExtractTopic.BASIC_INFO, data);

      // Assert
      expect(fieldValues.length).toBeGreaterThan(0);
      const contractNumberField = fieldValues.find(fv => fv.name === 'contractNumber');
      expect(contractNumberField?.hasValue).toBe(true);
      expect(contractNumberField?.value).toBe('CTR-2024-001');
    });
  });

  describe('Missing Fields Detection', () => {
    it('should return empty array when all required fields present', () => {
      // Arrange
      const topicWithRequiredFields: ExtractTopicDefinition = {
        name: 'TEST_REQUIRED',
        displayName: '测试必填',
        description: '测试',
        fields: [
          { name: 'field1', type: 'string', required: true },
          { name: 'field2', type: 'string', required: false },
        ],
      };

      // Act - Register and check
      service.register(topicWithRequiredFields);
      const missing = service.getMissingFields('TEST_REQUIRED', {
        field1: 'value',
      });

      // Assert
      expect(missing).toEqual([]);
    });

    it('should return missing required fields', () => {
      // Arrange
      const topicWithRequiredFields: ExtractTopicDefinition = {
        name: 'TEST_REQUIRED_2',
        displayName: '测试必填2',
        description: '测试',
        fields: [
          { name: 'field1', type: 'string', required: true },
          { name: 'field2', type: 'string', required: true },
          { name: 'field3', type: 'string', required: false },
        ],
      };

      // Act
      service.register(topicWithRequiredFields);
      const missing = service.getMissingFields('TEST_REQUIRED_2', {
        field1: 'value',
      });

      // Assert
      expect(missing).toEqual(['field2']);
    });

    it('should get all missing fields across topics', () => {
      // Arrange
      // First register a topic with required fields
      const topicWithRequired: ExtractTopicDefinition = {
        name: 'TEST_REQUIRED_TOPIC',
        displayName: '测试必填主题',
        description: '测试',
        fields: [
          { name: 'requiredField1', type: 'string', required: true },
          { name: 'requiredField2', type: 'string', required: true },
        ],
      };
      service.register(topicWithRequired);

      const results: TopicExtractResult[] = [
        {
          topicName: 'TEST_REQUIRED_TOPIC',
          success: true,
          data: { requiredField1: 'value1' }, // Missing requiredField2
          extractedAt: new Date(),
        },
      ];

      // Act
      const missingMap = service.getAllMissingFields(results);

      // Assert
      expect(missingMap.size).toBe(1);
      expect(missingMap.has('TEST_REQUIRED_TOPIC')).toBe(true);
      expect(missingMap.get('TEST_REQUIRED_TOPIC')).toEqual(['requiredField2']);
    });
  });

  describe('Topic Query by Order', () => {
    it('should get topics by order range', () => {
      // Act
      const topics = service.getTopicsByOrder(1, 3);

      // Assert
      expect(topics.length).toBeGreaterThan(0);
      topics.forEach(topic => {
        expect(topic.order).toBeGreaterThanOrEqual(1);
        expect(topic.order).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('Display Name and Utilities', () => {
    it('should get topic display name', () => {
      // Act
      const displayName = service.getTopicDisplayName(ExtractTopic.BASIC_INFO);

      // Assert
      expect(displayName).toBe(ExtractTopicNames[ExtractTopic.BASIC_INFO]);
    });

    it('should return name for unknown topic display name', () => {
      // Act
      const displayName = service.getTopicDisplayName('UNKNOWN_TOPIC');

      // Assert
      expect(displayName).toBe('UNKNOWN_TOPIC');
    });

    it('should get total weight of all topics', () => {
      // Act
      const totalWeight = service.getTotalWeight();

      // Assert
      expect(totalWeight).toBeGreaterThan(0);
      // Should equal sum of all default topic weights
      const expectedWeight = EXTRACT_TOPICS.reduce((sum, t) => sum + (t.weight || 0), 0);
      expect(totalWeight).toBe(expectedWeight);
    });

    it('should convert InfoType to ExtractTopic', () => {
      // Act
      const topic = service.infoTypeToTopic('BASIC_INFO');

      // Assert
      expect(topic).toBe(ExtractTopic.BASIC_INFO);
    });

    it('should return undefined for invalid InfoType', () => {
      // Act
      const topic = service.infoTypeToTopic('INVALID_TYPE');

      // Assert
      expect(topic).toBeUndefined();
    });
  });

  describe('Placeholder Detection', () => {
    it('should detect placeholder string values as invalid', () => {
      // Arrange
      const results: TopicExtractResult[] = [
        {
          topicName: ExtractTopic.BASIC_INFO,
          success: true,
          data: {
            contractNumber: 'N/A',
            title: 'null',
            contractType: 'undefined',
          },
          extractedAt: new Date(),
        },
      ];

      // Act
      const score = service.calculateCompleteness(results);

      // Assert
      // All values are placeholders, so no valid data
      expect(score.score).toBe(0);
    });

    it('should treat empty string as invalid', () => {
      // Arrange
      const results: TopicExtractResult[] = [
        {
          topicName: ExtractTopic.BASIC_INFO,
          success: true,
          data: {
            contractNumber: '',
            title: '   ',
          },
          extractedAt: new Date(),
        },
      ];

      // Act
      const score = service.calculateCompleteness(results);

      // Assert
      expect(score.score).toBe(0);
    });

    it('should treat empty arrays as invalid', () => {
      // Arrange
      const results: TopicExtractResult[] = [
        {
          topicName: ExtractTopic.MILESTONES,
          success: true,
          data: {
            milestones: [],
          },
          extractedAt: new Date(),
        },
      ];

      // Act
      const score = service.calculateCompleteness(results);

      // Assert
      expect(score.score).toBe(0);
    });

    it('should treat non-empty arrays as valid', () => {
      // Arrange
      const results: TopicExtractResult[] = [
        {
          topicName: ExtractTopic.MILESTONES,
          success: true,
          data: {
            milestones: [{ name: 'M1', amount: 10000 }],
          },
          extractedAt: new Date(),
        },
      ];

      // Act
      const score = service.calculateCompleteness(results);

      // Assert
      expect(score.score).toBeGreaterThan(0);
    });
  });
});

// Helper function to generate mock values based on field type
function getMockValue(type: string): any {
  switch (type) {
    case 'string':
      return 'mock_value';
    case 'number':
    case 'decimal':
      return 100;
    case 'date':
      return '2024-01-01';
    case 'boolean':
      return true;
    case 'array':
      return [{ item: 'value' }];
    default:
      return 'mock';
  }
}
