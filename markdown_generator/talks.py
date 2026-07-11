#!/usr/bin/env python3
"""Validate or generate optional talk collection documents."""

from __future__ import annotations

import argparse
import sys
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
    yaml_scalar,
)


SCHEMA = TableSchema(
    required_fields={"title", "url_slug", "date"},
    optional_fields={"type", "venue", "location", "talk_url", "description"},
    list_fields=set(),
    boolean_fields=set(),
    choices={},
    date_field="date",
    slug_field="url_slug",
)


def render_talk(row: Dict[str, object]) -> Document:
    talk_date = str(row["date"])
    slug = str(row["url_slug"])
    talk_type = str(row.get("type", "") or "Talk")
    filename = f"{talk_date}-{slug}.md"
    lines: List[str] = [
        "---",
        f"title: {yaml_scalar(row['title'])}",
        "collection: talks",
        f"type: {yaml_scalar(talk_type)}",
        f"talk_type: {yaml_scalar(talk_type)}",
        f"permalink: /talks/{talk_date}-{slug}",
        f"date: {talk_date}",
    ]
    for key in ("venue", "location"):
        if row.get(key):
            lines.append(f"{key}: {yaml_scalar(row[key])}")
    lines.extend(["---", ""])

    body = []
    if row.get("talk_url"):
        body.append(f"[More information here]({row['talk_url']})")
    if row.get("description"):
        if body:
            body.append("")
        body.append(str(row["description"]))
    content = "\n".join(lines + body).rstrip() + "\n"
    return Document(filename, content, int(row["_row_number"]))


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
        documents = render_documents(rows, render_talk)
        if args.command == "check":
            print_manifest("talk", documents)
        else:
            write_documents(documents, args.output_dir, args.overwrite)
            print(f"Generated {len(documents)} talk(s) in {args.output_dir}")
        return 0
    except InputValidationError as error:
        print_validation_errors(error)
        return 2
    except (OSError, UnicodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
