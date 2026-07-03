#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const INPUT = path.join(ROOT, "Rivstart Resources", "rivstart-vocabulary.enriched.json");
const OUT_DIR = path.join(ROOT, "Sverige Resources");
const OUT_JSON = path.join(OUT_DIR, "sverige-vocabulary.json");
const OUT_JS = path.join(OUT_DIR, "sverige-vocabulary.js");

const LEVELS = ["A1/A2", "B1/B2", "B2/C1"];

main();

function main() {
  const base = JSON.parse(fs.readFileSync(INPUT, "utf8"));
  const entries = base.entries.filter((entry) => LEVELS.includes(entry.level));
  const payload = {
    ...base,
    generated_at: new Date().toISOString().slice(0, 10),
    collection: {
      id: "sverige-wordbooks",
      name: "Sverige",
      levels: LEVELS,
    },
    stats: buildStats(entries),
    entries,
    enrichment: {
      ...(base.enrichment || {}),
      output: "Sverige Resources/sverige-vocabulary.json",
    },
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(
    OUT_JS,
    `window.SVERIGE_VOCABULARY = ${JSON.stringify(payload)};\nwindow.RIVSTART_VOCABULARY = window.SVERIGE_VOCABULARY;\n`,
    "utf8",
  );
  console.log(JSON.stringify(payload.stats, null, 2));
}

function buildStats(entries) {
  const byLevel = {};
  const bySource = {};
  for (const entry of entries) {
    byLevel[entry.level] = (byLevel[entry.level] || 0) + 1;
    bySource[entry.source] = (bySource[entry.source] || 0) + 1;
  }
  return { total: entries.length, by_level: byLevel, by_source: bySource };
}
