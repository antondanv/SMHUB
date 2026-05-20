from __future__ import annotations

from pathlib import Path
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile
import json


WORD_NAMESPACE = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def load_preview_sidecar(file_path: Path) -> dict | None:
    sidecar_path = file_path.with_suffix(file_path.suffix + ".preview.json")
    if not sidecar_path.exists():
        return None

    try:
        return json.loads(sidecar_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def extract_docx_paragraphs(file_path: Path) -> list[str]:
    try:
        with ZipFile(file_path) as archive:
            xml_bytes = archive.read("word/document.xml")
    except (FileNotFoundError, KeyError, BadZipFile):
        return []

    root = ElementTree.fromstring(xml_bytes)
    paragraphs: list[str] = []

    for paragraph in root.findall(".//w:p", WORD_NAMESPACE):
        parts = [
            node.text.strip()
            for node in paragraph.findall(".//w:t", WORD_NAMESPACE)
            if node.text and node.text.strip()
        ]
        if parts:
            paragraphs.append(" ".join(parts))

    return paragraphs


def build_preview_from_paragraphs(paragraphs: list[str], fallback_title: str) -> dict | None:
    if not paragraphs:
        return None

    title = paragraphs[0]
    summary = paragraphs[1] if len(paragraphs) > 1 else fallback_title
    sections: list[dict[str, list[str] | str]] = []
    current_heading = "Содержимое"
    current_bullets: list[str] = []

    for paragraph in paragraphs[2:]:
        if paragraph.startswith("• "):
            current_bullets.append(paragraph[2:].strip())
            continue

        if current_bullets:
            sections.append(
                {
                    "heading": current_heading,
                    "bullets": current_bullets,
                }
            )
            current_bullets = []

        current_heading = paragraph

    if current_bullets:
        sections.append(
            {
                "heading": current_heading,
                "bullets": current_bullets,
            }
        )

    if not sections:
        sections = [
            {
                "heading": "Содержимое",
                "bullets": paragraphs[1:7],
            }
        ]

    return {
        "title": title,
        "summary": summary,
        "sections": sections,
        "note": "Предпросмотр собран из содержимого файла и показан в удобном для чтения виде.",
    }
