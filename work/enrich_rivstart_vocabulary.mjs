#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DEFAULT_INPUT = path.join(ROOT, "Rivstart Resources", "rivstart-vocabulary.json");
const DEFAULT_CACHE = path.join(ROOT, "work", "rivstart-vocabulary-enrichments.jsonl");
const DEFAULT_OUTPUT_JSON = path.join(ROOT, "Rivstart Resources", "rivstart-vocabulary.enriched.json");
const DEFAULT_OUTPUT_JS = path.join(ROOT, "Rivstart Resources", "rivstart-vocabulary.enriched.js");

const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});

async function main() {
  const options = {
    input: stringArg("input", DEFAULT_INPUT),
    cache: stringArg("cache", DEFAULT_CACHE),
    outputJson: stringArg("output-json", DEFAULT_OUTPUT_JSON),
    outputJs: stringArg("output-js", DEFAULT_OUTPUT_JS),
    model: stringArg("model", "gpt-4.1-mini"),
    apiUrl: stringArg("api-url", "https://api.openai.com/v1/responses"),
    batchSize: intArg("batch-size", 20),
    limit: limitArg("limit", 20),
    offset: intArg("offset", 0),
    level: stringArg("level", "all"),
    chapter: stringArg("chapter", "all"),
    dryRun: boolArg("dry-run"),
    manualPrompt: boolArg("manual-prompt"),
    localFill: boolArg("local-fill"),
    promptOutput: stringArg("prompt-output", path.join(ROOT, "work", "rivstart-next-batch-prompt.md")),
    importResponse: stringArg("import-response", ""),
    includeSentences: boolArg("include-sentences"),
    overwriteExisting: boolArg("overwrite-existing"),
    appendExampleExplanation: !boolArg("no-append-example-explanation"),
  };

  const source = readJson(options.input);
  const cached = readEnrichmentCache(options.cache);
  const candidates = selectCandidates(source.entries, cached, options);

  console.log(`Input entries: ${source.entries.length}`);
  console.log(`Cached enrichments: ${cached.size}`);
  console.log(`Selected candidates: ${candidates.length}`);

  if (options.dryRun) {
    console.log(JSON.stringify({
      model: options.model,
      batch_size: options.batchSize,
      first_batch: candidates.slice(0, options.batchSize).map(promptItem),
    }, null, 2));
    return;
  }

  if (options.importResponse) {
    const imported = importManualResponse(options.importResponse, source.entries);
    appendEnrichments(options.cache, imported);
    for (const item of imported) cached.set(item.id, item);
    console.log(`Imported manual enrichments: ${imported.length}`);
    writeMergedVocabulary(source, cached, options);
    return;
  }

  if (options.manualPrompt) {
    const batch = candidates.slice(0, options.batchSize);
    if (!batch.length) {
      writeMergedVocabulary(source, cached, options);
      return;
    }
    ensureDir(path.dirname(options.promptOutput));
    fs.writeFileSync(options.promptOutput, manualPrompt(batch), "utf8");
    console.log(`Wrote manual prompt for ${batch.length} items: ${options.promptOutput}`);
    return;
  }

  if (options.localFill) {
    if (!candidates.length) {
      writeMergedVocabulary(source, cached, options);
      return;
    }
    const enrichments = candidates.map(localEnrichment);
    appendEnrichments(options.cache, enrichments);
    for (const item of enrichments) cached.set(item.id, item);
    console.log(`Locally generated enrichments: ${enrichments.length}`);
    writeMergedVocabulary(source, cached, options);
    return;
  }

  if (!candidates.length) {
    writeMergedVocabulary(source, cached, options);
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY. Set it before running the enrichment job.");
  }

  ensureDir(path.dirname(options.cache));
  for (let index = 0; index < candidates.length; index += options.batchSize) {
    const batch = candidates.slice(index, index + options.batchSize);
    const enrichments = await enrichBatch(batch, options);
    appendEnrichments(options.cache, enrichments);
    for (const item of enrichments) cached.set(item.id, item);
    console.log(`Batch ${Math.floor(index / options.batchSize) + 1}: wrote ${enrichments.length} enrichments`);
  }

  writeMergedVocabulary(source, cached, options);
}

