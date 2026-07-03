from __future__ import annotations

import re
from pathlib import Path

import pdfplumber


PDF_PATH = Path("/Users/yuxuancao/Downloads/toaz.info-essentials-of-swedish-grammarpdf-pr_e7047544758103bdaced2504c96dda24.pdf")
SOURCE_NOTES = Path("Essentials of Swedish Grammar")
OUTPUT_DIR = Path("Essentials of Swedish Grammar - Complete Chapter Notes")


CHAPTERS = [
    ("01", "Introduction", 7, 11, "01 Introduction"),
    ("02", "Word Classes", 12, 19, "02 Word Classes"),
    ("03", "Subject Verb and Object", 20, 22, "03 Subject Verb and Object"),
    ("04", "Various Types of Clause", 23, 30, "04 Various Types of Clause"),
    ("05", "Pronouns", 31, 34, "05 Pronouns"),
    ("06", "Commands and Clauses With More Than One Verb", 35, 42, "06 Commands and Clauses With More Than One Verb"),
    ("07", "Complex Sentences", 43, 48, "07 Complex Sentences"),
    ("08", "Pronunciation and Spelling", 49, 63, "08 Pronunciation and Spelling"),
    ("09", "The Verb and Its Forms", 64, 80, "09 The Verb and Its Forms"),
    ("10", "Forms of the Noun", 81, 90, "10 Forms of the Noun"),
    ("11", "Adjectival Agreement", 91, 99, "11 Adjectival Agreement"),
    ("12", "Possessive Pronouns and the Genitive", 100, 103, "12 Possessive Pronouns and the Genitive"),
    ("13", "Some More Determiners", 104, 112, "13 Some More Determiners"),
    ("14", "Comparison Comparative and Superlative", 113, 120, "14 Comparison Comparative and Superlative"),
    ("15", "Expressions of Place Position and Direction", 121, 132, "15 Expressions of Place Position and Direction"),
    ("16", "Subordinate Clauses and Infinitive Constructions", 133, 147, "16 Subordinate Clauses and Infinitive Constructions"),
    ("17", "Cleft and Existential Sentences", 148, 152, "17 Cleft and Existential Sentences"),
    ("18", "Index and Appendices", 153, 159, "Appendices"),
]


def clean_extracted_text(text: str, printed_page: int) -> str:
    text = text.replace("\x0c", "")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    lines = [line.rstrip() for line in text.splitlines()]
    if lines and lines[-1].strip() == str(printed_page):
        lines = lines[:-1]
    return "\n".join(lines).strip()


def extract_pages() -> dict[int, str]:
    pages: dict[int, str] = {}
    with pdfplumber.open(PDF_PATH) as pdf:
        for printed_page in range(7, 160):
            page = pdf.pages[printed_page - 1]
            text = page.extract_text(x_tolerance=1, y_tolerance=3) or ""
            pages[printed_page] = clean_extracted_text(text, printed_page)
    return pages


def strip_frontmatter(text: str) -> str:
    return re.sub(r"\A---\n.*?\n---\n", "", text, flags=re.S).strip()


def extract_title(markdown: str, fallback: str) -> str:
    match = re.search(r"^#\s+(.+)$", markdown, flags=re.M)
    return match.group(1).strip() if match else fallback


def split_note(markdown: str) -> tuple[str, str]:
    body = strip_frontmatter(markdown)
    body = re.sub(r"^# .+\n+", "", body, count=1)
    body = re.sub(r"## Source Correspondence\n\n.*?(?=\n## |\Z)", "", body, flags=re.S)
    parts = re.split(r"\n## Study Notes / Summary\n", body, maxsplit=1)
    organized = parts[0].strip()
    summary = parts[1].strip() if len(parts) > 1 else ""
    return organized, summary


def plain_wiki_links(text: str) -> str:
    def replace(match: re.Match[str]) -> str:
        inner = match.group(1)
        parts = re.split(r"(?<!\\)\|", inner, maxsplit=1)
        if len(parts) == 2:
            return parts[1].replace("\\|", "|")
        return Path(parts[0]).name.replace("\\|", "|")

    return re.sub(r"\[\[(.*?)\]\]", replace, text)


def demote_headings(text: str, levels: int = 2) -> str:
    prefix = "#" * levels
    return re.sub(r"^(#{1,5})\s+", lambda m: m.group(1) + prefix + " ", text, flags=re.M)


