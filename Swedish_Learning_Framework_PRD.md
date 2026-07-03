# 多语言词句记忆网站 PRD
# Multi-language Word and Sentence Memory PRD

## 1. 产品定位 / Product Positioning

本产品从“单一语言语法学习站”调整为“多语言词句记忆工具”。核心场景是：用户在 Obsidian 中阅读并记录不熟悉的单词或句子，将这些内容导入网页，网页通过 Anki 风格的记忆曲线进行重复复习。

The product is a multi-language word and sentence memory tool. The core workflow is: read in Obsidian, capture unfamiliar words or sentences, import them into the website, and review them with Anki-style spaced repetition.

## 2. 核心原则 / Product Principles

| 中文 | English |
|---|---|
| 不再以语法课程为中心 | Not grammar-course centered |
| 以阅读中遇到的词句为核心输入 | Reading-derived words and sentences are the primary input |
| 单词卡和句子卡都必须支持解释文本 | Word and sentence cards must support explanation text |
| 复习算法参考 Anki 的间隔复习思路 | SRS should follow Anki-like review behavior |
| 数据结构不绑定某一门语言 | Data model must not be tied to one language |
| 保留 Obsidian 导入和 Anki 导出的后路 | Preserve future paths for Obsidian import and Anki export |
| 大型外部词库必须先转成标准导入包 | Large external decks must be normalized before import |
| 同步必须手动确认 | Synchronization must be manually confirmed |
| 展示 Markdown，但保存原文 | Render Markdown while preserving raw source text |

## 3. 目标用户 / Target Users

1. 使用 Obsidian 阅读外语内容，并记录不熟悉词句的学习者。
2. 同时学习多门语言，希望统一管理复习卡片的人。
3. 需要 Anki 风格复习体验，但希望先在网页中快速管理阅读摘录的人。

## 4. 核心流程 / Core Workflow

1. 用户在 Obsidian 阅读文章、书籍或网页摘录。
2. 用户记录不熟悉单词或句子。
3. 用户将 Obsidian Markdown 粘贴或上传到网页。
4. 网页解析词句、释义、解释、例句、语言、标签。
5. 系统与已有条目去重。
6. 新条目生成卡片；已有条目刷新到最新复习队列。
7. 用户按 Again / Hard / Good / Easy 复习。
8. 用户在网页修改卡片后，该卡进入卡盒顶部修改栈。
9. 用户手动导出自上次检查点后动过的卡片 Markdown，写回 Obsidian。
10. 用户也可以手动接受 Obsidian 当前卡片内容并更新网页。
11. 后续可将全部内容导出为 Anki 兼容字段。

## 5. 功能范围 / Functional Scope

### 5.1 控制台 / Dashboard

显示：

1. 今天需要复习的任务数量。
2. 明天需要完成的任务数量。
3. 今日新增学习条目数量。
4. 词句条目总数。
5. 直接进入复习、添加学习、导入 Obsidian 的入口。
6. 按 7 日 / 14 日 / 30 日 / 几个月查看双折线趋势图。

趋势图：

1. 第一条线展示每日复习量。
2. 第二条线展示每日学习量。
3. 时间范围默认 14 日，可切换。
4. 首页只保留任务相关信息，删除解释性流程文案。

### 5.2 复习 / Review

卡片类型：

1. 单词卡 / Word card
2. 句子卡 / Sentence card

卡片背面字段：

1. 中文释义 / MeaningZH
2. 英文释义 / MeaningEN
3. 解释文本 / Explanation
4. 例句 / Example
5. 例句翻译 / Example translation
6. 标签 / Tags

复习页 UI：

1. 主卡片与队列分区不能重叠。
2. 长句卡片必须自动换行。
3. 窄屏下主卡片和队列上下排列。
4. 每张卡片右上角提供锤子编辑按钮。

评分：

| Rating | 中文 | 行为 |
|---|---|---|
| Again | 忘了 | 降低 ease，进入 learning/latest |
| Hard | 困难 | 小幅增加间隔 |
| Good | 记得 | 按 ease 增加间隔 |
| Easy | 很熟 | 更大幅增加间隔，提高 ease |

### 5.3 词句库 / Library

支持：

1. 按语言筛选。
2. 按类型筛选：word / sentence。
3. 按来源筛选：manual / obsidian_import / standard_import / rivstart_a1a2_anki / rivstart_b1b2_anki / demo。
4. 搜索正面、释义、解释、例句、标签。
5. 将任意条目加入最新复习。
6. 暂停或恢复卡片。
7. 通过锤子按钮编辑卡片正面、背面、解释、例句、标签、语言和类型。
8. 卡片展示支持 Markdown/WikiLink 渲染。

### 5.4 手动添加 / Capture

字段：

1. 类型：word / sentence
2. 语言：sv / de / en / ja / fr / custom
3. 正面：词或句子
4. 中文释义
5. 英文释义
6. 解释文本
7. 例句
8. 例句翻译
9. 标签