function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      index += 1;
    }
  }
  return out;
}

function stringArg(name, fallback) {
  return args[name] === undefined ? fallback : String(args[name]);
}

function intArg(name, fallback) {
  if (args[name] === undefined) return fallback;
  const parsed = Number.parseInt(String(args[name]), 10);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`Invalid --${name}: ${args[name]}`);
  return parsed;
}

function limitArg(name, fallback) {
  if (args[name] === undefined) return fallback;
  if (String(args[name]).toLowerCase() === "all") return Infinity;
  return intArg(name, fallback);
}

function boolArg(name) {
  return args[name] === true || args[name] === "true" || args[name] === "1";
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, "utf8"));
}

function readEnrichmentCache(filename) {
  const map = new Map();
  if (!fs.existsSync(filename)) return map;
  const lines = fs.readFileSync(filename, "utf8").split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    const record = JSON.parse(line);
    if (record?.id) map.set(record.id, record);
  }
  return map;
}

function selectCandidates(entries, cached, options) {
  return entries
    .filter((entry) => options.includeSentences || entry.entry_type === "word" || entry.type === "word")
    .filter((entry) => options.overwriteExisting || !entry.sentence || !entry.sentence_translation)
    .filter((entry) => !cached.has(entry.id))
    .filter((entry) => options.level === "all" || entry.level === options.level)
    .filter((entry) => options.chapter === "all" || String(entry.chapter) === String(options.chapter))
    .slice(options.offset)
    .slice(0, options.limit);
}

function promptItem(entry) {
  return {
    id: entry.id,
    level: entry.level,
    front: entry.front,
    meaning_en: entry.meaning_en,
    existing_meaning_zh: entry.meaning_zh,
    word_class: entry.word_class,
    gender: entry.gender,
    forms_raw: entry.conjugation,
    chapter: entry.chapter_label || entry.chapter,
    source_note: entry.explanation,
  };
}

