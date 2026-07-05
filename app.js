const STORAGE_KEY = "memory-deck-state-v2";
const LEGACY_KEY = "nordkort-swedish-state-v1";
const CLOUD_CONFIG_KEY = "memory-deck-cloud-config-v1";
const CLOUD_TABLE = "memory_deck_profiles";
const RIVSTART_IMPORT_LIMIT = 800;
const WORDBOOK_DETAIL_PAGE_SIZE = 50;
const SEARCH_RESULT_LIMIT = 80;
const SVERIGE_WORDBOOK_SOURCES = {
  rivstart_a1a2_anki: { bookId: "book-sv-rivstart-a1a2", label: "Sverige A1/A2" },
  rivstart_b1b2_anki: { bookId: "book-sv-rivstart-b1b2", label: "Sverige B1/B2" },
  rivstart_b2c1_anki: { bookId: "book-sv-sverige-b2c1", label: "Sverige B2/C1" }
};

const navItems = [
  { id: "dashboard", label: "Homepage", title: "Homepage", glyph: "01" },
  { id: "study", label: "Study", title: "Study", glyph: "02" },
  { id: "review", label: "Review", title: "Review", glyph: "03" },
  { id: "wordbooks", label: "Vocabulary", title: "Vocabulary", glyph: "04" },
  { id: "allwords", label: "All Words", title: "All Words", glyph: "05" },
  { id: "library", label: "Search", title: "Search", glyph: "06" },
  { id: "capture", label: "Add", title: "Add", glyph: "07" },
  { id: "settings", label: "Setting", title: "Setting", glyph: "08" }
];

const languagePresets = [
  { code: "sv", label: "Swedish", native: "Svenska" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "en", label: "English", native: "English" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "custom", label: "Custom", native: "Custom" }
];

const reviewFrequencyProfiles = {
  frequent: {
    label: "高频",
    description: "新卡或不稳固卡片使用更短间隔。",
    againDays: 0,
    hardMinDays: 1,
    hardMultiplier: 1,
    newGoodDays: 1,
    goodMultiplier: 2,
    newEasyDays: 2,
    easyMultiplier: 2.6,
    easyBonus: 0.1
  },
  standard: {
    label: "标准",
    description: "适合日常复习的平衡间隔。",
    againDays: 0,
    hardMinDays: 1,
    hardMultiplier: 1.2,
    newGoodDays: 1,
    goodMultiplier: null,
    newEasyDays: 4,
    easyMultiplier: null,
    easyBonus: 0.15
  },
  relaxed: {
    label: "宽松",
    description: "当每日队列压力较大时使用更长间隔。",
    againDays: 1,
    hardMinDays: 2,
    hardMultiplier: 1.6,
    newGoodDays: 2,
    goodMultiplier: 3.2,
    newEasyDays: 6,
    easyMultiplier: 4,
    easyBonus: 0.2
  }
};

const demoItems = [
  {
    type: "word",
    language: "sv",
    front: "fönster",
    meaning_zh: "窗户",
    meaning_en: "window",
    explanation: "中性名词，常见形式是 ett fönster。复数可以是 fönster。",
    sentence: "Jag öppnar fönstret.",
    sentence_translation: "我打开窗户。",
    tags: ["reading", "noun"]
  },
  {
    type: "word",
    language: "sv",
    front: "skriva",
    meaning_zh: "写",
    meaning_en: "to write",
    explanation: "动词原形。现在时 skriver，supine 是 skrivit。",
    sentence: "Hon har skrivit ett brev.",
    sentence_translation: "她写了一封信。",
    tags: ["verb"]
  },
  {
    type: "sentence",
    language: "sv",
    front: "Varje morgon dricker jag kaffe.",
    meaning_zh: "每天早上我喝咖啡。",
    meaning_en: "Every morning I drink coffee.",
    explanation: "句首时间状语后，限定动词 dricker 位于第二成分，主语 jag 在动词后。",
    sentence: "",
    sentence_translation: "",
    tags: ["sentence", "word-order"]
  },
  {
    type: "word",
    language: "de",
    front: "Zeitung",
    meaning_zh: "报纸",
    meaning_en: "newspaper",
    explanation: "德语阴性名词，die Zeitung。用于验证多语言数据模型。",
    sentence: "Ich lese die Zeitung.",
    sentence_translation: "我读报纸。",
    tags: ["noun", "reading"]
  }
];

let state = loadState();
let cloud = {
  client: null,
  user: null,
  configured: false,
  status: "Not configured",
  syncing: false
};
let cloudSaveTimer = null;

function createInitialState() {
  const items = {};
  const cards = {};
  const settings = defaultSettings();
  demoItems.forEach((seed, index) => {
    const item = createItem(seed, "demo");
    items[item.id] = item;
    const card = createCard(item, index < 2 ? "standard" : "latest");
    card.due_at = addDays(new Date(), index - 1).toISOString();
    card.interval_days = Math.max(0, index);
    cards[card.id] = card;
  });

  const initial = {
    activeView: "dashboard",
    uiMode: "en",
    currentLanguage: "all",
    settings,
    review: { currentCardId: null, showAnswer: false, history: [] },
    study: { selectedLanguage: "all", selectedBookId: "all", currentItemId: null, showAnswer: false, history: [] },
    items,
    cards,
    wordbooks: defaultWordbooks(items),
    wordbooksView: { selectedBookId: "", page: 1 },
    wordbookImportDraft: emptyWordbookImportDraft(settings.defaultCardLanguage),
    reviewLogs: [],
    importText: sampleImportText(),
    importFolder: "",
    importPreview: [],
    lastImportSummary: null,
    settingsPanel: "defaults",
    modifiedStack: [],
    syncLog: [],
    syncCheckpoint: { logIndex: 0, at: "" },
    syncInboundText: "",
    syncPreview: [],
    filters: { query: "", language: settings.defaultSearchLanguage, type: "all", source: "all" },
    allWords: { letter: "" },
    rivstart: { query: "", level: "all", chapter: "all" },
    trendRange: 14,
    editor: { itemId: null },
    wordbookEditor: { bookId: null },
    capturePanel: "manual",
    captureDraft: emptyDraft(settings.defaultCardLanguage),
    exportFormat: "tsv"
  };
  normalizeLearningState(initial);
  return initial;
}

function defaultSettings() {
  return {
    defaultSearchLanguage: "all",
    defaultCardLanguage: "sv",
    reviewFrequency: "standard",
    studyBatchSize: 10
  };
}

function defaultWordbooks(items = {}) {
  const ids = Object.values(items).reduce((acc, item) => {
    if (!acc[item.language]) acc[item.language] = [];
    acc[item.language].push(item.id);
    return acc;
  }, {});
  const now = new Date().toISOString();
  return {
    "book-sv-default": {
      id: "book-sv-default",
      name: "Swedish Default",
      language: "sv",
      type: "default",
      item_ids: ids.sv || [],
      created_at: now,
      updated_at: now
    },
    "book-de-default": {
      id: "book-de-default",
      name: "German Default",
      language: "de",
      type: "default",
      item_ids: ids.de || [],
      created_at: now,
      updated_at: now
    },
    "book-sv-rivstart-a1a2": {
      id: "book-sv-rivstart-a1a2",
      name: "Sverige A1/A2",
      language: "sv",
      type: "sverige",
      source: "rivstart_a1a2_anki",
      item_ids: [],
      created_at: now,
      updated_at: now
    },
    "book-sv-rivstart-b1b2": {
      id: "book-sv-rivstart-b1b2",
      name: "Sverige B1/B2",
      language: "sv",
      type: "sverige",
      source: "rivstart_b1b2_anki",
      item_ids: [],
      created_at: now,
      updated_at: now
    },
    "book-sv-sverige-b2c1": {
      id: "book-sv-sverige-b2c1",
      name: "Sverige B2/C1",
      language: "sv",
      type: "sverige",
      source: "rivstart_b2c1_anki",
      item_ids: [],
      created_at: now,
      updated_at: now
    }
  };
}

function emptyWordbookImportDraft(language = "sv") {
  return {
    name: "",
    language,
    text: ""
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    return migrateState(JSON.parse(raw));
  } catch {
    return createInitialState();
  }
}

function migrateState(parsed) {
  const fresh = createInitialState();
  const next = {
    ...fresh,
    ...parsed,
    review: { ...fresh.review, ...(parsed.review || {}) },
    study: { ...fresh.study, ...(parsed.study || {}) },
    settings: { ...fresh.settings, ...(parsed.settings || {}) },
    wordbooks: { ...fresh.wordbooks, ...(parsed.wordbooks || {}) },
    wordbooksView: { ...fresh.wordbooksView, ...(parsed.wordbooksView || {}) },
    wordbookImportDraft: { ...fresh.wordbookImportDraft, ...(parsed.wordbookImportDraft || {}) },
    filters: { ...fresh.filters, ...(parsed.filters || {}) },
    allWords: { ...fresh.allWords, ...(parsed.allWords || {}) },
    modifiedStack: Array.isArray(parsed.modifiedStack) ? parsed.modifiedStack : fresh.modifiedStack,
    syncLog: Array.isArray(parsed.syncLog) ? parsed.syncLog : fresh.syncLog,
    syncCheckpoint: { ...fresh.syncCheckpoint, ...(parsed.syncCheckpoint || {}) },
    syncInboundText: parsed.syncInboundText || fresh.syncInboundText,
    syncPreview: Array.isArray(parsed.syncPreview) ? parsed.syncPreview : fresh.syncPreview,
    settingsPanel: parsed.settingsPanel || fresh.settingsPanel,
    rivstart: { ...fresh.rivstart, ...(parsed.rivstart || {}) },
    editor: fresh.editor,
    wordbookEditor: fresh.wordbookEditor,
    capturePanel: parsed.capturePanel || fresh.capturePanel,
    trendRange: parsed.trendRange || fresh.trendRange,
    importFolder: parsed.importFolder || fresh.importFolder,
    captureDraft: { ...fresh.captureDraft, ...(parsed.captureDraft || {}) }
  };
  normalizeLearningState(next);
  return next;
}

function normalizeLearningState(target) {
  target.settings = { ...defaultSettings(), ...(target.settings || {}) };
  target.settings.studyBatchSize = clampNumber(target.settings.studyBatchSize, 1, 100, 10);
  target.study = {
    selectedLanguage: "all",
    selectedBookId: "all",
    currentItemId: null,
    showAnswer: false,
    history: [],
    ...(target.study || {})
  };
  target.study.history = Array.isArray(target.study.history) ? target.study.history : [];
  target.review = { currentCardId: null, showAnswer: false, history: [], ...(target.review || {}) };
  target.review.history = Array.isArray(target.review.history) ? target.review.history : [];
  target.wordbooks = canonicalWordbooks(target.items || {}, target.wordbooks || {});
  Object.values(target.items || {}).forEach((item) => {
    repairSverigeItemMeaning(item);
    normalizeLearningItem(target, item);
  });
  Object.values(target.wordbooks || {}).forEach((book) => {
    book.item_ids = [...new Set((book.item_ids || []).filter((id) => target.items[id]))];
    book.updated_at = book.updated_at || new Date().toISOString();
  });
}

function canonicalWordbooks(items, existing = {}) {
  const base = defaultWordbooks(items);
  const allowedIds = new Set(Object.keys(base));
  const next = {};
  Object.entries(base).forEach(([id, book]) => {
    const previous = existing[id] || {};
    next[id] = {
      ...book,
      created_at: previous.created_at || book.created_at,
      updated_at: previous.updated_at || book.updated_at,
      item_ids: id.includes("sverige") || id.includes("rivstart")
        ? [...new Set(previous.item_ids || book.item_ids || [])]
        : book.item_ids
    };
  });
  Object.values(existing).forEach((book) => {
    if (!allowedIds.has(book.id)) {
      if (!book.id || !book.name) return;
      next[book.id] = {
        ...book,
        language: normalizeLanguage(book.language),
        type: clean(book.type) || "custom",
        item_ids: Array.isArray(book.item_ids) ? [...new Set(book.item_ids.filter((id) => items[id]))] : [],
        created_at: book.created_at || new Date().toISOString(),
        updated_at: book.updated_at || new Date().toISOString()
      };
      return;
    }
    if (book.id === "book-sv-default") {
      next[book.id].name = "Swedish Default";
      next[book.id].language = "sv";
      next[book.id].type = "default";
    }
    if (book.id === "book-de-default") {
      next[book.id].name = "German Default";
      next[book.id].language = "de";
      next[book.id].type = "default";
    }
  });
  Object.entries(SVERIGE_WORDBOOK_SOURCES).forEach(([source, meta]) => {
    const book = next[meta.bookId];
    if (!book) return;
    book.name = meta.label;
    book.language = "sv";
    book.type = "sverige";
    book.source = source;
  });
  return next;
}

function normalizeLearningItem(target, item) {
  item.learned_count = Number(item.learned_count || 0);
  item.first_learned_at = item.first_learned_at || "";
  item.last_learned_at = item.last_learned_at || "";
  item.skipped = Boolean(item.skipped);
  item.skipped_at = item.skipped_at || "";
  item.wordbook_progress = item.wordbook_progress || {};
  item.wordbook_refs = Array.isArray(item.wordbook_refs) ? item.wordbook_refs : [];
  if (!item.latest_wordbook_id || !target.wordbooks?.[item.latest_wordbook_id]) {
    item.latest_wordbook_id = item.language === "de" ? "book-de-default" : item.language === "sv" ? "book-sv-default" : "";
  }
  addItemToWordbook(target, item.latest_wordbook_id, item.id, false);
}

function repairSverigeItemMeaning(item) {
  if (!item || !SVERIGE_WORDBOOK_SOURCES[item.source]) return;
  if (!/^\\s*(中文释义|英文释义)\\s*[:：]/.test(item.meaning_zh || "")) return;
  const replacement = rivstartDataset().entries.find((entry) =>
    entry.source === item.source &&
    normalizeType(entry.type) === normalizeType(item.type) &&
    normalizeKey(entry.front) === normalizeKey(item.front)
  );
  if (!replacement?.meaning_zh || /^\\s*(中文释义|英文释义)\\s*[:：]/.test(replacement.meaning_zh)) return;
  item.meaning_zh = replacement.meaning_zh;
  item.meaning_en = item.meaning_en || replacement.meaning_en;
  item.updated_at = new Date().toISOString();
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function saveState() {
  const storageStatus = document.querySelector("#storageStatus");
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (storageStatus) storageStatus.textContent = cloud.user ? "Saved locally" : "Saved";
    queueCloudSave();
    return true;
  } catch {
    if (storageStatus) storageStatus.textContent = "Save failed: data too large";
    return false;
  }
}

function emptyDraft(language = "sv") {
  return {
    type: "word",
    language,
    front: "",
    meaning_zh: "",
    meaning_en: "",
    explanation: "",
    sentence: "",
    sentence_translation: "",
    tags: ""
  };
}

function sampleImportText() {
  return `# Reading Notes

Source: Swedish article
Language: sv

### Noun
#### [[fönster]]
ett fönster
window
窗户
例句: Jag öppnar fönstret.
解释: 中性名词；定形是 fönstret。

#### [[sjö]]
en sjö
lake
湖

### Verb
#### [[läsa]]
läsa
to read
读
例句: Hon läser en bok.

### Sentences
#### [[Jag har läst texten.]]
I have read the text.
我已经读了这篇文章。
解释: 句子卡，用来记忆完整表达。`;
}

function createItem(input, source) {
  const type = normalizeType(input.type);
  const language = normalizeLanguage(input.language);
  const front = clean(input.front);
  const id = itemId(language, type, front);
  return {
    id,
    type,
    language,
    front,
    meaning_zh: clean(input.meaning_zh),
    meaning_en: clean(input.meaning_en),
    explanation: clean(input.explanation),
    sentence: clean(input.sentence),
    sentence_translation: clean(input.sentence_translation),
    tags: normalizeTags(input.tags),
    source: source || input.source || "manual",
    source_refs: input.source_refs || [],
    created_at: input.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    learned_count: Number(input.learned_count || 0),
    first_learned_at: input.first_learned_at || "",
    last_learned_at: input.last_learned_at || "",
    skipped: Boolean(input.skipped),
    skipped_at: input.skipped_at || "",
    latest_wordbook_id: input.latest_wordbook_id || "",
    wordbook_refs: Array.isArray(input.wordbook_refs) ? input.wordbook_refs : [],
    wordbook_progress: input.wordbook_progress || {},
    normalized_key: normalizeKey(front),
    anki_note_fields: {
      note_type: type === "sentence" ? "Sentence" : "Vocabulary",
      deck_hint: `${languageLabel(language)}::Reading`,
      fields: ["Front", "MeaningZH", "MeaningEN", "Explanation", "Example", "Tags"]
    }
  };
}