保存后自动生成卡片并加入最新复习队列。

### 5.5 Obsidian 导入 / Obsidian Import

Obsidian 模板可能变化，因此导入器不应只依赖固定模板。

MVP 支持：

1. 粘贴 Markdown 文本。
2. 上传 `.md` 文件。
3. 识别 `Language: xx`。
4. 识别 `### Noun / Verb / Adj. / Adv. / Sentences` 等分组。
5. 识别 `#### [[word]]` 或 `#### [[sentence]]`。
6. 识别 Markdown 列表项。
7. 忽略代码块。
8. 从行内提取 English、中文、例句、解释。
9. 通过 Obsidian 文件夹或路径推断语言。
10. 如果路径无法推断语言，使用网页手动选择的默认语言。

语言推断规则：

| 文件夹或路径包含 | 语言 |
|---|---|
| German / Deutsch / 德语 | de |
| Swedish / Svenska / 瑞典语 | sv |
| English / 英语 | en |
| Japanese / 日本語 / 日语 | ja |
| French / Français / 法语 | fr |

默认模板示例：

````markdown
# Reading Notes

Language: sv

### Noun
#### [[fönster]]
ett fönster
window
窗户
例句: Jag öppnar fönstret.
解释: 中性名词；定形是 fönstret。

### Sentences
#### [[Jag har läst texten.]]
I have read the text.
我已经读了这篇文章。
解释: 句子卡，用来记忆完整表达。
````

### 5.6 标准导入包 / Standard Import Package

外部词库、Anki 包、出版社附加材料或批量整理文件，不应直接写入浏览器 `localStorage`。必须先转换为标准导入包，由导入器按规则校验、去重、合并和创建复习卡。

Canonical format:

1. `manifest.json`：描述批次、文件列表、记录数量、来源和导入要求。
2. `*.memory-items.jsonl`：UTF-8 JSON Lines；一行一个 `memory_item`。
3. `memory-import-v1.schema.json`：单条记录的 JSON Schema。

#### 5.6.1 记录要求 / Record Requirements

每条记录必须包含：

| Field | Required | 说明 |
|---|---:|---|
| `schema_version` | yes | 固定为 `memory-import/v1` |
| `record_type` | yes | 固定为 `memory_item` |
| `import_id` | yes | 批次内唯一 ID，例如 `rivstart-a1-a2:1655279303310` |
| `identity.language` | yes | ISO-like language code，例如 `sv` |
| `identity.entry_type` | yes | `word` / `phrase` / `sentence` |
| `identity.target_item_type` | yes | 映射到站内 `word` / `sentence` |
| `identity.front_normalized` | yes | 标准化后的正面文本 |
| `identity.dedupe_key` | yes | 去重键，默认 `language|target_item_type|front_normalized` |
| `identity.source_occurrence_key` | yes | 来源出处键，用于保留跨书/章节重复出现 |
| `content.front` | yes | 记忆卡正面 |
| `content.meaning_zh` | yes | 中文释义，可为空字符串 |
| `content.meaning_en` | yes | 英文释义，可为空字符串 |
| `content.explanation` | yes | 词形、词性、用法、来源位置等解释 |
| `content.examples` | yes | 例句数组，可为空 |
| `linguistic` | yes | 词性、名词性、词形、语义分类等结构化语言信息 |
| `source` | yes | provider、package、chapter、page、原始 note id 等 |
| `tags` | yes | 可筛选标签 |
| `import_policy` | yes | 重复处理、是否建卡、初始队列 |
| `quality` | yes | 是否需人工复核、警告列表 |

#### 5.6.2 导入器行为 / Importer Behavior

导入器必须：

1. 校验 `schema_version`，不接受未知版本。
2. 逐行读取 JSONL，避免大词库一次性写入浏览器状态。
3. 使用 `identity.dedupe_key` 判断是否为同一记忆条目。
4. 使用 `identity.source_occurrence_key` 保存来源出处；同一词在多个章节出现时应追加来源，而不是丢弃。
5. 遇到重复项时默认执行 `merge_source_ref_and_fill_empty_fields`。
6. 不覆盖用户已有非空字段，尤其是中文释义、个人解释、例句和复习进度。
7. 只有在不存在对应卡片且 `import_policy.create_review_card === true` 时才创建复习卡。
8. 单次导入 UI 必须有批量上限或分批确认，避免 `localStorage` 超限。

#### 5.6.3 Rivstart A1-B2 转换结果 / Rivstart A1-B2 Conversion

本地 Rivstart Anki 包已转换为标准导入包，保存于：

- `Rivstart Resources/import-ready/manifest.json`
- `Rivstart Resources/import-ready/rivstart-a1-a2.memory-items.jsonl`
- `Rivstart Resources/import-ready/rivstart-b1-b2.memory-items.jsonl`
- `Rivstart Resources/import-ready/memory-import-v1.schema.json`

