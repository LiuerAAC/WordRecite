from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import pdfplumber


PDF_PATH = Path("/Users/yuxuancao/Downloads/toaz.info-essentials-of-swedish-grammarpdf-pr_e7047544758103bdaced2504c96dda24.pdf")
OUT = Path("/Users/yuxuancao/Documents/Language Study/Essentials of Swedish Grammar Extracted")


@dataclass(frozen=True)
class Section:
    number: str
    title: str
    page: int


@dataclass(frozen=True)
class Chapter:
    number: str
    title: str
    page: int
    sections: tuple[Section, ...]


CHAPTERS = (
    Chapter("2", "Word classes", 12, (
        Section("2.1", "The verb and its forms", 12),
        Section("2.2", "The noun and its forms", 14),
        Section("2.3", "Number", 14),
        Section("2.4", "Definiteness", 15),
        Section("2.5", "Gender: en words and ett words", 15),
        Section("2.6", "Personal pronouns", 16),
        Section("2.7", "Adjectives", 18),
        Section("2.8", "Adverbs", 18),
        Section("2.9", "Prepositions", 19),
        Section("2.10", "Numerals", 19),
    )),
    Chapter("3", "Subject, verb and object", 20, (
        Section("3.1", "The parts of a sentence", 20),
        Section("3.2", "Subject, object and word order in Swedish", 21),
        Section("3.3", "Subject-verb constraint", 22),
    )),
    Chapter("4", "Various types of clause", 23, (
        Section("4.1", "Clause negation: inte", 23),
        Section("4.2", "Yes/no questions", 23),
        Section("4.3", "Question-word questions", 24),
        Section("4.4", "Question words", 25),
        Section("4.5", "Another part of the sentence: adverbials", 27),
        Section("4.6", "Fronting", 28),
        Section("4.7", "Short answers", 29),
    )),
    Chapter("5", "Pronouns", 31, (
        Section("5.1", "Personal pronouns", 31),
        Section("5.2", "Reflexive forms", 32),
        Section("5.3", "man", 33),
        Section("5.4", "Word order in clauses with pronouns", 34),
    )),
    Chapter("6", "Commands and clauses with more than one verb", 35, (
        Section("6.1", "Two or more verbs in succession", 35),
        Section("6.2", "Making the infinitive from the present", 35),
        Section("6.3", "Some common auxiliary verbs", 36),
        Section("6.4", "Commands. The imperative", 38),
        Section("6.5", "Commands, requests and politeness phrases", 39),
        Section("6.6", "Word order in clauses with more than one verb", 39),
        Section("6.7", "Sentence adverbials", 40),
        Section("6.8", "Yes/no questions with more than one verb", 41),
        Section("6.9", "Question-word questions and fronting with more than one verb", 42),
    )),
    Chapter("7", "Complex sentences", 43, (
        Section("7.1", "Coordination and subordination", 43),
        Section("7.2", "Main clause and subordinate clause", 44),
        Section("7.3", "Att clauses", 45),
        Section("7.4", "Adverbial clauses", 45),
        Section("7.5", "Word order in subordinate clauses", 47),
        Section("7.6", "Relative clauses", 48),
    )),
    Chapter("8", "Pronunciation and spelling", 49, (
        Section("8.1", "Vowels and consonants", 49),
        Section("8.2", "How sounds in language are made. Voiced and voiceless sounds", 49),
        Section("8.3", "Length and stress", 50),
        Section("8.4", "Acute and grave accent", 51),
        Section("8.5", "Swedish long vowels", 52),
        Section("8.6", "Swedish short vowels", 53),
        Section("8.7", "Pronunciation of ö and ä before r", 54),
        Section("8.8", "Pronunciation of the letter o", 54),
        Section("8.9", "Swedish consonants", 55),
        Section("8.9.1", "Swedish stops", 55),
        Section("8.9.2", "Swedish fricatives", 56),
        Section("8.10", "Other consonants", 57),
        Section("8.11", "Consonant combinations", 57),
        Section("8.12", "Letters combined with j pronounced as one sound", 58),
        Section("8.13", "Pronunciation of the letters g, k and sk before front vowels", 58),
        Section("8.14", "Pronunciation of the consonant combinations rt, rd, rn and rs", 59),
        Section("8.15", "Doubled consonants", 60),
        Section("8.16", "Doubling of m and n", 61),
        Section("8.17", "Capital and small letters", 62),
    )),
    Chapter("9", "The verb and its forms", 64, (
        Section("9.1", "The perfect and the pluperfect", 64),
        Section("9.2", "The future", 65),
        Section("9.3", "How to make the verb forms", 66),
        Section("9.4", "The infinitive", 67),
        Section("9.5", "The supine", 68),
        Section("9.6", "The present", 68),
        Section("9.7", "The past", 69),
        Section("9.8", "Strong verbs", 69),
        Section("9.9", "Short verbs", 71),
        Section("9.10", "Irregular verbs", 72),
        Section("9.11", "The passive", 73),
        Section("9.12", "Making the s form of verbs", 74),
        Section("9.13", "The participle forms of the verb", 75),
        Section("9.14", "The present participle", 77),
        Section("9.15", "The past participle", 77),
        Section("9.16", "Verbs with two objects", 78),
        Section("9.17", "Verbs with particles", 79),
    )),
    Chapter("10", "Forms of the noun", 81, (
        Section("10.1", "En words and ett words", 81),
        Section("10.2", "Definiteness", 82),
        Section("10.3", "Use of the definite and indefinite forms", 83),
        Section("10.4", "Countable and uncountable nouns", 84),
        Section("10.5", "The plural forms of nouns", 84),
        Section("10.6", "Plural forms: suffixes", 87),
        Section("10.7", "Nouns that change their vowels in the plural", 88),
        Section("10.8", "The definite form in the plural", 88),
        Section("10.9", "Plurals: summary", 90),
        Section("10.10", "The genitive", 90),
    )),
    Chapter("11", "Adjectival agreement", 91, (
        Section("11.1", "The adjective and the noun phrase", 91),
        Section("11.2", "Articles and adjectives in the indefinite form", 92),
        Section("11.3", "Articles and adjectives in the definite form", 93),
        Section("11.4", "Articles and adjectives in the plural", 94),
        Section("11.5", "Predicative adjectives", 95),
        Section("11.6", "Summary of the forms of the adjective", 96),
        Section("11.7", "The adjective liten", 96),
        Section("11.8", "Agreement of the participles", 96),
        Section("11.9", "The t form of the past participle and of certain adjectives", 97),
        Section("11.10", "The inflection of certain participles and adjectives", 99),
    )),
    Chapter("12", "Possessive pronouns and the genitive", 100, (
        Section("12.1", "Possessive pronouns", 100),
        Section("12.2", "The reflexive form of possessive pronouns: sin", 100),
        Section("12.3", "The forms of possessive pronouns", 101),
        Section("12.4", "The forms of nouns and adjectives after genitives and possessives", 103),
    )),
    Chapter("13", "Some more determiners", 104, (
        Section("13.1", "den här and den där", 104),
        Section("13.2", "vilken", 105),
        Section("13.3", "någon", 106),
        Section("13.4", "inte någon - ingen", 107),
        Section("13.5", "all, hel, annan, sådan and other determiners", 109),
    )),
    Chapter("14", "Comparison. Comparative and superlative", 113, (
        Section("14.1", "General comments on comparison", 113),
        Section("14.2", "The comparative form of the adjective", 115),
        Section("14.3", "The superlative forms of the adjective", 116),
        Section("14.4", "Adjectives that end in er, el or en", 117),
        Section("14.5", "Irregular adjectives", 117),
        Section("14.6", "Making the comparative and the superlative with mer and mest", 119),
        Section("14.7", "Adverbs. Words denoting degree, quantity and number", 120),
    )),
    Chapter("15", "Expressions of place. Position and direction", 121, (
        Section("15.1", "här and där", 121),
        Section("15.2", "Verbs denoting position", 122),
        Section("15.3", "Prepositions denoting position", 124),
        Section("15.4", "Prepositions denoting direction", 126),
        Section("15.5", "Some important verbs of motion", 127),
        Section("15.6", "Verbs corresponding to 'put'", 129),
        Section("15.7", "Preposition of position instead of preposition of direction", 130),
        Section("15.8", "Particles", 131),
        Section("15.9", "Pojken sprang in i huset/ut ur huset", 132),
    )),
    Chapter("16", "Subordinate clauses and infinitive constructions", 133, (
        Section("16.1", "The infinitive marker att", 133),
        Section("16.2", "Att clauses and the infinitive as subject", 135),
        Section("16.3", "Important verbs followed by an att clause or the infinitive as object", 138),
        Section("16.4", "Indirect questions", 142),
        Section("16.5", "Indirect yes/no questions", 142),
        Section("16.6", "Indirect question-word questions", 143),
        Section("16.7", "Relative clauses", 144),
        Section("16.8", "Isolated prepositions", 146),
    )),
    Chapter("17", "Cleft and existential sentences", 148, (
        Section("17.1", "The cleft sentence", 148),
        Section("17.2", "The existential sentence", 150),
        Section("17.3", "When can you use the existential sentence?", 151),
    )),
)