function createCard(item, lane) {
  return {
    id: uniqueId(`card-${item.id}`),
    item_id: item.id,
    card_type: item.type === "sentence" ? "sentence_recall" : "word_recall",
    front: item.front,
    back: cardBack(item),
    due_at: new Date().toISOString(),
    interval_days: 0,
    ease_factor: 2.5,
    repetitions: 0,
    lapses: 0,
    review_lane: lane || "standard",
    suspended: false,
    skipped: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

function touchItem(itemId, action, detail) {
  if (!itemId || !state.items[itemId]) return;
  state.modifiedStack = [itemId, ...(state.modifiedStack || []).filter((id) => id !== itemId)];
  state.syncLog = state.syncLog || [];
  state.syncLog.push({
    id: uniqueId("sync-log"),
    item_id: itemId,
    action,
    detail: detail || "",
    at: new Date().toISOString()
  });
}

function touchedSinceCheckpoint() {
  const start = state.syncCheckpoint?.logIndex || 0;
  const logs = (state.syncLog || []).slice(start);
  const ids = [...new Set(logs.map((entry) => entry.item_id).filter((id) => state.items[id]))];
  return ids.map((id) => state.items[id]);
}

function cardBack(item) {
  return [
    item.meaning_zh ? `Chinese: ${item.meaning_zh}` : "",
    item.meaning_en ? `English: ${item.meaning_en}` : "",
    item.explanation ? `Notes: ${item.explanation}` : "",
    item.sentence ? `Example: ${item.sentence}` : "",
    item.sentence_translation ? `Example translation: ${item.sentence_translation}` : "",
    item.tags.length ? `Tags: ${item.tags.join(", ")}` : ""
  ].filter(Boolean).join("\n");
}

function addItemToWordbook(target, bookId, itemId, updateLatest = true) {
  if (!bookId || !itemId || !target.wordbooks?.[bookId] || !target.items?.[itemId]) return;
  const book = target.wordbooks[bookId];
  book.item_ids = [...new Set([...(book.item_ids || []), itemId])];
  book.updated_at = new Date().toISOString();
  const item = target.items[itemId];
  item.wordbook_refs = [
    ...(item.wordbook_refs || []).filter((ref) => ref.book_id !== bookId),
    { book_id: bookId, seen_at: new Date().toISOString() }
  ];
  item.wordbook_progress = item.wordbook_progress || {};
  item.wordbook_progress[bookId] = {
    learned_at: item.wordbook_progress[bookId]?.learned_at || "",
    skipped: Boolean(item.wordbook_progress[bookId]?.skipped),
    seen_at: new Date().toISOString()
  };
  if (updateLatest) item.latest_wordbook_id = bookId;
}

function wordbookForSource(source, language) {
  if (SVERIGE_WORDBOOK_SOURCES[source]) return SVERIGE_WORDBOOK_SOURCES[source].bookId;
  if (language === "de") return "book-de-default";
  if (language === "sv") return "book-sv-default";
  return "";
}

function itemId(language, type, front) {
  return `i-${language}-${type}-${normalizeKey(front).replace(/\s+/g, "-")}`;
}

function uniqueId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clean(value) {
  return String(value || "").trim();
}

function normalizeType(value) {
  const key = String(value || "").toLowerCase().trim();
  if (key.startsWith("sent")) return "sentence";
  return "word";
}

function normalizeLanguage(value) {
  const key = String(value || "sv").toLowerCase().trim();
  return key || "custom";
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return String(value || "").split(/[,\s#]+/).map(clean).filter(Boolean);
}

function normalizeKey(value) {
  return stripWiki(value)
    .toLocaleLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s.'’-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripWiki(value) {
  const text = clean(value);
  const match = text.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/);
  return match ? match[1].trim() : text.replace(/^#+\s*/, "").trim();
}

function languageLabel(code) {
  if (code === "all") return "全部语言";
  const preset = languagePresets.find((item) => item.code === code);
  return preset ? preset.label : code.toUpperCase();
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function dayKey(date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

function isSameDay(a, b) {
  return dayKey(a) === dayKey(b);
}

function isDue(card) {
  const item = state.items[card.item_id];
  return !card.suspended && !card.skipped && !item?.skipped && (card.review_lane === "latest" || new Date(card.due_at).getTime() <= Date.now());
}

function laneRank(lane) {
  return lane === "latest" ? 0 : lane === "learning" ? 1 : 2;
}

function dueCards() {
  return Object.values(state.cards)
    .filter(isDue)
    .filter((card) => state.currentLanguage === "all" || state.items[card.item_id]?.language === state.currentLanguage)
    .sort((a, b) => {
      const lane = laneRank(a.review_lane) - laneRank(b.review_lane);
      if (lane !== 0) return lane;
      return new Date(a.due_at) - new Date(b.due_at);
    });
}

function cardsDueOn(offset) {
  const target = addDays(new Date(), offset);
  return Object.values(state.cards)
    .filter((card) => !card.suspended)
    .filter((card) => !card.skipped && !state.items[card.item_id]?.skipped)
    .filter((card) => state.currentLanguage === "all" || state.items[card.item_id]?.language === state.currentLanguage)
    .filter((card) => card.review_lane === "latest" ? offset === 0 : isSameDay(new Date(card.due_at), target));
}

function t(zh, en) {
  if (state.uiMode === "en") return en || zh;
  if (state.uiMode === "both") return `${zh}${en ? ` / ${en}` : ""}`;
  return zh || en;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderInlineMarkdown(value) {
  let html = escapeHtml(value || "");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target, alias) => {
    const label = alias || target;
    return `<strong class="wiki-link">${label}</strong>`;
  });
  html = html.replace(/\[([^\]]+)\]\([^)]+\)/g, '<strong class="md-link">$1</strong>');
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return html;
}

function renderMarkdownBlock(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => renderInlineMarkdown(line))
    .join("<br>");
}

function cloudConfig() {
  const defaults = window.MEMORY_DECK_SUPABASE || {};
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(CLOUD_CONFIG_KEY) || "{}") };
  } catch {
    return { ...defaults };
  }
}

function saveCloudConfig(config) {
  localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify({
    url: clean(config.url),
    anonKey: clean(config.anonKey)
  }));
}

function cloudCanConnect(config = cloudConfig()) {
  return Boolean(config.url && config.anonKey && window.supabase?.createClient);
}

async function initCloud() {
  const config = cloudConfig();
  cloud.configured = cloudCanConnect(config);
  if (!cloud.configured) {
    cloud.status = window.supabase?.createClient ? "Not configured" : "Supabase library unavailable";
    renderCloudStatus();
    return;
  }
  try {
    cloud.client = window.supabase.createClient(config.url, config.anonKey);
    const sessionResult = await cloud.client.auth.getSession();
    cloud.user = sessionResult.data?.session?.user || null;
    cloud.status = cloud.user ? "Signed in" : "Ready to sign in";
    cloud.client.auth.onAuthStateChange(async (_event, session) => {
      cloud.user = session?.user || null;
      cloud.status = cloud.user ? "Signed in" : "Signed out";
      if (cloud.user) await loadCloudState();
      render();
    });
    if (cloud.user) await loadCloudState();
    render();
  } catch (error) {
    cloud.status = `Cloud error: ${error.message}`;
    renderCloudStatus();
  }
}

function renderCloudStatus() {
  const storageStatus = document.querySelector("#storageStatus");
  if (!storageStatus) return;
  if (cloud.user) storageStatus.textContent = "Cloud connected";
  else if (cloud.configured) storageStatus.textContent = "Cloud ready";
  else storageStatus.textContent = "Saved";
}

function queueCloudSave() {
  if (!cloud.user || !cloud.client || cloud.syncing) return;
  window.clearTimeout(cloudSaveTimer);
  cloudSaveTimer = window.setTimeout(() => saveCloudState("auto"), 900);
}

function stateForCloud() {
  return {
    ...state,
    editor: { itemId: null },
    wordbookEditor: { bookId: null }
  };
}

