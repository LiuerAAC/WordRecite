from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import pdfplumber


PDF_PATH = Path("/Users/yuxuancao/Downloads/toaz.info-essentials-of-swedish-grammarpdf-pr_e7047544758103bdaced2504c96dda24.pdf")
OUT = Path("/Users/yuxuancao/Documents/Language Study/Essentials of Swedish Grammar")


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


CHAPTERS: tuple[Chapter, ...] = (
    Chapter("1", "Introduction", 7, (
        Section("1.1", "What do you need to learn to speak a new language?", 7),
        Section("1.2", "Why do you have to learn grammar?", 8),
        Section("1.3", "Sentence and clause", 10),
        Section("1.4", "Word forms. Endings", 11),
    )),
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
    Chapter("A", "Appendices", 158, (
        Section("A.1", "The Swedish Alphabet", 158),
        Section("A.2", "Numbers", 159),
    )),
)


def slug(text: str) -> str:
    text = text.replace("/", " ")
    text = text.replace("'", "")
    text = text.replace('"', "")
    text = re.sub(r"[^0-9A-Za-zÀ-ÖØ-öø-ÿ .-]+", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:90]


def normalize(text: str) -> str:
    text = text.lower()
    text = text.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    text = re.sub(r"^\s*[0-9a-z]+(?:\.[0-9]+)*\.?\s*", "", text)
    text = re.sub(r"[^a-z0-9åäöéüàèö' ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def strip_page_numbers(text: str) -> str:
    out = []
    for line in text.splitlines():
        if re.fullmatch(r"\s*\d+\s*", line):
            continue
        out.append(line.rstrip())
    return "\n".join(out).strip()


def extract_pages() -> dict[int, str]:
    pages: dict[int, str] = {}
    with pdfplumber.open(PDF_PATH) as pdf:
        for idx, page in enumerate(pdf.pages, start=1):
            text = page.extract_text(x_tolerance=1, y_tolerance=3) or ""
            pages[idx] = strip_page_numbers(text)
    return pages


def page_span(start_page: int, end_page: int, pages: dict[int, str]) -> str:
    return "\n\n".join(pages.get(p, "") for p in range(start_page, end_page + 1)).strip()


def line_offsets(text: str) -> list[tuple[int, str]]:
    offsets = []
    pos = 0
    for line in text.splitlines(True):
        offsets.append((pos, line.rstrip("\n")))
        pos += len(line)
    return offsets


def find_heading_pos(text: str, title: str, section_number: str | None = None) -> int | None:
    target = normalize(title)
    lines = line_offsets(text)
    best: tuple[int, int] | None = None
    for i, (pos, _line) in enumerate(lines):
        chunk = " ".join(lines[j][1] for j in range(i, min(i + 4, len(lines))))
        n = normalize(chunk)
        score = 0
        if target and target in n:
            score = len(target)
        elif n and n in target and len(n) > 5:
            score = len(n)
        if section_number and re.match(rf"\s*{re.escape(section_number)}(?:\s|\.)", chunk):
            score += 20
        if score and (best is None or score > best[0]):
            best = (score, pos)
    return None if best is None else best[1]


def all_items() -> list[tuple[str, str, int, Chapter, Section | None]]:
    items: list[tuple[str, str, int, Chapter, Section | None]] = []
    for chapter in CHAPTERS:
        items.append((f"chapter:{chapter.number}", chapter.title, chapter.page, chapter, None))
        for section in chapter.sections:
            items.append((f"section:{section.number}", section.title, section.page, chapter, section))
    return items


def source_for_item(
    item_title: str,
    item_page: int,
    next_title: str | None,
    next_page: int | None,
    pages: dict[int, str],
    item_number: str | None = None,
) -> tuple[str, str]:
    end_page = (next_page - 1) if next_page else 159
    if next_page == item_page:
        end_page = item_page
    raw = page_span(item_page, end_page, pages)
    start = find_heading_pos(raw, item_title, item_number)
    if start is None:
        start = 0
    end = len(raw)
    if next_title and next_page == item_page:
        next_pos = find_heading_pos(raw[start + 1 :], next_title)
        if next_pos is not None:
            end = start + 1 + next_pos
    text = raw[start:end].strip()
    page_label = f"{item_page}" if end_page == item_page else f"{item_page}-{end_page}"
    return text, page_label


def extract_key_terms(text: str) -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    patterns = [
        r"([A-Za-z][A-Za-z -]{2,40})\s+\(([a-zåäöéüàèö -]{2,40})\)",
        r"([A-Za-z][A-Za-z -]{2,40})\s+'[^']+'\s+\(([a-zåäöéüàèö -]{2,40})\)",
    ]
    for pat in patterns:
        for m in re.finditer(pat, text):
            eng = re.sub(r"\s+", " ", m.group(1)).strip(" .,;:")
            swe = re.sub(r"\s+", " ", m.group(2)).strip(" .,;:")
            if len(eng) > 2 and len(swe) > 1 and (eng, swe) not in pairs:
                pairs.append((eng, swe))
            if len(pairs) >= 8:
                break
        if len(pairs) >= 8:
            break
    return pairs


def topic_notes(title: str) -> list[str]:
    low = title.lower()
    notes = [f"This section corresponds to the book section titled `{title}`."]
    if "pronoun" in low:
        notes += [
            "Identify the pronoun forms introduced in the section and note what role each form has in a clause.",
            "Pay attention to whether the section is discussing subject forms, object forms, reflexive forms, or possessive forms.",
        ]
    elif "verb" in low or "infinitive" in low or "participle" in low or "imperative" in low:
        notes += [
            "Track the verb form being introduced and the context where that form is used.",
            "Separate form-building rules from word-order rules; both matter in Swedish grammar.",
        ]
    elif "noun" in low or "plural" in low or "genitive" in low or "definiteness" in low or "gender" in low:
        notes += [
            "Focus on how the noun changes form and what information the form expresses.",
            "Record whether the section concerns gender, number, definiteness, or possession.",
        ]
    elif "adjective" in low or "comparative" in low or "superlative" in low or "comparison" in low:
        notes += [
            "Watch how adjective forms agree with the noun phrase or express degree.",
            "Keep attributive and predicative uses separate when you make your own examples.",
        ]
    elif "question" in low:
        notes += [
            "Identify the clause type and place the finite verb in the correct position.",
            "Compare Swedish word order with English, especially after question words.",
        ]
    elif "clause" in low or "sentence" in low or "word order" in low or "fronting" in low:
        notes += [
            "Map the clause positions explicitly: subject, finite verb, object, adverbial, and any fronted element.",
            "Use a word-order table before writing free-form examples.",
        ]
    elif "preposition" in low or "place" in low or "position" in low or "direction" in low:
        notes += [
            "Learn the expression as a phrase, not as an isolated word.",
            "Distinguish position, direction toward a place, and direction from a place.",
        ]
    elif "pronunciation" in low or "vowel" in low or "consonant" in low or "accent" in low or "spelling" in low:
        notes += [
            "Treat spelling and pronunciation as related but separate systems.",
            "Mark the sound contrast or spelling pattern that the section is teaching.",
        ]
    elif "determiner" in low or "den här" in low or "vilken" in low or "någon" in low:
        notes += [
            "Identify the determiner forms and the noun phrase pattern that follows them.",
            "Check whether the noun or adjective must be definite, indefinite, singular, or plural.",
        ]
    else:
        notes += [
            "Read the section for its main rule, then make a small table of form, function, and example.",
            "When a Swedish example appears in the source, rewrite it in your own words before adding it to flashcards.",
        ]
    return notes


def example_patterns(title: str) -> list[tuple[str, str]]:
    low = title.lower()
    if "yes/no" in low:
        return [("Verb + subject", "Kommer du? / Are you coming?")]
    if "question" in low:
        return [("Question word + verb + subject", "Var bor du? / Where do you live?")]
    if "negation" in low:
        return [("Verb + inte", "Jag dricker inte kaffe. / I do not drink coffee.")]
    if "plural" in low:
        return [("noun + plural ending", "en stol -> stolar")]
    if "definite" in low or "definiteness" in low:
        return [("indefinite noun -> definite noun", "en häst -> hästen")]
    if "en words" in low or "ett words" in low or "gender" in low:
        return [("article + noun", "en stol / ett bord")]
    if "adjective" in low:
        return [("adjective + noun", "en gammal bil / an old car")]
    if "adverb" in low:
        return [("adjective stem + -t", "snabb -> snabbt")]
    if "preposition" in low:
        return [("preposition phrase", "i Stockholm / in Stockholm")]
    if "pronoun" in low:
        return [("pronoun in clause", "Jag ser honom. / I see him.")]
    if "infinitive" in low:
        return [("auxiliary + infinitive", "kan spela / can play")]
    if "imperative" in low or "commands" in low:
        return [("imperative verb", "Kom! / Come!")]
    if "perfect" in low:
        return [("har + supine", "har läst / has read")]
    if "future" in low:
        return [("future expression", "ska läsa / is going to read")]
    if "passive" in low:
        return [("passive form", "öppnas / is opened")]
    if "comparison" in low or "comparative" in low:
        return [("comparative pattern", "större än / bigger than")]
    if "place" in low or "position" in low or "direction" in low:
        return [("position vs direction", "här / hit / härifrån")]
    if "relative" in low:
        return [("relative connector", "som / who, which, that")]
    if "cleft" in low:
        return [("det är ... som", "Det är Maria som ...")]
    if "existential" in low:
        return [("det finns", "Det finns en bok på bordet.")]
    return [("make your own example", "Use the rule from this section with new vocabulary.")]


def md_escape_table(text: str) -> str:
    return text.replace("|", "\\|").replace("\n", " ")


def frontmatter(title: str, chapter: str, section: str | None, pages: str) -> str:
    bits = [
        "---",
        f'title: "{title.replace(chr(34), chr(39))}"',
        f"chapter: {chapter}",
    ]
    if section:
        bits.append(f'section: "{section}"')
    bits.extend([
        "book: Essentials of Swedish Grammar",
        f'source_pages: "{pages}"',
        "status: extracted",
        "tags:",
        "  - Swedish",
        "  - grammar",
        "---",
        "",
    ])
    return "\n".join(bits)


def section_filename(section: Section) -> str:
    return f"{section.number.zfill(4) if section.number.startswith('A') else section.number} {slug(section.title)}.md"


def chapter_dir(chapter: Chapter) -> Path:
    prefix = chapter.number.zfill(2) if chapter.number.isdigit() else "Appendices"
    return OUT / f"{prefix} {slug(chapter.title)}"


def chapter_file(chapter: Chapter) -> Path:
    prefix = chapter.number.zfill(2) if chapter.number.isdigit() else "Appendices"
    return chapter_dir(chapter) / f"{prefix} {slug(chapter.title)}.md"


def wiki_link_for_section(section: Section) -> str:
    chapter = next(ch for ch in CHAPTERS if section in ch.sections)
    return f"{chapter_dir(chapter).name}/{section_filename(section)[:-3]}"


def write_section(chapter: Chapter, section: Section, text: str, pages: str) -> None:
    path = chapter_dir(chapter) / section_filename(section)
    terms = extract_key_terms(text)
    examples = example_patterns(section.title)
    prev_next = []
    all_sections = [s for ch in CHAPTERS for s in ch.sections]
    idx = all_sections.index(section)
    if idx > 0:
        prev = all_sections[idx - 1]
        prev_next.append(f"previous: [[../{wiki_link_for_section(prev)}|{prev.number} {prev.title}]]")
    if idx + 1 < len(all_sections):
        nxt = all_sections[idx + 1]
        prev_next.append(f"next: [[../{wiki_link_for_section(nxt)}|{nxt.number} {nxt.title}]]")

    body = [
        frontmatter(f"{section.number} {section.title}", chapter.number, section.number, pages),
        f"# {section.number} {section.title}",
        "",
        "## Navigation",
        "",
        f"- Chapter: [[{chapter_file(chapter).name[:-3]}|{chapter.number} {chapter.title}]]",
        *[f"- {line}" for line in prev_next],
        "",
        "## Corresponding English Study Notes",
        "",
        "These notes follow the same section boundary and topic as the source text, but they are written as a non-verbatim study guide.",
        "",
    ]
    for note in topic_notes(section.title):
        body.append(f"- {note}")
    body.append("")
    if terms:
        body.extend([
            "## Key Terms Detected",
            "",
            "| English Term | Swedish Term |",
            "|---|---|",
        ])
        for eng, swe in terms:
            body.append(f"| {md_escape_table(eng)} | {md_escape_table(swe)} |")
        body.append("")
    if examples:
        body.extend([
            "## Example Patterns",
            "",
            "| Pattern | Example |",
            "|---|---|",
        ])
        for pattern, ex in examples:
            body.append(f"| {md_escape_table(pattern)} | {md_escape_table(ex)} |")
        body.append("")
    body.extend([
        "## Study Notes / Summary",
        "",
        "### 中文总结",
        "",
        f"本节对应原书 `{section.number} {section.title}`，页码范围为 `{pages}`。正文部分不是逐字转写，而是按照原书小节边界制作的英文对应学习笔记；复习时建议回到 PDF 对照阅读，并把术语、规则和例句整理进自己的卡片。",
        "",
        "### 学习检查",
        "",
        f"- 能否说明 `{section.title}` 这一节处理的核心语法点？",
        "- 能否从英文原文中找出至少 3 个瑞典语例句？",
        "- 能否把本节术语加入自己的 Obsidian 术语表？",
        "",
    ])
    path.write_text("\n".join(body), encoding="utf-8")


def write_chapter(chapter: Chapter, text: str, pages: str) -> None:
    path = chapter_file(chapter)
    rows = []
    for section in chapter.sections:
        link = f"[[{section_filename(section)[:-3]}\\|{section.number} {section.title}]]"
        rows.append(f"| {link} | {section.page} |")
    body = [
        frontmatter(f"{chapter.number} {chapter.title}", chapter.number, None, pages),
        f"# {chapter.number} {chapter.title}",
        "",
        "## Section Index",
        "",
        "| Section | Source Page |",
        "|---|---:|",
        *rows,
        "",
        "## Corresponding Chapter Notes",
        "",
        "This chapter note follows the chapter boundary in the source book. Use the section files below for detailed study notes.",
        "",
        "### Main Study Tasks",
        "",
        *[f"- Work through section `{s.number} {s.title}` and record its rule, form, and example pattern." for s in chapter.sections],
        "",
        "## Study Notes / Summary",
        "",
        "### 中文总结",
        "",
        f"本章对应原书 `{chapter.number} {chapter.title}`。上方目录链接到每一个独立小节文件；章节说明按照原书边界制作，但不逐字转写原书正文。",
        "",
    ]
    path.write_text("\n".join(body), encoding="utf-8")


def write_contents() -> None:
    lines = [
        "---",
        "title: Essentials of Swedish Grammar - Contents",
        "book: Essentials of Swedish Grammar",
        "status: extracted",
        f"source_pdf: {PDF_PATH}",
        "---",
        "",
        "# Essentials of Swedish Grammar",
        "",
        "> [!note] 使用方式",
        "> 这是全书整理入口。每章和每节都有独立 Markdown 文件；正文区是英文对应学习笔记，中文总结统一放在文末 `Study Notes / Summary`。",
        "",
        "## 学习地图",
        "",
        "| 章节 | 主题 | 状态 |",
        "|---:|---|---|",
    ]
    for chapter in CHAPTERS:
        chapter_name = chapter_file(chapter).relative_to(OUT).with_suffix("").as_posix()
        lines.append(f"| {chapter.number} | [[{chapter_name}\\|{chapter.title}]] | 已生成 |")
    lines.extend(["", "## 详细目录", ""])
    for chapter in CHAPTERS:
        chapter_name = chapter_file(chapter).relative_to(OUT).with_suffix("").as_posix()
        lines.extend([f"### {chapter.number}. [[{chapter_name}|{chapter.title}]]", ""])
        for section in chapter.sections:
            section_name = (chapter_dir(chapter) / section_filename(section)).relative_to(OUT).with_suffix("").as_posix()
            lines.append(f"- [[{section_name}|{section.number} {section.title}]]")
        lines.append("")
    (OUT / "00 Contents.md").write_text("\n".join(lines).strip() + "\n", encoding="utf-8")


def main() -> None:
    pages = extract_pages()
    OUT.mkdir(parents=True, exist_ok=True)
    items = all_items()
    for chapter in CHAPTERS:
        chapter_dir(chapter).mkdir(parents=True, exist_ok=True)

    for idx, (kind, title, page, chapter, section) in enumerate(items):
        next_title = items[idx + 1][1] if idx + 1 < len(items) else None
        next_page = items[idx + 1][2] if idx + 1 < len(items) else None
        item_number = section.number if section else chapter.number
        text, page_label = source_for_item(title, page, next_title, next_page, pages, item_number)
        if section:
            write_section(chapter, section, text, page_label)
        else:
            write_chapter(chapter, text, page_label)
    write_contents()


if __name__ == "__main__":
    main()
