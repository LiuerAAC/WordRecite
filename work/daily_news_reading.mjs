#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULT_OUTPUT_DIR = "Daily News Reading";

const languageConfig = {
  de: {
    name: "German",
    label: "Deutsch",
    locale: "de-DE",
    defaultLevel: "B1",
    feeds: [
      {
        name: "Deutschlandfunk Nachrichten",
        url: "https://www.deutschlandfunk.de/nachrichten-100.rss"
      },
      {
        name: "Tagesschau",
        url: "https://www.tagesschau.de/xml/rss2/"
      },
      {
        name: "Google News Deutschland",
        url: "https://news.google.com/rss?hl=de&gl=DE&ceid=DE:de"
      }
    ]
  },
  sv: {
    name: "Swedish",
    label: "Svenska",
    locale: "sv-SE",
    defaultLevel: "A2",
    feeds: [
      {
        name: "Sveriges Radio Ekot",
        url: "https://api.sr.se/api/rss/program/83?format=145"
      },
      {
        name: "Google News Sverige",
        url: "https://news.google.com/rss?hl=sv&gl=SE&ceid=SE:sv"
      }
    ]
  },
  en: {
    name: "English",
    label: "English",
    locale: "en-US",
    defaultLevel: "B2",
    feeds: [
      {
        name: "Sky News World",
        url: "https://feeds.skynews.com/feeds/rss/world.xml"
      },
      {
        name: "BBC World",
        url: "https://feeds.bbci.co.uk/news/world/rss.xml"
      },
      {
        name: "Google News US",
        url: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en"
      }
    ]
  }
};

const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(`daily_news_reading failed: ${error.message}`);
  process.exit(1);
});

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const lang = args.lang || "sv";
  const config = languageConfig[lang];
  if (!config) {
    throw new Error(`Unknown language "${lang}". Use de, sv, or en.`);
  }

  const level = args.level || config.defaultLevel;
  const mode = args.mode || (process.env.OPENAI_API_KEY ? "ai" : "feed");
  const outputDir = args.out || DEFAULT_OUTPUT_DIR;

  const item = args.title
    ? manualItem(args)
    : await fetchNewsItem(config, args.topic);

  const aiText = mode === "ai"
    ? await generateLearningArticle({ config, lang, level, item })
    : null;

  const today = formatDate(new Date(), config.locale);
  const note = buildNote({
    lang,
    config,
    level,
    mode,
    item,
    aiText,
    date: today
  });

  const safeTitle = slugify(item.title || "news");
  const fileName = `${today} - ${safeTitle}.md`;
  const targetDir = path.join(process.cwd(), outputDir, config.label);
  const targetPath = path.join(targetDir, fileName);

  if (args.dryRun) {
    console.log(note);
    return;
  }

  await mkdir(targetDir, { recursive: true });
  await writeFile(targetPath, note, "utf8");
  console.log(targetPath);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (!raw.startsWith("--")) continue;
    const key = raw.slice(2);
    if (key === "help" || key === "dry-run") {
      parsed[toCamel(key)] = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    parsed[toCamel(key)] = value;
    index += 1;
  }
  return parsed;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function manualItem(values) {
  return {
    title: values.title,
    link: values.url || "",
    description: values.description || "",
    pubDate: new Date().toISOString(),
    source: values.source || "Manual"
  };
}

async function fetchNewsItem(config, topic) {
  const errors = [];
  for (const feed of config.feeds) {
    try {
      const xml = await fetchText(feed.url, 10000);
      const items = parseFeed(xml, feed.name);
      const selected = selectItem(items, topic);
      if (selected) return selected;
      errors.push(`${feed.name}: no matching items`);
    } catch (error) {
      errors.push(`${feed.name}: ${error.message}`);
    }
  }

  throw new Error(
    [
      `No news item could be loaded for ${config.name}.`,
      "Tried:",
      ...errors.map((error) => `- ${error}`),
      "Fallback: run with --title \"...\" --url \"...\" to create the same note structure manually."
    ].join("\n")
  );
}

async function fetchText(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "ObsidianLanguageStudy/1.0 (+https://obsidian.md)"
      },
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    return await fetchTextWithCurl(url, timeoutMs, error);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTextWithCurl(url, timeoutMs, originalError) {
  try {
    const { stdout } = await execFileAsync("curl", [
      "-L",
      "--max-time",
      String(Math.ceil(timeoutMs / 1000)),
      "--silent",
      "--show-error",
      "-A",
      "ObsidianLanguageStudy/1.0 (+https://obsidian.md)",
      url
    ], {
      maxBuffer: 1024 * 1024 * 4
    });
    if (!stdout.trim()) {
      throw new Error("empty response");
    }
    return stdout;
  } catch (curlError) {
    throw new Error(`${originalError.message}; curl fallback failed: ${curlError.message}`);
  }
}

function parseFeed(xml, source) {
  if (xml.includes("<entry")) {
    return matchBlocks(xml, "entry").map((entry) => ({
      title: cleanXmlText(readTag(entry, "title")),
      link: cleanXmlText(readAtomLink(entry) || readTag(entry, "link")),
      description: cleanXmlText(readTag(entry, "summary") || readTag(entry, "content")),
      pubDate: cleanXmlText(readTag(entry, "updated") || readTag(entry, "published")),
      source
    })).filter((item) => item.title);
  }

  return matchBlocks(xml, "item").map((item) => ({
    title: cleanXmlText(readTag(item, "title")),
    link: cleanXmlText(readTag(item, "link")),
    description: cleanXmlText(readTag(item, "description") || readTag(item, "content:encoded")),
    pubDate: cleanXmlText(readTag(item, "pubDate") || readTag(item, "dc:date")),
    source
  })).filter((item) => item.title);
}