async function saveCloudState(reason = "manual") {
  if (!cloud.user || !cloud.client) return false;
  try {
    cloud.syncing = true;
    cloud.status = reason === "manual" ? "Syncing..." : "Auto syncing...";
    renderCloudStatus();
    const { error } = await cloud.client.from(CLOUD_TABLE).upsert({
      user_id: cloud.user.id,
      state: stateForCloud(),
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
    if (error) throw error;
    cloud.status = "Synced";
    renderCloudStatus();
    return true;
  } catch (error) {
    cloud.status = `Sync failed: ${error.message}`;
    renderCloudStatus();
    return false;
  } finally {
    cloud.syncing = false;
    renderCloudPanelOnly();
  }
}

async function loadCloudState() {
  if (!cloud.user || !cloud.client) return false;
  try {
    cloud.syncing = true;
    cloud.status = "Loading cloud state...";
    const { data, error } = await cloud.client
      .from(CLOUD_TABLE)
      .select("state, updated_at")
      .eq("user_id", cloud.user.id)
      .maybeSingle();
    if (error) throw error;
    if (data?.state) {
      state = migrateState(data.state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      cloud.status = `Loaded cloud state`;
    } else {
      await saveCloudState("initial");
      cloud.status = "Cloud state created";
    }
    renderCloudStatus();
    return true;
  } catch (error) {
    cloud.status = `Load failed: ${error.message}`;
    renderCloudStatus();
    return false;
  } finally {
    cloud.syncing = false;
  }
}

function renderCloudPanelOnly() {
  if (state.activeView !== "settings" || state.settingsPanel !== "cloud") return;
  const root = document.querySelector("#viewRoot");
  if (!root) return;
  render();
}

function render() {
  renderNav();
  if (state.activeView === "import") {
    state.capturePanel = "obsidian";
    state.activeView = "capture";
  }
  const movedSettingsPanels = { sync: "sync", export: "anki" };
  if (movedSettingsPanels[state.activeView]) {
    state.settingsPanel = movedSettingsPanels[state.activeView];
    state.activeView = "settings";
  }
  let active = navItems.find((item) => item.id === state.activeView);
  if (!active) {
    state.activeView = "dashboard";
    active = navItems[0];
  }
  const pageLead = document.querySelector("#pageLead");
  if (pageLead) {
    pageLead.textContent = "Tasks";
  }
  document.querySelector("#pageTitle").textContent = active.title;
  const languageMode = document.querySelector("#languageMode");
  if (languageMode) languageMode.value = state.uiMode;
  const root = document.querySelector("#viewRoot");
  root.innerHTML = "";

  if (state.activeView === "dashboard") root.innerHTML = renderDashboard();
  if (state.activeView === "review") root.innerHTML = renderReview();
  if (state.activeView === "study") root.innerHTML = renderStudy();
  if (state.activeView === "wordbooks") root.innerHTML = renderWordbooks();
  if (state.activeView === "allwords") root.innerHTML = renderAllWords();
  if (state.activeView === "library") root.innerHTML = renderLibrary();
  if (state.activeView === "capture") root.innerHTML = renderCapture();
  if (state.activeView === "settings") root.innerHTML = renderSettings();

  root.insertAdjacentHTML("beforeend", renderEditorModal());
  root.insertAdjacentHTML("beforeend", renderWordbookEditorModal());
  bindViewEvents();
}

function renderNav() {
  const nav = document.querySelector("#navList");
  nav.innerHTML = navItems.map((item) => `
    <button class="nav-button ${state.activeView === item.id ? "is-active" : ""}" type="button" data-view="${item.id}" onclick="window.__memoryDeckNav('${item.id}')">
      <span class="nav-glyph">${item.glyph}</span>
      <span>${item.label}</span>
    </button>
  `).join("");
}

window.__memoryDeckNav = function navigateMainView(view) {
  window.__memoryDeckNavHandled = true;
  state.activeView = view;
  resetViewState(view);
  saveState();
  render();
  setTimeout(() => {
    window.__memoryDeckNavHandled = false;
  }, 0);
};

function resetViewState(view) {
  state.editor = { itemId: null };
  state.wordbookEditor = { bookId: null };
  if (view === "study") {
    state.study.selectedLanguage = "all";
    state.study.selectedBookId = "all";
    state.study.currentItemId = null;
    state.study.showAnswer = false;
  }
  if (view === "review") {
    state.review.currentCardId = null;
    state.review.showAnswer = false;
  }
  if (view === "wordbooks") {
    state.wordbooksView = { selectedBookId: "", page: 1 };
  }
  if (view === "allwords") {
    state.allWords = { letter: "" };
  }
  if (view === "library") {
    state.filters = {
      query: "",
      language: currentSettings().defaultSearchLanguage,
      type: "all",
      source: "all"
    };
  }
  if (view === "capture") {
    state.capturePanel = "manual";
  }
  if (view === "settings") {
    state.settingsPanel = "defaults";
  }
}

function renderDashboard() {
  const today = dueCards();
  const tomorrow = cardsDueOn(1);
  const newItemsToday = itemsCreatedOn(0);
  const range = Number(state.trendRange || 14);

  return `
    <div class="panel-grid dashboard-grid">
      <section class="panel panel-pad span-12 task-hero">
        <div>
          <p class="eyebrow">Tasks</p>
          <h2><span class="number-value">${today.length}</span> 张今天复习</h2>
          <p>明天 <span class="number-inline">${tomorrow.length}</span> 张 · 今日新增 <span class="number-inline">${newItemsToday.length}</span> 条</p>
        </div>
        <div class="hero-actions">
          ${renderLanguageFilter("currentLanguage", state.currentLanguage)}
          <button class="primary-button" type="button" data-jump="review">开始复习</button>
          <button class="ghost-button" type="button" data-jump="study">开始学习</button>
          <button class="ghost-button" type="button" data-open-add-panel="obsidian">Import Obsidian</button>
        </div>
      </section>

      ${metric("Today", today.length, "review due today", "span-3 dashboard-metric")}
      ${metric("Tomorrow", tomorrow.length, "due tomorrow", "span-3 dashboard-metric")}
      ${metric("New Today", newItemsToday.length, "new items today", "span-3 dashboard-metric")}
      ${metric("Total Items", Object.keys(state.items).length, "words and sentences", "span-3 dashboard-metric")}

      <section class="panel panel-pad span-8">
        <div class="section-head">
          <div>
            <h2>复习 / 学习趋势</h2>
          </div>
          <select id="trendRange">
            ${[7, 14, 30, 90].map((days) => `<option value="${days}" ${range === days ? "selected" : ""}>${days === 90 ? "几个月" : `${days} 日`}</option>`).join("")}
          </select>
        </div>
        ${renderTrendChart(range)}
      </section>

      <section class="panel panel-pad span-4">
        <div class="section-head">
          <div>
            <h2>今日队列</h2>
          </div>
          <button class="ghost-button" type="button" data-jump="library">搜索</button>
        </div>
        ${renderQueueList(today.slice(0, 8))}
      </section>
    </div>
  `;
}

function metric(label, value, hint, span) {
  return `
    <section class="panel panel-pad metric ${span}">
      <span>${label}</span>
      <strong>${value}</strong>
      <span>${hint}</span>
    </section>
  `;
}

function itemsCreatedOn(offset) {
  const target = addDays(new Date(), offset);
  return Object.values(state.items).filter((item) => isSameDay(new Date(item.created_at), target));
}

function trendData(days) {
  const start = addDays(new Date(), -(days - 1));
  const result = [];
  for (let index = 0; index < days; index += 1) {
    const date = addDays(start, index);
    const key = dayKey(date);
    const reviews = state.reviewLogs.filter((log) => dayKey(new Date(log.reviewed_at)) === key).length;
    const learned = Object.values(state.items).filter((item) => dayKey(new Date(item.created_at)) === key).length;
    result.push({ key, label: key.slice(5), reviews, learned });
  }
  return result;
}

function renderTrendChart(days) {
  const data = trendData(days);
  const max = Math.max(1, ...data.flatMap((row) => [row.reviews, row.learned]));
  const width = 720;
  const height = 260;
  const pad = 34;
  const points = (field) => data.map((row, index) => {
    const x = pad + (index * (width - pad * 2)) / Math.max(1, data.length - 1);
    const y = height - pad - (row[field] / max) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const bars = data.map((row, index) => {
    const x = pad + (index * (width - pad * 2)) / Math.max(1, data.length - 1);
    return `<text x="${x.toFixed(1)}" y="${height - 8}" text-anchor="middle">${escapeHtml(row.label)}</text>`;
  }).join("");
  return `
    <div class="chart-wrap">
      <svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="复习量和学习量趋势">
        <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" class="chart-axis"></line>
        <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" class="chart-axis"></line>
        <polyline points="${points("reviews")}" class="chart-line review-line"></polyline>
        <polyline points="${points("learned")}" class="chart-line learn-line"></polyline>
        ${data.map((row, index) => {
          const x = pad + (index * (width - pad * 2)) / Math.max(1, data.length - 1);
          const reviewY = height - pad - (row.reviews / max) * (height - pad * 2);
          const learnY = height - pad - (row.learned / max) * (height - pad * 2);
          return `<circle cx="${x.toFixed(1)}" cy="${reviewY.toFixed(1)}" r="3.8" class="review-dot"><title>${row.label} 复习 ${row.reviews}</title></circle><circle cx="${x.toFixed(1)}" cy="${learnY.toFixed(1)}" r="3.8" class="learn-dot"><title>${row.label} 学习 ${row.learned}</title></circle>`;
        }).join("")}
        ${bars}
      </svg>
      <div class="chart-legend">
        <span><i class="legend-review"></i>复习量</span>
        <span><i class="legend-learn"></i>学习量</span>
      </div>
    </div>
  `;
}

function workflowStep(title, body) {
  return `
    <div class="workflow-step">
      <strong>${title}</strong>
      <span>${body}</span>
    </div>
  `;
}

function uniqueLanguages() {
  return [...new Set(Object.values(state.items).map((item) => item.language))].sort();
}

function renderLanguageCard(code) {
  const items = Object.values(state.items).filter((item) => item.language === code);
  const due = dueCards().filter((card) => state.items[card.item_id]?.language === code);
  return `
    <article class="word-card">
      <div>
        <h3>${escapeHtml(languageLabel(code))}</h3>
        <p>${items.length} 条 · ${due.length} 张待复习</p>
      </div>
      <button class="chip-button" type="button" data-set-language="${code}">只看该语言</button>
    </article>
  `;
}

function renderReview() {
  const due = dueCards();
  if (!due.length) {
    return renderEmpty("没有到期卡片", "可以添加词句或导入 Obsidian 阅读笔记后开始复习。", "import", "导入词句");
  }
  const current = due.find((card) => card.id === state.review.currentCardId) || due[0];
  state.review.currentCardId = current.id;
  const item = state.items[current.item_id];
  const answer = state.review.showAnswer ? `
    <div class="review-back">
      <div class="markdown-render">${renderMarkdownBlock(current.back)}</div>
    </div>
    <div class="review-actions">
      <button class="rating-button" type="button" data-review-prev>上一张</button>
      <button class="rating-button" type="button" data-skip-card="${item.id}">跳过</button>
      ${["again", "hard", "good", "easy"].map((rating) => `
        <button class="rating-button" type="button" data-rate="${rating}" data-rating="${rating}">
          ${ratingLabel(rating)}
        </button>
      `).join("")}
    </div>
  ` : `
    <div class="review-actions">
      <button class="ghost-button" type="button" data-review-prev>上一张</button>
      <button class="primary-button" type="button" data-show-answer>显示答案</button>
      <button class="ghost-button" type="button" data-skip-card="${item.id}">跳过</button>
    </div>
  `;

  return `
    <div class="review-layout">
      <section>
        <article class="review-card">
          <div class="section-head">
            <div>
              <h2>${item.type === "sentence" ? "句子卡" : "单词卡"}</h2>
              <p>${languageLabel(item.language)} · ${due.length} 张待复习 · 间隔 ${current.interval_days} 天</p>
            </div>
            <div class="table-actions">
              <button class="hammer-button" type="button" data-edit-item="${item.id}" title="编辑卡片" aria-label="编辑卡片">🔨</button>
              <span class="source-pill">${current.review_lane}</span>
            </div>
          </div>
          <div class="review-front">${renderInlineMarkdown(current.front)}</div>
          ${answer}
        </article>
      </section>
      <section class="panel panel-pad review-queue-panel">
        <div class="section-head">
          <div>
            <h2>队列</h2>
          </div>
        </div>
        ${renderQueueList(due.slice(0, 12))}
      </section>
    </div>
  `;
}

function renderStudy() {
  normalizeLearningState(state);
  const settings = currentSettings();
  const selectedBook = state.wordbooks?.[state.study.selectedBookId];
  if (!selectedBook) {
    return renderStudyBookPicker();
  }
  const importSummary = ensureWordbookImported(selectedBook);
  if (importSummary.added || importSummary.refreshed) saveState();
  const queue = studyQueue();
  const current = queue.find((item) => item.id === state.study.currentItemId) || queue[0];
  state.study.currentItemId = current?.id || null;
  const progress = studyProgressSummary();
  if (!current) {
    return `
      <div class="panel-grid">
        <section class="panel panel-pad span-12">
          <div class="empty-state">
            <h2>没有待学习单词</h2>
            <p>${escapeHtml(selectedBook.name)} 下没有未首次学习的内容，可以返回单词书切换或在添加页导入新词书。</p>
            <button class="primary-button" type="button" data-jump="wordbooks">返回单词书</button>
          </div>
        </section>
      </div>
    `;
  }
  const answer = state.study.showAnswer ? `
    <div class="review-back">
      <div class="markdown-render">${renderMarkdownBlock(cardBack(current))}</div>
    </div>
    <div class="review-actions">
      <button class="rating-button" type="button" data-study-prev>上一张</button>
      <button class="rating-button" type="button" data-study-skip>跳过</button>
      <button class="rating-button" type="button" data-study-learned>学会</button>
    </div>
  ` : `
    <div class="review-actions">
      <button class="ghost-button" type="button" data-study-prev>上一张</button>
      <button class="primary-button" type="button" data-study-show-answer>显示答案</button>
      <button class="ghost-button" type="button" data-study-skip>跳过</button>
    </div>
  `;
  const stats = wordbookStats(selectedBook);
  return `
    <div class="panel-grid">
      <section class="panel panel-pad span-12 study-book-session">
        <div>
          <h2>${escapeHtml(selectedBook.name)}</h2>
          <p>${languageLabel(selectedBook.language)} · ${wordbookTypeLabel(selectedBook.type)} · 本组 ${queue.length}/${settings.studyBatchSize}</p>
        </div>
        <div class="study-book-progress">
          <strong>${stats.progress}%</strong>
          <span>已学 ${stats.learned} · 跳过 ${stats.skipped} · 共计 ${stats.total}</span>
        </div>
        <button class="ghost-button" type="button" data-clear-study-book>切换单词书</button>
      </section>

      <div class="review-layout span-12">
      <section>
        <article class="review-card">
          <div class="section-head">
            <div>
              <h2>学习卡</h2>
              <p>${languageLabel(current.language)} · 本组 ${queue.length}/${settings.studyBatchSize} · 已学 ${progress.learned}/${progress.total}</p>
            </div>
            <div class="table-actions">
              <button class="hammer-button" type="button" data-edit-item="${current.id}" title="编辑卡片" aria-label="编辑卡片">🔨</button>
            </div>
          </div>
          <div class="review-front">${renderInlineMarkdown(current.front)}</div>
          ${answer}
        </article>
      </section>
      <section class="panel panel-pad review-queue-panel">
        <div class="section-head"><div><h2>本组队列</h2></div></div>
        ${renderStudyQueue(queue)}
      </section>
      </div>
    </div>
  `;
}

function renderStudyBookPicker() {
  const books = Object.values(state.wordbooks || {})
    .map((book) => ({ book, stats: wordbookStats(book) }))
    .filter(({ stats }) => stats.total > 0)
    .sort((a, b) => `${a.book.language}-${a.book.type}-${a.book.name}`.localeCompare(`${b.book.language}-${b.book.type}-${b.book.name}`));
  return `
    <div class="panel-grid">
      <section class="panel panel-pad span-12">
        <div class="section-head">
          <div>
            <h2>选择单词书</h2>
            <p>先选择一本词书，再进入本组学习。</p>
          </div>
          <button class="ghost-button" type="button" data-jump="wordbooks">管理单词书</button>
        </div>
      </section>
      ${books.map(({ book, stats }) => renderStudyBookOption(book, stats)).join("") || `<section class="panel panel-pad span-12"><div class="empty-state"><h2>暂无可学习词书</h2><p>请先在添加页导入单词书。</p><button class="primary-button" type="button" data-jump="capture">导入单词书</button></div></section>`}
    </div>
  `;
}

function renderStudyBookOption(book, stats) {
  return `
    <section class="panel panel-pad span-4 study-book-option">
      <div class="wordbook-progress-badge">${stats.progress}%</div>
      <div>
        <h2>${escapeHtml(book.name)}</h2>
        <p>${languageLabel(book.language)} · ${wordbookTypeLabel(book.type)}</p>
      </div>
      <div class="wordbook-counts">
        <span>已学 <strong>${stats.learned}</strong></span>
        <span>跳过 <strong>${stats.skipped}</strong></span>
        <span>共计 <strong>${stats.total}</strong></span>
      </div>
      <button class="primary-button" type="button" data-study-book="${book.id}">开始学习</button>
    </section>
  `;
}

function renderStudyFilters() {
  return `
    <div class="filters study-filters">
      <select id="studyLanguage">
        ${studyLanguageOptions().map((item) => `<option value="${item.code}" ${state.study.selectedLanguage === item.code ? "selected" : ""}>${item.label}</option>`).join("")}
      </select>
      <select id="studyBook">
        ${studyBookOptions(state.study.selectedLanguage).map((book) => `<option value="${book.id}" ${state.study.selectedBookId === book.id ? "selected" : ""}>${escapeHtml(book.name)}</option>`).join("")}
      </select>
    </div>
  `;
}

function renderStudyQueue(queue) {
  if (!queue.length) return `<div class="empty-state"><h2>本组为空</h2><p>没有待学习卡片。</p></div>`;
  return `
    <div class="queue-strip">
      ${queue.map((item) => `
        <div class="queue-row ${item.id === state.study.currentItemId ? "is-current" : ""}">
          <div>
            <strong>${renderInlineMarkdown(item.front)}</strong>
            <div class="word-meta">
              <span class="tag">${languageLabel(item.language)}</span>
              <span class="tag">${escapeHtml(wordbookLabel(item.latest_wordbook_id))}</span>
              <span class="tag">${item.learned_count || 0} 次</span>
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function studyLanguageOptions() {
  return [{ code: "all", label: "全部语言" }, ...uniqueLanguages().map((code) => ({ code, label: languageLabel(code) }))];
}

function studyBookOptions(language) {
  const books = Object.values(state.wordbooks || {})
    .filter((book) => language === "all" || book.language === language || book.language === "all")
    .sort((a, b) => `${a.language}-${a.name}`.localeCompare(`${b.language}-${b.name}`));
  return [{ id: "all", name: "全部单词书", language: "all" }, ...books];
}

function studyQueue() {
  normalizeLearningState(state);
  const batchSize = currentSettings().studyBatchSize;
  const candidates = Object.values(state.items)
    .filter((item) => !item.skipped)
    .filter((item) => state.study.selectedLanguage === "all" || item.language === state.study.selectedLanguage)
    .filter((item) => itemInSelectedStudyBook(item))
    .filter((item) => !studyProgressForItem(item).learned_at && !studyProgressForItem(item).skipped)
    .sort((a, b) => new Date(studyProgressForItem(b).seen_at || b.updated_at) - new Date(studyProgressForItem(a).seen_at || a.updated_at));
  return candidates.slice(0, batchSize);
}

function itemInSelectedStudyBook(item) {
  const bookId = state.study.selectedBookId || "all";
  if (bookId === "all") return true;
  return Boolean(state.wordbooks?.[bookId]?.item_ids?.includes(item.id));
}

function studyProgressForItem(item) {
  const bookId = state.study.selectedBookId === "all" ? item.latest_wordbook_id : state.study.selectedBookId;
  item.wordbook_progress = item.wordbook_progress || {};
  return item.wordbook_progress[bookId] || { learned_at: "", skipped: false, seen_at: item.updated_at };
}

function studyProgressSummary() {
  const all = Object.values(state.items)
    .filter((item) => state.study.selectedLanguage === "all" || item.language === state.study.selectedLanguage)
    .filter(itemInSelectedStudyBook);
  return {
    total: all.length,
    learned: all.filter((item) => studyProgressForItem(item).learned_at).length
  };
}

function wordbookLabel(bookId) {
  return state.wordbooks?.[bookId]?.name || "Default";
}

function renderWordbooks() {
  const selectedBook = state.wordbooks?.[state.wordbooksView?.selectedBookId];
  if (selectedBook) return renderWordbookDetail(selectedBook);

  const books = Object.values(state.wordbooks || {})
    .sort((a, b) => `${a.language}-${a.type}-${a.name}`.localeCompare(`${b.language}-${b.type}-${b.name}`));
  const languages = [...new Set(books.map((book) => book.language))];
  return `
    <div class="panel-grid">
      <section class="panel panel-pad span-12">
        <div class="section-head">
          <div>
            <h2>现有单词书</h2>
            <p>按语言浏览词书和学习进度。</p>
          </div>
          <button class="primary-button" type="button" data-jump="capture">导入单词书</button>
        </div>
        <div class="import-summary">
          ${miniStat("单词书", books.length)}
          ${miniStat("语言", languages.length)}
          ${miniStat("词条", Object.keys(state.items || {}).length)}
          ${miniStat("已学习", Object.values(state.items || {}).filter((item) => item.first_learned_at).length)}
        </div>
      </section>
      ${books.map(renderWordbookCard).join("") || `<section class="panel panel-pad span-12"><div class="empty-state"><h2>暂无单词书</h2><p>可以在添加页导入单词书。</p></div></section>`}
    </div>
  `;
}

function renderWordbookCard(book) {
  const stats = wordbookStats(book);
  return `
    <section class="panel panel-pad span-4 wordbook-card">
      <div class="wordbook-progress-badge">${stats.progress}%</div>
      <div class="section-head">
        <div>
          <h2>${escapeHtml(book.name)}</h2>
          <p>${languageLabel(book.language)} · ${wordbookTypeLabel(book.type)}</p>
        </div>
      </div>
      <div class="wordbook-counts">
        <span>已学 <strong>${stats.learned}</strong></span>
        <span>跳过 <strong>${stats.skipped}</strong></span>
        <span>共计 <strong>${stats.total}</strong></span>
      </div>
      <div class="table-actions">
        <button class="chip-button" type="button" data-open-wordbook-details="${book.id}">View Details</button>
      </div>
    </section>
  `;
}

function wordbookStats(book) {
  const items = wordbookItems(book);
  const importedItems = wordbookImportedItems(book);
  const externalItems = wordbookExternalItems(book);
  const learned = items.filter((item) => item.wordbook_progress?.[book.id]?.learned_at).length;
  const skipped = items.filter((item) => item.wordbook_progress?.[book.id]?.skipped || item.skipped).length;
  const total = items.length;
  const progress = total ? Math.round(((learned + skipped) / total) * 100) : 0;
  return {
    total,
    learned,
    skipped,
    progress,
    imported: importedItems.length,
    external: externalItems.length
  };
}

function renderWordbookDetail(book) {
  const stats = wordbookStats(book);
  const items = wordbookItems(book);
  const totalPages = Math.max(1, Math.ceil(items.length / WORDBOOK_DETAIL_PAGE_SIZE));
  const currentPage = clampNumber(state.wordbooksView?.page || 1, 1, totalPages, 1);
  state.wordbooksView = { selectedBookId: book.id, page: currentPage };
  const offset = (currentPage - 1) * WORDBOOK_DETAIL_PAGE_SIZE;
  const visibleItems = items.slice(offset, offset + WORDBOOK_DETAIL_PAGE_SIZE);

  return `
    <div class="panel-grid">
      <section class="panel panel-pad span-12">
        <div class="section-head">
          <div>
            <h2>${escapeHtml(book.name)}</h2>
            <p>${languageLabel(book.language)} · ${wordbookTypeLabel(book.type)}</p>
          </div>
          <div class="table-actions">
            <button class="ghost-button" type="button" data-close-wordbook>Back</button>
            <button class="primary-button" type="button" data-edit-wordbook="${book.id}">Edit</button>
          </div>
        </div>
        <div class="import-summary">
          ${miniStat("Progress", `${stats.progress}%`)}
          ${miniStat("Learned", stats.learned)}
          ${miniStat("Skipped", stats.skipped)}
          ${miniStat("Total", stats.total)}
        </div>
      </section>

      <section class="panel panel-pad span-12">
        <div class="section-head">
          <div>
            <h2>词条列表</h2>
            <p>第 ${currentPage}/${totalPages} 页 · 每页最多 ${WORDBOOK_DETAIL_PAGE_SIZE} 条</p>
          </div>
        </div>
        ${renderWordbookListTable(book, visibleItems, offset)}
        ${renderWordbookPagination(currentPage, totalPages, items.length)}
      </section>
    </div>
  `;
}

function wordbookItems(book) {
  if (book.source && SVERIGE_WORDBOOK_SOURCES[book.source]) {
    const importedItems = wordbookImportedItems(book);
    return wordbookExternalItems(book).map((externalItem) => {
      const localId = itemId("sv", normalizeType(externalItem.type), externalItem.front);
      const localItem = importedItems.find((item) =>
        item.id === localId ||
        (item.source_refs || []).some((ref) => ref.id === externalItem.external_entry_id)
      );
      return localItem ? { ...localItem, external_entry_id: externalItem.external_entry_id } : externalItem;
    });
  }
  const importedItems = wordbookImportedItems(book);
  return importedItems;
}

function wordbookImportedItems(book) {
  return (book.item_ids || [])
    .map((id) => state.items[id])
    .filter(Boolean)
    .sort((a, b) => {
      const aRef = (a.wordbook_refs || []).find((ref) => ref.book_id === book.id);
      const bRef = (b.wordbook_refs || []).find((ref) => ref.book_id === book.id);
      return new Date(bRef?.seen_at || b.updated_at) - new Date(aRef?.seen_at || a.updated_at);
    });
}

function wordbookExternalItems(book) {
  if (!book.source || !SVERIGE_WORDBOOK_SOURCES[book.source]) return [];
  return rivstartDataset().entries
    .filter((entry) => entry.source === book.source)
    .sort((a, b) => chapterSortValue(a.chapter) - chapterSortValue(b.chapter) || Number(a.page || 0) - Number(b.page || 0) || a.front.localeCompare(b.front, "sv"))
    .map((entry) => ({
      id: entry.id,
      type: entry.type,
      front: entry.front,
      meaning_zh: entry.meaning_zh,
      meaning_en: entry.meaning_en,
      learned_count: 0,
      skipped: false,
      source: entry.source,
      external_entry_id: entry.id,
      wordbook_progress: {},
    }));
}

function ensureWordbookImported(book) {
  if (!book?.source || !SVERIGE_WORDBOOK_SOURCES[book.source]) {
    return { total: 0, added: 0, refreshed: 0 };
  }
  const entries = rivstartDataset().entries.filter((entry) => entry.source === book.source);
  if (!entries.length) return { total: 0, added: 0, refreshed: 0 };
  const hasAllItems = entries.every((entry) => {
    const item = state.items[itemId("sv", normalizeType(entry.type), entry.front)];
    return item && book.item_ids?.includes(item.id);
  });
  if (hasAllItems) return { total: entries.length, added: 0, refreshed: 0 };

  let added = 0;
  let refreshed = 0;
  entries.forEach((entry) => {
    const item = rivstartEntryToItem(entry);
    item.latest_wordbook_id = book.id;
    const result = upsertItem(item, "learning");
    if (result.status === "new") added += 1;
    else refreshed += 1;
  });
  book.item_ids = [...new Set(book.item_ids || [])];
  book.updated_at = new Date().toISOString();
  state.lastImportSummary = { total: entries.length, newCount: added, existingCount: refreshed };
  return { total: entries.length, added, refreshed };
}

function renderWordbookListTable(book, items, offset) {
  if (!items.length) {
    return `<div class="empty-state"><h2>暂无词条</h2><p>这本词书还没有导入内容。</p></div>`;
  }
  return `
    <div class="wordbook-table-wrap">
      <table class="wordbook-table">
        <thead>
          <tr>
            <th>#</th>
            <th>正面</th>
            <th>中文释义</th>
            <th>英文释义</th>
            <th>类型</th>
            <th>学习</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, index) => {
            const progress = item.wordbook_progress?.[book.id] || {};
            const status = progress.skipped || item.skipped ? "已跳过" : progress.learned_at ? "已学" : "未学";
            const editable = Boolean(state.items[item.id]);
            const editButton = editable
              ? `<button class="chip-button" type="button" data-edit-item="${item.id}">编辑</button>`
              : `<button class="chip-button" type="button" data-edit-wordbook-entry="${book.id}" data-entry-id="${item.external_entry_id || item.id}">编辑</button>`;
            return `
              <tr>
                <td>${offset + index + 1}</td>
                <td class="word-cell">${renderInlineMarkdown(item.front)}</td>
                <td>${renderInlineMarkdown(item.meaning_zh || "")}</td>
                <td>${renderInlineMarkdown(item.meaning_en || "")}</td>
                <td>${item.type === "sentence" ? "句子" : "单词"}</td>
                <td><span class="status-pill">${status} · ${item.learned_count || 0} 次</span></td>
                <td>${editButton}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderWordbookPagination(currentPage, totalPages, totalItems) {
  return `
    <div class="wordbook-pagination">
      <button class="ghost-button" type="button" data-wordbook-page="${Math.max(1, currentPage - 1)}" ${currentPage <= 1 ? "disabled" : ""}>上一页</button>
      <span>${totalItems ? `${((currentPage - 1) * WORDBOOK_DETAIL_PAGE_SIZE) + 1}-${Math.min(currentPage * WORDBOOK_DETAIL_PAGE_SIZE, totalItems)} / ${totalItems}` : "0 / 0"}</span>
      <button class="ghost-button" type="button" data-wordbook-page="${Math.min(totalPages, currentPage + 1)}" ${currentPage >= totalPages ? "disabled" : ""}>下一页</button>
    </div>
  `;
}

function wordbookTypeLabel(type) {
  return {
    default: "默认",
    rivstart: "Sverige",
    sverige: "Sverige",
    custom: "自定义"
  }[type] || "自定义";
}

function ratingLabel(rating) {
  return { again: "忘了", hard: "困难", good: "记得", easy: "很熟" }[rating];
}

function renderQueueList(cards) {
  if (!cards.length) return `<div class="empty-state"><h2>队列为空</h2><p>没有需要显示的复习卡。</p></div>`;
  return `
    <div class="queue-strip">
      ${cards.map((card) => {
        const item = state.items[card.item_id];
        return `
          <div class="queue-row">
            <div>
              <strong>${renderInlineMarkdown(card.front)}</strong>
              <div class="word-meta">
                <span class="tag">${item ? languageLabel(item.language) : "Unknown"}</span>
                <span class="tag">${item?.type === "sentence" ? "sentence" : "word"}</span>
                <span class="tag">${card.review_lane}</span>
              </div>
            </div>
            <span class="status-pill">${card.repetitions} 次</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function vocabularyIndexEntries() {
  const entries = new Map();
  const put = (input, options = {}) => {
    const language = normalizeLanguage(input.language || "sv");
    const type = normalizeType(input.type || "word");
    const front = clean(input.front);
    if (!front) return;
    const key = `${language}|${type}|${normalizeKey(front)}`;
    const existing = entries.get(key) || {
      id: key,
      language,
      type,
      front,
      meaning_zh: "",
      meaning_en: "",
      explanation: "",
      sentence: "",
      sentence_translation: "",
      tags: [],
      learned_count: 0,
      skipped: false,
      localItemId: "",
      source_values: [],
      source_tags: [],
      external_refs: []
    };
    const prefer = Boolean(options.local);
    existing.front = prefer ? front : existing.front || front;
    existing.meaning_zh = prefer ? (input.meaning_zh || existing.meaning_zh) : existing.meaning_zh || input.meaning_zh || "";
    existing.meaning_en = prefer ? (input.meaning_en || existing.meaning_en) : existing.meaning_en || input.meaning_en || "";
    existing.explanation = prefer ? (input.explanation || existing.explanation) : existing.explanation || input.explanation || "";
    existing.sentence = prefer ? (input.sentence || existing.sentence) : existing.sentence || input.sentence || "";
    existing.sentence_translation = prefer ? (input.sentence_translation || existing.sentence_translation) : existing.sentence_translation || input.sentence_translation || "";
    existing.tags = [...new Set([...(existing.tags || []), ...normalizeTags(input.tags || [])])];
    existing.learned_count = Math.max(existing.learned_count || 0, Number(input.learned_count || 0));
    existing.skipped = Boolean(existing.skipped || input.skipped);
    if (options.local) existing.localItemId = input.id;
    if (options.source) {
      existing.source_values = [...new Set([...existing.source_values, options.source])];
      existing.source_tags = [...new Set([...existing.source_tags, sourceLabel(options.source)])];
    }
    if (options.externalEntryId) {
      existing.external_refs = [
        ...existing.external_refs.filter((ref) => ref.entryId !== options.externalEntryId),
        { entryId: options.externalEntryId, source: options.source, bookId: wordbookForSource(options.source, language) }
      ];
    }
    entries.set(key, existing);
  };

  rivstartDataset().entries.forEach((entry) => {
    put({
      language: "sv",
      type: entry.type,
      front: entry.front,
      meaning_zh: entry.meaning_zh,
      meaning_en: entry.meaning_en,
      explanation: entry.explanation,
      sentence: entry.sentence,
      sentence_translation: entry.sentence_translation,
      tags: entry.tags
    }, { source: entry.source, externalEntryId: entry.id });
  });

  Object.values(state.items || {}).forEach((item) => {
    put(item, { source: item.source || "manual", local: true });
    (item.source_refs || []).forEach((ref) => {
      if (!ref?.source_name || !SVERIGE_WORDBOOK_SOURCES[ref.source_name]) return;
      put(item, { source: ref.source_name, local: true, externalEntryId: ref.id });
    });
  });

  return [...entries.values()].sort((a, b) =>
    a.language.localeCompare(b.language) ||
    a.type.localeCompare(b.type) ||
    a.front.localeCompare(b.front, "sv")
  );
}

function filteredVocabularyEntries() {
  const query = normalizeKey(state.filters.query);
  return vocabularyIndexEntries().filter((entry) => {
    const queryText = [
      entry.front,
      entry.meaning_zh,
      entry.meaning_en,
      entry.explanation,
      entry.sentence,
      entry.sentence_translation,
      entry.tags.join(" "),
      entry.source_tags.join(" ")
    ].join(" ");
    const matchesQuery = !query || normalizeKey(queryText).includes(query);
    const matchesLanguage = state.filters.language === "all" || entry.language === state.filters.language;
    const matchesType = state.filters.type === "all" || entry.type === state.filters.type;
    const matchesSource = state.filters.source === "all" || entry.source_values.includes(state.filters.source);
    return matchesQuery && matchesLanguage && matchesType && matchesSource;
  });
}

function alphabetKey(value) {
  const first = clean(value).charAt(0).toLocaleUpperCase("sv-SE");
  return /^[A-ZÅÄÖ]$/u.test(first) ? first : "#";
}

function allWordsEntries() {
  return vocabularyIndexEntries().filter((entry) => entry.type === "word");
}

function allWordsLetters(entries) {
  const letters = [...new Set(entries.map((entry) => alphabetKey(entry.front)))];
  return letters.sort((a, b) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b, "sv");
  });
}

function entryEditButton(entry, compact = false) {
  if (entry.localItemId) {
    return `<button class="${compact ? "chip-button" : "hammer-button card-edit"}" type="button" data-edit-item="${entry.localItemId}" title="编辑卡片" aria-label="编辑卡片">${compact ? "编辑" : "🔨"}</button>`;
  }
  const ref = entry.external_refs.find((item) => item.bookId && item.entryId);
  if (!ref) return "";
  return `<button class="${compact ? "chip-button" : "hammer-button card-edit"}" type="button" data-edit-wordbook-entry="${ref.bookId}" data-entry-id="${ref.entryId}" title="编辑卡片" aria-label="编辑卡片">${compact ? "编辑" : "🔨"}</button>`;
}

function renderSourceTags(entry) {
  return entry.source_tags.map((source) => `<span class="source-pill">${escapeHtml(source)}</span>`).join("");
}

function renderLibraryEntryCard(entry) {
  const item = entry.localItemId ? state.items[entry.localItemId] : null;
  const card = item ? Object.values(state.cards).find((candidate) => candidate.item_id === item.id) : null;
  return `
    <article class="word-card">
      ${entryEditButton(entry)}
      <div>
        <h3>${renderInlineMarkdown(entry.front)}</h3>
        <p>${renderInlineMarkdown(entry.meaning_zh || entry.meaning_en || "未填写释义")}</p>
      </div>
      <p>${renderMarkdownBlock(entry.explanation || entry.sentence || "未填写解释文本。")}</p>
      <div class="word-meta">
        <span class="tag">${languageLabel(entry.language)}</span>
        <span class="tag">${entry.type}</span>
        ${renderSourceTags(entry)}
        ${entry.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
      <div class="table-actions">
        ${item ? `<button class="chip-button" type="button" data-refresh-card="${item.id}">加入最新复习</button>` : ""}
        ${card ? `<button class="chip-button" type="button" data-toggle-suspend="${card.id}">${card.suspended ? "恢复" : "暂停"}</button>` : ""}
      </div>
    </article>
  `;
}

function renderLibrary() {
  const filtered = filteredVocabularyEntries();
  const visible = filtered.slice(0, SEARCH_RESULT_LIMIT);
  return `
    <section class="panel panel-pad">
      <div class="section-head">
        <div>
          <h2>词句库</h2>
          <p>找到 ${filtered.length} 条${filtered.length > SEARCH_RESULT_LIMIT ? ` · 仅显示前 ${SEARCH_RESULT_LIMIT} 条` : ""}</p>
        </div>
        <button class="primary-button" type="button" data-jump="capture">添加词句</button>
      </div>
      <div class="filters">
        <input type="search" id="itemSearch" value="${escapeHtml(state.filters.query)}" placeholder="搜索正面 / 释义 / 解释 / 例句">
        ${renderLanguageFilter("filterLanguage", state.filters.language)}
        <select id="typeFilter">
          <option value="all">全部类型</option>
          <option value="word">单词</option>
          <option value="sentence">句子</option>
        </select>
        <select id="sourceFilter">
          <option value="all">全部来源</option>
          <option value="manual">手动</option>
          <option value="wordbook_import">单词书导入</option>
          <option value="obsidian_import">Obsidian</option>
          <option value="rivstart_a1a2_anki">Sverige A1/A2</option>
          <option value="rivstart_b1b2_anki">Sverige B1/B2</option>
          <option value="rivstart_b2c1_anki">Sverige B2/C1</option>
          <option value="demo">演示</option>
        </select>
      </div>
      <div class="vocab-grid">
        ${visible.map(renderLibraryEntryCard).join("") || `<div class="empty-state"><h2>没有匹配条目</h2><p>调整关键词或筛选条件。</p></div>`}
      </div>
    </section>
  `;
}

function renderAllWords() {
  const entries = allWordsEntries();
  const letters = allWordsLetters(entries);
  const selectedLetter = letters.includes(state.allWords?.letter) ? state.allWords.letter : (letters[0] || "");
  state.allWords = { letter: selectedLetter };
  const visible = selectedLetter ? entries.filter((entry) => alphabetKey(entry.front) === selectedLetter) : [];
  return `
    <div class="panel-grid">
      <section class="panel panel-pad span-12">
        <div class="section-head">
          <div>
            <h2>全部单词列表</h2>
            <p>共 ${entries.length} 个单词 · 当前 ${selectedLetter || "-"}：${visible.length} 个</p>
          </div>
        </div>
        <div class="alphabet-tabs">
          ${letters.map((letter) => `
            <button class="chip-button ${letter === selectedLetter ? "is-active" : ""}" type="button" data-allwords-letter="${letter}">
              ${escapeHtml(letter)}
            </button>
          `).join("")}
        </div>
      </section>

      <section class="panel panel-pad span-12">
        ${renderAllWordsTable(visible)}
      </section>
    </div>
  `;
}

function renderAllWordsTable(entries) {
  if (!entries.length) return `<div class="empty-state"><h2>暂无单词</h2><p>当前字母下没有词条。</p></div>`;
  return `
    <div class="wordbook-table-wrap">
      <table class="wordbook-table all-words-table">
        <thead>
          <tr>
            <th>单词</th>
            <th>中文释义</th>
            <th>英文释义</th>
            <th>来源</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map((entry) => `
            <tr>
              <td class="word-cell">${renderInlineMarkdown(entry.front)}</td>
              <td>${renderInlineMarkdown(entry.meaning_zh || "")}</td>
              <td>${renderInlineMarkdown(entry.meaning_en || "")}</td>
              <td><div class="word-source-stack">${renderSourceTags(entry)}</div></td>
              <td>${entryEditButton(entry, true)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSettings() {
  const panels = [
    ["defaults", "默认行为"],
    ["cloud", "Account"],
    ["sync", "同步"],
    ["anki", "Anki 后路"]
  ];
  const panelIds = panels.map(([id]) => id);
  const panel = panelIds.includes(state.settingsPanel) ? state.settingsPanel : "defaults";
  state.settingsPanel = panel;
  return `
    <div class="panel-grid">
      <section class="panel panel-pad span-12">
        <div class="settings-tabs">
          ${panels.map(([id, label]) => `
            <button class="chip-button ${panel === id ? "is-active" : ""}" type="button" data-settings-panel="${id}">${label}</button>
          `).join("")}
        </div>
      </section>
      ${panel === "sync" ? `<div class="span-12 settings-tool-shell">${renderSync()}</div>` : ""}
      ${panel === "anki" ? `<div class="span-12 settings-tool-shell">${renderExport()}</div>` : ""}
      ${panel === "cloud" ? renderCloudSettings() : ""}
      ${panel === "defaults" ? renderSettingsDefaults() : ""}
    </div>
  `;
}

function renderCloudSettings() {
  const config = cloudConfig();
  const hasClient = Boolean(window.supabase?.createClient);
  const connected = Boolean(cloud.user);
  return `
    <section class="panel panel-pad span-7">
      <div class="section-head">
        <div>
          <h2>Account / Cloud</h2>
          <p>Use Supabase Auth and a user-owned database row to keep vocabulary, study progress, and settings online.</p>
        </div>
      </div>
      <form class="capture-form" id="cloudConfigForm">
        <label>Supabase URL
          <input name="url" type="text" value="${escapeHtml(config.url || "")}" placeholder="https://project.supabase.co">
        </label>
        <label>Supabase Anon Key
          <input name="anonKey" type="text" value="${escapeHtml(config.anonKey || "")}" placeholder="public anon key">
        </label>
        <div class="table-actions">
          <button class="primary-button" type="submit">Save Backend</button>
          <button class="ghost-button" type="button" data-cloud-reconnect ${hasClient ? "" : "disabled"}>Reconnect</button>
        </div>
      </form>
    </section>

    <section class="panel panel-pad span-5">
      <div class="section-head">
        <div>
          <h2>${connected ? "Signed In" : "Sign In"}</h2>
          <p>${escapeHtml(cloud.status || "Not configured")}</p>
        </div>
      </div>
      ${connected ? `
        <div class="cloud-account-card">
          <strong>${escapeHtml(cloud.user.email || cloud.user.id)}</strong>
          <span>Cloud database: ${escapeHtml(CLOUD_TABLE)}</span>
        </div>
        <div class="table-actions">
          <button class="primary-button" type="button" data-cloud-sync ${cloud.syncing ? "disabled" : ""}>Sync Now</button>
          <button class="ghost-button" type="button" data-cloud-signout>Sign Out</button>
        </div>
      ` : `
        <form class="capture-form" id="cloudAuthForm">
          <label>Email
            <input name="email" type="text" autocomplete="email" placeholder="you@example.com">
          </label>
          <label>Password
            <input name="password" type="password" autocomplete="current-password" placeholder="at least 6 characters">
          </label>
          <div class="table-actions">
            <button class="primary-button" type="submit" data-auth-action="signin" ${cloud.configured ? "" : "disabled"}>Sign In</button>
            <button class="ghost-button" type="submit" data-auth-action="signup" ${cloud.configured ? "" : "disabled"}>Sign Up</button>
          </div>
        </form>
      `}
    </section>

    <section class="panel panel-pad span-12">
      <div class="wordbook-detail-note">
        <h2>Database Schema</h2>
        <p>Run the SQL in supabase-schema.sql once in your Supabase project, then save the project URL and anon key here.</p>
      </div>
    </section>
  `;
}

function renderSettingsDefaults() {
  const settings = currentSettings();
  const profile = reviewProfile();
  return `
    <section class="panel panel-pad span-7">
      <div class="section-head">
        <div>
          <h2>默认行为</h2>
        </div>
      </div>
      <form class="capture-form" id="settingsForm">
        <div class="form-row">
          <label>界面语言
            <select id="languageMode" name="uiMode">
              <option value="zh" ${state.uiMode === "zh" ? "selected" : ""}>中文主导</option>
              <option value="en" ${state.uiMode === "en" ? "selected" : ""}>English first</option>
              <option value="both" ${state.uiMode === "both" ? "selected" : ""}>双语并列</option>
            </select>
          </label>
          <label>默认搜索语言
            <select id="settingsDefaultSearchLanguage" name="defaultSearchLanguage">
              ${settingsLanguageOptions(settings.defaultSearchLanguage, true)}
            </select>
          </label>
        </div>
        <div class="form-row">
          <label>默认卡片语言
            <select id="settingsDefaultCardLanguage" name="defaultCardLanguage">
              ${settingsLanguageOptions(settings.defaultCardLanguage, false)}
            </select>
          </label>
          <label>复习频率
            <select id="settingsReviewFrequency" name="reviewFrequency">
              ${Object.entries(reviewFrequencyProfiles).map(([value, item]) => `
                <option value="${value}" ${settings.reviewFrequency === value ? "selected" : ""}>${item.label}</option>
              `).join("")}
            </select>
          </label>
        </div>
        <label>每组学习单词数
          <input id="settingsStudyBatchSize" type="number" min="1" max="100" step="1" value="${settings.studyBatchSize}">
        </label>
        <p class="notice-line">${escapeHtml(profile.description)}</p>
        <div class="table-actions">
          <button class="ghost-button" type="button" data-reset-settings>重置设置</button>
          <button class="danger-button" type="button" id="resetDemo">重置演示数据</button>
        </div>
      </form>
    </section>

    <section class="panel panel-pad span-5">
      <div class="section-head">
        <div>
          <h2>当前默认值</h2>
        </div>
      </div>
      <div class="import-summary">
        ${miniStat("搜索", languageLabel(settings.defaultSearchLanguage))}
        ${miniStat("新卡片", languageLabel(settings.defaultCardLanguage))}
        ${miniStat("复习", profile.label)}
        ${miniStat("学习组", settings.studyBatchSize)}
      </div>
      <p class="notice-line">修改默认搜索语言会同步更新搜索页的语言筛选。</p>
    </section>
  `;
}

function renderItemCard(item) {
  const card = Object.values(state.cards).find((candidate) => candidate.item_id === item.id);
  return `
    <article class="word-card">
      <button class="hammer-button card-edit" type="button" data-edit-item="${item.id}" title="编辑卡片" aria-label="编辑卡片">🔨</button>
      <div>
        <h3>${renderInlineMarkdown(item.front)}</h3>
        <p>${renderInlineMarkdown(item.meaning_zh || item.meaning_en || "未填写释义")}</p>
      </div>
      <p>${renderMarkdownBlock(item.explanation || item.sentence || "未填写解释文本。")}</p>
      <div class="word-meta">
        <span class="tag">${languageLabel(item.language)}</span>
        <span class="tag">${item.type}</span>
        <span class="source-pill">${sourceLabel(item.source)}</span>
        ${item.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
      <div class="table-actions">
        <button class="chip-button" type="button" data-refresh-card="${item.id}">加入最新复习</button>
        <button class="chip-button" type="button" data-toggle-suspend="${card?.id || ""}">${card?.suspended ? "恢复" : "暂停"}</button>
      </div>
    </article>
  `;
}

function renderCapture() {
  const draft = state.captureDraft;
  const bookDraft = state.wordbookImportDraft || emptyWordbookImportDraft(currentSettings().defaultCardLanguage);
  const panel = state.capturePanel || "manual";
  return `
    <div class="panel-grid">
      <section class="panel panel-pad span-12">
        <div class="settings-tabs capture-tabs">
          <button class="chip-button ${panel === "manual" ? "is-active" : ""}" type="button" data-capture-panel="manual">添加词句</button>
          <button class="chip-button ${panel === "wordbook" ? "is-active" : ""}" type="button" data-capture-panel="wordbook">导入单词书</button>
          <button class="chip-button ${panel === "obsidian" ? "is-active" : ""}" type="button" data-capture-panel="obsidian">Obsidian 导入</button>
        </div>
      </section>

      ${panel === "manual" ? `
      <section class="panel panel-pad span-12 capture-page">
        <div class="section-head">
          <div>
            <h2>添加词句</h2>
          </div>
        </div>
        <form class="capture-form" id="captureForm">
          <div class="form-row">
            <label>类型
              <select name="type">
                <option value="word" ${draft.type === "word" ? "selected" : ""}>单词</option>
                <option value="sentence" ${draft.type === "sentence" ? "selected" : ""}>句子</option>
              </select>
            </label>
            <label>语言
              ${renderLanguageSelect("language", draft.language)}
            </label>
          </div>
          <label>正面
            <input name="front" type="text" value="${escapeHtml(draft.front)}" placeholder="word or sentence">
          </label>
          <div class="form-row">
            <label>中文释义
              <input name="meaning_zh" type="text" value="${escapeHtml(draft.meaning_zh)}">
            </label>
            <label>English meaning
              <input name="meaning_en" type="text" value="${escapeHtml(draft.meaning_en)}">
            </label>
          </div>
          <label>解释文本
            <textarea name="explanation" placeholder="语义、用法、搭配、易错点">${escapeHtml(draft.explanation)}</textarea>
          </label>
          <div class="form-row">
            <label>例句
              <input name="sentence" type="text" value="${escapeHtml(draft.sentence)}">
            </label>
            <label>例句翻译
              <input name="sentence_translation" type="text" value="${escapeHtml(draft.sentence_translation)}">
            </label>
          </div>
          <label>标签
            <input name="tags" type="text" value="${escapeHtml(draft.tags)}" placeholder="reading, noun, phrase">
          </label>
          <div class="table-actions">
            <button class="primary-button" type="submit">保存并加入复习</button>
            <button class="ghost-button" type="button" data-clear-draft>清空</button>
          </div>
        </form>
      </section>` : ""}

      ${panel === "wordbook" ? `
      <section class="panel panel-pad span-12 capture-page">
        <div class="section-head">
          <div>
            <h2>导入单词书</h2>
            <p>每行一个词条：正面、中文释义、英文释义，用 Tab、逗号或短横线分隔。</p>
          </div>
        </div>
        <form class="capture-form" id="wordbookImportForm">
          <div class="form-row">
            <label>单词书名称
              <input name="name" type="text" value="${escapeHtml(bookDraft.name)}" placeholder="自定义单词书">
            </label>
            <label>语言
              ${renderLanguageSelect("wordbookLanguage", bookDraft.language).replace('name="wordbookLanguage"', 'name="language"')}
            </label>
          </div>
          <label>单词书内容
            <textarea name="text" class="wordbook-import-box" placeholder="Haus\t房子\thouse&#10;läsa - 读 - to read">${escapeHtml(bookDraft.text)}</textarea>
          </label>
          <label>已有单词书
            <select id="wordbookExisting">
              <option value="">创建新单词书</option>
              ${Object.values(state.wordbooks || {}).filter((book) => book.type !== "default").map((book) => `
                <option value="${book.id}">${languageLabel(book.language)} · ${escapeHtml(book.name)}</option>
              `).join("")}
            </select>
          </label>
          <div class="table-actions">
            <button class="primary-button" type="submit">导入单词书</button>
            <button class="ghost-button" type="button" data-clear-wordbook-import>清空</button>
          </div>
        </form>
      </section>` : ""}

      ${panel === "obsidian" ? `<div class="span-12 settings-tool-shell">${renderImport()}</div>` : ""}
    </div>
  `;
}

function renderImport() {
  const preview = state.importPreview || [];
  const summary = summarizeImport(preview);
  return `
    <div class="panel-grid">
      <section class="panel panel-pad span-5">
        <div class="section-head">
          <div>
            <h2>Obsidian 阅读笔记</h2>
          </div>
        </div>
        <div class="import-drop">
          <textarea id="importText" spellcheck="false">${escapeHtml(state.importText || "")}</textarea>
          <div class="form-row">
            <label>默认语言
              ${renderLanguageSelect("importLanguage", state.currentLanguage === "all" ? "sv" : state.currentLanguage)}
            </label>
            <label>Obsidian 文件夹 / 路径
              <input id="importFolder" type="text" value="${escapeHtml(state.importFolder || "")}" placeholder="German/2026-06-30.md">
            </label>
          </div>
          <div class="form-row">
            <label>默认类型
              <select id="importDefaultType">
                <option value="word">单词</option>
                <option value="sentence">句子</option>
              </select>
            </label>
            <span></span>
          </div>
          <div class="import-controls">
            <input id="markdownFile" type="file" accept=".md,text/markdown,text/plain">
            <button class="ghost-button" type="button" data-parse-import>解析</button>
            <button class="primary-button" type="button" data-commit-import ${preview.length ? "" : "disabled"}>加入复习</button>
          </div>
        </div>
      </section>

      <section class="panel panel-pad span-7">
        <div class="section-head">
          <div>
            <h2>导入确认</h2>
          </div>
        </div>
        <div class="import-summary">
          ${miniStat("识别", summary.total)}
          ${miniStat("新增", summary.newCount)}
          ${miniStat("已有", summary.existingCount)}
          ${miniStat("疑似", summary.possibleCount)}
        </div>
        ${renderImportTable(preview)}
      </section>
    </div>
  `;
}

function renderImportTable(preview) {
  if (!preview.length) return `<div class="empty-state"><h2>尚未解析</h2><p>粘贴阅读笔记后点击解析。</p></div>`;
  return `
    <table class="import-table">
      <thead><tr><th>正面</th><th>语言</th><th>类型</th><th>释义</th><th>状态</th></tr></thead>
      <tbody>
        ${preview.map((item) => `
          <tr>
            <td class="word-cell">${escapeHtml(item.front)}</td>
            <td>${escapeHtml(languageLabel(item.language))}</td>
            <td>${item.type}</td>
            <td>${escapeHtml(item.meaning_zh || item.meaning_en || item.explanation)}</td>
            <td><span class="status-pill">${matchLabel(item.match_status)}</span></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderExport() {
  const rows = ankiRows();
  const text = state.exportFormat === "csv" ? toCsv(rows) : toTsv(rows);
  return `
    <section class="panel panel-pad">
      <div class="section-head">
        <div>
          <h2>Anki 导出预留</h2>
        </div>
        <select id="exportFormat">
          <option value="tsv">TSV</option>
          <option value="csv">CSV</option>
        </select>
      </div>
      <div class="export-schema">
        ${["Deck", "NoteType", "Front", "MeaningZH", "MeaningEN", "Explanation", "Example", "Tags"].map((field) => `<span class="tag">${field}</span>`).join("")}
      </div>
      <textarea class="export-box" readonly>${escapeHtml(text)}</textarea>
      <div class="table-actions">
        <button class="primary-button" type="button" data-copy-export>复制导出文本</button>
      </div>
    </section>
  `;
}

function renderSync() {
  const touched = touchedSinceCheckpoint();
  const exportText = syncMarkdown(touched);
  const logStart = state.syncCheckpoint?.logIndex || 0;
  const logs = (state.syncLog || []).slice(logStart);
  return `
    <div class="panel-grid">
      <section class="panel panel-pad span-5">
        <div class="section-head">
          <div><h2>网页 → Obsidian</h2></div>
          <button class="ghost-button" type="button" data-mark-sync-checkpoint ${logs.length ? "" : "disabled"}>标记已备份</button>
        </div>
        <div class="sync-stats">
          ${miniStat("待同步卡", touched.length)}
          ${miniStat("日志条目", logs.length)}
        </div>
        <textarea class="export-box sync-box" readonly>${escapeHtml(exportText)}</textarea>
        <div class="table-actions">
          <button class="primary-button" type="button" data-copy-sync ${touched.length ? "" : "disabled"}>复制 Markdown</button>
        </div>
      </section>

      <section class="panel panel-pad span-7">
        <div class="section-head">
          <div><h2>Obsidian → 网页</h2></div>
        </div>
        <div class="import-drop">
          <textarea id="syncInboundText" spellcheck="false" placeholder="粘贴 Obsidian 当前卡片 Markdown">${escapeHtml(state.syncInboundText || "")}</textarea>
          <div class="form-row">
            <label>默认语言
              ${renderLanguageSelect("syncLanguage", state.currentLanguage === "all" ? "sv" : state.currentLanguage)}
            </label>
            <label>Obsidian 文件夹 / 路径
              <input id="syncFolder" type="text" value="${escapeHtml(state.importFolder || "")}" placeholder="German/cards.md">
            </label>
          </div>
          <div class="table-actions">
            <button class="ghost-button" type="button" data-preview-sync-inbound>预览</button>
            <button class="primary-button" type="button" data-accept-sync-inbound ${state.syncPreview?.length ? "" : "disabled"}>接受 Obsidian 当前版本</button>
          </div>
        </div>
        ${renderSyncPreview()}
      </section>

      <section class="panel panel-pad span-12">
        <div class="section-head">
          <div><h2>同步日志</h2></div>
        </div>
        ${renderSyncLog(logs)}
      </section>
    </div>
  `;
}

function syncMarkdown(items) {
  if (!items.length) return "";
  return items.map((item) => {
    const front = item.front.trim().startsWith("[[") ? item.front : `[[${item.front}]]`;
    return [
      `### ${languageLabel(item.language)} / ${item.type}`,
      `#### ${front}`,
      item.meaning_en || "",
      item.meaning_zh || "",
      item.explanation ? `解释: ${item.explanation}` : "",
      item.sentence ? `例句: ${item.sentence}` : "",
      item.sentence_translation ? `翻译: ${item.sentence_translation}` : "",
      item.tags.length ? `Tags: ${item.tags.join(", ")}` : ""
    ].filter(Boolean).join("\n");
  }).join("\n\n");
}

function renderSyncPreview() {
  const preview = state.syncPreview || [];
  if (!preview.length) return `<div class="empty-state"><h2>无预览</h2><p>粘贴 Obsidian 卡片后点击预览。</p></div>`;
  return renderImportTable(preview);
}

function renderSyncLog(logs) {
  if (!logs.length) return `<div class="empty-state"><h2>没有待备份修改</h2><p>当前检查点之后没有卡片变更。</p></div>`;
  return `
    <table class="import-table">
      <thead><tr><th>时间</th><th>卡片</th><th>动作</th><th>说明</th></tr></thead>
      <tbody>
        ${logs.slice().reverse().map((log) => {
          const item = state.items[log.item_id];
          return `<tr><td>${new Date(log.at).toLocaleString()}</td><td class="word-cell">${item ? renderInlineMarkdown(item.front) : escapeHtml(log.item_id)}</td><td>${escapeHtml(log.action)}</td><td>${escapeHtml(log.detail || "")}</td></tr>`;
        }).join("")}
      </tbody>
    </table>
  `;
}

function renderEditorModal() {
  if (!state.editor?.itemId) return "";
  const item = state.items[state.editor.itemId];
  if (!item) return "";
  return `
    <div class="modal-backdrop" role="presentation" data-close-editor>
      <section class="edit-modal" role="dialog" aria-modal="true" aria-label="编辑卡片" data-editor-panel>
        <div class="section-head">
          <div>
            <h2>编辑卡片</h2>
          </div>
          <button class="hammer-button" type="button" data-close-editor aria-label="关闭">×</button>
        </div>
        <form class="capture-form" id="editForm">
          <div class="form-row">
            <label>类型
              <select name="type">
                <option value="word" ${item.type === "word" ? "selected" : ""}>单词</option>
                <option value="sentence" ${item.type === "sentence" ? "selected" : ""}>句子</option>
              </select>
            </label>
            <label>语言
              ${renderLanguageSelect("editLanguage", item.language).replace('name="editLanguage"', 'name="language"')}
            </label>
          </div>
          <label>正面
            <input name="front" type="text" value="${escapeHtml(item.front)}">
          </label>
          <div class="form-row">
            <label>中文释义
              <input name="meaning_zh" type="text" value="${escapeHtml(item.meaning_zh)}">
            </label>
            <label>English meaning
              <input name="meaning_en" type="text" value="${escapeHtml(item.meaning_en)}">
            </label>
          </div>
          <label>解释文本
            <textarea name="explanation">${escapeHtml(item.explanation)}</textarea>
          </label>
          <div class="form-row">
            <label>例句
              <input name="sentence" type="text" value="${escapeHtml(item.sentence)}">
            </label>
            <label>例句翻译
              <input name="sentence_translation" type="text" value="${escapeHtml(item.sentence_translation)}">
            </label>
          </div>
          <label>标签
            <input name="tags" type="text" value="${escapeHtml(item.tags.join(", "))}">
          </label>
          <div class="table-actions">
            <button class="primary-button" type="submit">保存修改</button>
            <button class="ghost-button" type="button" data-close-editor>取消</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderWordbookEditorModal() {
  if (!state.wordbookEditor?.bookId) return "";
  const book = state.wordbooks?.[state.wordbookEditor.bookId];
  if (!book) return "";
  return `
    <div class="modal-backdrop" role="presentation" data-close-wordbook-editor>
      <section class="edit-modal" role="dialog" aria-modal="true" aria-label="Edit vocabulary book" data-wordbook-editor-panel>
        <div class="section-head">
          <div>
            <h2>Edit Vocabulary</h2>
          </div>
          <button class="hammer-button" type="button" data-close-wordbook-editor aria-label="Close">×</button>
        </div>
        <form class="capture-form" id="wordbookEditForm">
          <label>Name
            <input name="name" type="text" value="${escapeHtml(book.name)}">
          </label>
          <div class="form-row">
            <label>Language
              ${renderLanguageSelect("wordbookEditLanguage", book.language).replace('name="wordbookEditLanguage"', 'name="language"')}
            </label>
            <label>Type
              <select name="type">
                ${["default", "custom", "sverige", "rivstart"].map((type) => `
                  <option value="${type}" ${book.type === type ? "selected" : ""}>${escapeHtml(wordbookTypeLabel(type))}</option>
                `).join("")}
              </select>
            </label>
          </div>
          <label>Source
            <input name="source" type="text" value="${escapeHtml(book.source || "")}" placeholder="manual or imported source">
          </label>
          <div class="table-actions">
            <button class="primary-button" type="submit">Save</button>
            <button class="ghost-button" type="button" data-close-wordbook-editor>Cancel</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderRivstart() {
  const dataset = rivstartDataset();
  if (!dataset.entries.length) {
    return renderEmpty("没有加载 Sverige 数据", "确认 sverige-vocabulary.js 已在页面中加载。", "", "");
  }
  const filtered = filteredRivstartEntries();
  const visible = filtered.slice(0, 160);
  const sverigeSources = new Set(Object.keys(SVERIGE_WORDBOOK_SOURCES));
  const imported = new Set(Object.values(state.items)
    .filter((item) => sverigeSources.has(item.source))
    .map((item) => `${item.source}|${item.normalized_key}`));
  const canImport = filtered.length > 0 && filtered.length <= RIVSTART_IMPORT_LIMIT;
  const levels = dataset.collection?.levels || rivstartLevels();
  const levelStats = levels.map((level) => {
    const total = dataset.entries.filter((entry) => entry.level === level).length;
    const due = Object.values(state.cards).filter((card) => {
      const item = state.items[card.item_id];
      return item?.source_refs?.some((ref) => ref.level === level) && isDue(card);
    }).length;
    return metric(level, total, `${due} due after import`, "span-3");
  }).join("");

  return `
    <div class="panel-grid">
      ${levelStats}
      ${metric("当前筛选", filtered.length, `上限 ${RIVSTART_IMPORT_LIMIT} 条/次`, "span-3")}
      ${metric("已导入", imported.size, "Sverige items", "span-3")}

      <section class="panel panel-pad span-12">
        <div class="section-head">
          <div>
            <h2>分批导入</h2>
            <p>按级别、章节或关键词缩小范围后导入。三本 Sverige 单词书保留在外部数据文件中，避免本地保存超限。</p>
          </div>
          <div class="table-actions">
            <button class="primary-button" type="button" data-import-rivstart ${canImport ? "" : "disabled"}>
              导入当前筛选
            </button>
          </div>
        </div>
        <div class="filters">
          <input type="search" id="rivstartSearch" value="${escapeHtml(state.rivstart.query)}" placeholder="搜索瑞典语 / 英文 / 词形 / 标签">
          <select id="rivstartLevel">
            ${["all", ...rivstartLevels()].map((level) => `<option value="${level}" ${state.rivstart.level === level ? "selected" : ""}>${level === "all" ? "全部级别" : level}</option>`).join("")}
          </select>
          <select id="rivstartChapter">
            ${rivstartChapterOptions().map((chapter) => `<option value="${escapeHtml(chapter.value)}" ${state.rivstart.chapter === chapter.value ? "selected" : ""}>${escapeHtml(chapter.label)}</option>`).join("")}
          </select>
        </div>
        ${!canImport && filtered.length ? `<p class="notice-line">当前筛选 ${filtered.length} 条，超过单次导入上限。建议先选择具体章节，或继续搜索缩小范围。</p>` : ""}
        ${renderRivstartTable(visible, imported)}
        ${filtered.length > visible.length ? `<p class="notice-line">仅预览前 ${visible.length} 条；导入会处理当前筛选范围内的全部 ${filtered.length} 条。</p>` : ""}
      </section>
    </div>
  `;
}

function renderRivstartTable(entries, imported) {
  if (!entries.length) return `<div class="empty-state"><h2>没有匹配词条</h2><p>调整筛选条件。</p></div>`;
  return `
    <table class="import-table rivstart-table">
      <thead><tr><th>瑞典语</th><th>英文</th><th>级别</th><th>位置</th><th>信息</th><th>状态</th></tr></thead>
      <tbody>
        ${entries.map((entry) => `
          <tr>
            <td class="word-cell">${escapeHtml(entry.front)}</td>
            <td>${escapeHtml(entry.meaning_en)}</td>
            <td>${escapeHtml(entry.level)}</td>
            <td>${escapeHtml([entry.chapter_label, entry.page ? `p.${entry.page}` : ""].filter(Boolean).join(" · "))}</td>
            <td>${escapeHtml([entry.conjugation, entry.word_class, entry.gender].filter(Boolean).join(" · "))}</td>
            <td><span class="status-pill">${imported.has(`${entry.source}|${normalizeKey(entry.front)}`) ? "已导入" : "未导入"}</span></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderLanguageSelect(name, selected) {
  return `
    <select name="${name}" id="${name}">
      ${languagePresets.map((item) => `<option value="${item.code}" ${selected === item.code ? "selected" : ""}>${item.label}</option>`).join("")}
    </select>
  `;
}

function renderLanguageFilter(id, selected) {
  const existing = uniqueLanguages().map((code) => ({ code, label: languageLabel(code) }));
  if (selected !== "all" && !existing.some((item) => item.code === selected)) {
    existing.push({ code: selected, label: languageLabel(selected) });
  }
  const options = [{ code: "all", label: "全部语言" }, ...existing];
  return `
    <select id="${id}">
      ${options.map((item) => `<option value="${item.code}" ${selected === item.code ? "selected" : ""}>${item.label}</option>`).join("")}
    </select>
  `;
}

function settingsLanguageOptions(selected, includeAll) {
  const codes = [...new Set([
    ...languagePresets.map((item) => item.code),
    ...uniqueLanguages(),
    selected
  ].filter(Boolean))];
  const options = [
    ...(includeAll ? [{ code: "all", label: "全部语言" }] : []),
    ...codes.map((code) => ({ code, label: languageLabel(code) }))
  ];
  return options.map((item) => `<option value="${item.code}" ${selected === item.code ? "selected" : ""}>${item.label}</option>`).join("");
}

function currentSettings() {
  state.settings = { ...defaultSettings(), ...(state.settings || {}) };
  if (!reviewFrequencyProfiles[state.settings.reviewFrequency]) state.settings.reviewFrequency = "standard";
  if (!state.settings.defaultSearchLanguage) state.settings.defaultSearchLanguage = "all";
  if (!state.settings.defaultCardLanguage || state.settings.defaultCardLanguage === "all") {
    state.settings.defaultCardLanguage = "sv";
  }
  state.settings.studyBatchSize = clampNumber(state.settings.studyBatchSize, 1, 100, 10);
  return state.settings;
}

function reviewProfile() {
  const settings = currentSettings();
  return reviewFrequencyProfiles[settings.reviewFrequency] || reviewFrequencyProfiles.standard;
}

function filteredItems() {
  const query = normalizeKey(state.filters.query);
  return Object.values(state.items).filter((item) => {
    const queryText = [item.front, item.meaning_zh, item.meaning_en, item.explanation, item.sentence, item.tags.join(" ")].join(" ");
    const matchesQuery = !query || normalizeKey(queryText).includes(query);
    const matchesLanguage = state.filters.language === "all" || item.language === state.filters.language;
    const matchesType = state.filters.type === "all" || item.type === state.filters.type;
    const matchesSource = state.filters.source === "all" || item.source === state.filters.source;
    return matchesQuery && matchesLanguage && matchesType && matchesSource;
  }).sort((a, b) => a.front.localeCompare(b.front));
}

function hasLibrarySearchCriteria() {
  return Boolean(
    normalizeKey(state.filters.query) ||
    state.filters.type !== "all" ||
    state.filters.source !== "all"
  );
}

function sourceLabel(source) {
  return {
    demo: "演示",
    manual: "手动",
    wordbook_import: "单词书导入",
    obsidian_import: "Obsidian",
    rivstart_a1a2_anki: "Sverige A1/A2",
    rivstart_b1b2_anki: "Sverige B1/B2",
    rivstart_b2c1_anki: "Sverige B2/C1"
  }[source] || source;
}

function miniStat(label, value) {
  return `<div class="mini-stat"><span>${label}</span><strong>${value}</strong></div>`;
}

function summarizeImport(entries) {
  return {
    total: entries.length,
    newCount: entries.filter((item) => item.match_status === "new").length,
    existingCount: entries.filter((item) => item.match_status === "existing").length,
    possibleCount: entries.filter((item) => item.match_status === "possible_duplicate").length
  };
}

function matchLabel(status) {
  return { new: "新增", existing: "已存在", possible_duplicate: "疑似重复", failed: "解析失败" }[status] || status;
}

function renderEmpty(title, body, jump, button) {
  return `
    <section class="empty-state">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(body)}</p>
      ${jump ? `<button class="primary-button" type="button" data-jump="${jump}">${escapeHtml(button)}</button>` : ""}
    </section>
  `;
}

function bindViewEvents() {
  const navList = document.querySelector("#navList");
  if (navList) {
    navList.onclick = (event) => {
      if (window.__memoryDeckNavHandled) return;
      const button = event.target.closest("[data-view]");
      if (!button) return;
      state.activeView = button.dataset.view;
      resetViewState(state.activeView);
      saveState();
      render();
    };
  }

  document.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeView = button.dataset.jump;
      saveState();
      render();
    });
  });

  document.querySelectorAll("[data-settings-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeView = "settings";
      state.settingsPanel = button.dataset.settingsPanel;
      saveState();
      render();
    });
  });

  document.querySelectorAll("[data-open-add-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeView = "capture";
      state.capturePanel = button.dataset.openAddPanel;
      saveState();
      render();
    });
  });

  document.querySelectorAll("[data-set-language]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentLanguage = button.dataset.setLanguage;
      state.filters.language = button.dataset.setLanguage;
      saveState();
      render();
    });
  });

  const currentLanguage = document.querySelector("#currentLanguage");
  if (currentLanguage) {
    currentLanguage.addEventListener("change", () => {
      state.currentLanguage = currentLanguage.value;
      saveState();
      render();
    });
  }
  const trendRange = document.querySelector("#trendRange");
  if (trendRange) {
    trendRange.addEventListener("change", () => {
      state.trendRange = Number(trendRange.value);
      saveState();
      render();
    });
  }

  bindLibraryEvents();
  bindAllWordsEvents();
  bindWordbookEvents();
  bindCaptureEvents();
  bindReviewEvents();
  bindStudyEvents();
  bindImportEvents();
  bindSyncEvents();
  bindExportEvents();
  bindCloudEvents();
  bindSettingsEvents();
  bindEditorEvents();
}

