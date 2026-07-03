# Memory Import v1

本目录保存可后续导入记忆网站的规范化词条文件。它不是浏览器 `localStorage` 状态，也不会自动创建复习记录。

## 文件结构

- `manifest.json`：导入批次清单、文件列表、记录数量和导入要求。
- `*.memory-items.jsonl`：UTF-8 JSON Lines；一行一个 `memory_item`。
- `memory-import-v1.schema.json`：单条 JSONL 记录的 JSON Schema。

## 导入器要求

导入器必须：

1. 校验 `schema_version === "memory-import/v1"`。
2. 逐行读取 JSONL，不能要求一次性把全部文件载入浏览器状态。
3. 使用 `identity.dedupe_key` 判断是否已存在同一记忆条目。
4. 使用 `identity.source_occurrence_key` 保存来源出处，避免同一词跨书/章节出现时丢失来源。
5. 遇到重复项时默认执行 `merge_source_ref_and_fill_empty_fields`：保留用户已编辑字段，只填补空字段并追加来源。
6. 不自动覆盖用户已有中文释义、解释、例句或复习进度。
7. 尊重 `import_policy.create_review_card` 和 `import_policy.initial_review_lane`，但不得创建重复复习卡。

## 记录核心字段

```json
{
  "schema_version": "memory-import/v1",
  "record_type": "memory_item",
  "import_id": "rivstart-a1-a2:1655279303310",
  "identity": {
    "language": "sv",
    "entry_type": "word",
    "target_item_type": "word",
    "front_normalized": "rivstart",
    "dedupe_key": "sv|word|rivstart",
    "source_occurrence_key": "rivstart-a1-a2|1655279303310"
  },
  "content": {
    "front": "rivstart",
    "display_front": "rivstart",
    "meaning_zh": "",
    "meaning_en": "flying start",
    "explanation": "词形：(-en,-er, -erna)；词性：noun / substantiv；名词性：En；分类：klassrumfraser；Kapitel 1，页 07",
    "examples": []
  },
  "linguistic": {
    "part_of_speech": "noun / substantiv",
    "gender": "En",
    "forms_raw": "(-en,-er, -erna)",
    "semantic_categories": ["noun", "klassrumfraser"]
  },
  "source": {
    "provider": "anki_apkg",
    "package_id": "rivstart-a1-a2",
    "package_level": "A1/A2",
    "source_file": "Rivstart_A1A2_Swedish__English_w_enett_word_type__more.apkg",
    "source_note_id": "1655279303310",
    "chapter": "1",
    "chapter_label": "Kapitel 1",
    "page": "07",
    "raw_tags": ["rivstart", "rivstart-a1-a2", "chapter-1", "noun", "en", "klassrumfraser"]
  },
  "tags": ["rivstart", "rivstart-a1-a2", "chapter-1", "noun", "en", "klassrumfraser"],
  "import_policy": {
    "on_duplicate": "merge_source_ref_and_fill_empty_fields",
    "initial_review_lane": "latest",
    "create_review_card": true,
    "suspended": false
  },
  "quality": {
    "needs_review": false,
    "warnings": []
  }
}
```

