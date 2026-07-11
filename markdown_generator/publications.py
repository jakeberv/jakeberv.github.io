#!/usr/bin/env python3
"""Validate or generate site-compatible publication collection documents."""

from __future__ import annotations

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Dict, List

from generator_core import (
    Document,
    InputValidationError,
    TableSchema,
    print_manifest,
    print_validation_errors,
    read_table,
    render_documents,
    write_documents,
    yaml_block,
    yaml_list,
    yaml_scalar,
)


REPO_ROOT = Path(__file__).resolve().parent.parent
REQUIRED_FIELDS = {
    "pub_date",
    "title",
    "venue",
    "citation",
    "url_slug",
    "type",
    "tags",
    "authors",
    "abstract",
    "method_families",
    "method_tags",
    "method_tag_confidence",
}
OPTIONAL_FIELDS = {
    "excerpt",
    "paper_url",
    "link",
    "slides_url",
    "bibtex_url",
    "doi",
    "github",
    "featured",
    "student_authors",
    "category",
}
SCHEMA = TableSchema(
    required_fields=REQUIRED_FIELDS,
    optional_fields=OPTIONAL_FIELDS,
    list_fields={"tags", "authors", "method_families", "method_tags", "student_authors"},
    boolean_fields={"featured"},
    choices={"method_tag_confidence": {"high", "medium", "low"}},
    date_field="pub_date",
    slug_field="url_slug",
)


def render_publication(row: Dict[str, object]) -> Document:
    pub_date = str(row["pub_date"])
    slug = str(row["url_slug"])
    filename = f"{pub_date}-{slug}.md"
    featured = str(row.get("featured", "") or "false")
    category = str(row.get("category", "") or "manuscripts")

    lines: List[str] = [
        "---",
        f"title: {yaml_scalar(row['title'])}",
        "collection: publications",
        f"permalink: /publication/{pub_date}-{slug}",
        f"date: {pub_date}",
        f"venue: {yaml_scalar(row['venue'])}",
        f"category: {yaml_scalar(category)}",
        f"featured: {featured}",
        f"type: {yaml_scalar(row['type'])}",
    ]
    lines.extend(yaml_list("tags", row["tags"]))
    lines.extend(yaml_list("authors", row["authors"]))
    if row.get("student_authors"):
        lines.extend(yaml_list("student_authors", row["student_authors"]))
    lines.extend(yaml_block("abstract", str(row["abstract"])))
    lines.extend(yaml_list("method_families", row["method_families"]))
    lines.extend(yaml_list("method_tags", row["method_tags"]))
    lines.append(f"method_tag_confidence: {yaml_scalar(row['method_tag_confidence'])}")

    scalar_fields = (
        ("excerpt", "excerpt"),
        ("paper_url", "paperurl"),
        ("link", "link"),
        ("slides_url", "slidesurl"),
        ("bibtex_url", "bibtexurl"),
        ("doi", "doi"),
        ("github", "github"),
    )
    for input_key, output_key in scalar_fields:
        if row.get(input_key):
            lines.append(f"{output_key}: {yaml_scalar(row[input_key])}")
    lines.extend([f"citation: {yaml_scalar(row['citation'])}", "---", ""])

    body = []
    if row.get("paper_url"):
        body.append(f"[Download paper here]({row['paper_url']}){{: .btn--research}}")
    if row.get("link") and row.get("link") != row.get("paper_url"):
        body.append(f"[View publication]({row['link']}){{: .btn--research}}")
    if row.get("slides_url"):
        body.append(f"[View slides]({row['slides_url']}){{: .btn--research}}")
    if row.get("bibtex_url"):
        body.append(f"[Download BibTeX]({row['bibtex_url']}){{: .btn--research}}")
    if row.get("excerpt"):
        body.extend(["", str(row["excerpt"])])
    body.extend(["", f"Recommended citation: {row['citation']}"])
    content = "\n".join(lines + body).rstrip() + "\n"
    return Document(filename, content, int(row["_row_number"]))


def validate_taxonomies(documents: List[Document]) -> None:
    validators = [
        REPO_ROOT / "scripts/qa/validate-publication-tags.mjs",
        REPO_ROOT / "scripts/qa/validate-publication-method-tags.mjs",
    ]
    with tempfile.TemporaryDirectory(prefix="publication-generator-check-") as temporary:
        staging_dir = Path(temporary)
        write_documents(documents, staging_dir, overwrite=False)
        errors = []
        for validator in validators:
            try:
                result = subprocess.run(
                    ["node", str(validator), "--publications-dir", str(staging_dir)],
                    cwd=REPO_ROOT,
                    capture_output=True,
                    text=True,
                    check=False,
                )
            except OSError as error:
                raise OSError(f"unable to run Node taxonomy validator: {error}") from error
            if result.returncode != 0:
                diagnostic = (result.stderr or result.stdout).strip()
                diagnostic_lines = diagnostic.splitlines() if diagnostic else ["validation failed"]
                errors.extend(f"{validator.name}: {line}" for line in diagnostic_lines)
        if errors:
            raise InputValidationError(errors)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subcommands = parser.add_subparsers(dest="command", required=True)
    check = subcommands.add_parser("check", help="validate input without persistent writes")
    check.add_argument("input", type=Path)
    generate = subcommands.add_parser("generate", help="validate and write generated Markdown")
    generate.add_argument("input", type=Path)
    generate.add_argument("--output-dir", type=Path, required=True)
    generate.add_argument("--overwrite", action="store_true")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        rows = read_table(args.input, SCHEMA)
        documents = render_documents(rows, render_publication)
        validate_taxonomies(documents)
        if args.command == "check":
            print_manifest("publication", documents)
        else:
            write_documents(documents, args.output_dir, args.overwrite)
            print(f"Generated {len(documents)} publication(s) in {args.output_dir}")
        return 0
    except InputValidationError as error:
        print_validation_errors(error)
        return 2
    except (OSError, UnicodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