function bindLibraryEvents() {
  const search = document.querySelector("#itemSearch");
  if (search) {
    search.addEventListener("input", () => {
      state.filters.query = search.value;
      saveState();
      render();
    });
  }
  const filterLanguage = document.querySelector("#filterLanguage");
  if (filterLanguage) {
    filterLanguage.value = state.filters.language;
    filterLanguage.addEventListener("change", () => {
      state.filters.language = filterLanguage.value;
      saveState();
      render();
    });
  }
  const typeFilter = document.querySelector("#typeFilter");
  if (typeFilter) {
    typeFilter.value = state.filters.type;
    typeFilter.addEventListener("change", () => {
      state.filters.type = typeFilter.value;
      saveState();
      render();
    });
  }
  const sourceFilter = document.querySelector("#sourceFilter");
  if (sourceFilter) {
    sourceFilter.value = state.filters.source;
    sourceFilter.addEventListener("change", () => {
      state.filters.source = sourceFilter.value;
      saveState();
      render();
    });
  }
  document.querySelectorAll("[data-refresh-card]").forEach((button) => {
    button.addEventListener("click", () => {
      refreshItem(button.dataset.refreshCard, "latest");
    });
  });
  document.querySelectorAll("[data-toggle-suspend]").forEach((button) => {
    button.addEventListener("click", () => toggleSuspend(button.dataset.toggleSuspend));
  });
}

