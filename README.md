# DownfallConpendium Site

Static web frontend for browsing Slay the Spire 2 Downfall mod cards and relics.

## Online

Browse online: https://mewcodex.github.io/DownfallConpendium2/

## Contents

- `index.html`: page structure
- `styles.css`: UI styles
- `app.js`: filtering, rendering, i18n, behavior alignment with mod runtime
- `data/cards.json`: generated card data
- `data/catfall-cards.json`: generated Catfall card data
- `data/catfall-relics.json`: generated Catfall relic data
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

Catfall data is generated independently and does not inherit regular Downfall records or assets:

- `../pipeline/run_catfall_pipeline.bat`

Re-run the pipeline after changing extraction rules or replacing the source archive in `pipeline/resources/`. The site header displays the generated mod version and whether Chinese text is bundled with the mod or supplied separately.

Catfall mode uses the bundled Guardian and Downfall packages, including Downfall's Hermit implementation. It is Chinese-only and keeps its enabled state when moving between the card and relic pages.

## Notes

- This folder is intended to be published independently from the rest of the workspace.
- Runtime-display edge cases (for example upgrade text usage and Afterlife extended text) are aligned to actual mod code behavior via generated flags in `cards.json`.
