# Content authoring generators

The supported generators turn validated CSV or TSV metadata into reviewable Jekyll collection documents. They support Python 3.10 or newer using only the standard library; no exact Python patch version or Python packages are required. They work from any current directory and never write into a collection implicitly. Publication checks also use the repository's supported Node 24 runtime to invoke the canonical taxonomy validators.

## Safe workflow

Validate an input without persistent output:

```bash
python3 markdown_generator/publications.py check /path/to/publications.csv
python3 markdown_generator/talks.py check /path/to/talks.tsv
```

Generate into an explicit staging directory:

```bash
python3 markdown_generator/publications.py generate /path/to/publications.csv --output-dir /tmp/publications-review
python3 markdown_generator/talks.py generate /path/to/talks.tsv --output-dir /tmp/talks-review
```

Existing target files are refused as a group. Add `--overwrite` only after reviewing the staged output. Non-overwrite publication uses an atomic no-clobber operation, including if a target appears after preflight. Overwrite mode atomically replaces generated target names, preserves an existing file's permissions, and does not delete unrelated or stale files.

Exit status `0` means validation or generation succeeded, `2` identifies input, schema, taxonomy, or collision errors, and `1` identifies filesystem or runtime failures.

## Publication schema

CSV and TSV headers may appear in any order. The required columns are:

```text
pub_date,title,venue,citation,url_slug,type,tags,authors,abstract,method_families,method_tags,method_tag_confidence
```

Optional columns are:

```text
excerpt,paper_url,link,slides_url,doi,github,featured,student_authors,category
```

Use exact `YYYY-MM-DD` dates and slugs containing only letters, digits, `_`, and `-`. Separate `tags`, `authors`, `student_authors`, `method_families`, and `method_tags` with `|`. `featured` accepts only `true` or `false`; it defaults to `false`. `category` defaults to `manuscripts`.

Publication checks stage the rendered Markdown temporarily and run the repository's canonical publication and research-method validators. A successful check therefore means the generated records satisfy the same taxonomy policies enforced during deployment.

## Talk schema

Required columns are `title`, `url_slug`, and `date`. Optional columns are `type`, `venue`, `location`, `talk_url`, and `description`. The type defaults to `Talk`.

This generator creates optional `_talks` collection documents for `/talks-archive/`. It does not read or modify `_data/talks.yml`, which remains the manually curated source for the visible `/talks/` page.

## Legacy tools

The notebooks, spreadsheet, sample inputs, and `pubsFromBib.py` remain in the repository for historical reference but are not supported generator interfaces. They may require third-party packages and are excluded from the deployed Pages artifact.

Run `npm run check:generators` to exercise the supported command-line contract.