function bindAllWordsEvents() {
  document.querySelectorAll("[data-allwords-letter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.allWords = { letter: button.dataset.allwordsLetter || "" };
      saveState();
      render();
    });
  });
}

function bindWordbookEvents() {
  document.querySelectorAll("[data-open-wordbook-details]").forEach((button) => {
    button.addEventListener("click", () => {
      const book = state.wordbooks?.[button.dataset.openWordbookDetails];
      if (!book) return;
      state.wordbooksView = { selectedBookId: book.id, page: 1 };
      saveState();
      render();
    });
  });

  document.querySelectorAll("[data-study-book]").forEach((button) => {
    button.addEventListener("click", () => {
      const book = state.wordbooks?.[button.dataset.studyBook];
      if (!book) return;
      ensureWordbookImported(book);
      state.study.selectedLanguage = book.language === "all" ? "all" : book.language;
      state.study.selectedBookId = book.id;
      state.study.currentItemId = null;
      state.study.showAnswer = false;
      state.activeView = "study";
      saveState();
      render();
    });
  });

  document.querySelectorAll("[data-close-wordbook]").forEach((button) => {
    button.addEventListener("click", () => {
      state.wordbooksView = { selectedBookId: "", page: 1 };
      state.activeView = "wordbooks";
      saveState();
      render();
    });
  });

  document.querySelectorAll("[data-wordbook-page]").forEach((button) => {
    button.addEventListener("click", () => {
      state.wordbooksView = {
        selectedBookId: state.wordbooksView?.selectedBookId || "",
        page: Number(button.dataset.wordbookPage) || 1
      };
      state.activeView = "wordbooks";
      saveState();
      render();
    });
  });

  document.querySelectorAll("[data-edit-wordbook]").forEach((button) => {
    button.addEventListener("click", () => openWordbookEditor(button.dataset.editWordbook));
  });
}

