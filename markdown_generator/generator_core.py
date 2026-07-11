"""Shared validation and safe-write helpers for content generators."""

from __future__ import annotations

import csv
import json
import os
import re
import tempfile
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Callable, Dict, Iterable, List, Mapping, Sequence, Set


SLUG_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]*$")


class InputValidationError(Exception):
    """An input or collision error that the user can correct."""

    def __init__(self, messages: Sequence[str]):
        super().__init__("\n".join(messages))
        self.messages = list(messages)


@dataclass(frozen=True)
class TableSchema:
    required_fields: Set[str]
    optional_fields: Set[str]
    list_fields: Set[str]
    boolean_fields: Set[str]
    choices: Mapping[str, Set[str]]
    date_field: str
    slug_field: str

    @property
    def allowed_fields(self) -> Set[str]:
        return self.required_fields | self.optional_fields


@dataclass(frozen=True)
class Document:
    filename: str
    content: str
    row_number: int


def _duplicate_values(values: Iterable[str]) -> List[str]:
    seen = set()
    duplicates = set()
    for value in values:
        if value in seen:
            duplicates.add(value)
        seen.add(value)
    return sorted(duplicates)


def _normalize_cell(value: str) -> str:
    return value.replace("\r\n", "\n").replace("\r", "\n").strip()


def _validate_header(headers: Sequence[str], schema: TableSchema) -> None:
    errors = []
    if not headers:
        errors.append("missing header row")
    if any(not header for header in headers):
        errors.append("header names cannot be blank")

    duplicates = _duplicate_values(headers)
    if duplicates:
        errors.append(f"duplicate header(s): {', '.join(duplicates)}")

    unknown = sorted(set(headers) - schema.allowed_fields)
    if unknown:
        errors.append(f"unknown header(s): {', '.join(unknown)}")

    missing = sorted(schema.required_fields - set(headers))
    if missing:
        errors.append(f"missing required header(s): {', '.join(missing)}")

    if errors:
        raise InputValidationError(errors)


def _parse_list(value: str, field: str, row_number: int, required: bool) -> tuple[List[str], List[str]]:
    if not value:
        if required:
            return [], [f"row {row_number}: {field} is required"]
        return [], []

    values = [item.strip() for item in value.split("|")]
    errors = []
    if any(not item for item in values):
        errors.append(f"row {row_number}: {field} contains an empty list item")
    duplicates = _duplicate_values(item for item in values if item)
    if duplicates:
        errors.append(f"row {row_number}: {field} contains duplicate value(s): {', '.join(duplicates)}")
    return [item for item in values if item], errors


def read_table(input_path: Path, schema: TableSchema) -> List[Dict[str, object]]:
    """Parse and validate a CSV or TSV file without writing persistent output."""

    suffix = input_path.suffix.lower()
    if suffix not in {".csv", ".tsv"}:
        raise InputValidationError([f"expected a .csv or .tsv input file, got {input_path.name}"])

    delimiter = "," if suffix == ".csv" else "\t"
    try:
        handle = input_path.open("r", encoding="utf-8-sig", newline="")
    except (OSError, UnicodeError) as error:
        raise OSError(f"unable to read {input_path}: {error}") from error

    with handle:
        try:
            reader = csv.reader(handle, delimiter=delimiter, strict=True)
            raw_headers = next(reader, None)
            if raw_headers is None:
                raise InputValidationError(["missing header row"])
            headers = [_normalize_cell(header) for header in raw_headers]
            _validate_header(headers, schema)

            rows: List[Dict[str, object]] = []
            errors: List[str] = []
            for row_number, values in enumerate(reader, start=2):
                if not values or all(not value.strip() for value in values):
                    continue
                if len(values) != len(headers):
                    errors.append(
                        f"row {row_number}: expected {len(headers)} columns but found {len(values)}"
                    )
                    continue

                row: Dict[str, object] = {
                    header: _normalize_cell(value) for header, value in zip(headers, values)
                }
                for field in sorted(schema.required_fields - schema.list_fields):
                    if not row.get(field):
                        errors.append(f"row {row_number}: {field} is required")

                date_value = str(row.get(schema.date_field, ""))
                if date_value:
                    try:
                        parsed_date = date.fromisoformat(date_value)
                        if parsed_date.isoformat() != date_value:
                            raise ValueError
                    except ValueError:
                        errors.append(
                            f"row {row_number}: {schema.date_field} must be a valid YYYY-MM-DD date"
                        )

                slug = str(row.get(schema.slug_field, ""))
                if slug and not SLUG_PATTERN.fullmatch(slug):
                    errors.append(
                        f"row {row_number}: {schema.slug_field} must match {SLUG_PATTERN.pattern}"
                    )

                for field in schema.list_fields:
                    parsed, list_errors = _parse_list(
                        str(row.get(field, "")),
                        field,
                        row_number,
                        field in schema.required_fields,
                    )
                    row[field] = parsed
                    errors.extend(list_errors)

                for field in schema.boolean_fields:
                    value = str(row.get(field, ""))
                    if value and value not in {"true", "false"}:
                        errors.append(f"row {row_number}: {field} must be true or false")

                for field, allowed_values in schema.choices.items():
                    value = str(row.get(field, ""))
                    if value and value not in allowed_values:
                        allowed = ", ".join(sorted(allowed_values))
                        errors.append(f"row {row_number}: {field} must be one of: {allowed}")

                row["_row_number"] = row_number
                rows.append(row)
        except csv.Error as error:
            raise InputValidationError([f"malformed delimited input near row {reader.line_num}: {error}"]) from error
        except UnicodeError as error:
            raise InputValidationError([f"input must be valid UTF-8: {error}"]) from error

    if not rows and not errors:
        errors.append("input contains no data rows")
    if errors:
        raise InputValidationError(errors)
    return rows


