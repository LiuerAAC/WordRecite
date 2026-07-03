import json
import os
import re
import sqlite3
import tempfile
import zipfile
from collections import Counter


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "Rivstart Resources")
OUT_JS = os.path.join(OUT_DIR, "rivstart-vocabulary.js")
OUT_JSON = os.path.join(OUT_DIR, "rivstart-vocabulary.json")
IMPORT_DIR = os.path.join(OUT_DIR, "import-ready")
IMPORT_SCHEMA_VERSION = "memory-import/v1"

PACKAGES = [
    {
        "level": "A1/A2",
        "source": "rivstart_a1a2_anki",
        "path": "/Users/yuxuancao/Downloads/Rivstart_A1A2_Swedish__English_w_enett_word_type__more.apkg",
    },
    {
        "level": "B1/B2",
        "source": "rivstart_b1b2_anki",
        "path": "/Users/yuxuancao/Downloads/Rivstart_B1B2_ordlista.apkg",
    },
    {
        "level": "B2/C1",
        "source": "rivstart_b2c1_anki",
        "path": "/Users/yuxuancao/Downloads/Rivstart_B2C1_ordkort.apkg",
    },
]

PACKAGE_META = {
    "A1/A2": {
        "package_id": "rivstart-a1-a2",
        "jsonl": "rivstart-a1-a2.memory-items.jsonl",
        "source_file": "Rivstart_A1A2_Swedish__English_w_enett_word_type__more.apkg",
    },
    "B1/B2": {
        "package_id": "rivstart-b1-b2",
        "jsonl": "rivstart-b1-b2.memory-items.jsonl",
        "source_file": "Rivstart_B1B2_ordlista.apkg",
    },
    "B2/C1": {
        "package_id": "rivstart-b2-c1",
        "jsonl": "rivstart-b2-c1.memory-items.jsonl",
        "source_file": "Rivstart_B2C1_ordkort.apkg",
    },
}


def clean(value):
    return str(value or "").replace("\x00", "").strip()


def tagify(value):
    value = clean(value).lower()
    value = re.sub(r"[^a-z0-9åäö]+", "-", value)
    return value.strip("-")


def normalize_key(value):
    value = clean(value).lower()
    value = re.sub(r"[^\w\såäö.'’-]+", "", value, flags=re.UNICODE)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def chapter_number(value):
    value = clean(value)
    match = re.search(r"(\d+)", value)
    return match.group(1) if match else value


def normalize_page(value):
    value = clean(value)
    match = re.search(r"(\d+)", value)
    return match.group(1) if match else value


def guess_type(ordklass, swedish):
    text = clean(ordklass).lower()
    if "fras" in text or "phrase" in text or len(clean(swedish).split()) > 1:
        return "sentence"
    return "word"


def target_item_type(entry_type):
    return "word" if entry_type == "word" else "sentence"


def explain(parts):
    return "；".join(part for part in parts if clean(part))


def read_notes(package):
    with zipfile.ZipFile(package["path"]) as archive:
        names = set(archive.namelist())
        db_name = "collection.anki21" if "collection.anki21" in names else (
            "collection.anki21b" if "collection.anki21b" in names else "collection.anki2"
        )
        temp_dir = tempfile.mkdtemp()
        archive.extract(db_name, temp_dir)
        db_path = os.path.join(temp_dir, db_name)

    connection = sqlite3.connect(db_path)
    try:
        return list(connection.execute("select id, tags, flds from notes order by id"))
    finally:
        connection.close()