function bindCaptureEvents() {
  document.querySelectorAll("[data-capture-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      state.capturePanel = button.dataset.capturePanel;
      saveState();
      render();
    });
  });

  const form = document.querySelector("#captureForm");
  if (form) {
    form.addEventListener("input", () => {
      state.captureDraft = Object.fromEntries(new FormData(form).entries());
      saveState();
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      if (!clean(data.front)) {
        toast("正面不能为空");
        return;
      }
      const item = createItem({ ...data, tags: data.tags }, "manual");
      upsertItem(item, "latest");
      state.captureDraft = emptyDraft(currentSettings().defaultCardLanguage);
      state.activeView = "review";
      saveState();
      render();
      toast("已保存并加入复习");
    });
  }
  const clear = document.querySelector("[data-clear-draft]");
  if (clear) {
    clear.addEventListener("click", () => {
      state.captureDraft = emptyDraft(currentSettings().defaultCardLanguage);
      saveState();
      render();
    });
  }
  const bookForm = document.querySelector("#wordbookImportForm");
  if (bookForm) {
    bookForm.addEventListener("input", () => {
      state.wordbookImportDraft = Object.fromEntries(new FormData(bookForm).entries());
      saveState();
    });
    bookForm.addEventListener("submit", (event) => {
      event.preventDefault();
      importWordbookFromForm(new FormData(bookForm));
    });
  }
  const clearBook = document.querySelector("[data-clear-wordbook-import]");
  if (clearBook) {
    clearBook.addEventListener("click", () => {
      state.wordbookImportDraft = emptyWordbookImportDraft(currentSettings().defaultCardLanguage);
      saveState();
      render();
    });
  }
}

function bindReviewEvents() {
  const show = document.querySelector("[data-show-answer]");
  if (show) {
    show.addEventListener("click", () => {
      state.review.showAnswer = true;
      saveState();
      render();
    });
  }
  document.querySelectorAll("[data-rate]").forEach((button) => {
    button.addEventListener("click", () => rateCurrentCard(button.dataset.rate));
  });
  document.querySelectorAll("[data-skip-card]").forEach((button) => {
    button.addEventListener("click", () => skipItem(button.dataset.skipCard, "review"));
  });
  document.querySelectorAll("[data-review-prev]").forEach((button) => {
    button.addEventListener("click", () => restorePreviousCard("review"));
  });
}

function bindStudyEvents() {
  const clearStudyBook = document.querySelector("[data-clear-study-book]");
  if (clearStudyBook) {
    clearStudyBook.addEventListener("click", () => {
      state.study.selectedLanguage = "all";
      state.study.selectedBookId = "all";
      state.study.currentItemId = null;
      state.study.showAnswer = false;
      saveState();
      render();
    });
  }

  const language = document.querySelector("#studyLanguage");
  if (language) {
    language.addEventListener("change", () => {
      state.study.selectedLanguage = language.value;
      state.study.selectedBookId = "all";
      state.study.currentItemId = null;
      state.study.showAnswer = false;
      saveState();
      render();
    });
  }
  const book = document.querySelector("#studyBook");
  if (book) {
    book.addEventListener("change", () => {
      state.study.selectedBookId = book.value;
      state.study.currentItemId = null;
      state.study.showAnswer = false;
      saveState();
      render();
    });
  }
  const show = document.querySelector("[data-study-show-answer]");
  if (show) {
    show.addEventListener("click", () => {
      state.study.showAnswer = true;
      saveState();
      render();
    });
  }
  document.querySelectorAll("[data-study-prev]").forEach((button) => {
    button.addEventListener("click", () => restorePreviousCard("study"));
  });
  const learned = document.querySelector("[data-study-learned]");
  if (learned) learned.addEventListener("click", markCurrentStudyLearned);
  const skip = document.querySelector("[data-study-skip]");
  if (skip) skip.addEventListener("click", () => {
    const itemId = state.study.currentItemId;
    if (itemId) skipItem(itemId, "study");
  });
}

function bindImportEvents() {
  const importText = document.querySelector("#importText");
  if (importText) {
    importText.addEventListener("input", () => {
      state.importText = importText.value;
      saveState();
    });
  }
  const importFolder = document.querySelector("#importFolder");
  if (importFolder) {
    importFolder.addEventListener("input", () => {
      state.importFolder = importFolder.value;
      saveState();
    });
  }
  const file = document.querySelector("#markdownFile");
  if (file) {
    file.addEventListener("change", async () => {
      const selected = file.files && file.files[0];
      if (!selected) return;
      state.importText = await selected.text();
      state.importFolder = selected.webkitRelativePath || selected.name || state.importFolder;
      state.importPreview = parseObsidian(state.importText, importOptions());
      saveState();
      render();
    });
  }
  const parse = document.querySelector("[data-parse-import]");
  if (parse) {
    parse.addEventListener("click", () => {
      state.importText = document.querySelector("#importText").value;
      state.importPreview = parseObsidian(state.importText, importOptions());
      saveState();
      render();
      toast(`解析完成：${state.importPreview.length} 条`);
    });
  }
  const commit = document.querySelector("[data-commit-import]");
  if (commit) commit.addEventListener("click", commitImport);
}

