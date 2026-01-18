# 从"客户想法"到"Ralph执行"的完整工程流程

------

## 整体流程图

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: 想法捕获（1-2次会议）                              │
│  输入：客户的模糊想法                                        │
│  输出：IDEA.md                                              │
├─────────────────────────────────────────────────────────────┤
│  Phase 2: 需求挖掘（AI辅助 + 多轮沟通）                      │
│  输入：IDEA.md + 会议记录                                   │
│  输出：PRD.md + 待澄清清单                                  │
├─────────────────────────────────────────────────────────────┤
│  Phase 3: 需求确认（客户签署）                               │
│  输入：PRD.md                                               │
│  输出：PRD-SIGNED.md + 验收标准                             │
├─────────────────────────────────────────────────────────────┤
│  Phase 4: 技术拆解（你 + AI）                                │
│  输入：PRD-SIGNED.md                                        │
│  输出：SPECS/ 目录（多个小规格文档）                         │
├─────────────────────────────────────────────────────────────┤
│  Phase 5: Ralph循环（自动化执行）                            │
│  输入：SPECS/ + PROMPT.md                                   │
│  输出：可工作的代码                                         │
├─────────────────────────────────────────────────────────────┤
│  Phase 6: 验收交付                                          │
│  输入：代码 + 验收标准                                      │
│  输出：客户签收                                             │
└─────────────────────────────────────────────────────────────┘
```

------

## Phase 1: 想法捕获

**目标**：把客户脑子里的模糊想法变成可处理的文本

**你做的事**：

1. 和客户开会，记录（录音/笔记）
2. 引导客户描述：
   - 想解决什么问题？
   - 谁会用这个系统？
   - 现在怎么做的，哪里痛？
   - 有没有参考竞品？

**会后整理**：

```markdown
# IDEA.md

## 客户背景
- 公司：XXX
- 行业：XXX
- 规模：XXX

## 核心痛点
- 痛点1：目前XXX流程效率低
- 痛点2：XXX数据无法追溯

## 初步想法
客户希望有一个系统能够...

## 提到的约束
- 预算范围：XXX
- 上线时间：XXX
- 必须兼容现有XXX系统

## 原话记录
- "我们希望..."
- "最重要的是..."
- "绝对不能..."
```

------

## Phase 2: 需求挖掘（AI辅助）

**目标**：把IDEA.md扩展成结构化的PRD

**Step 2.1: AI生成问题清单**

把IDEA.md喂给AI，Prompt：

```markdown
你是一个资深业务分析师。
基于以下客户想法，生成需要澄清的问题清单。

分类：
1. 业务流程类（现有流程、例外情况）
2. 用户角色类（谁用、权限）
3. 数据类（输入输出、来源）
4. 集成类（对接哪些系统）
5. 非功能类（性能、安全、合规）

对于每个问题，标注：
- 重要程度（高/中/低）
- 如果客户不回答，默认假设是什么

[粘贴IDEA.md]
```

**输出**：QUESTIONS.md

**Step 2.2: 带着问题去沟通**

- 你带着QUESTIONS.md去和客户开会
- 不暴露AI的存在
- 记录客户的回答

**Step 2.3: AI整理会议记录**

会后，把录音/笔记喂给AI：

```markdown
你是一个业务分析师。
基于以下会议记录，更新需求文档。

任务：
1. 提取客户确认的需求点
2. 标记仍然模糊的地方
3. 记录客户提到的新约束
4. 生成下次需要追问的问题

[粘贴会议记录]
[粘贴当前PRD草稿]
```

**Step 2.4: 循环直到收敛**

```
重复 Step 2.1 - 2.3
直到：
  - 待澄清问题 < 5个
  - 且都是低重要度
  - 或客户说"差不多了，可以报价了"
```

**输出**：PRD.md + ASSUMPTIONS.md（未确认的假设）

------

## Phase 3: 需求确认

**目标**：锁定需求基线，获得客户签字

**Step 3.1: AI生成验收标准**

```markdown
你是一个QA专家。
基于以下PRD，为每个功能点生成可测试的验收标准。

