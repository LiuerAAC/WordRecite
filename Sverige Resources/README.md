# Sverige Vocabulary

This directory contains the data file loaded by the web app for the three Sverige wordbooks.

## Files

- `sverige-vocabulary.json`: readable JSON data.
- `sverige-vocabulary.js`: browser-ready data script. It defines both `window.SVERIGE_VOCABULARY` and `window.RIVSTART_VOCABULARY` for backward compatibility.

## Wordbooks

- `Sverige A1/A2`: sourced from the local Rivstart A1/A2 Anki package and enriched with Chinese meanings, examples, example translations, and example explanations.
- `Sverige B1/B2`: sourced from the local Rivstart B1/B2 Anki package and enriched with Chinese meanings, examples, example translations, and example explanations.
- `Sverige B2/C1`: sourced from `/Users/yuxuancao/Downloads/Rivstart_B2C1_ordkort.apkg` and enriched with Chinese meanings, examples, example translations, and example explanations.

## Regenerate

```bash
node work/enrich_rivstart_vocabulary.mjs --local-fill --limit all --level A1/A2
node work/enrich_rivstart_vocabulary.mjs --local-fill --limit all --level B1/B2
node work/enrich_rivstart_vocabulary.mjs --local-fill --limit all --level B2/C1
node work/build_sverige_vocabulary.mjs
```