function importWordbookFromForm(formData) {
  const data = Object.fromEntries(formData.entries());
  const language = normalizeLanguage(data.language || currentSettings().defaultCardLanguage);
  const existingBookId = document.querySelector("#wordbookExisting")?.value || "";
  const parsed = parseWordbookText(data.text, language);
  if (!parsed.length) {
    toast("没有可导入的词条");
    return;
  }
  const book = existingBookId && state.wordbooks[existingBookId]
    ? state.wordbooks[existingBookId]
    : createWordbook(clean(data.name) || `${languageLabel(language)}自定义单词书`, language);
  let added = 0;
  let refreshed = 0;
  parsed.forEach((entry) => {
    const item = createItem({
      ...entry,
      type: "word",
      language,
      tags: ["wordbook", normalizeKey(book.name).replace(/\s+/g, "-")],
      latest_wordbook_id: book.id,
      source_refs: [{
        id: uniqueId("source"),
        type: "wordbook_import",
        source_name: book.name,
        imported_at: new Date().toISOString()
      }]
    }, "wordbook_import");
    const result = upsertItem(item, "learning");
    if (result.status === "new") added += 1;
    else refreshed += 1;
  });
  state.wordbookImportDraft = emptyWordbookImportDraft(language);
  state.study.selectedLanguage = language;
  state.study.selectedBookId = book.id;
  state.study.currentItemId = null;
  state.study.showAnswer = false;
  state.activeView = "study";
  saveState();
  render();
  toast(`单词书导入完成：新增 ${added}，更新 ${refreshed}`);
}

function createWordbook(name, language) {
  const now = new Date().toISOString();
  const id = uniqueId(`book-${language}`);
  const book = {
    id,
    name,
    language,
    type: "custom",
    item_ids: [],
    created_at: now,
    updated_at: now
  };
  state.wordbooks[id] = book;
  return book;
}

function parseWordbookText(text, language) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => parseWordbookLine(line, language))
    .filter((entry) => entry.front);
}

function parseWordbookLine(line, language) {
  const parts = line.includes("\t")
    ? line.split("\t")
    : line.includes(",")
      ? line.split(",")
      : line.split(/\s+[-–—]\s+/);
  const cleanParts = parts.map(clean).filter(Boolean);
  const front = stripWiki(cleanParts[0] || "");
  const rest = cleanParts.slice(1);
  const meaning_zh = rest.find((part) => /[\u4e00-\u9fff]/.test(part)) || "";
  const meaning_en = rest.find((part) => /[a-zA-Z]/.test(part) && !/[\u4e00-\u9fff]/.test(part)) || "";
  return {
    front,
    language,
    meaning_zh,
    meaning_en,
    explanation: rest.filter((part) => part !== meaning_zh && part !== meaning_en).join("；")
  };
}

function bindRivstartEvents() {
  const query = document.querySelector("#rivstartSearch");
  if (query) {
    query.addEventListener("input", () => {
      state.rivstart.query = query.value;
      saveState();
      render();
    });
  }
  const level = document.querySelector("#rivstartLevel");
  if (level) {
    level.addEventListener("change", () => {
      state.rivstart.level = level.value;
      state.rivstart.chapter = "all";
      saveState();
      render();
    });
  }
  const chapter = document.querySelector("#rivstartChapter");
  if (chapter) {
    chapter.addEventListener("change", () => {
      state.rivstart.chapter = chapter.value;
      saveState();
      render();
    });
  }
  const importButton = document.querySelector("[data-import-rivstart]");
  if (importButton) importButton.addEventListener("click", importFilteredRivstart);
}

function bindExportEvents() {
  const format = document.querySelector("#exportFormat");
  if (format) {
    format.value = state.exportFormat;
    format.addEventListener("change", () => {
      state.exportFormat = format.value;
      saveState();
      render();
    });
  }
  const copy = document.querySelector("[data-copy-export]");
  if (copy) {
    copy.addEventListener("click", async () => {
      const rows = ankiRows();
      const text = state.exportFormat === "csv" ? toCsv(rows) : toTsv(rows);
      await navigator.clipboard.writeText(text);
      toast("导出文本已复制");
    });
  }
}

function bindSettingsEvents() {
  const form = document.querySelector("#settingsForm");
  if (!form) return;
  const languageMode = document.querySelector("#languageMode");
  if (languageMode) {
    languageMode.addEventListener("change", (event) => {
      state.uiMode = event.target.value;
      saveState();
      render();
      toast("界面语言已更新");
    });
  }
  const defaultSearchLanguage = document.querySelector("#settingsDefaultSearchLanguage");
  if (defaultSearchLanguage) {
    defaultSearchLanguage.addEventListener("change", () => {
      currentSettings().defaultSearchLanguage = defaultSearchLanguage.value;
      state.filters.language = defaultSearchLanguage.value;
      saveState();
      render();
      toast("默认搜索语言已更新");
    });
  }
  const defaultCardLanguage = document.querySelector("#settingsDefaultCardLanguage");
  if (defaultCardLanguage) {
    defaultCardLanguage.addEventListener("change", () => {
      currentSettings().defaultCardLanguage = defaultCardLanguage.value;
      state.captureDraft.language = defaultCardLanguage.value;
      saveState();
      render();
      toast("默认卡片语言已更新");
    });
  }
  const reviewFrequency = document.querySelector("#settingsReviewFrequency");
  if (reviewFrequency) {
    reviewFrequency.addEventListener("change", () => {
      currentSettings().reviewFrequency = reviewFrequency.value;
      saveState();
      render();
      toast("复习频率已更新");
    });
  }
  const studyBatchSize = document.querySelector("#settingsStudyBatchSize");
  if (studyBatchSize) {
    studyBatchSize.addEventListener("change", () => {
      currentSettings().studyBatchSize = clampNumber(studyBatchSize.value, 1, 100, 10);
      state.study.currentItemId = null;
      saveState();
      render();
      toast("学习组大小已更新");
    });
  }
  const reset = document.querySelector("[data-reset-settings]");
  if (reset) {
    reset.addEventListener("click", () => {
      state.settings = defaultSettings();
      state.filters.language = state.settings.defaultSearchLanguage;
      state.captureDraft.language = state.settings.defaultCardLanguage;
      saveState();
      render();
      toast("设置已重置");
    });
  }
  const resetDemo = document.querySelector("#resetDemo");
  if (resetDemo) {
    resetDemo.addEventListener("click", () => {
      localStorage.removeItem(LEGACY_KEY);
      localStorage.removeItem(STORAGE_KEY);
      state = createInitialState();
      state.activeView = "settings";
      saveState();
      render();
      toast("演示数据已重置");
    });
  }
}

function bindCloudEvents() {
  const configForm = document.querySelector("#cloudConfigForm");
  if (configForm) {
    configForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(configForm).entries());
      saveCloudConfig(data);
      cloud.client = null;
      cloud.user = null;
      cloud.status = "Backend saved";
      await initCloud();
      render();
      toast("Backend configuration saved");
    });
  }

  const reconnect = document.querySelector("[data-cloud-reconnect]");
  if (reconnect) {
    reconnect.addEventListener("click", async () => {
      await initCloud();
      render();
      toast(cloud.configured ? "Cloud reconnected" : "Cloud not configured");
    });
  }

  const authForm = document.querySelector("#cloudAuthForm");
  if (authForm) {
    authForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitter = event.submitter;
      const data = Object.fromEntries(new FormData(authForm).entries());
      const email = clean(data.email);
      const password = String(data.password || "");
      if (!cloud.client || !email || !password) {
        toast("Enter backend config, email, and password");
        return;
      }
      cloud.status = "Authenticating...";
      render();
      const action = submitter?.dataset.authAction || "signin";
      const result = action === "signup"
        ? await cloud.client.auth.signUp({ email, password })
        : await cloud.client.auth.signInWithPassword({ email, password });
      if (result.error) {
        cloud.status = result.error.message;
        render();
        toast(result.error.message);
        return;
      }
      cloud.user = result.data.user || result.data.session?.user || null;
      cloud.status = cloud.user ? "Signed in" : "Check email to confirm signup";
      if (cloud.user) await loadCloudState();
      render();
    });
  }

  const sync = document.querySelector("[data-cloud-sync]");
  if (sync) {
    sync.addEventListener("click", async () => {
      const ok = await saveCloudState("manual");
      render();
      toast(ok ? "Cloud sync complete" : "Cloud sync failed");
    });
  }

  const signout = document.querySelector("[data-cloud-signout]");
  if (signout) {
    signout.addEventListener("click", async () => {
      if (cloud.client) await cloud.client.auth.signOut();
      cloud.user = null;
      cloud.status = "Signed out";
      render();
    });
  }
}

function bindSyncEvents() {
  const inbound = document.querySelector("#syncInboundText");
  if (inbound) {
    inbound.addEventListener("input", () => {
      state.syncInboundText = inbound.value;
      saveState();
    });
  }
  const folder = document.querySelector("#syncFolder");
  if (folder) {
    folder.addEventListener("input", () => {
      state.importFolder = folder.value;
      saveState();
    });
  }
  const preview = document.querySelector("[data-preview-sync-inbound]");
  if (preview) {
    preview.addEventListener("click", () => {
      state.syncInboundText = document.querySelector("#syncInboundText")?.value || "";
      const syncFolder = document.querySelector("#syncFolder")?.value || state.importFolder || "";
      const manualLanguage = document.querySelector("#syncLanguage")?.value || "sv";
      state.syncPreview = parseObsidian(state.syncInboundText, {
        language: inferLanguageFromPath(syncFolder) || manualLanguage,
        folder: syncFolder,
        type: "word"
      });
      saveState();
      render();
      toast(`预览 ${state.syncPreview.length} 条`);
    });
  }
  const accept = document.querySelector("[data-accept-sync-inbound]");
  if (accept) accept.addEventListener("click", acceptSyncInbound);

  const copy = document.querySelector("[data-copy-sync]");
  if (copy) {
    copy.addEventListener("click", async () => {
      await navigator.clipboard.writeText(syncMarkdown(touchedSinceCheckpoint()));
      toast("同步 Markdown 已复制");
    });
  }
  const checkpoint = document.querySelector("[data-mark-sync-checkpoint]");
  if (checkpoint) {
    checkpoint.addEventListener("click", () => {
      state.syncCheckpoint = { logIndex: (state.syncLog || []).length, at: new Date().toISOString() };
      saveState();
      render();
      toast("已标记备份检查点");
    });
  }
}

function acceptSyncInbound() {
  const preview = state.syncPreview || [];
  if (!preview.length) return;
  let added = 0;
  let refreshed = 0;
  preview.forEach((entry) => {
    entry.source_refs = [{
      id: uniqueId("source"),
      type: "obsidian_markdown",
      source_name: "manual-sync",
      folder: state.importFolder || "",
      imported_at: new Date().toISOString(),
      raw_text: (entry.raw_lines || []).join("\n")
    }];
    const existing = findExistingItem(entry);
    if (existing) {
      applyIncomingItem(existing, entry, true);
      ensureCard(existing, "latest");
      touchItem(existing.id, "accept_obsidian", "accepted Obsidian current card");
      refreshed += 1;
    } else {
      state.items[entry.id] = entry;
      ensureCard(entry, "latest");
      touchItem(entry.id, "accept_obsidian_new", "accepted new Obsidian card");
      added += 1;
    }
  });
  state.syncPreview = [];
  state.syncInboundText = "";
  saveState();
  render();
  toast(`已接受 Obsidian：新增 ${added}，更新 ${refreshed}`);
}

function applyIncomingItem(target, incoming, overwrite) {
  const fields = ["meaning_zh", "meaning_en", "explanation", "sentence", "sentence_translation"];
  fields.forEach((field) => {
    if (overwrite) {
      if (incoming[field]) target[field] = incoming[field];
    } else if (!target[field] && incoming[field]) {
      target[field] = incoming[field];
    }
  });
  target.tags = [...new Set([...(target.tags || []), ...(incoming.tags || [])])];
  target.source_refs = [...(target.source_refs || []), ...(incoming.source_refs || [])];
  target.last_seen_at = new Date().toISOString();
  target.updated_at = new Date().toISOString();
}

function bindEditorEvents() {
  document.querySelectorAll("[data-edit-item]").forEach((button) => {
    button.addEventListener("click", () => openEditor(button.dataset.editItem));
  });
  document.querySelectorAll("[data-edit-wordbook-entry]").forEach((button) => {
    button.addEventListener("click", () => openWordbookEntryEditor(button.dataset.editWordbookEntry, button.dataset.entryId));
  });
  document.querySelectorAll("[data-close-editor]").forEach((node) => {
    node.addEventListener("click", (event) => {
      if (event.target.closest("[data-editor-panel]") && !event.target.matches("[data-close-editor]")) return;
      closeEditor();
    });
  });
  const panel = document.querySelector("[data-editor-panel]");
  if (panel) {
    panel.addEventListener("click", (event) => event.stopPropagation());
  }
  const form = document.querySelector("#editForm");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      saveEditor(new FormData(form));
    });
  }

  document.querySelectorAll("[data-close-wordbook-editor]").forEach((node) => {
    node.addEventListener("click", (event) => {
      if (event.target.closest("[data-wordbook-editor-panel]") && !event.target.matches("[data-close-wordbook-editor]")) return;
      closeWordbookEditor();
    });
  });
  const wordbookPanel = document.querySelector("[data-wordbook-editor-panel]");
  if (wordbookPanel) {
    wordbookPanel.addEventListener("click", (event) => event.stopPropagation());
  }
  const wordbookForm = document.querySelector("#wordbookEditForm");
  if (wordbookForm) {
    wordbookForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveWordbookEditor(new FormData(wordbookForm));
    });
  }
}

function openEditor(itemId) {
  if (!state.items[itemId]) return;
  state.editor = { itemId };
  render();
}

function openWordbookEntryEditor(bookId, entryId) {
  const item = ensureWordbookEntryEditable(bookId, entryId);
  if (!item) return;
  state.editor = { itemId: item.id };
  saveState();
  render();
}

function ensureWordbookEntryEditable(bookId, entryId) {
  const book = state.wordbooks?.[bookId];
  if (!book) return null;
  const existing = state.items?.[entryId];
  if (existing) {
    addItemToWordbook(state, book.id, existing.id, true);
    return existing;
  }
  const entry = rivstartDataset().entries.find((candidate) => candidate.id === entryId && (!book.source || candidate.source === book.source));
  if (!entry) return null;
  const item = rivstartEntryToItem(entry);
  item.latest_wordbook_id = book.id;
  const result = upsertItem(item, "learning");
  addItemToWordbook(state, book.id, result.item.id, true);
  return result.item;
}

function closeEditor() {
  state.editor = { itemId: null };
  render();
}

function saveEditor(formData) {
  const item = state.items[state.editor?.itemId];
  if (!item) return;
  const data = Object.fromEntries(formData.entries());
  const oldId = item.id;
  item.type = normalizeType(data.type);
  item.language = normalizeLanguage(data.language);
  item.front = clean(data.front);
  item.meaning_zh = clean(data.meaning_zh);
  item.meaning_en = clean(data.meaning_en);
  item.explanation = clean(data.explanation);
  item.sentence = clean(data.sentence);
  item.sentence_translation = clean(data.sentence_translation);
  item.tags = normalizeTags(data.tags);
  item.normalized_key = normalizeKey(item.front);
  item.updated_at = new Date().toISOString();
  item.anki_note_fields.note_type = item.type === "sentence" ? "Sentence" : "Vocabulary";

  const nextId = itemId(item.language, item.type, item.front);
  if (nextId !== oldId && !state.items[nextId]) {
    delete state.items[oldId];
    item.id = nextId;
    state.items[nextId] = item;
    Object.values(state.wordbooks || {}).forEach((book) => {
      book.item_ids = (book.item_ids || []).map((id) => id === oldId ? nextId : id);
      book.item_ids = [...new Set(book.item_ids)];
    });
    Object.values(state.cards).forEach((card) => {
      if (card.item_id === oldId) card.item_id = nextId;
    });
    state.editor.itemId = nextId;
  }
  Object.values(state.cards).forEach((card) => {
    if (card.item_id === item.id) {
      card.front = item.front;
      card.back = cardBack(item);
      card.card_type = item.type === "sentence" ? "sentence_recall" : "word_recall";
      card.updated_at = new Date().toISOString();
    }
  });
  touchItem(item.id, "edit", "manual card edit");
  closeEditor();
  toast("卡片已更新");
}

function openWordbookEditor(bookId) {
  if (!state.wordbooks?.[bookId]) return;
  state.wordbookEditor = { bookId };
  render();
}

function closeWordbookEditor() {
  state.wordbookEditor = { bookId: null };
  render();
}

function saveWordbookEditor(formData) {
  const book = state.wordbooks?.[state.wordbookEditor?.bookId];
  if (!book) return;
  const data = Object.fromEntries(formData.entries());
  book.name = clean(data.name) || book.name;
  book.language = normalizeLanguage(data.language);
  book.type = clean(data.type) || book.type || "custom";
  book.source = clean(data.source);
  book.updated_at = new Date().toISOString();
  closeWordbookEditor();
  toast("Vocabulary book updated");
}

function importOptions() {
  const folder = document.querySelector("#importFolder")?.value || state.importFolder || "";
  const manualLanguage = document.querySelector("#importLanguage")?.value || (state.currentLanguage === "all" ? "sv" : state.currentLanguage);
  return {
    language: inferLanguageFromPath(folder) || manualLanguage,
    folder,
    type: document.querySelector("#importDefaultType")?.value || "word"
  };
}

function inferLanguageFromPath(path) {
  const normalized = String(path || "").toLowerCase();
  const rules = [
    ["german", "de"], ["deutsch", "de"], ["德语", "de"],
    ["swedish", "sv"], ["svenska", "sv"], ["瑞典语", "sv"],
    ["english", "en"], ["英语", "en"],
    ["spanish", "es"], ["español", "es"], ["西班牙语", "es"],
    ["french", "fr"], ["français", "fr"], ["法语", "fr"]
  ];
  const match = rules.find(([needle]) => normalized.includes(needle));
  return match ? match[1] : "";
}

