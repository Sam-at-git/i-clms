import { JsonTolerantParser, ValidationSchema, ValidationResult } from './json-tolerant-parser.util';

describe('JsonTolerantParser', () => {
  describe('parse', () => {
    it('should parse valid JSON', () => {
      const input = '{"name": "test", "value": 123}';
      const result = JsonTolerantParser.parse(input);
      expect(result).toEqual({ name: 'test', value: 123 });
      // value 应该是 number 类型，因为 JSON.parse 会这样解析
      expect(typeof result.value).toBe('number');
    });

    it('should extract JSON from markdown code block', () => {
      const input = '```json\n{"name": "test"}\n```';
      const result = JsonTolerantParser.parse(input);
      expect(result).toEqual({ name: 'test' });
    });

    it('should extract JSON from code block without language identifier', () => {
      const input = '```\n{"name": "test"}\n```';
      const result = JsonTolerantParser.parse(input);
      expect(result).toEqual({ name: 'test' });
    });

    it('should extract JSON from <json> tags', () => {
      const input = '<json>{"name": "test"}</json>';
      const result = JsonTolerantParser.parse(input);
      expect(result).toEqual({ name: 'test' });
    });

    it('should extract JSON surrounded by other text', () => {
      const input = 'Some text before {"name": "test"} and after';
      const result = JsonTolerantParser.parse(input);
      expect(result).toEqual({ name: 'test' });
    });

    describe('field name normalization', () => {
      it('should normalize customer_name to customerName', () => {
        const input = '{"customer_name": "XX公司"}';
        const result = JsonTolerantParser.parse(input, ['customerName']);
        expect(result).toEqual({ customerName: 'XX公司' });
      });

      it('should normalize our_entity to ourEntity', () => {
        const input = '{"our_entity": "YY公司"}';
        const result = JsonTolerantParser.parse(input, ['ourEntity']);
        expect(result).toEqual({ ourEntity: 'YY公司' });
      });

      it('should normalize contract_no to contractNo', () => {
        const input = '{"contract_no": "HT-001"}';
        const result = JsonTolerantParser.parse(input, ['contractNo']);
        expect(result).toEqual({ contractNo: 'HT-001' });
      });

      it('should normalize amount_with_tax to amountWithTax', () => {
        const input = '{"amount_with_tax": "100000"}';
        const result = JsonTolerantParser.parse(input, ['amountWithTax']);
        expect(result).toEqual({ amountWithTax: '100000' });
      });

      it('should normalize payment_terms to paymentTerms', () => {
        const input = '{"payment_terms": "30天"}';
        const result = JsonTolerantParser.parse(input, ['paymentTerms']);
        expect(result).toEqual({ paymentTerms: '30天' });
      });

      it('should handle multiple field normalizations', () => {
        const input = '{"customer_name": "XX公司", "contract_no": "HT-001", "our_entity": "YY公司"}';
        const result = JsonTolerantParser.parse(input, ['customerName', 'contractNo', 'ourEntity']);
        expect(result).toEqual({
          customerName: 'XX公司',
          contractNo: 'HT-001',
          ourEntity: 'YY公司',
        });
      });
    });

    describe('quote handling', () => {
      it('should fix Chinese double quotes', () => {
        const input = '{"name": "test"}';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({ name: 'test' });
      });

      it('should fix Chinese single quotes', () => {
        const input = "{'name': 'test'}";
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({ name: 'test' });
      });

      it('should convert single quotes to double quotes', () => {
        const input = '{"name": \'test\'}';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({ name: 'test' });
      });
    });

    describe('missing quotes handling', () => {
      it('should fix missing quotes on object keys', () => {
        const input = '{name: "test"}';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({ name: 'test' });
      });

      it('should fix missing quotes on string values', () => {
        const input = '{"name": test}';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({ name: 'test' });
      });

      it('should handle mixed quoted and unquoted keys', () => {
        const input = '{"name": "test", age: 30}';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({ name: 'test', age: '30' });  // 值会被加引号，所以是字符串
      });
    });

    describe('trailing comma handling', () => {
      it('should remove trailing comma in object', () => {
        const input = '{"name": "test",}';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({ name: 'test' });
      });

      it('should remove trailing comma in array', () => {
        const input = '{"items": [1, 2, 3,]}';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({ items: [1, 2, 3] });
      });

      it('should remove multiple trailing commas', () => {
        const input = '{"name": "test",,,}';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({ name: 'test' });
      });
    });

    describe('special values handling', () => {
      it('should convert NaN to null', () => {
        const input = '{"value": NaN}';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({ value: null });
      });

      it('should convert Infinity to null', () => {
        const input = '{"value": Infinity}';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({ value: null });
      });

      it('should convert -Infinity to null', () => {
        const input = '{"value": -Infinity}';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({ value: null });
      });

      it('should convert undefined to null', () => {
        const input = '{"value": undefined}';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({ value: null });
      });

      it('should normalize True to true', () => {
        const input = '{"flag": True}';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({ flag: true });
      });

      it('should normalize False to false', () => {
        const input = '{"flag": False}';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({ flag: false });
      });

      it('should normalize Null to null', () => {
        const input = '{"value": Null}';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({ value: null });
      });
    });

    describe('comment removal', () => {
      it('should remove single-line comments', () => {
        const input = '{"name": "test"} // comment';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({ name: 'test' });
      });

      it('should remove multi-line comments', () => {
        const input = '{"name": "test" /* comment */}';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({ name: 'test' });
      });

      it('should remove multiple comments', () => {
        const input = '{"name": "test"} // comment1\n /* comment2 */';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({ name: 'test' });
      });
    });

    describe('complex scenarios', () => {
      it('should handle LLM response with markdown code block and Chinese quotes', () => {
        const input = '```json\n{"customerName": "北京XX科技有限公司", "contractNo": "HT-2024-001"}\n```';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({
          customerName: '北京XX科技有限公司',
          contractNo: 'HT-2024-001',
        });
      });

      it('should handle response with field name variants', () => {
        const input = '{"customer_name": "XX公司", "amount_with_tax": "100000"}';
        const result = JsonTolerantParser.parse(input, ['customerName', 'amountWithTax']);
        expect(result).toEqual({
          customerName: 'XX公司',
          amountWithTax: '100000',
        });
      });

      it('should handle response with missing quotes and trailing commas', () => {
        const input = '{name: "test", age: 30,}';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({ name: 'test', age: 30 });
      });

      it('should handle nested objects', () => {
        const input = '{"user": {"name": "test", "age": 30}}';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({
          user: { name: 'test', age: 30 },
        });
      });

      it('should handle arrays', () => {
        const input = '{"items": [1, 2, 3]}';
        const result = JsonTolerantParser.parse(input);
        expect(result).toEqual({ items: [1, 2, 3] });
      });
    });

    describe('error handling', () => {
      it('should throw error for empty string', () => {
        expect(() => JsonTolerantParser.parse('')).toThrow();
      });

      it('should throw error for null input', () => {
        expect(() => JsonTolerantParser.parse(null as any)).toThrow();
      });

      it('should throw error for completely invalid input', () => {
        expect(() => JsonTolerantParser.parse('not json at all')).toThrow();
      });

      it('should provide meaningful error message', () => {
        try {
          JsonTolerantParser.parse('definitely not json');
          fail('Should have thrown an error');
        } catch (error) {
          expect((error as Error).message).toContain('Failed to parse JSON');
        }
      });
    });
  });

  describe('safeParse', () => {
    it('should return parsed result for valid JSON', () => {
      const input = '{"name": "test"}';
      const result = JsonTolerantParser.safeParse(input, { default: true });
      expect(result).toEqual({ name: 'test' });
    });

    it('should return default value for invalid JSON', () => {
      const input = 'not json';
      const defaultValue = { error: true };
      const result = JsonTolerantParser.safeParse(input, defaultValue);
      expect(result).toEqual(defaultValue);
    });

    it('should return default value for empty string', () => {
      const defaultValue = { default: true };
      const result = JsonTolerantParser.safeParse('', defaultValue);
      expect(result).toEqual(defaultValue);
    });
  });

  describe('validateAndFix', () => {
    it('should validate valid result against schema', () => {
      const result = { name: 'test', value: 123 };
      const schema: ValidationSchema = {
        required: ['name', 'value'],
      };
      const validation = JsonTolerantParser.validateAndFix(result, schema);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const result = { name: 'test' };
      const schema: ValidationSchema = {
        required: ['name', 'value'],
      };
      const validation = JsonTolerantParser.validateAndFix(result, schema);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing required field: value');
    });

    it('should auto-correct invalid enum values with wrong case', () => {
      const result = { type: 'STAFF_augmentation' };
      const schema: ValidationSchema = {
        enums: {
          type: ['STAFF_AUGMENTATION', 'PROJECT_OUTSOURCING', 'PRODUCT_SALES'],
        },
      };
      const validation = JsonTolerantParser.validateAndFix(result, schema);
      expect(validation.valid).toBe(true);
      expect(validation.result.type).toBe('STAFF_AUGMENTATION');
      expect(validation.warnings).toContain('Auto-corrected type: STAFF_augmentation → STAFF_AUGMENTATION');
    });

    it('should warn about invalid enum values', () => {
      const result = { type: 'INVALID' };
      const schema: ValidationSchema = {
        enums: {
          type: ['STAFF_AUGMENTATION', 'PROJECT_OUTSOURCING'],
        },
      };
      const validation = JsonTolerantParser.validateAndFix(result, schema);
      expect(validation.valid).toBe(true); // No error, just warning
      expect(validation.warnings.length).toBeGreaterThan(0);
    });

    it('should convert non-array to array for array fields', () => {
      const result = { items: 'single-item' };
      const schema: ValidationSchema = {
        arrays: ['items'],
      };
      const validation = JsonTolerantParser.validateAndFix(result, schema);
      expect(validation.valid).toBe(true);
      expect(Array.isArray(validation.result.items)).toBe(true);
      expect(validation.result.items).toEqual(['single-item']);
      expect(validation.warnings).toContain('Field items should be an array, got string. Converting to array.');
    });

    it('should keep valid arrays as is', () => {
      const result = { items: ['a', 'b'] };
      const schema: ValidationSchema = {
        arrays: ['items'],
      };
      const validation = JsonTolerantParser.validateAndFix(result, schema);
      expect(validation.valid).toBe(true);
      expect(validation.result.items).toEqual(['a', 'b']);
    });

    it('should handle null values for optional fields', () => {
      const result = { name: 'test', value: null };
      const schema: ValidationSchema = {
        required: ['name'],
        optional: ['value'],
      };
      const validation = JsonTolerantParser.validateAndFix(result, schema);
      expect(validation.valid).toBe(true);
    });

    it('should detect missing null/undefined required fields', () => {
      const result = { name: 'test', value: null };
      const schema: ValidationSchema = {
        required: ['name', 'value'],
      };
      const validation = JsonTolerantParser.validateAndFix(result, schema);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing required field: value');
    });
  });

  describe('mismatched brackets', () => {
    it('should add missing closing brace', () => {
      const input = '{"name": "test"';
      const result = JsonTolerantParser.parse(input);
      expect(result).toEqual({ name: 'test' });
    });

    it('should add missing closing bracket', () => {
      const input = '{"items": [1, 2, 3';
      const result = JsonTolerantParser.parse(input);
      expect(result.items).toEqual([1, 2, 3]);
    });

    it('should add multiple missing braces', () => {
      const input = '{{"name": "test"';
      const result = JsonTolerantParser.parse(input);
      expect(result.name).toBe('test');
    });
  });
});