def source_files_for(source_dir: Path) -> list[Path]:
    if not source_dir.exists():
        return []
    files = sorted(source_dir.glob("*.md"))
    chapter_file = source_dir / f"{source_dir.name}.md"
    ordered = []
    if chapter_file.exists():
        ordered.append(chapter_file)
    ordered.extend([p for p in files if p != chapter_file])
    return ordered


def build_organized_and_summary(source_dir_name: str) -> tuple[str, str]:
    source_dir = SOURCE_NOTES / source_dir_name
    organized_parts: list[str] = []
    summary_parts: list[str] = []
    for path in source_files_for(source_dir):
        markdown = path.read_text(encoding="utf-8")
        title = extract_title(strip_frontmatter(markdown), path.stem)
        organized, summary = split_note(markdown)
        organized = demote_headings(plain_wiki_links(organized))
        summary = demote_headings(plain_wiki_links(summary))
        if organized:
            organized_parts.append(f"### {title}\n\n{organized}")
        if summary:
            summary_parts.append(f"### {title}\n\n{summary}")
    return "\n\n".join(organized_parts).strip(), "\n\n".join(summary_parts).strip()


def frontmatter(number: str, title: str, start: int, end: int) -> str:
    return (
        "---\n"
        f'title: "{number} {title}"\n'
        f"chapter: {number}\n"
        "book: Essentials of Swedish Grammar\n"
        f"source_pages: {start}-{end}\n"
        "status: complete\n"
        "structure:\n"
        "  - extracted chapter text\n"
        "  - organized content\n"
        "  - summary\n"
        "tags:\n"
        "  - Swedish\n"
        "  - grammar\n"
        "---\n"
    )


def page_block(page_no: int, text: str) -> str:
    if not text:
        return f"### Page {page_no}\n\n> [!warning] No extractable text found on this page."
    return f"### Page {page_no}\n\n{text}"


def write_chapter(number: str, title: str, start: int, end: int, source_dir_name: str, pages: dict[int, str]) -> Path:
    out_path = OUTPUT_DIR / f"{number} {title}.md"
    source_text = "\n\n---\n\n".join(page_block(p, pages[p]) for p in range(start, end + 1))
    organized, summary = build_organized_and_summary(source_dir_name)
    if not organized:
        organized = "_No organized notes are available for this chapter yet._"
    if not summary:
        summary = "_No separate summary is available for this chapter yet._"
    content = (
        frontmatter(number, title, start, end)
        + f"\n# {number} {title}\n\n"
        + "## 1. Extracted Chapter Text\n\n"
        + "> [!info] Source text\n"
        + f"> Extracted from book pages {start}-{end}. Page markers are retained so the text can be checked against the PDF.\n\n"
        + source_text
        + "\n\n## 2. Organized Content\n\n"
        + organized
        + "\n\n## 3. Summary\n\n"
        + summary
        + "\n"
    )
    out_path.write_text(content, encoding="utf-8")
    return out_path


def write_contents(paths: list[Path]) -> None:
    rows = []
    details = []
    for path in paths:
        stem = path.stem
        number, title = stem.split(" ", 1)
        rows.append(f"| {number} | [[{stem}\\|{title}]] | 已完成 |")
        details.append(f"- [[{stem}|{number} {title}]]")
    contents = (
        "---\n"
        'title: "Essentials of Swedish Grammar - Complete Chapter Notes"\n'
        "book: Essentials of Swedish Grammar\n"
        "status: complete\n"
        "---\n\n"
        "# Essentials of Swedish Grammar - Complete Chapter Notes\n\n"
        "> [!note] 结构说明\n"
        "> 每章按三部分整理：1. Extracted Chapter Text；2. Organized Content；3. Summary。\n\n"
        "## Chapter Map\n\n"
        "| Chapter | Title | Status |\n"
        "|---:|---|---|\n"
        + "\n".join(rows)
        + "\n\n## Files\n\n"
        + "\n".join(details)
        + "\n"
    )
    (OUTPUT_DIR / "00 Contents.md").write_text(contents, encoding="utf-8")


def main() -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)
    pages = extract_pages()
    paths = [write_chapter(*chapter, pages) for chapter in CHAPTERS]
    write_contents(paths)
    print(f"Wrote {len(paths) + 1} markdown files to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