格式：
功能点：XXX
验收标准：
  - [ ] 当...时，系统应该...
  - [ ] 当...时，系统应该...
边界情况：
  - [ ] 如果...，则...

[粘贴PRD.md]
```

**Step 3.2: 需求评审会**

- 和客户过PRD + 验收标准
- 现场确认/修改
- 标记哪些是"必须"，哪些是"nice to have"

**Step 3.3: 签署**

```markdown
# PRD-SIGNED.md

[PRD内容]

---
## 签署确认

客户确认以上需求准确反映了项目范围。
未列入的功能不在本期交付范围内。

签字：___________
日期：___________
```

------

## Phase 4: 技术拆解

**目标**：把PRD拆成Ralph能处理的小块

**关键原则**：

> 每个Spec小到能在一个上下文窗口内完成

**Step 4.1: AI辅助拆解**

```markdown
你是一个技术架构师。
基于以下PRD，拆解成独立的技术规格文档。

规则：
1. 每个Spec对应一个独立可交付的功能单元
2. 每个Spec预估代码量 < 500行
3. 标明依赖关系（哪个Spec必须先完成）
4. 每个Spec包含：
   - 功能描述
   - 输入/输出
   - 验收标准（从PRD继承）
   - 技术约束

[粘贴PRD-SIGNED.md]
```

**Step 4.2: 人工审核依赖关系**

```
SPECS/
├── 01-project-setup.md          # 无依赖
├── 02-database-schema.md        # 依赖01
├── 03-user-auth.md              # 依赖01, 02
├── 04-order-create.md           # 依赖02, 03
├── 05-order-list.md             # 依赖04
├── 06-order-export.md           # 依赖05
└── SEQUENCE.md                  # 执行顺序
```

**SEQUENCE.md示例**：

```markdown
# 执行顺序

## Wave 1（可并行）
- 01-project-setup.md

## Wave 2（依赖Wave 1）
- 02-database-schema.md

## Wave 3（依赖Wave 2）
- 03-user-auth.md

## Wave 4（依赖Wave 3）
- 04-order-create.md
- 05-order-list.md  # 可和04并行，都只依赖03

## Wave 5
- 06-order-export.md
```

------

## Phase 5: Ralph循环

**目标**：自动化执行每个Spec

**Step 5.1: 准备PROMPT.md模板**

```markdown
# PROMPT.md

## 你的角色
你是一个高级软件工程师，正在实现一个功能模块。

## 当前任务
实现以下规格：
[SPEC_CONTENT]

## 项目上下文
- 技术栈：[Python/FastAPI/PostgreSQL]
- 代码风格：参考 STYLE.md
- 现有代码结构：参考 STRUCTURE.md

## 工作流程
1. 阅读规格，理解需求
2. 检查现有代码，理解上下文
3. 编写代码实现功能
4. 编写测试覆盖验收标准
5. 运行测试确保通过
6. 运行lint确保代码风格
7. 提交代码（commit message格式：feat: [功能名]）

## 完成条件
当以下全部满足时，输出 <promise>COMPLETE</promise>：
- [ ] 所有验收标准对应的测试通过
- [ ] lint检查通过
- [ ] 代码已提交

## 如果卡住
如果遇到规格不清晰的地方：
1. 记录问题到 QUESTIONS.md
2. 做出合理假设并记录到 ASSUMPTIONS.md
3. 基于假设继续实现
4. 输出 <promise>BLOCKED: [问题描述]</promise>
```

**Step 5.2: 编写执行脚本**

```bash
#!/bin/bash
# ralph-run.sh

SPEC_DIR="./specs"
PROMPT_TEMPLATE="./PROMPT.md"