def clean_filename(text: str) -> str:
    text = text.replace("/", " ")
    text = text.replace(":", "")
    text = text.replace("'", "")
    text = re.sub(r"[^0-9A-Za-zÀ-ÖØ-öø-ÿ .-]+", "", text)
    return re.sub(r"\s+", " ", text).strip()


def chapter_dir(chapter: Chapter) -> Path:
    return OUT / f"{chapter.number.zfill(2)} {clean_filename(chapter.title).title()}"


def section_file(chapter: Chapter, section: Section) -> Path:
    n = section.number.split(".")
    prefix = f"{int(n[0]):02d}.{int(n[1]):02d}" if len(n) == 2 and n[1].isdigit() else section.number
    return chapter_dir(chapter) / f"{prefix} {clean_filename(section.title).title()}.md"


def norm(s: str) -> str:
    s = s.lower()
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = re.sub(r"[^a-z0-9åäöéüàèö' ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def strip_page_numbers(text: str) -> str:
    lines = []
    for line in text.splitlines():
        if re.fullmatch(r"\s*\d+\s*", line):
            continue
        lines.append(line.rstrip())
    return "\n".join(lines).strip()


def extract_pages() -> dict[int, str]:
    pages = {}
    with pdfplumber.open(PDF_PATH) as pdf:
        for i, page in enumerate(pdf.pages, 1):
            text = page.extract_text(x_tolerance=1, y_tolerance=3) or ""
            pages[i] = strip_page_numbers(text)
    return pages


def find_heading(text: str, title: str, section_number: str | None = None) -> int:
    lines = text.splitlines(True)
    offsets = []
    pos = 0
    for line in lines:
        offsets.append((pos, line.rstrip("\n")))
        pos += len(line)
    title_n = norm(title)
    # First pass: prefer the exact heading line. This avoids starting a section
    # a few lines too early when a multi-line lookahead contains the heading.
    for off, line in offsets:
        line_n = norm(line)
        line_without_num = norm(re.sub(r"^\s*\d+(?:\.\d+)*\.?\s*", "", line))
        if section_number and re.search(rf"\b{re.escape(section_number)}\b", line):
            if title_n in line_n or line_without_num in title_n or title_n in line_without_num:
                return off
        if title_n and (line_n == title_n or line_without_num == title_n):
            return off
        if len(title_n) > 12 and line_n.startswith(title_n):
            return off
    best = (0, 0)
    for i, (off, _line) in enumerate(offsets):
        chunk = " ".join(offsets[j][1] for j in range(i, min(i + 4, len(offsets))))
        chunk_n = norm(chunk)
        score = 0
        if title_n in chunk_n:
            score += len(title_n)
        if section_number and re.search(rf"\b{re.escape(section_number)}\b", chunk):
            score += 30
        if score > best[0]:
            best = (score, off)
    return best[1]


def page_text(pages: dict[int, str], start: int, end: int) -> str:
    return "\n\n".join(pages[i] for i in range(start, end + 1) if i in pages)


def extract_section_text(pages: dict[int, str], chapter: Chapter, section: Section, next_section: Section | None, next_chapter: Chapter | None) -> tuple[str, str]:
    end_page = (next_section.page if next_section else (next_chapter.page if next_chapter else 153))
    end_page = max(section.page, end_page)
    raw = page_text(pages, section.page, end_page)
    start = find_heading(raw, section.title, section.number)
    end = len(raw)
    if next_section and next_section.page <= end_page:
        next_pos = find_heading(raw[start + 1:], next_section.title, next_section.number)
        if next_pos:
            end = start + 1 + next_pos
    elif next_chapter and next_chapter.page <= end_page:
        next_pos = find_heading(raw[start + 1:], next_chapter.title, next_chapter.number)
        if next_pos:
            end = start + 1 + next_pos
    text = raw[start:end].strip()
    actual_end_page = end_page
    if next_section and next_section.page == section.page:
        actual_end_page = section.page
    elif next_section:
        actual_end_page = next_section.page
    label = str(section.page) if actual_end_page == section.page else f"{section.page}-{actual_end_page}"
    return text, label


def frontmatter(section: Section, chapter: Chapter, pages: str) -> str:
    return "\n".join([
        "---",
        f'title: "{section.number} {section.title}"',
        f"chapter: {chapter.number}",
        f"section: {section.number}",
        "book: Essentials of Swedish Grammar",
        f'source_pages: "{pages}"',
        "status: extracted",
        "tags:",
        "  - Swedish",
        "  - grammar",
        "---",
        "",
    ])


def make_summary(section: Section) -> str:
    return f"""## Study Notes / Summary

### 中文总结

本节对应原书 `{section.number} {section.title}`。上方 `Extracted Text` 为从 PDF 文本层提取并按小节切分的英文内容；复习时可在这里继续补充自己的中文总结、例句和记忆卡片。

### 检查点

- 是否通读并校对了本节英文提取文本？
- 是否整理了本节出现的瑞典语术语和例句？
- 是否能用自己的话说明本节的核心语法点？
"""


def write_section(chapter: Chapter, section: Section, text: str, pages: str) -> None:
    path = section_file(chapter, section)
    path.parent.mkdir(parents=True, exist_ok=True)
    body = [
        frontmatter(section, chapter, pages),
        f"# {section.number} {section.title}",
        "",
        "## Extracted Text",
        "",
        text,
        "",
        make_summary(section),
    ]
    path.write_text("\n".join(body).strip() + "\n", encoding="utf-8")


def write_chapter_index(chapter: Chapter) -> None:
    path = chapter_dir(chapter) / f"{chapter.number.zfill(2)} {clean_filename(chapter.title).title()}.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = []
    for section in chapter.sections:
        rel = section_file(chapter, section).with_suffix("").name
        rows.append(f"| [[{rel}\\|{section.number} {section.title}]] | {section.page} |")
    body = [
        "---",
        f'title: "{chapter.number} {chapter.title}"',
        f"chapter: {chapter.number}",
        "book: Essentials of Swedish Grammar",
        "status: extracted",
        "---",
        "",
        f"# {chapter.number} {chapter.title}",
        "",
        "## Section Index",
        "",
        "| Section | Source Page |",
        "|---|---:|",
        *rows,
        "",
    ]
    path.write_text("\n".join(body), encoding="utf-8")


def write_contents() -> None:
    lines = [
        "---",
        "title: Essentials of Swedish Grammar - Extracted Contents",
        "book: Essentials of Swedish Grammar",
        "status: extracted",
        "---",
        "",
        "# Essentials of Swedish Grammar - Extracted Sections",
        "",
        "## Chapters",
        "",
        "| Chapter | Topic |",
        "|---:|---|",
    ]
    for chapter in CHAPTERS:
        rel = chapter_dir(chapter).relative_to(OUT) / f"{chapter.number.zfill(2)} {clean_filename(chapter.title).title()}"
        lines.append(f"| {chapter.number} | [[{rel.as_posix()}\\|{chapter.title}]] |")
    lines.extend(["", "## Detailed Contents", ""])
    for chapter in CHAPTERS:
        rel_ch = chapter_dir(chapter).relative_to(OUT) / f"{chapter.number.zfill(2)} {clean_filename(chapter.title).title()}"
        lines.append(f"### {chapter.number}. [[{rel_ch.as_posix()}|{chapter.title}]]")
        lines.append("")
        for section in chapter.sections:
            rel = section_file(chapter, section).relative_to(OUT).with_suffix("")
            lines.append(f"- [[{rel.as_posix()}|{section.number} {section.title}]]")
        lines.append("")
    (OUT / "00 Contents.md").write_text("\n".join(lines).strip() + "\n", encoding="utf-8")


def main() -> None:
    pages = extract_pages()
    OUT.mkdir(parents=True, exist_ok=True)
    for ci, chapter in enumerate(CHAPTERS):
        write_chapter_index(chapter)
        for si, section in enumerate(chapter.sections):
            next_section = chapter.sections[si + 1] if si + 1 < len(chapter.sections) else None
            next_chapter = CHAPTERS[ci + 1] if ci + 1 < len(CHAPTERS) else None
            text, page_label = extract_section_text(pages, chapter, section, next_section, next_chapter)
            write_section(chapter, section, text, page_label)
    write_contents()


if __name__ == "__main__":
    main()
