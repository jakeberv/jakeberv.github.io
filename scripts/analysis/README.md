# R Analysis Tools

Run these scripts from the repository root so their relative data paths resolve correctly.

- `citation_map_parser.R` converts the manually exported Web of Science data in `_data/map.txt` to `_data/map_data.json`.
- `legacy/citation_analysis.R` and `legacy/citation_network.R` are retained research prototypes. They are not part of the website build or a supported automated pipeline.

The legacy Semantic Scholar analysis requires `SEMANTIC_SCHOLAR_API_KEY` in the process environment. Never place credentials in source files. Its root `.RDS` outputs are local generated state and are intentionally ignored.

Install the optional R dependencies deliberately before running these tools:

```sh
Rscript -e 'install.packages(c("V8", "jsonlite", "httr", "igraph", "reticulate", "rvest", "dplyr", "R.utils"))'
```

The scripts never modify the active R library themselves.