function upsertItem(item, lane) {
  const existing = findExistingItem(item);
  const bookId = item.latest_wordbook_id || wordbookForSource(item.source, item.language);
  if (existing) {
    existing.meaning_zh = existing.meaning_zh || item.meaning_zh;
    existing.meaning_en = existing.meaning_en || item.meaning_en;
    existing.explanation = item.explanation || existing.explanation;
    existing.sentence = item.sentence || existing.sentence;
    existing.sentence_translation = item.sentence_translation || existing.sentence_translation;
    existing.tags = [...new Set([...existing.tags, ...item.tags])];
    existing.source_refs = [...(existing.source_refs || []), ...(item.source_refs || [])];
    existing.last_seen_at = new Date().toISOString();
    existing.updated_at = new Date().toISOString();
    addItemToWordbook(state, bookId, existing.id, true);
    ensureCard(existing, lane || "latest");
    touchItem(existing.id, "upsert_existing", "merged incoming item");
    return { item: existing, status: "existing" };
  }
  state.items[item.id] = item;
  addItemToWordbook(state, bookId, item.id, true);
  ensureCard(item, lane || "latest");
  touchItem(item.id, "create", `created from ${item.source}`);
  return { item, status: "new" };
}

function findExistingItem(item) {
  return Object.values(state.items).find((candidate) =>
    candidate.language === item.language &&
    candidate.type === item.type &&
    candidate.normalized_key === item.normalized_key
  );
}

function ensureCard(item, lane) {
  const existing = Object.values(state.cards).find((card) => card.item_id === item.id);
  if (existing) {
    existing.front = item.front;
    existing.back = cardBack(item);
    existing.review_lane = lane || existing.review_lane;
    existing.due_at = new Date().toISOString();
    existing.updated_at = new Date().toISOString();
    existing.suspended = Boolean(item.skipped);
    existing.skipped = Boolean(item.skipped);
    return existing;
  }
  const card = createCard(item, lane || "latest");
  card.suspended = Boolean(item.skipped);
  card.skipped = Boolean(item.skipped);
  state.cards[card.id] = card;
  return card;
}

function refreshItem(itemId, lane) {
  const item = state.items[itemId];
  if (!item) return;
  ensureCard(item, lane || "latest");
  saveState();
  render();
  toast("已加入最新复习");
}

function toggleSuspend(cardId) {
  const card = state.cards[cardId];
  if (!card) return;
  card.suspended = !card.suspended;
  card.updated_at = new Date().toISOString();
  saveState();
  render();
}

function cardActionSnapshot(itemId, mode) {
  const relatedCards = Object.values(state.cards).filter((card) => card.item_id === itemId);
  return {
    itemId,
    mode,
    item: cloneData(state.items[itemId]),
    cards: cloneData(relatedCards),
    reviewLogsLength: state.reviewLogs.length,
    syncLogLength: (state.syncLog || []).length,
    review: cloneData(state.review),
    study: cloneData(state.study)
  };
}

function pushCardHistory(itemId, mode) {
  const stack = mode === "study" ? state.study.history : state.review.history;
  stack.push(cardActionSnapshot(itemId, mode));
  if (stack.length > 50) stack.shift();
}

function restorePreviousCard(mode) {
  const stack = mode === "study" ? state.study.history : state.review.history;
  const snapshot = stack.pop();
  if (!snapshot) {
    toast("没有上一张可回溯");
    return;
  }
  restoreCardSnapshot(snapshot, stack);
  saveState();
  render();
  toast("已回到上一张");
}

function restoreCardSnapshot(snapshot, remainingStack) {
  if (snapshot.item) state.items[snapshot.itemId] = snapshot.item;
  Object.keys(state.cards).forEach((cardId) => {
    if (state.cards[cardId].item_id === snapshot.itemId) delete state.cards[cardId];
  });
  (snapshot.cards || []).forEach((card) => {
    state.cards[card.id] = card;
  });
  state.reviewLogs = state.reviewLogs.slice(0, snapshot.reviewLogsLength);
  state.syncLog = (state.syncLog || []).slice(0, snapshot.syncLogLength);
  state.review = snapshot.review || state.review;
  state.study = snapshot.study || state.study;
  if (snapshot.mode === "study") state.study.history = remainingStack;
  else state.review.history = remainingStack;
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function skipItem(itemId, mode) {
  const item = state.items[itemId];
  if (!item) return;
  pushCardHistory(itemId, mode);
  item.skipped = true;
  item.skipped_at = new Date().toISOString();
  const bookId = mode === "study" ? (state.study.selectedBookId === "all" ? item.latest_wordbook_id : state.study.selectedBookId) : item.latest_wordbook_id;
  if (bookId) {
    item.wordbook_progress = item.wordbook_progress || {};
    item.wordbook_progress[bookId] = {
      ...(item.wordbook_progress[bookId] || {}),
      skipped: true,
      seen_at: item.wordbook_progress[bookId]?.seen_at || new Date().toISOString()
    };
  }
  Object.values(state.cards).forEach((card) => {
    if (card.item_id === itemId) {
      card.suspended = true;
      card.skipped = true;
      card.updated_at = new Date().toISOString();
    }
  });
  touchItem(itemId, "skip", "skipped card");
  state.review.currentCardId = null;
  state.review.showAnswer = false;
  state.study.currentItemId = null;
  state.study.showAnswer = false;
  saveState();
  render();
  toast("已跳过，可用上一张撤销");
}

function markCurrentStudyLearned() {
  const item = state.items[state.study.currentItemId];
  if (!item) return;
  pushCardHistory(item.id, "study");
  const now = new Date().toISOString();
  const bookId = state.study.selectedBookId === "all" ? item.latest_wordbook_id : state.study.selectedBookId;
  item.wordbook_progress = item.wordbook_progress || {};
  item.wordbook_progress[bookId] = {
    ...(item.wordbook_progress[bookId] || {}),
    learned_at: now,
    skipped: false,
    seen_at: item.wordbook_progress[bookId]?.seen_at || now
  };
  item.learned_count = Number(item.learned_count || 0) + 1;
  item.first_learned_at = item.first_learned_at || now;
  item.last_learned_at = now;
  item.updated_at = now;
  ensureCard(item, "learning");
  touchItem(item.id, "study_learned", `learned in ${wordbookLabel(bookId)}`);
  state.study.currentItemId = null;
  state.study.showAnswer = false;
  saveState();
  render();
}

function rateCurrentCard(rating) {
  const card = state.cards[state.review.currentCardId];
  if (!card) return;
  pushCardHistory(card.item_id, "review");
  const oldInterval = card.interval_days || 0;
  const previousEase = card.ease_factor || 2.5;
  const profile = reviewProfile();
  let nextInterval = 1;

  if (rating === "again") {
    nextInterval = profile.againDays;
    card.ease_factor = Math.max(1.3, previousEase - 0.25);
    card.lapses += 1;
    card.review_lane = "learning";
  }
  if (rating === "hard") {
    nextInterval = Math.max(profile.hardMinDays, Math.ceil(oldInterval * profile.hardMultiplier));
    card.ease_factor = Math.max(1.3, previousEase - 0.1);
    card.review_lane = "standard";
  }
  if (rating === "good") {
    nextInterval = oldInterval <= 0
      ? profile.newGoodDays
      : Math.ceil(oldInterval * (profile.goodMultiplier || previousEase));
    card.review_lane = "standard";
  }
  if (rating === "easy") {
    nextInterval = oldInterval <= 0
      ? profile.newEasyDays
      : Math.ceil(oldInterval * (profile.easyMultiplier || previousEase + 0.5));
    card.ease_factor = previousEase + profile.easyBonus;
    card.review_lane = "standard";
  }

  card.interval_days = nextInterval;
  card.due_at = addDays(new Date(), nextInterval).toISOString();
  card.repetitions += 1;
  card.updated_at = new Date().toISOString();
  state.reviewLogs.push({
    id: uniqueId("review"),
    card_id: card.id,
    item_id: card.item_id,
    reviewed_at: new Date().toISOString(),
    rating,
    previous_interval: oldInterval,
    next_interval: nextInterval,
    previous_ease: previousEase,
    next_ease: card.ease_factor
  });
  state.review.showAnswer = false;
  state.review.currentCardId = null;
  saveState();
  render();
}

function parseObsidian(markdown, options) {
  const text = stripCodeBlocks(String(markdown || ""));
  const lines = text.split(/\r?\n/);
  const detectedLanguage = detectLanguage(lines) || options.language || "sv";
  const entries = [];
  let currentType = options.type || "word";
  let current = null;

  const finish = () => {
    if (!current) return;
    const item = importEntryToItem(current, detectedLanguage, currentType);
    classifyImport(item);
    entries.push(item);
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^language\s*:/i.test(line)) continue;
    const heading3 = line.match(/^###\s+(.+)$/);
    if (heading3) {
      finish();
      currentType = sectionToType(heading3[1], options.type);
      continue;
    }
    const heading4 = line.match(/^####\s+(.+)$/);
    const bullet = line.match(/^[-*]\s+(?:\[\[([^\]]+)\]\]|(.+?))(?:\s+[-–—]\s+(.+))?$/);
    if (heading4 || bullet) {
      finish();
      const front = stripWiki(heading4 ? heading4[1] : (bullet[1] || bullet[2]));
      current = {
        front,
        type: currentType,
        language: detectedLanguage,
        lines: bullet && bullet[3] ? [bullet[3]] : []
      };
      continue;
    }
    if (current) current.lines.push(line);
  }
  finish();
  return entries.filter((entry) => entry.front);
}

function stripCodeBlocks(text) {
  return text.replace(/```[\s\S]*?```/g, "");
}

function detectLanguage(lines) {
  const found = lines.find((line) => /^language\s*:/i.test(line.trim()));
  if (!found) return "";
  return normalizeLanguage(found.split(":").slice(1).join(":"));
}

function sectionToType(section, fallback) {
  const key = section.toLowerCase();
  if (key.includes("sentence") || key.includes("句")) return "sentence";
  return fallback || "word";
}

function importEntryToItem(entry, language, fallbackType) {
  const fields = parseEntryLines(entry.lines);
  const type = entry.type || fallbackType || "word";
  const importItem = {
    id: "",
    front: entry.front,
    type,
    language: entry.language || language,
    meaning_zh: fields.meaning_zh,
    meaning_en: fields.meaning_en,
    explanation: fields.explanation,
    sentence: fields.sentence,
    sentence_translation: fields.sentence_translation,
    tags: ["obsidian"],
    source: "obsidian_import",
    match_status: "new",
    matched_item_id: "",
    raw_lines: entry.lines
  };
  const item = createItem(importItem, "obsidian_import");
  item.raw_lines = entry.lines;
  item.match_status = "new";
  item.matched_item_id = "";
  return item;
}

function parseEntryLines(lines) {
  const out = { meaning_zh: "", meaning_en: "", explanation: "", sentence: "", sentence_translation: "" };
  const free = [];
  for (const raw of lines) {
    const line = clean(raw);
    const kv = line.match(/^(解释|说明|note|notes|explanation|例句|example|sentence|翻译|translation)\s*[:：]\s*(.+)$/i);
    if (kv) {
      const key = kv[1].toLowerCase();
      const value = kv[2].trim();
      if (key.includes("解释") || key.includes("note") || key.includes("explanation") || key.includes("说明")) out.explanation = value;
      else if (key.includes("例句") || key.includes("example") || key.includes("sentence")) out.sentence = value;
      else if (key.includes("翻译") || key.includes("translation")) out.sentence_translation = value;
      continue;
    }
    free.push(line);
  }
  for (const line of free) {
    if (!out.meaning_en && /[a-zA-Z]/.test(line) && !/[\u4e00-\u9fff]/.test(line)) {
      out.meaning_en = line;
    } else if (!out.meaning_zh && /[\u4e00-\u9fff]/.test(line)) {
      out.meaning_zh = line;
    } else if (!out.explanation) {
      out.explanation = line;
    } else if (!out.sentence) {
      out.sentence = line;
    }
  }
  return out;
}

function classifyImport(item) {
  const existing = findExistingItem(item);
  if (existing) {
    item.match_status = "existing";
    item.matched_item_id = existing.id;
    return item;
  }
  const possible = Object.values(state.items).find((candidate) =>
    candidate.language === item.language &&
    candidate.type === item.type &&
    item.meaning_en &&
    normalizeKey(candidate.meaning_en) === normalizeKey(item.meaning_en)
  );
  if (possible) {
    item.match_status = "possible_duplicate";
    item.matched_item_id = possible.id;
  }
  return item;
}

function commitImport() {
  const preview = state.importPreview || [];
  if (!preview.length) return;
  let added = 0;
  let refreshed = 0;
  const batchId = uniqueId("obsidian");
  preview.forEach((entry) => {
    if (!entry.front) return;
    entry.source_refs = [{
      id: uniqueId("source"),
      type: "obsidian_markdown",
      source_name: batchId,
      folder: state.importFolder || "",
      imported_at: new Date().toISOString(),
      raw_text: (entry.raw_lines || []).join("\n")
    }];
    const result = upsertItem(entry, "latest");
    if (result.status === "new") added += 1;
    else refreshed += 1;
  });
  state.lastImportSummary = { total: preview.length, newCount: added, existingCount: refreshed };
  state.importPreview = [];
  state.activeView = "review";
  saveState();
  render();
  toast(`导入完成：新增 ${added}，刷新 ${refreshed}`);
}

function rivstartDataset() {
  return window.SVERIGE_VOCABULARY || window.RIVSTART_VOCABULARY || { entries: [], stats: { total: 0, by_level: {} } };
}

function rivstartLevels() {
  return [...new Set(rivstartDataset().entries.map((entry) => entry.level))].sort();
}

function rivstartChapterOptions() {
  const entries = rivstartDataset().entries.filter((entry) =>
    state.rivstart.level === "all" || entry.level === state.rivstart.level
  );
  const chapters = [...new Map(entries.map((entry) => [
    entry.chapter || "unknown",
    {
      value: entry.chapter || "unknown",
      label: entry.chapter_label || `Kapitel ${entry.chapter || "?"}`
    }
  ])).values()];
  chapters.sort((a, b) => chapterSortValue(a.value) - chapterSortValue(b.value) || a.label.localeCompare(b.label));
  return [{ value: "all", label: "全部章节" }, ...chapters];
}

function chapterSortValue(value) {
  const number = Number(String(value).match(/\d+/)?.[0]);
  return Number.isFinite(number) ? number : -1;
}

function filteredRivstartEntries() {
  const query = normalizeKey(state.rivstart.query);
  return rivstartDataset().entries.filter((entry) => {
    const matchesLevel = state.rivstart.level === "all" || entry.level === state.rivstart.level;
    const matchesChapter = state.rivstart.chapter === "all" || String(entry.chapter || "unknown") === state.rivstart.chapter;
    const haystack = [
      entry.front,
      entry.meaning_en,
      entry.explanation,
      entry.conjugation,
      entry.word_class,
      entry.gender,
      ...(entry.tags || [])
    ].join(" ");
    const matchesQuery = !query || normalizeKey(haystack).includes(query);
    return matchesLevel && matchesChapter && matchesQuery;
  }).sort((a, b) => (
    a.level.localeCompare(b.level) ||
    chapterSortValue(a.chapter) - chapterSortValue(b.chapter) ||
    Number(a.page || 0) - Number(b.page || 0) ||
    a.front.localeCompare(b.front, "sv")
  ));
}

function rivstartEntryToItem(entry) {
  const item = createItem({
    type: entry.type,
    language: "sv",
    front: entry.front,
    meaning_zh: entry.meaning_zh,
    meaning_en: entry.meaning_en,
    explanation: entry.explanation,
    sentence: entry.sentence,
    sentence_translation: entry.sentence_translation,
    tags: entry.tags,
    source_refs: [{
      id: entry.id,
      type: "anki_apkg",
      source_name: entry.source,
      level: entry.level,
      chapter: entry.chapter,
      page: entry.page,
      imported_at: new Date().toISOString()
    }]
  }, entry.source);
  item.anki_note_fields.deck_hint = `Swedish::Sverige::${entry.level}`;
  item.anki_note_fields.fields = ["Front", "MeaningEN", "Explanation", "Chapter", "Page", "Tags"];
  return item;
}

function importFilteredRivstart() {
  const entries = filteredRivstartEntries();
  if (!entries.length) return;
  if (entries.length > RIVSTART_IMPORT_LIMIT) {
    toast(`当前 ${entries.length} 条，超过单次上限 ${RIVSTART_IMPORT_LIMIT}`);
    return;
  }
  let added = 0;
  let refreshed = 0;
  entries.forEach((entry) => {
    const result = upsertItem(rivstartEntryToItem(entry), "latest");
    if (result.status === "new") added += 1;
    else refreshed += 1;
  });
  state.lastImportSummary = { total: entries.length, newCount: added, existingCount: refreshed };
  const saved = saveState();
  render();
  toast(saved ? `Sverige 导入完成：新增 ${added}，刷新 ${refreshed}` : "导入后保存失败：请减少批量大小");
}

function ankiRows() {
  return Object.values(state.items).map((item) => ({
    Deck: `${languageLabel(item.language)}::Reading`,
    NoteType: item.anki_note_fields.note_type,
    Front: item.front,
    MeaningZH: item.meaning_zh,
    MeaningEN: item.meaning_en,
    Explanation: item.explanation,
    Example: [item.sentence, item.sentence_translation].filter(Boolean).join(" / "),
    Tags: item.tags.join(" ")
  }));
}

function toTsv(rows) {
  const headers = ["Deck", "NoteType", "Front", "MeaningZH", "MeaningEN", "Explanation", "Example", "Tags"];
  return [headers.join("\t"), ...rows.map((row) => headers.map((key) => sanitizeCell(row[key], "\t")).join("\t"))].join("\n");
}

function toCsv(rows) {
  const headers = ["Deck", "NoteType", "Front", "MeaningZH", "MeaningEN", "Explanation", "Example", "Tags"];
  return [headers.join(","), ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(","))].join("\n");
}

function sanitizeCell(value, delimiter) {
  return String(value || "").replaceAll("\n", " ").replaceAll(delimiter, " ").trim();
}

function csvCell(value) {
  const text = sanitizeCell(value, ",");
  return `"${text.replaceAll('"', '""')}"`;
}

function toast(message) {
  const old = document.querySelector(".toast");
  if (old) old.remove();
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);
  window.setTimeout(() => node.remove(), 2400);
}

render();
initCloud();
