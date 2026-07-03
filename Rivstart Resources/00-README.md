# Rivstart 词库与书籍资源索引

整理日期：2026-06-30

## 使用边界

Rivstart 是 Natur & Kultur 出版的受版权保护教材。本目录只保存公开网页入口、官方附加材料链接、合法电子/购买信息和检索备注；不保存、下载或传播未授权教材 PDF。

官方系列页说明：Rivstart 包含 Textbok、Ovningsbok 和网页版教师用书，另有 digitalt extramaterial；该附加材料包括自测练习、音频和答案。官方 FAQ 还说明，第三版 textbok/ovningsbok 有简单数字版本，无音频，单用户 12 个月许可。

## 学习顺序

1. [A1/A2](./01-A1-A2.md)
2. [B1/B2](./02-B1-B2.md)
3. [B2/C1](./03-B2-C1.md)

## 官方入口

- Rivstart 系列页：https://www.nok.se/laromedel/serier/Rivstart/
- NOK Digitalt extramaterial：https://www.nok.se/extramaterial/
- NOKportalen：https://nokportalen.se/

## 本地 Anki 词库处理

已把本机下载的 Anki 包处理成网页可加载的数据文件：

- 数据源：`/Users/yuxuancao/Downloads/Rivstart_A1A2_Swedish__English_w_enett_word_type__more.apkg`
- 数据源：`/Users/yuxuancao/Downloads/Rivstart_B1B2_ordlista.apkg`
- 数据源：`/Users/yuxuancao/Downloads/Rivstart_B2C1_ordkort.apkg`
- 生成文件：`Rivstart Resources/rivstart-vocabulary.json`
- 页面加载文件：`Rivstart Resources/rivstart-vocabulary.js`
- 标准导入包：`Rivstart Resources/import-ready/`
- 重新生成脚本：`work/extract_rivstart_anki.py`

当前词条由 A1/A2、B1/B2、B2/C1 三个本地 Anki 包生成。网页的 Sverige 面板会按级别、章节和关键词筛选，并限制单次导入 800 条，避免浏览器本地存储超限。

## GPT 批量补全例句

可用脚本：`work/enrich_rivstart_vocabulary.mjs`

它会读取 `Rivstart Resources/rivstart-vocabulary.json`，把每批词条提交给 OpenAI，让模型补全：

- `meaning_zh`：中文释义
- `sentence`：原创瑞典语例句
- `sentence_translation`：例句中文翻译
- `example_explanation_zh`：例句用法说明/语法点说明/固定搭配说明

脚本默认只处理没有例句的单词项，不处理原本就是句子的条目；结果先追加到 `work/rivstart-vocabulary-enrichments.jsonl`，再合并生成：

- `Rivstart Resources/rivstart-vocabulary.enriched.json`
- `Rivstart Resources/rivstart-vocabulary.enriched.js`

先做 dry run 检查批次内容，不调用 API：

```bash
node work/enrich_rivstart_vocabulary.mjs --dry-run --limit 5 --level A1/A2 --chapter 1
```

小批量试跑：

```bash
OPENAI_API_KEY=... node work/enrich_rivstart_vocabulary.mjs --limit 20 --batch-size 10 --level A1/A2 --chapter 1
```

如果没有 OpenAI API key，只使用 Codex/GPT 应用端，可以改用人工批处理模式。先生成下一批 prompt：

```bash
node work/enrich_rivstart_vocabulary.mjs --manual-prompt --level A1/A2 --batch-size 20
```

脚本会写出 `work/rivstart-next-batch-prompt.md`。把该文件内容交给应用端 GPT，要求它只返回 JSON；再把返回内容保存为例如 `work/rivstart-response.json`，导入缓存并合并：

```bash
node work/enrich_rivstart_vocabulary.mjs --import-response work/rivstart-response.json --level A1/A2
```

重复“生成 prompt -> GPT 返回 JSON -> 导入”的循环，直到 A1/A2 处理完。缓存文件 `work/rivstart-vocabulary-enrichments.jsonl` 会避免重复处理。

也可以使用无 API 本地基线补全，直接把缺失字段填满。该模式会优先生成简单 A1/A2 句子；不确定的词条会使用元语言例句并在 `quality_note` 标记，适合先完成覆盖率，再逐步精修：

```bash
node work/enrich_rivstart_vocabulary.mjs --local-fill --limit all --level A1/A2
```

B1/B2 同样可用本地基线补全：

```bash
node work/enrich_rivstart_vocabulary.mjs --local-fill --limit all --level B1/B2
```

B2/C1 也使用同一流程补全：

```bash
node work/enrich_rivstart_vocabulary.mjs --local-fill --limit all --level B2/C1
```

## Sverige 三本网页单词书

网页现在加载 `Sverige Resources/sverige-vocabulary.js`，对应三本单词书：

- `Sverige A1/A2`：来自本地 Rivstart A1/A2 Anki 词库，已补全中文释义、例句、例句翻译和例句说明。
- `Sverige B1/B2`：来自本地 Rivstart B1/B2 Anki 词库，已补全中文释义、例句、例句翻译和例句说明。
- `Sverige B2/C1`：来自本地 `Rivstart_B2C1_ordkort.apkg` 官方词卡包，已补全中文释义、例句、例句翻译和例句说明。

重新生成三本书数据：

```bash
node work/build_sverige_vocabulary.mjs
```

确认质量后全量运行：

```bash
OPENAI_API_KEY=... node work/enrich_rivstart_vocabulary.mjs --limit all --batch-size 20
```

常用参数：

- `--level A1/A2` 或 `--level B1/B2`：只处理某一级别。
- `--chapter 1`：只处理某一章。
- `--limit 100`：限制本次最多处理的词条数；全量用 `--limit all`。
- `--batch-size 20`：每次发给模型的词条数，建议 10 到 30。
- `--model gpt-4.1-mini`：指定模型。
- `--overwrite-existing`：覆盖已有中文释义或例句；默认只填空字段。

标准导入包遵循 `memory-import/v1`：

- `Rivstart Resources/import-ready/manifest.json`
- `Rivstart Resources/import-ready/rivstart-a1-a2.memory-items.jsonl`
- `Rivstart Resources/import-ready/rivstart-b1-b2.memory-items.jsonl`
- `Rivstart Resources/import-ready/memory-import-v1.schema.json`
- `Rivstart Resources/import-ready/README.md`

## PDF 结论

我没有记录任何非授权 PDF 下载源。合法路径是：

- 购买纸质书或官方数字版；
- 通过学校/课程的 NOKportalen 授权使用；
- 通过图书馆检索纸书或受授权的电子资源；
- 使用官方 extramaterial 中公开可访问的练习、音频、答案等材料。