for spec in $(cat SEQUENCE.md | grep "\.md" | tr -d ' -'); do
    echo "========== 开始处理: $spec =========="
    
    # 生成当前spec的prompt
    sed "s|\[SPEC_CONTENT\]|$(cat $SPEC_DIR/$spec)|g" $PROMPT_TEMPLATE > CURRENT_PROMPT.md
    
    # Ralph循环
    MAX_ITERATIONS=20
    ITERATION=0
    
    while [ $ITERATION -lt $MAX_ITERATIONS ]; do
        echo "--- 迭代 $ITERATION ---"
        
        OUTPUT=$(cat CURRENT_PROMPT.md | claude --dangerously-skip-permissions)
        
        if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
            echo "✅ $spec 完成"
            break
        fi
        
        if echo "$OUTPUT" | grep -q "<promise>BLOCKED"; then
            echo "⚠️ $spec 被阻塞，需要人工介入"
            echo "$OUTPUT" >> BLOCKED.log
            break
        fi
        
        ITERATION=$((ITERATION + 1))
    done
    
    if [ $ITERATION -eq $MAX_ITERATIONS ]; then
        echo "❌ $spec 达到最大迭代次数，需要人工检查"
    fi
done
```

**Step 5.3: 监控和介入**

```
运行过程中你需要监控：
  - BLOCKED.log：需要你去找客户澄清的问题
  - ASSUMPTIONS.md：AI做的假设，需要你判断是否合理
  - git log：查看进度

介入时机：
  - 某个spec迭代超过10次还没完成
  - 出现BLOCKED
  - 测试持续失败
```

------

## Phase 6: 验收交付

**Step 6.1: AI生成验收报告**

```markdown
基于以下信息，生成验收报告：

1. PRD-SIGNED.md（需求基线）
2. 测试覆盖率报告
3. 验收标准完成情况
4. 假设清单（ASSUMPTIONS.md）

格式：
- 功能完成度
- 测试覆盖率
- 已知限制
- 建议的后续优化
```

**Step 6.2: 客户验收会**

- 演示功能
- 对照验收标准逐条确认
- 记录反馈

**Step 6.3: 处理验收反馈**

```
如果客户说"这不是我要的"：
  1. 对照PRD-SIGNED.md
  2. 如果PRD有写 → "我们按签署的需求实现的"
  3. 如果PRD没写 → 记入变更请求，新报价
```

------

## 目录结构总结

```
project/
├── 01-discovery/
│   ├── IDEA.md                 # 客户原始想法
│   ├── QUESTIONS.md            # AI生成的问题清单
│   └── meeting-notes/          # 会议记录
│
├── 02-requirements/
│   ├── PRD.md                  # 需求文档（迭代中）
│   ├── PRD-SIGNED.md           # 签署版本（基线）
│   ├── ASSUMPTIONS.md          # 假设清单
│   └── ACCEPTANCE-CRITERIA.md  # 验收标准
│
├── 03-specs/
│   ├── SEQUENCE.md             # 执行顺序
│   ├── 01-project-setup.md
│   ├── 02-database-schema.md
│   └── ...
│
├── 04-code/
│   ├── src/
│   ├── tests/
│   └── ...
│
├── 05-ralph/
│   ├── PROMPT.md               # Prompt模板
│   ├── STYLE.md                # 代码风格指南
│   ├── STRUCTURE.md            # 项目结构说明
│   ├── ralph-run.sh            # 执行脚本
│   ├── BLOCKED.log             # 阻塞记录
│   └── progress.txt            # 进度记录
│
└── 06-delivery/
    ├── acceptance-report.md    # 验收报告
    └── change-requests/        # 变更请求
```

------

## 关键检查点

| 阶段    | 检查点        | 通过标准             |
| ------- | ------------- | -------------------- |
| Phase 1 | IDEA.md完成   | 客户核心痛点已记录   |
| Phase 2 | PRD.md收敛    | 待澄清问题<5个       |
| Phase 3 | PRD签署       | 客户签字             |
| Phase 4 | Specs拆解完成 | 每个spec<500行代码量 |
| Phase 5 | Ralph执行完成 | 所有spec标记COMPLETE |
| Phase 6 | 验收通过      | 客户签收             |