async function enrichBatch(batch, options) {
  const body = {
    model: options.model,
    temperature: 0.3,
    input: [
      {
        role: "system",
        content: [
          "You are a careful Swedish teacher for Chinese-speaking learners.",
          "Create original example sentences; do not quote textbook or copyrighted sentences.",
          "Respect CEFR level: A1/A2 should be short and concrete; B1/B2 can be richer but still clear.",
          "For every item, return one natural Swedish example, a Chinese translation, and a brief Chinese explanation of the example.",
          "If forms_raw gives a gender or inflection, use it correctly.",
          "Return only JSON matching the schema.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({ items: batch.map(promptItem) }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "rivstart_vocabulary_enrichment",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["items"],
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: [
                  "id",
                  "meaning_zh",
                  "example_sv",
                  "example_zh",
                  "example_explanation_zh",
                  "quality_note",
                ],
                properties: {
                  id: { type: "string" },
                  meaning_zh: { type: "string" },
                  example_sv: { type: "string" },
                  example_zh: { type: "string" },
                  example_explanation_zh: { type: "string" },
                  quality_note: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  };

  const response = await fetch(options.apiUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`OpenAI API error ${response.status}: ${JSON.stringify(data)}`);
  }

  const text = outputText(data);
  const parsed = JSON.parse(text);
  return validateEnrichments(batch, parsed.items || []);
}

function outputText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const chunks = [];
  for (const output of data.output || []) {
    for (const content of output.content || []) {
      if (typeof content.text === "string") chunks.push(content.text);
    }
  }
  if (!chunks.length) throw new Error(`Could not find output text in response: ${JSON.stringify(data)}`);
  return chunks.join("");
}

function validateEnrichments(batch, enrichments) {
  const expectedIds = new Set(batch.map((entry) => entry.id));
  const seen = new Set();
  const out = [];
  for (const item of enrichments) {
    if (!expectedIds.has(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push({
      id: item.id,
      meaning_zh: clean(item.meaning_zh),
      example_sv: clean(item.example_sv),
      example_zh: clean(item.example_zh),
      example_explanation_zh: clean(item.example_explanation_zh),
      quality_note: clean(item.quality_note),
      enriched_at: new Date().toISOString(),
    });
  }
  const missing = [...expectedIds].filter((id) => !seen.has(id));
  if (missing.length) {
    throw new Error(`Model response missed ids: ${missing.join(", ")}`);
  }
  for (const item of out) {
    if (!item.meaning_zh || !item.example_sv || !item.example_zh || !item.example_explanation_zh) {
      throw new Error(`Incomplete enrichment for ${item.id}: ${JSON.stringify(item)}`);
    }
  }
  return out;
}

function importManualResponse(filename, entries) {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const text = fs.readFileSync(filename, "utf8").trim();
  const parsed = JSON.parse(stripCodeFence(text));
  const items = Array.isArray(parsed) ? parsed : parsed.items;
  if (!Array.isArray(items)) throw new Error("Manual response must be a JSON array or an object with an items array.");
  const batch = items.map((item) => byId.get(item.id)).filter(Boolean);
  if (batch.length !== items.length) {
    const known = new Set(byId.keys());
    const unknown = items.map((item) => item.id).filter((id) => !known.has(id));
    throw new Error(`Manual response contains unknown ids: ${unknown.join(", ")}`);
  }
  return validateEnrichments(batch, items);
}

function stripCodeFence(text) {
  const match = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1] : text;
}

function manualPrompt(batch) {
  return [
    "你是严谨的瑞典语老师，面向中文母语学习者。",
    "",
    "请为下面每个 Rivstart 词条生成原创内容，不要引用教材原句：",
    "",
    "- meaning_zh：中文释义，简短准确。",
    "- example_sv：自然瑞典语例句。",
    "- example_zh：例句中文翻译。",
    "- example_explanation_zh：一句中文说明，解释例句里的词形、搭配、语序或用法重点。",
    "- quality_note：如果没有问题填空字符串；如果词义可能多义或需要人工确认，简短说明。",
    "",
    "要求：",
    "",
    "- A1/A2 例句短、具体、日常。",
    "- B1/B2 可以稍复杂，但仍然清楚。",
    "- 注意 en/ett、复数、动词变位、固定搭配。",
    "- 只返回 JSON，不要 Markdown，不要解释。",
    "- JSON 必须是这个结构：",
    "",
    "{\"items\":[{\"id\":\"...\",\"meaning_zh\":\"...\",\"example_sv\":\"...\",\"example_zh\":\"...\",\"example_explanation_zh\":\"...\",\"quality_note\":\"\"}]}",
    "",
    "词条：",
    "",
    JSON.stringify({ items: batch.map(promptItem) }, null, 2),
    "",
  ].join("\n");
}

function localEnrichment(entry) {
  const front = clean(entry.front);
  const meaningEn = clean(entry.meaning_en);
  const wordClass = clean(entry.word_class).toLowerCase();
  const lower = front.toLowerCase();
  const meaningZh = translateMeaning(meaningEn, lower);
  const example = localExample(entry, lower, wordClass);

  return {
    id: entry.id,
    meaning_zh: meaningZh,
    example_sv: example.sv,
    example_zh: example.zh,
    example_explanation_zh: example.explanation,
    quality_note: example.note,
    enriched_at: new Date().toISOString(),
  };
}

function localExample(entry, lower, wordClass) {
  const front = clean(entry.front);
  const gender = clean(entry.gender).toLowerCase();
  const simpleWord = /^[a-zåäöéÉÅÄÖ-]+$/i.test(front);
  const functionExample = functionWordExamples()[lower];
  if (functionExample) return functionExample;

  if (wordClass.includes("verb") && simpleWord) {
    return {
      sv: `Jag vill ${front} i dag.`,
      zh: `我今天想${translateVerbForSentence(entry.meaning_en)}。`,
      explanation: `${front} 在例句中接在 vill 后面，用动词原形，适合 A1/A2 阶段练习。`,
      note: "本地自动生成；建议后续按具体语境精修。",
    };
  }

  if ((wordClass.includes("adjektiv") || wordClass.includes("adjective")) && simpleWord) {
    return {
      sv: `Den är ${front}.`,
      zh: `它是${translateAdjectiveForSentence(entry.meaning_en)}的。`,
      explanation: `${front} 在例句中作表语，和 den 搭配时通常使用形容词基本形式。`,
      note: "本地自动生成；请按具体名词性别校对形容词变化。",
    };
  }

  if ((wordClass.includes("noun") || wordClass.includes("substantiv")) && simpleWord) {
    const article = gender === "ett" ? "ett" : "en";
    return {
      sv: `Jag skriver ordet "${front}" i min bok.`,
      zh: `我把单词“${front}”写在我的书里。`,
      explanation: `${front} 是${article === "ett" ? " ett 词" : " en 词或按 en 词处理"}；这个例句先用于记住词条拼写和基本词性。`,
      note: "本地自动生成的元语言例句；建议后续替换为更具体的语境例句。",
    };
  }

  if ((wordClass.includes("adverb") || wordClass.includes("adverbial")) && simpleWord) {
    return {
      sv: `Jag använder ordet "${front}" ofta.`,
      zh: `我经常使用单词“${front}”。`,
      explanation: `${front} 在这里作为要学习的词条出现；副词的实际位置需要结合具体句子练习。`,
      note: "本地自动生成的元语言例句；建议后续按副词类型精修。",
    };
  }

  return {
    sv: `Jag lär mig uttrycket "${front}" i dag.`,
    zh: `我今天学习表达“${front}”。`,
    explanation: `这个例句用于先建立 ${front} 的识别和记忆；如果它是固定搭配，后续可补充更自然的语境。`,
    note: "本地自动生成；多词或功能词条建议人工复核。",
  };
}

function functionWordExamples() {
  return {
    "och": {
      sv: "Jag dricker kaffe och vatten.",
      zh: "我喝咖啡和水。",
      explanation: "och 是并列连词，用来连接两个同类词或短语。",
      note: "",
    },
    "eller": {
      sv: "Vill du ha kaffe eller te?",
      zh: "你想要咖啡还是茶？",
      explanation: "eller 表示“或者”，常用于选择疑问句。",
      note: "",
    },
    "men": {
      sv: "Jag är trött, men jag studerar.",
      zh: "我很累，但是我学习。",
      explanation: "men 表示转折，连接两个并列分句。",
      note: "",
    },
    "på": {
      sv: "Boken ligger på bordet.",
      zh: "书在桌子上。",
      explanation: "på 可表示位置“在……上”。",
      note: "",
    },
    "i": {
      sv: "Jag bor i Sverige.",
      zh: "我住在瑞典。",
      explanation: "i 可表示地点“在……里/在……”。",
      note: "",
    },
    "till": {
      sv: "Jag går till skolan.",
      zh: "我去学校。",
      explanation: "till 常表示方向或目的地“去/到”。",
      note: "",
    },
    "från": {
      sv: "Jag kommer från Kina.",
      zh: "我来自中国。",
      explanation: "från 表示来源或起点“从/来自”。",
      note: "",
    },
    "med": {
      sv: "Jag pratar med min lärare.",
      zh: "我和我的老师说话。",
      explanation: "med 可表示“和……一起/与……”。",
      note: "",
    },
    "utan": {
      sv: "Jag dricker kaffe utan mjölk.",
      zh: "我喝不加牛奶的咖啡。",
      explanation: "utan 表示“没有/不带”。",
      note: "",
    },
    "att": {
      sv: "Jag tycker om att läsa.",
      zh: "我喜欢阅读。",
      explanation: "att 可作不定式标记，放在动词原形前。",
      note: "",
    },
    "som": {
      sv: "Jag har en vän som talar svenska.",
      zh: "我有一个会说瑞典语的朋友。",
      explanation: "som 可引导关系从句，说明前面的名词。",
      note: "",
    },
    "inte": {
      sv: "Jag förstår inte.",
      zh: "我不明白。",
      explanation: "inte 是否定副词，在简单主句中通常放在限定动词后。",
      note: "",
    },
    "jag": {
      sv: "Jag heter Anna.",
      zh: "我叫安娜。",
      explanation: "jag 是主格人称代词，表示“我”。",
      note: "",
    },
    "du": {
      sv: "Du talar svenska.",
      zh: "你说瑞典语。",
      explanation: "du 是主格人称代词，表示“你”。",
      note: "",
    },
    "han": {
      sv: "Han bor i Stockholm.",
      zh: "他住在斯德哥尔摩。",
      explanation: "han 表示“他”，在句中作主语。",
      note: "",
    },
    "hon": {
      sv: "Hon läser en bok.",
      zh: "她在读一本书。",
      explanation: "hon 表示“她”，在句中作主语。",
      note: "",
    },
    "vi": {
      sv: "Vi studerar svenska.",
      zh: "我们学习瑞典语。",
      explanation: "vi 表示“我们”，在句中作主语。",
      note: "",
    },
    "ni": {
      sv: "Ni läser kapitel två.",
      zh: "你们读第二章。",
      explanation: "ni 表示“你们”，在句中作主语。",
      note: "",
    },
    "de": {
      sv: "De bor i Sverige.",
      zh: "他们住在瑞典。",
      explanation: "de 表示“他们/她们/它们”，在句中作主语。",
      note: "",
    },
    "det": {
      sv: "Det är bra.",
      zh: "这很好。",
      explanation: "det 可作形式主语或指代 ett 词。",
      note: "",
    },
    "den": {
      sv: "Den är ny.",
      zh: "它是新的。",
      explanation: "den 可指代 en 词，也可表示“那个”。",
      note: "",
    },
    "här": {
      sv: "Jag bor här.",
      zh: "我住在这里。",
      explanation: "här 表示地点“这里”。",
      note: "",
    },
    "där": {
      sv: "Skolan ligger där.",
      zh: "学校在那里。",
      explanation: "där 表示地点“那里”。",
      note: "",
    },
  };
}

function translateMeaning(meaningEn, frontLower) {
  const exact = meaningTranslations()[frontLower] || meaningTranslations()[meaningEn.toLowerCase()];
  if (exact) return exact;
  const first = meaningEn.split(/[;,/]/)[0]?.trim();
  if (!first) return "待校对释义";
  const normalized = first.toLowerCase();
  return meaningTranslations()[normalized] || `英文释义：${meaningEn}`;
}

function translateVerbForSentence(meaningEn) {
  const first = meaningEn.split(/[;,/]/)[0]?.trim().toLowerCase();
  return verbPhraseTranslations()[first] || `做“${meaningEn}”这件事`;
}

function translateAdjectiveForSentence(meaningEn) {
  const first = meaningEn.split(/[;,/]/)[0]?.trim().toLowerCase();
  return adjectivePhraseTranslations()[first] || `“${meaningEn}”`;
}

function meaningTranslations() {
  return {
    "and": "和；与",
    "or": "或者；还是",
    "on": "在……上",
    "on/at": "在……上；在；于",
    "at": "在；于",
    "in": "在……里；在",
    "to": "到；向；给",
    "from": "从；来自",
    "with": "和；带有",
    "without": "没有；不带",
    "not": "不；没有",
    "vowel": "元音",
    "consonant": "辅音",
    "example": "例子",
    "word": "词；单词",
    "chapter": "章节",
    "page": "页；页面",
    "book": "书",
    "pen": "笔",
    "water": "水",
    "coffee": "咖啡",
    "photo": "照片",
    "hamburger": "汉堡包",
    "lawyer": "律师",
    "potato": "土豆；马铃薯",
    "cell phone": "手机",
    "mobile phone": "手机",
    "paper": "纸；纸张",
    "cinnamon roll": "肉桂卷",
    "long": "长的",
    "short": "短的；矮的",
    "new": "新的",
    "old": "旧的；老的",
    "good": "好的",
    "bad": "坏的；不好的",
    "big": "大的",
    "small": "小的",
    "hot": "热的",
    "cold": "冷的",
    "warm": "温暖的",
    "easy": "容易的",
    "difficult": "困难的",
    "swedish": "瑞典语；瑞典的",
    "know": "知道；会",
    "can": "会；能够",
    "combine": "结合；组合",
  };
}

function verbPhraseTranslations() {
  return {
    "know": "知道",
    "can": "能够",
    "combine": "组合",
    "read": "阅读",
    "write": "写",
    "speak": "说话",
    "listen": "听",
    "go": "去",
    "come": "来",
    "eat": "吃",
    "drink": "喝",
    "work": "工作",
    "study": "学习",
    "live": "居住",
    "meet": "见面",
    "buy": "买",
    "sell": "卖",
    "see": "看见",
    "hear": "听见",
    "understand": "理解",
    "ask": "问",
    "answer": "回答",
  };
}

function adjectivePhraseTranslations() {
  return {
    "long": "长",
    "short": "短",
    "new": "新",
    "old": "旧",
    "good": "好",
    "bad": "不好",
    "big": "大",
    "small": "小",
    "hot": "热",
    "cold": "冷",
    "warm": "暖和",
    "easy": "容易",
    "difficult": "困难",
    "swedish": "瑞典的",
  };
}

function appendEnrichments(filename, enrichments) {
  const lines = enrichments.map((item) => JSON.stringify(item)).join("\n");
  fs.appendFileSync(filename, `${lines}\n`, "utf8");
}

function writeMergedVocabulary(source, cached, options) {
  const payload = structuredClone(source);
  let enrichedCount = 0;
  payload.generated_at = new Date().toISOString().slice(0, 10);
  payload.enrichment = {
    source: "manual-gpt-and-local-baseline",
    cache_file: path.relative(ROOT, options.cache),
    enriched_entries: 0,
    fields_added: ["meaning_zh", "sentence", "sentence_translation", "example_explanation_zh"],
  };

  payload.entries = payload.entries.map((entry) => {
    const enrichment = cached.get(entry.id);
    if (!enrichment) return entry;
    enrichedCount += 1;
    const next = { ...entry };
    next.meaning_zh = options.overwriteExisting ? enrichment.meaning_zh : (next.meaning_zh || enrichment.meaning_zh);
    next.sentence = options.overwriteExisting ? enrichment.example_sv : (next.sentence || enrichment.example_sv);
    next.sentence_translation = options.overwriteExisting
      ? enrichment.example_zh
      : (next.sentence_translation || enrichment.example_zh);
    next.example_explanation_zh = enrichment.example_explanation_zh;
    next.enrichment_quality_note = enrichment.quality_note;
    if (options.appendExampleExplanation) {
      next.explanation = appendExampleExplanation(next.explanation, enrichment.example_explanation_zh);
    }
    return next;
  });

  payload.enrichment.enriched_entries = enrichedCount;
  ensureDir(path.dirname(options.outputJson));
  fs.writeFileSync(options.outputJson, JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(
    options.outputJs,
    `window.RIVSTART_VOCABULARY = ${JSON.stringify(payload)};\n`,
    "utf8",
  );
  console.log(`Merged enriched entries: ${enrichedCount}`);
  console.log(`Wrote ${options.outputJson}`);
  console.log(`Wrote ${options.outputJs}`);
}

function appendExampleExplanation(existing, exampleExplanation) {
  const note = `例句说明：${exampleExplanation}`;
  if (!existing) return note;
  if (existing.includes("例句说明：")) return existing;
  return `${existing}；${note}`;
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function ensureDir(dirname) {
  fs.mkdirSync(dirname, { recursive: true });
}
