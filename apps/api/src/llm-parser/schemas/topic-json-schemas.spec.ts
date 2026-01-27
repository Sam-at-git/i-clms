import {
  TOPIC_JSON_SCHEMAS,
  getTopicSchema,
  hasTopicSchema,
  getAllTopicsWithSchemas,
  JsonSchema,
} from './topic-json-schemas';
import { ExtractTopic } from '../topics/topics.const';

describe('Topic JSON Schemas', () => {
  describe('TOPIC_JSON_SCHEMAS', () => {
    it('should have schemas for all 8 topics', () => {
      const expectedTopics = [
        ExtractTopic.BASIC_INFO,
        ExtractTopic.FINANCIAL,
        ExtractTopic.TIME_INFO,
        ExtractTopic.MILESTONES,
        ExtractTopic.RATE_ITEMS,
        ExtractTopic.LINE_ITEMS,
        ExtractTopic.RISK_CLAUSES,
        ExtractTopic.DELIVERABLES,
      ];

      expect(Object.keys(TOPIC_JSON_SCHEMAS)).toHaveLength(8);
      expectedTopics.forEach((topic) => {
        expect(TOPIC_JSON_SCHEMAS[topic]).toBeDefined();
      });
    });

    it('should have valid JSON Schema structure for each topic', () => {
      Object.entries(TOPIC_JSON_SCHEMAS).forEach(([topic, schema]) => {
        expect(schema.type).toBe('object');
        expect(schema.properties).toBeDefined();
        expect(typeof schema.properties).toBe('object');
      });
    });
  });

  describe('BASIC_INFO Schema', () => {
    const schema = TOPIC_JSON_SCHEMAS[ExtractTopic.BASIC_INFO];

    it('should have correct properties', () => {
      const expectedFields = [
        'contractNumber',
        'title',
        'contractType',
        'firstPartyName',
        'secondPartyName',
        'industry',
      ];

      expectedFields.forEach((field) => {
        expect(schema.properties![field]).toBeDefined();
      });
    });

    it('should have required fields', () => {
      expect(schema.required).toContain('contractNumber');
      expect(schema.required).toContain('title');
      expect(schema.required).toContain('contractType');
      expect(schema.required).toContain('firstPartyName');
      expect(schema.required).toContain('secondPartyName');
    });

    it('should have valid contractType enum', () => {
      const contractTypeSchema = schema.properties!.contractType;
      expect(contractTypeSchema.enum).toContain('STAFF_AUGMENTATION');
      expect(contractTypeSchema.enum).toContain('PROJECT_OUTSOURCING');
      expect(contractTypeSchema.enum).toContain('PRODUCT_SALES');
      expect(contractTypeSchema.enum).toContain(null);
    });
  });

  describe('FINANCIAL Schema', () => {
    const schema = TOPIC_JSON_SCHEMAS[ExtractTopic.FINANCIAL];

    it('should have correct properties', () => {
      expect(schema.properties!.totalAmount).toBeDefined();
      expect(schema.properties!.currency).toBeDefined();
      expect(schema.properties!.taxRate).toBeDefined();
      expect(schema.properties!.paymentTerms).toBeDefined();
      expect(schema.properties!.paymentMethod).toBeDefined();
    });

    it('should require totalAmount', () => {
      expect(schema.required).toContain('totalAmount');
    });
  });

  describe('TIME_INFO Schema', () => {
    const schema = TOPIC_JSON_SCHEMAS[ExtractTopic.TIME_INFO];

    it('should have date fields with format', () => {
      expect(schema.properties!.signDate.format).toBe('date');
      expect(schema.properties!.startDate.format).toBe('date');
      expect(schema.properties!.endDate.format).toBe('date');
    });

    it('should have autoRenewal as boolean', () => {
      const autoRenewalType = schema.properties!.autoRenewal.type;
      expect(autoRenewalType).toContain('boolean');
    });
  });

  describe('MILESTONES Schema', () => {
    const schema = TOPIC_JSON_SCHEMAS[ExtractTopic.MILESTONES];

    it('should have milestones array property', () => {
      expect(schema.properties!.milestones.type).toBe('array');
    });

    it('should have correct milestone item structure', () => {
      const itemSchema = schema.properties!.milestones.items as JsonSchema;
      expect(itemSchema.properties!.sequence).toBeDefined();
      expect(itemSchema.properties!.name).toBeDefined();
      expect(itemSchema.properties!.amount).toBeDefined();
      expect(itemSchema.properties!.paymentPercentage).toBeDefined();
    });

    it('should require sequence and name in milestone items', () => {
      const itemSchema = schema.properties!.milestones.items as JsonSchema;
      expect(itemSchema.required).toContain('sequence');
      expect(itemSchema.required).toContain('name');
    });
  });

  describe('RATE_ITEMS Schema', () => {
    const schema = TOPIC_JSON_SCHEMAS[ExtractTopic.RATE_ITEMS];

    it('should have rateItems array property', () => {
      expect(schema.properties!.rateItems.type).toBe('array');
    });

    it('should have correct rate item structure', () => {
      const itemSchema = schema.properties!.rateItems.items as JsonSchema;
      expect(itemSchema.properties!.role).toBeDefined();
      expect(itemSchema.properties!.rateType).toBeDefined();
      expect(itemSchema.properties!.rate).toBeDefined();
    });

    it('should have valid rateType enum', () => {
      const itemSchema = schema.properties!.rateItems.items as JsonSchema;
      expect(itemSchema.properties!.rateType.enum).toContain('HOURLY');
      expect(itemSchema.properties!.rateType.enum).toContain('DAILY');
      expect(itemSchema.properties!.rateType.enum).toContain('MONTHLY');
    });
  });

  describe('LINE_ITEMS Schema', () => {
    const schema = TOPIC_JSON_SCHEMAS[ExtractTopic.LINE_ITEMS];

    it('should have lineItems array property', () => {
      expect(schema.properties!.lineItems.type).toBe('array');
    });

    it('should have correct line item structure', () => {
      const itemSchema = schema.properties!.lineItems.items as JsonSchema;
      expect(itemSchema.properties!.productName).toBeDefined();
      expect(itemSchema.properties!.quantity).toBeDefined();
      expect(itemSchema.properties!.unitPriceWithTax).toBeDefined();
    });

    it('should require productName and quantity', () => {
      const itemSchema = schema.properties!.lineItems.items as JsonSchema;
      expect(itemSchema.required).toContain('productName');
      expect(itemSchema.required).toContain('quantity');
    });
  });

  describe('RISK_CLAUSES Schema', () => {
    const schema = TOPIC_JSON_SCHEMAS[ExtractTopic.RISK_CLAUSES];

    it('should have correct properties', () => {
      expect(schema.properties!.penaltyClause).toBeDefined();
      expect(schema.properties!.confidentialityClause).toBeDefined();
      expect(schema.properties!.ipClause).toBeDefined();
      expect(schema.properties!.terminationClause).toBeDefined();
      expect(schema.properties!.disputeResolution).toBeDefined();
    });
  });

  describe('DELIVERABLES Schema', () => {
    const schema = TOPIC_JSON_SCHEMAS[ExtractTopic.DELIVERABLES];

    it('should have deliverables array property', () => {
      expect(schema.properties!.deliverables.type).toBe('array');
    });

    it('should have string items in deliverables array', () => {
      expect(schema.properties!.deliverables.items!.type).toBe('string');
    });
  });

  describe('getTopicSchema', () => {
    it('should return schema for valid topic name', () => {
      const schema = getTopicSchema('BASIC_INFO');
      expect(schema).toBeDefined();
      expect(schema?.type).toBe('object');
    });

    it('should return undefined for invalid topic name', () => {
      const schema = getTopicSchema('INVALID_TOPIC');
      expect(schema).toBeUndefined();
    });

    it('should return schema for all ExtractTopic values', () => {
      Object.values(ExtractTopic).forEach((topic) => {
        const schema = getTopicSchema(topic);
        expect(schema).toBeDefined();
      });
    });
  });

  describe('hasTopicSchema', () => {
    it('should return true for valid topics', () => {
      expect(hasTopicSchema('BASIC_INFO')).toBe(true);
      expect(hasTopicSchema('FINANCIAL')).toBe(true);
      expect(hasTopicSchema('MILESTONES')).toBe(true);
    });

    it('should return false for invalid topics', () => {
      expect(hasTopicSchema('INVALID')).toBe(false);
      expect(hasTopicSchema('')).toBe(false);
    });
  });

  describe('getAllTopicsWithSchemas', () => {
    it('should return all 8 topics', () => {
      const topics = getAllTopicsWithSchemas();
      expect(topics).toHaveLength(8);
    });

    it('should include all ExtractTopic values', () => {
      const topics = getAllTopicsWithSchemas();
      Object.values(ExtractTopic).forEach((topic) => {
        expect(topics).toContain(topic);
      });
    });
  });
});
