# DownfallConpendium Site

Static web frontend for browsing Slay the Spire 2 Downfall mod cards and relics.

## Online

Browse online: https://mewcodex.github.io/DownfallConpendium/

## Contents

- `index.html`: page structure
- `styles.css`: UI styles
- `app.js`: filtering, rendering, i18n, behavior alignment with mod runtime
- `data/cards.json`: generated card data
- `assets/`: card art and icon assets
- `serve_site.bat`: local static server helper

## Run locally

Prerequisite: Python 3

1. Open a terminal in this folder.
2. Run `serve_site.bat`.
3. Open http://localhost:5173

## Data Source

`data/cards.json`, `data/relics.json`, and `data/version.json` are generated in place by the sibling project pipeline:

- `../pipeline/run_pipeline.bat`

Re-run the pipeline after changing extraction rules or replacing either archive in `pipeline/resources/`. The site header displays the generated mod and Chinese translation versions.

## Notes

- This folder is intended to be published independently from the rest of the workspace.
- Runtime-display edge cases (for example upgrade text usage and Afterlife extended text) are aligned to actual mod code behavior via generated flags in `cards.json`.