def render_documents(
    rows: Sequence[Dict[str, object]],
    renderer: Callable[[Dict[str, object]], Document],
) -> List[Document]:
    documents = [renderer(row) for row in rows]
    filenames = [document.filename for document in documents]
    folded_names: Dict[str, List[str]] = {}
    for filename in filenames:
        folded_names.setdefault(filename.casefold(), []).append(filename)
    duplicate_groups = [names for names in folded_names.values() if len(names) > 1]
    if duplicate_groups:
        duplicates = [" / ".join(names) for names in duplicate_groups]
        raise InputValidationError(
            [f"duplicate target filename(s): {', '.join(duplicates)}"]
        )
    return documents


def yaml_scalar(value: object) -> str:
    return json.dumps(str(value), ensure_ascii=False)


def yaml_list(key: str, values: Sequence[str]) -> List[str]:
    lines = [f"{key}:"]
    lines.extend(f"  - {yaml_scalar(value)}" for value in values)
    return lines


def yaml_block(key: str, value: str) -> List[str]:
    lines = [f"{key}: |"]
    lines.extend(f"  {line}" if line else "  " for line in value.split("\n"))
    return lines


def _default_file_mode() -> int:
    current_umask = os.umask(0)
    os.umask(current_umask)
    return 0o666 & ~current_umask


def write_documents(documents: Sequence[Document], output_dir: Path, overwrite: bool) -> None:
    collisions = [document.filename for document in documents if (output_dir / document.filename).exists()]
    if collisions and not overwrite:
        raise InputValidationError(
            [
                "target file(s) already exist; pass --overwrite to replace them: "
                + ", ".join(sorted(collisions))
            ]
        )

    output_dir.mkdir(parents=True, exist_ok=True)
    for document in documents:
        temporary_name = None
        target = output_dir / document.filename
        try:
            target_mode = (
                target.stat().st_mode & 0o777
                if overwrite and target.exists()
                else _default_file_mode()
            )
            with tempfile.NamedTemporaryFile(
                "w",
                encoding="utf-8",
                newline="\n",
                dir=output_dir,
                prefix=f".{document.filename}.",
                delete=False,
            ) as handle:
                handle.write(document.content)
                temporary_name = handle.name
            os.chmod(temporary_name, target_mode)
            if overwrite:
                os.replace(temporary_name, target)
            else:
                try:
                    os.link(temporary_name, target)
                except FileExistsError as error:
                    raise InputValidationError(
                        [
                            "target file appeared during generation; pass --overwrite to replace it: "
                            + document.filename
                        ]
                    ) from error
                os.unlink(temporary_name)
            temporary_name = None
        finally:
            if temporary_name:
                try:
                    os.unlink(temporary_name)
                except OSError:
                    pass


def print_manifest(noun: str, documents: Sequence[Document]) -> None:
    print(f"Validated {len(documents)} {noun}{'' if len(documents) == 1 else 's'}:")
    for document in documents:
        print(f"  {document.filename}")


def print_validation_errors(error: InputValidationError) -> None:
    import sys

    for message in error.messages:
        print(f"error: {message}", file=sys.stderr)