当前记录数：

| Source | Records |
|---|---:|
| Rivstart A1/A2 Anki package | 2140 |
| Rivstart B1/B2 Anki package | 4893 |
| Total | 7033 |

### 5.7 Anki 导出预留 / Anki Export Path

当前 MVP 不直接生成 `.apkg`，但必须保持 Anki 兼容字段：

| Field | 说明 |
|---|---|
| Deck | 例如 `Swedish::Reading` |
| NoteType | `Vocabulary` 或 `Sentence` |
| Front | 词或句子 |
| MeaningZH | 中文释义 |
| MeaningEN | 英文释义 |
| Explanation | 解释文本 |
| Example | 例句与翻译 |
| Tags | 标签 |

MVP 支持 TSV / CSV 复制导出。后续可以扩展：

1. 下载 TSV / CSV 文件。
2. AnkiConnect 推送。
3. 生成 APKG。
4. 双向同步复习历史。

### 5.8 Obsidian 双向同步 / Manual Two-way Sync

同步必须手动处理，避免网页和 Obsidian 自动互相覆盖。

网页提供：

1. 网页到 Obsidian：导出自上次检查点之后动过的卡片 Markdown。
2. Obsidian 到网页：粘贴 Obsidian 当前卡片 Markdown，预览后手动接受。
3. 同步检查点：用户确认已备份后，记录当前日志位置。
4. 同步日志：记录每次新增、编辑、导入、接受 Obsidian 的变更。
5. 卡盒顶部修改栈：每次修改卡片内容后，该卡进入顶部；该顺序与 SRS 复习日期分离。

### 5.9 Markdown 展示 / Markdown Rendering

网页卡片展示层支持轻量 Markdown 渲染：

1. `[[双链]]` 显示为加粗高亮文本。
2. `[[target|alias]]` 显示 alias。
3. `[text](url)` 显示 text 并高亮。
4. `**bold**`、`*italic*`、`` `code` `` 做基础渲染。
5. 原始字段不删除 Markdown 标记，保存回 Obsidian 时仍使用原文。

## 6. 数据模型 / Data Model

### 6.1 MemoryItem

```ts
type MemoryItem = {
  id: string
  type: "word" | "sentence"
  language: string
  front: string
  meaning_zh: string
  meaning_en: string
  explanation: string
  sentence: string
  sentence_translation: string
  tags: string[]
  source: "manual" | "obsidian_import" | "standard_import" | "rivstart_a1a2_anki" | "rivstart_b1b2_anki" | "demo"
  source_refs: SourceRef[]
  normalized_key: string
  anki_note_fields: AnkiNoteFields
  created_at: string
  updated_at: string
  last_seen_at: string
}
```

### 6.1.1 SourceRef

```ts
type SourceRef = {
  id: string
  type: "obsidian_markdown" | "anki_apkg" | "manual"
  source_name?: string
  folder?: string
  imported_at: string
  raw_text?: string
}
```

### 6.2 ReviewCard

```ts
type ReviewCard = {
  id: string
  item_id: string
  card_type: "word_recall" | "sentence_recall"
  front: string
  back: string
  due_at: string
  interval_days: number
  ease_factor: number
  repetitions: number
  lapses: number
  review_lane: "latest" | "learning" | "standard"
  suspended: boolean
}
```

### 6.3 ReviewLog

```ts
type ReviewLog = {
  id: string
  card_id: string
  item_id: string
  reviewed_at: string
  rating: "again" | "hard" | "good" | "easy"
  previous_interval: number
  next_interval: number
  previous_ease: number
  next_ease: number
}
```

### 6.4 SyncLog

```ts
type SyncLog = {
  id: string
  item_id: string
  action: "create" | "edit" | "upsert_existing" | "accept_obsidian" | "accept_obsidian_new"
  detail: string
  at: string
}
```

### 6.5 SyncCheckpoint

```ts
type SyncCheckpoint = {
  logIndex: number
  at: string
}
```

## 7. MVP 范围 / MVP Scope

必须有：

1. 多语言词句库。
2. 单词卡和句子卡。
3. Anki 风格 SRS。
4. 解释文本字段。
5. Obsidian Markdown 粘贴/上传导入。
6. 去重合并并刷新 latest 复习队列。
7. 大型外部词库必须先转换为标准导入包。
8. TSV / CSV 导出预留 Anki。
9. localStorage 本地保存。
9. 首页任务指标和复习/学习双折线图。
10. 卡片搜索。
11. 锤子编辑卡片。
12. 按 Obsidian 文件夹推断语言。
13. 手动双向同步页。
14. 同步日志和卡盒顶部修改栈。
15. Markdown/WikiLink 展示渲染，保存原文。

暂不做：

1. APKG 生成。
2. AnkiConnect 直连。
3. Obsidian 插件。
4. 云同步。
5. 自动翻译或 AI 解释生成。