function matchBlocks(xml, tag) {
  const expression = new RegExp(`<${escapeRegExp(tag)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tag)}>`, "gi");
  return [...xml.matchAll(expression)].map((match) => match[1]);
}

function readTag(xml, tag) {
  const expression = new RegExp(`<${escapeRegExp(tag)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tag)}>`, "i");
  return xml.match(expression)?.[1] || "";
}

function readAtomLink(xml) {
  const match = xml.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  return match?.[1] || "";
}

function cleanXmlText(value) {
  return stripTags(decodeEntities(stripCdata(value || ""))).replace(/\s+/g, " ").trim();
}

function stripCdata(value) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, " ");
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function selectItem(items, topic) {
  if (!items.length) return null;
  if (!topic) return items[0];
  const needle = topic.toLowerCase();
  return items.find((item) => {
    const text = `${item.title} ${item.description}`.toLowerCase();
    return text.includes(needle);
  }) || items[0];
}

async function generateLearningArticle({ config, lang, level, item }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for --mode ai. Use --mode feed or set the key.");
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const targetWords = level.startsWith("A") ? "220-320" : level.startsWith("B1") ? "350-500" : "500-650";
  const prompt = [
    `Write an original ${config.name} learning article for a ${level} learner.`,
    `Target length: ${targetWords} words.`,
    "Use the news facts below only as inspiration. Do not quote or paraphrase a copyrighted article.",
    "Include these sections in Markdown:",
    "## Lerntext / Reading Text",
    "## 中文摘要",
    "## Key Vocabulary",
    "## Grammar Focus",
    "## Reading Questions",
    "## Short Writing Prompt",
    "",
    `Language code: ${lang}`,
    `Headline: ${item.title}`,
    `Source: ${item.source}`,
    `Source link: ${item.link}`,
    `Feed summary: ${item.description || "(none)"}`
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: prompt
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI API HTTP ${response.status}: ${message.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = extractResponseText(data);
  if (!text) {
    throw new Error("OpenAI API returned no text output.");
  }
  return text.trim();
}

function extractResponseText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const chunks = [];
  for (const output of data.output || []) {
    for (const content of output.content || []) {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
      if (content.type === "text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n");
}

function buildNote({ lang, config, level, mode, item, aiText, date }) {
  const title = escapeYaml(item.title || "Untitled news item");
  const link = escapeYaml(item.link || "");
  const description = item.description ? blockquote(item.description) : "> No feed summary was provided.";
  const sourceDate = item.pubDate || "";

  return `---
type: news-reading
language: ${lang}
language_name: ${config.name}
level: ${level}
date: ${date}
mode: ${mode}
source: ${escapeYaml(item.source)}
source_url: ${link}
headline: ${title}
status: unread
tags:
  - language/news
  - language/${lang}
---

# ${item.title}

## Source

- Language: ${config.label}
- Level: ${level}
- Source: ${item.source}
- Published: ${sourceDate || "Unknown"}
- Link: ${item.link || "No link"}

## Reading Setup

- Before reading: predict the topic from the headline.
- During reading: mark unknown words with ==highlight==.
- After reading: write a 3 sentence summary without looking back.

## Feed Summary

${description}

${aiText ? aiText : fallbackLearningSections(config)}

## Vocabulary Log

| Word | Meaning | Example from text | Review date |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |

## Retrieval Practice

1. What happened?
2. Who or what is affected?
3. Why does it matter?
4. Which sentence pattern should I reuse?

## Follow-up

- [ ] Read the source article.
- [ ] Add 5-10 useful words to the vocabulary log.
- [ ] Create 2 active recall cards.
- [ ] Review this note tomorrow.
`;
}

function fallbackLearningSections(config) {
  return `## Reading Text

Open the source link above and read the original ${config.name} article. This note intentionally keeps only the RSS summary and your learning work, so the vault does not become a full-text news archive.

To generate an original graded reading text inside this note, rerun the command with \`--mode ai\` after setting \`OPENAI_API_KEY\`.

## Grammar Focus

- Find one sentence with a main clause.
- Find one sentence with a time, place, or reason phrase.
- Copy one sentence pattern that you can reuse in your own writing.

## Short Writing Prompt

Write 4-6 sentences in ${config.name} explaining the news in your own words.
`;
}

function blockquote(value) {
  return value.split(/\r?\n/).map((line) => `> ${line}`).join("\n");
}

function formatDate(date, locale) {
  const formatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: process.env.TZ || "Asia/Shanghai"
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80) || "news";
}

function escapeYaml(value) {
  const text = String(value || "").replace(/"/g, '\\"');
  return `"${text}"`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function printHelp() {
  console.log(`Usage:
  node work/daily_news_reading.mjs --lang sv
  node work/daily_news_reading.mjs --lang de --level B1 --mode ai
  node work/daily_news_reading.mjs --lang en --topic climate
  node work/daily_news_reading.mjs --lang sv --title "..." --url "https://..."

Options:
  --lang       de, sv, or en. Defaults to sv.
  --level      CEFR level label. Defaults by language.
  --mode       feed or ai. Defaults to ai when OPENAI_API_KEY exists, otherwise feed.
  --topic      Keyword filter for feed items.
  --title      Manual headline fallback.
  --url        Manual source URL fallback.
  --source     Manual source name fallback.
  --out        Output directory. Defaults to "Daily News Reading".
  --dry-run    Print Markdown instead of writing a file.
`);
}