def a1a2_entry(note_id, tags, fields):
    swedish, english, conjugation, ordklass, en_ett, _light, _dark, sem1, sem2, chapter, page = (
        fields + [""] * 11
    )[:11]
    chapter_label = clean(chapter) or "Intro"
    page_label = normalize_page(page)
    entry_tags = [
        "rivstart",
        "rivstart-a1-a2",
        f"chapter-{tagify(chapter_number(chapter_label))}" if chapter_label else "",
        tagify(ordklass.split("/")[0]) if ordklass else "",
        tagify(en_ett) if en_ett else "",
        tagify(sem1) if sem1 else "",
        tagify(sem2) if sem2 else "",
    ]
    entry_type = guess_type(ordklass, swedish)
    return {
        "id": f"a1a2-{note_id}",
        "level": "A1/A2",
        "type": target_item_type(entry_type),
        "entry_type": entry_type,
        "language": "sv",
        "front": clean(swedish),
        "meaning_zh": "",
        "meaning_en": clean(english),
        "explanation": explain(
            [
                f"词形：{clean(conjugation)}" if conjugation else "",
                f"词性：{clean(ordklass)}" if ordklass else "",
                f"名词性：{clean(en_ett)}" if en_ett else "",
                f"分类：{clean(sem1)}" if sem1 else "",
                f"子类：{clean(sem2)}" if sem2 else "",
                f"{chapter_label}，页 {page_label}" if page_label else chapter_label,
            ]
        ),
        "sentence": "",
        "sentence_translation": "",
        "tags": [tag for tag in entry_tags if tag],
        "source": "rivstart_a1a2_anki",
        "chapter": chapter_number(chapter_label),
        "chapter_label": chapter_label,
        "page": page_label,
        "word_class": clean(ordklass),
        "gender": clean(en_ett),
        "conjugation": clean(conjugation),
    }


def b1b2_entry(note_id, tags, fields):
    swedish, conjugation, english, chapter, page = (fields + [""] * 5)[:5]
    chapter_label = chapter_number(chapter)
    page_label = normalize_page(page)
    raw_tags = [tagify(tag) for tag in clean(tags).split()]
    entry_tags = [
        "rivstart",
        "rivstart-b1-b2",
        f"chapter-{tagify(chapter_label)}" if chapter_label else "",
        *raw_tags,
    ]
    return {
        "id": f"b1b2-{note_id}",
        "level": "B1/B2",
        "type": "word",
        "entry_type": "word",
        "language": "sv",
        "front": clean(swedish),
        "meaning_zh": "",
        "meaning_en": clean(english),
        "explanation": explain(
            [
                f"词形：{clean(conjugation)}" if conjugation else "",
                f"Kapitel {chapter_label}" if chapter_label else "",
                f"页 {page_label}" if page_label else "",
            ]
        ),
        "sentence": "",
        "sentence_translation": "",
        "tags": [tag for tag in entry_tags if tag],
        "source": "rivstart_b1b2_anki",
        "chapter": chapter_label,
        "chapter_label": f"Kapitel {chapter_label}" if chapter_label else "",
        "page": page_label,
        "word_class": "",
        "gender": "",
        "conjugation": clean(conjugation),
    }


def b2c1_entry(note_id, tags, fields):
    swedish, english, chapter, text = (fields + [""] * 4)[:4]
    chapter_label = chapter_number(chapter)
    raw_tags = [tagify(tag) for tag in clean(tags).split()]
    text_label = clean(text)
    entry_tags = [
        "rivstart",
        "rivstart-b2-c1",
        f"chapter-{tagify(chapter_label)}" if chapter_label else "",
        tagify(text_label) if text_label else "",
        *raw_tags,
    ]
    return {
        "id": f"b2c1-{note_id}",
        "level": "B2/C1",
        "type": "word",
        "entry_type": "word",
        "language": "sv",
        "front": clean(swedish),
        "meaning_zh": "",
        "meaning_en": clean(english),
        "explanation": explain(
            [
                f"分类：{text_label}" if text_label else "",
                f"Kapitel {chapter_label}" if chapter_label else "",
            ]
        ),
        "sentence": "",
        "sentence_translation": "",
        "tags": [tag for tag in entry_tags if tag],
        "source": "rivstart_b2c1_anki",
        "chapter": chapter_label,
        "chapter_label": f"Kapitel {chapter_label}" if chapter_label else "",
        "page": "",
        "word_class": "",
        "gender": "",
        "conjugation": "",
    }


