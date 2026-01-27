import { MarkdownCleaner } from './markdown-cleaner.util';
import { SemanticChunk } from '../llm-parser/semantic-chunker.service';

describe('MarkdownCleaner', () => {
  describe('clean', () => {
    it('should remove # headers', () => {
      const input = '## 合同当事人\n甲方：XX公司';
      const output = MarkdownCleaner.clean(input);
      expect(output).toBe('合同当事人\n甲方：XX公司');
    });

    it('should remove ### headers', () => {
      const input = '### 第一条 合同条款\n内容详情';
      const output = MarkdownCleaner.clean(input);
      expect(output).toContain('第一条 合同条款');
      expect(output).not.toContain('###');
    });

    it('should remove ** bold markers', () => {
      const input = '**甲方：**XX公司';
      const output = MarkdownCleaner.clean(input);
      expect(output).toBe('甲方：XX公司');
    });

    it('should remove __ bold markers', () => {
      const input = '__乙方：__YY公司';
      const output = MarkdownCleaner.clean(input);
      expect(output).toBe('乙方：YY公司');
    });

    it('should remove * italic markers', () => {
      const input = '*重要条款*内容';
      const output = MarkdownCleaner.clean(input);
      expect(output).toBe('重要条款内容');
    });

    it('should remove inline code markers', () => {
      const input = '`合同编号`HT-001';
      const output = MarkdownCleaner.clean(input);
      expect(output).toBe('合同编号HT-001');
    });

    it('should remove code blocks', () => {
      const input = '```json\n{"name": "test"}\n```';
      const output = MarkdownCleaner.clean(input);
      expect(output).toBe('{"name": "test"}');
      // 确保没有残留的 ``` 标记
      expect(output).not.toContain('```');
    });

    it('should remove link format but keep text', () => {
      const input = '[点击这里](https://example.com)查看详情';
      const output = MarkdownCleaner.clean(input);
      expect(output).toBe('点击这里查看详情');
    });

    it('should remove strikethrough markers', () => {
      const input = '~~已删除~~内容';
      const output = MarkdownCleaner.clean(input);
      expect(output).toBe('已删除内容');
    });

    it('should preserve label text', () => {
      const input = '## 第一条 合同当事人\n**甲方：** 北京XX科技有限公司';
      const output = MarkdownCleaner.clean(input);
      expect(output).toContain('甲方：');
      expect(output).toContain('北京XX科技有限公司');
    });

    it('should handle complex markdown document', () => {
      const input = `## 人力资源外包框架协议

**合同编号：** CTR-2024-001
**签订日期：** 2024-03-15

### 甲方（用工方）
**公司名称：** 北京XX科技有限公司
**地址：** 北京市朝阳区XX路XX号

### 乙方（服务方）
**公司名称：** 上海YY技术服务有限公司

\`\`\`json
{"status": "active"}
\`\`\`

[点击下载附件](./attachment.pdf)`;
      const output = MarkdownCleaner.clean(input);
      expect(output).not.toContain('#');
      expect(output).not.toContain('**');
      expect(output).not.toContain('```');
      expect(output).toContain('人力资源外包框架协议');
      // 加粗删除后冒号可能被保留，也可能被替换
      expect(output).toContain('合同编号：');
      expect(output).toContain('CTR-2024-001');
      expect(output).toContain('甲方（用工方）');
      expect(output).toContain('公司名称：');
      expect(output).toContain('北京XX科技有限公司');
      expect(output).toContain('点击下载附件');
    });

    it('should compress multiple empty lines', () => {
      const input = 'Line1\n\n\n\n\nLine2';
      const output = MarkdownCleaner.clean(input);
      expect(output).toBe('Line1\n\nLine2');
    });

    it('should trim leading/trailing whitespace from lines', () => {
      const input = '  Line1  \n  Line2  ';
      const output = MarkdownCleaner.clean(input);
      expect(output).toBe('Line1\nLine2');
    });

    it('should handle empty string', () => {
      const output = MarkdownCleaner.clean('');
      expect(output).toBe('');
    });

    it('should handle null input', () => {
      const output = MarkdownCleaner.clean(null as any);
      expect(output).toBe('');
    });
  });

  describe('cleanForContract', () => {
    it('should clean markdown table format', () => {
      const input = `| 角色 | 级别 | 费率 |
|-----|-----|------|
| 高级工程师 | P5 | 800元/小时 |
| 中级工程师 | P3 | 500元/小时 |`;

      const output = MarkdownCleaner.cleanForContract(input);
      expect(output).toContain('角色');
      expect(output).toContain('级别');
      expect(output).toContain('费率');
      expect(output).toContain('高级工程师');
      expect(output).not.toContain('|-----|');
    });

    it('should preserve important labels', () => {
      const input = '甲方 XX公司\n乙方 YY公司\n合同编号 HT-001';
      const output = MarkdownCleaner.cleanForContract(input);
      expect(output).toContain('甲方：');
      expect(output).toContain('乙方：');
    });
  });

  describe('cleanWithHeaderLevel', () => {
    it('should preserve header level information', () => {
      const input = `# 一级标题
## 二级标题
### 三级标题`;

      const output = MarkdownCleaner.cleanWithHeaderLevel(input);
      expect(output).toContain('[一级标题]');
      expect(output).toContain('[二级标题]');
      expect(output).toContain('[三级标题]');
    });
  });

  describe('extractPlainText', () => {
    it('should return continuous plain text', () => {
      const input = `# 标题
段落1
段落2`;
      const output = MarkdownCleaner.extractPlainText(input);
      expect(output).not.toContain('\n');
      expect(output).toContain('标题 段落1 段落2');  // 空格分隔
    });
  });

  describe('cleanWithContext', () => {
    it('should add context header to chunk', () => {
      const chunk: SemanticChunk = {
        id: 'chunk-0',
        text: '甲方：XX公司',
        metadata: {
          type: 'header',
          title: '合同当事人',
          priority: 100,
          fieldRelevance: ['customerName'],
        },
        position: { start: 0, end: 10 },
      };

      const output = MarkdownCleaner.cleanWithContext(chunk, '完整合同文本', '测试合同');
      expect(output).toContain('【合同名称：《测试合同》');
      expect(output).toContain('当前章节：合同当事人');
      expect(output).toContain('位置：');
      expect(output).toContain('类型：');
      expect(output).toContain('甲方：XX公司');
    });

    it('should handle chunk without title', () => {
      const chunk: SemanticChunk = {
        id: 'chunk-0',
        text: '甲方：XX公司',
        metadata: {
          type: 'header',
          priority: 100,
          fieldRelevance: ['customerName'],
        },
        position: { start: 0, end: 10 },
      };

      const output = MarkdownCleaner.cleanWithContext(chunk, '完整合同文本');
      expect(output).toContain('【');
      expect(output).toContain('甲方：XX公司');
    });

    it('should detect start position', () => {
      const chunk: SemanticChunk = {
        id: 'chunk-0',
        text: '甲方：XX公司',
        metadata: {
          type: 'header',
          priority: 100,
          fieldRelevance: [],
        },
        position: { start: 0, end: 10 },
      };
      const longText = 'a'.repeat(10000);

      const output = MarkdownCleaner.cleanWithContext(chunk, longText);
      expect(output).toContain('文档开始部分');
    });

    it('should detect end position', () => {
      const chunk: SemanticChunk = {
        id: 'chunk-0',
        text: '甲方：XX公司',
        metadata: {
          type: 'header',
          priority: 100,
          fieldRelevance: [],
        },
        position: { start: 9000, end: 9010 },
      };
      const longText = 'a'.repeat(10000);

      const output = MarkdownCleaner.cleanWithContext(chunk, longText);
      expect(output).toContain('文档结尾部分');
    });

    it('should get correct type label', () => {
      const chunk: SemanticChunk = {
        id: 'chunk-0',
        text: '甲方：XX公司',
        metadata: {
          type: 'financial',
          priority: 90,
          fieldRelevance: [],
        },
        position: { start: 0, end: 10 },
      };

      const output = MarkdownCleaner.cleanWithContext(chunk, '完整合同文本');
      expect(output).toContain('类型：财务条款');
    });
  });
});
