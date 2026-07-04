#!/usr/bin/env python3

import json
import html
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, "/private/tmp/wordrecite_pydeps")
from deep_translator import GoogleTranslator  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
CACHE_FILE = ROOT / "work" / "meaning-en-zh-translations.json"
ENRICHMENT_CACHE = ROOT / "work" / "rivstart-vocabulary-enrichments.jsonl"
ENRICHED_JSON = ROOT / "Rivstart Resources" / "rivstart-vocabulary.enriched.json"
ENRICHED_JS = ROOT / "Rivstart Resources" / "rivstart-vocabulary.enriched.js"
SVERIGE_JSON = ROOT / "Sverige Resources" / "sverige-vocabulary.json"
SVERIGE_JS = ROOT / "Sverige Resources" / "sverige-vocabulary.js"
BAD_PREFIX = re.compile(r"^\s*(中文释义|英文释义)\s*[:：]\s*")


def main() -> None:
    translation_cache = {
        key: value
        for key, value in read_json(CACHE_FILE, {}).items()
        if has_chinese(value)
    }
    payload = read_json(SVERIGE_JSON, {})
    entries = payload.get("entries", [])
    targets = sorted({
        clean(entry.get("meaning_en"))
        for entry in entries
        if clean(entry.get("meaning_en")) and needs_translation(entry.get("meaning_zh"), entry.get("enrichment_quality_note"))
    })
    missing = [text for text in targets if text not in translation_cache]
    print(json.dumps({"targets": len(targets), "cached": len(targets) - len(missing), "missing": len(missing)}, ensure_ascii=False))

    if missing:
        translator = GoogleTranslator(source="en", target="zh-CN")
        batch_size = int(os_environ("TRANSLATE_BATCH_SIZE", "40"))
        limit = int(os_environ("TRANSLATE_LIMIT", str(len(missing))))
        selected = missing[:limit]
        completed = 0
        for batch_start in range(0, len(selected), batch_size):
            batch = selected[batch_start:batch_start + batch_size]
            try:
                translated_batch = translate_batch_text(translator, batch)
                translation_cache.update(translated_batch)
            except Exception as error:
                print(f"batch failed at {batch_start}: {error}", file=sys.stderr)
                for text in batch:
                    try:
                        translated = clean(translator.translate(text))
                        if translated and translated != text:
                            translation_cache[text] = translated
                    except Exception as item_error:
                        print(f"translate failed: {text!r}: {item_error}", file=sys.stderr)
            completed += len(batch)
            write_json(CACHE_FILE, translation_cache)
            print(json.dumps({"processed": completed, "selected": len(selected), "cache": len(translation_cache)}, ensure_ascii=False))
            time.sleep(float(os_environ("TRANSLATE_SLEEP", "0.5")))
        write_json(CACHE_FILE, translation_cache)

    fix_enrichment_cache(translation_cache)
    fix_payload_file(ENRICHED_JSON, ENRICHED_JS, "window.RIVSTART_VOCABULARY", translation_cache)
    fix_payload_file(SVERIGE_JSON, SVERIGE_JS, "window.SVERIGE_VOCABULARY", translation_cache)


def needs_translation(value: object, note: object = "") -> bool:
    text = clean(value)
    if not text or BAD_PREFIX.match(text):
        return True
    return "needs_zh_review" in clean(note) and not has_chinese(text)


def translate_batch_text(translator: GoogleTranslator, batch: list[str]) -> dict[str, str]:
    lines = [f"{index + 1}. {text}" for index, text in enumerate(batch)]
    translated = clean(translator.translate("\n".join(lines)))
    parsed = parse_numbered_translation(translated)
    if len(parsed) < len(batch):
      raise RuntimeError(f"Could not parse batch translation: {translated[:500]}")
    return {
        source: clean(parsed.get(index + 1, "")) or source
        for index, source in enumerate(batch)
        if clean(parsed.get(index + 1, "")) and clean(parsed.get(index + 1, "")) != source
    }


def parse_numbered_translation(text: str) -> dict[int, str]:
    result: dict[int, str] = {}
    pattern = re.compile(r"(?s)(?<!\d)(\d+)[.、．]\s*(.*?)(?=(?<!\d)\d+[.、．]\s*|$)")
    for match in pattern.finditer(text):
        result[int(match.group(1))] = clean(match.group(2))
    return result


def fix_enrichment_cache(translation_cache: dict[str, str]) -> None:
    lines = [line for line in ENRICHMENT_CACHE.read_text(encoding="utf-8").splitlines() if line.strip()]
    fixed = []
    changed = 0
    for line in lines:
        item = json.loads(line)
        english = clean(item.get("meaning_en")) or clean(BAD_PREFIX.sub("", clean(item.get("meaning_zh"))))
        replacement = translation_cache.get(english)
        if replacement and needs_translation(item.get("meaning_zh"), item.get("quality_note")):
            item["meaning_zh"] = replacement
            item["quality_note"] = remove_review_note(item.get("quality_note"))
            changed += 1
        fixed.append(json.dumps(item, ensure_ascii=False, separators=(",", ":")))
    ENRICHMENT_CACHE.write_text("\n".join(fixed) + "\n", encoding="utf-8")
    print(json.dumps({"cache_changed": changed}, ensure_ascii=False))


def fix_payload_file(json_file: Path, js_file: Path, global_name: str, translation_cache: dict[str, str]) -> None:
    payload = read_json(json_file, {})
    changed = 0
    for entry in payload.get("entries", []):
        english = clean(entry.get("meaning_en"))
        replacement = translation_cache.get(english)
        if replacement and needs_translation(entry.get("meaning_zh"), entry.get("enrichment_quality_note")):
            entry["meaning_zh"] = replacement
            entry["enrichment_quality_note"] = remove_review_note(entry.get("enrichment_quality_note"))
            changed += 1
    payload["enrichment"] = {
        **payload.get("enrichment", {}),
        "meaning_zh_machine_translated_at": now_iso(),
        "meaning_zh_machine_translation_source": "Google Translate via deep-translator; cached by English meaning.",
    }
    write_json(json_file, payload)
    if global_name == "window.SVERIGE_VOCABULARY":
        js_file.write_text(
            f"{global_name} = {json.dumps(payload, ensure_ascii=False, separators=(',', ':'))};\n"
            "window.RIVSTART_VOCABULARY = window.SVERIGE_VOCABULARY;\n",
            encoding="utf-8",
        )
    else:
        js_file.write_text(
            f"{global_name} = {json.dumps(payload, ensure_ascii=False, separators=(',', ':'))};\n",
            encoding="utf-8",
        )
    print(json.dumps({str(json_file): changed}, ensure_ascii=False))


def remove_review_note(value: object) -> str:
    parts = [part.strip() for part in clean(value).split(";") if part.strip() and part.strip() != "needs_zh_review"]
    return "; ".join(parts)


def has_chinese(value: object) -> bool:
    return bool(re.search(r"[\u4e00-\u9fff]", clean(value)))


def clean(value: object) -> str:
    return re.sub(r"\s+", " ", html.unescape(str(value or ""))).strip()


def read_json(filename: Path, fallback):
    if not filename.exists():
        return fallback
    return json.loads(filename.read_text(encoding="utf-8"))


def write_json(filename: Path, payload) -> None:
    filename.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def os_environ(name: str, fallback: str) -> str:
    import os
    return os.environ.get(name, fallback)


if __name__ == "__main__":
    main()