def import_record(entry):
    meta = PACKAGE_META[entry["level"]]
    package_id = meta["package_id"]
    source_note_id = entry["id"].split("-", 1)[1]
    entry_type = entry.get("entry_type") or entry.get("type") or "word"
    target_type = target_item_type(entry_type)
    front_key = normalize_key(entry["front"])
    return {
        "schema_version": IMPORT_SCHEMA_VERSION,
        "record_type": "memory_item",
        "import_id": f"{package_id}:{source_note_id}",
        "identity": {
            "language": entry["language"],
            "entry_type": entry_type,
            "target_item_type": target_type,
            "front_normalized": front_key,
            "dedupe_key": f"{entry['language']}|{target_type}|{front_key}",
            "source_occurrence_key": f"{package_id}|{source_note_id}",
        },
        "content": {
            "front": entry["front"],
            "display_front": entry["front"],
            "meaning_zh": entry["meaning_zh"],
            "meaning_en": entry["meaning_en"],
            "explanation": entry["explanation"],
            "examples": [],
        },
        "linguistic": {
            "part_of_speech": entry["word_class"],
            "gender": entry["gender"],
            "forms_raw": entry["conjugation"],
            "semantic_categories": [
                tag for tag in entry["tags"]
                if tag not in {"rivstart", "rivstart-a1-a2", "rivstart-b1-b2", "rivstart-b2-c1"}
                and not tag.startswith("chapter-")
                and tag not in {"en", "ett"}
            ],
        },
        "source": {
            "provider": "anki_apkg",
            "package_id": package_id,
            "package_level": entry["level"],
            "source_file": meta["source_file"],
            "source_note_id": source_note_id,
            "chapter": entry["chapter"],
            "chapter_label": entry["chapter_label"],
            "page": entry["page"],
            "raw_tags": entry["tags"],
        },
        "tags": entry["tags"],
        "import_policy": {
            "on_duplicate": "merge_source_ref_and_fill_empty_fields",
            "initial_review_lane": "latest",
            "create_review_card": True,
            "suspended": False,
        },
        "quality": {
            "needs_review": False,
            "warnings": [],
        },
    }


def build():
    entries = []
    for package in PACKAGES:
        for note_id, tags, flds in read_notes(package):
            fields = flds.split("\x1f")
            if package["level"] == "A1/A2":
                entry = a1a2_entry(note_id, tags, fields)
            elif package["level"] == "B1/B2":
                entry = b1b2_entry(note_id, tags, fields)
            else:
                entry = b2c1_entry(note_id, tags, fields)
            if entry["front"] and entry["meaning_en"]:
                entries.append(entry)

    stats = {
        "total": len(entries),
        "by_level": Counter(entry["level"] for entry in entries),
        "by_source": Counter(entry["source"] for entry in entries),
    }
    payload = {
        "generated_at": "2026-06-30",
        "source_packages": [
            {
                "level": package["level"],
                "source": package["source"],
                "file": os.path.basename(package["path"]),
            }
            for package in PACKAGES
        ],
        "stats": {
            "total": stats["total"],
            "by_level": dict(stats["by_level"]),
            "by_source": dict(stats["by_source"]),
        },
        "entries": entries,
    }

    records_by_level = {
        level: [import_record(entry) for entry in entries if entry["level"] == level]
        for level in PACKAGE_META
    }

    manifest = {
        "schema_version": IMPORT_SCHEMA_VERSION,
        "package_type": "memory_import_package",
        "generated_at": "2026-06-30",
        "format": "jsonl",
        "encoding": "utf-8",
        "files": [
            {
                "path": meta["jsonl"],
                "level": level,
                "record_count": len(records_by_level[level]),
                "source_file": meta["source_file"],
            }
            for level, meta in PACKAGE_META.items()
        ],
        "import_requirements": {
            "must_validate_schema_version": True,
            "must_use_identity_dedupe_key": True,
            "must_preserve_source_occurrence_key": True,
            "must_not_overwrite_non_empty_user_fields_by_default": True,
        },
        "stats": payload["stats"],
    }

    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(IMPORT_DIR, exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
    with open(OUT_JS, "w", encoding="utf-8") as handle:
        handle.write("window.RIVSTART_VOCABULARY = ")
        json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write(";\n")
    for level, records in records_by_level.items():
        filename = PACKAGE_META[level]["jsonl"]
        with open(os.path.join(IMPORT_DIR, filename), "w", encoding="utf-8") as handle:
            for record in records:
                handle.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")))
                handle.write("\n")
    with open(os.path.join(IMPORT_DIR, "manifest.json"), "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
    return payload


if __name__ == "__main__":
    result = build()
    print(json.dumps(result["stats"], ensure_ascii=False, indent=2))
