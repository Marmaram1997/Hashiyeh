# Hashiyeh (حاشیه): project context

Read this before working on the repo. It holds the decisions made so far.

## What this is
A personal digital-humanities project by Maryam Fooladi for her CV. It shows translation, NLP and digital humanities working together. It is not commercial.

The subject is Nasrollah Monshi's 12th-century Persian prose version of *Kelileh o Demneh* (Kalila and Dimna), framed as "the Persian life of a world book". The chain of versions is Sanskrit (Panchatantra) → Pahlavi (Borzuya, 6th c., lost) → Arabic (Ibn al-Muqaffaʿ, c. 750, himself Persian) → Persian (Monshi, 12th c.) → Anvar-i Soheili (Kashefi, 15th c., Herat), with European branches such as the Castilian *Calila e Dimna* (1251). The site must make the Persian layers visible.

"Hashiyeh" means "the margin", and it is a placeholder name. The core idea: the text sits at the centre and the computational commentary lives in the margin, as in Persian manuscripts.

## Hard rules
- Bilingual, English and Persian, with a full toggle. Persian is RTL and set in a Naskh face (Noto Naskh Arabic or Amiri). English uses EB Garamond.
- Every factual claim must be verifiable. Never invent dates, figures, quotes or attributions. Mark summaries as editorial summaries, not quotations.
- Images are AI-generated in the manner of Persian manuscript painting, with no text or calligraphy inside them. Label them as AI-generated on the site.
- The 1885 English (Keith-Falconer) comes from the later Syriac branch. It is a sibling version, not a translation of Monshi. Say so wherever the two are compared.
- Keep model suggestions separate from human-reviewed interpretations in all annotation data.

## Data (in /data)
- `kelile_monshi.json`: full Monshi text from the Ganjoor API (ganjoor.net/monshi/kelile-demni). 19 chapters, 250 sections, about 85,000 words. Each section has `verses` with `pos` (Ganjoor's verse position field), which separates prose lines from poetry lines.
- `keith_falconer_1885_ocr.txt`: archive.org OCR of Keith-Falconer, *Kalilah and Dimnah* (Cambridge, 1885). Public domain. Noisy; never edit it, correct it through the scripts below.
- `ocr_corrections/`: `changes.json`/`changes.csv` (every change: tale, stage, rule, before, after, context, edit distance, review status), `review_sample.csv` (25 random stage-1 changes plus all model substitutions, with an empty `correct? (y/n)` column for the human check). All entries are `not yet reviewed`.
- `lion_ox_aligned.json`: 12 tales from the chapter "The Lion and the Ox", hand-aligned. Persian sections (whole Ganjoor sections, which can include frame dialogue), English line spans from the OCR, parent/child nesting, teller.
  - Tellers checked against the text: Ape and Carpenter (Kalila → Dimna), Three Fishes (Dimna → Lion), Camel (Ox → Dimna), Sandpiper (Dimna → Ox), Apes and Glow-worm (Kalila → Dimna), Two Partners (Kalila → Dimna), Tortoise and Geese (hen-bird → her mate). The rest still need labelling.
  - `fa_sections[].inserts`: text added from another source where Ganjoor has a placeholder, kept apart from the Ganjoor `text`. Now: the Arabic couplet in the Lion and the Hare (replaces lines 10–11), source "Minovi ed., p. 88", cited by the project editor; the page reference has not been checked. Defined in `scripts/build_aligned.py` (`INSERTS`); the reader swaps the lines and shows a margin note.
  - Finding: the Frog and the Snake (nested in the Two Partners) is in Monshi but not in the later Syriac version.

## Scripts (in /scripts)
- `fetch_kelile.py`: downloads the whole book from the Ganjoor API into `data/kelile_monshi.json`.
- `ocr_clean.py`: stage 1, deterministic rules (page headers, margin line numbers, footnote markers, line-end hyphens). Holds the tale line spans.
- `ocr_correct.py`: stage 2, model-chosen substitutions (old, new, reason), each applied exactly once with a uniqueness check, plus an `UNRESOLVED` list of doubtful spots left as in the OCR. Cuts nested tales from their parent. Writes `data/ocr_corrections/`.
- `build_aligned.py`: builds `lion_ox_aligned.json` (runs both OCR stages). Each tale has `en_text` (corrected), `en_text_raw_ocr`, `en_source_lines`, `en_changes`, `en_status`.

## What exists
- Site pages (static, clean URLs, shared `assets/site.css` and `assets/site.js` with the EN/FA switch and header): `/` landing (cypress cover, short intro, Start reading, Continue reading if `hashiyeh-last` exists, list of 19 chapters from `data/chapters.json`), `/read` (Persian-only scroll reader of the whole book, see below), `/versions` ("Other versions": the old open-book spread with the 1885 Keith-Falconer English, labelled "From the Syriac branch... a related version, not a translation of Monshi"), `/journey`, `/tales` (atlas with margin panel; "Read this tale" opens `/read#shirogav/shN`), `/method`, `/about`. Language choice is kept in localStorage (`hashiyeh-lang`). Pages use absolute paths, so serve with `npm run dev`; file:// will not work.
- `/read` (`read/index.html`): one chapter at a time, sections as units, Persian only (Noto Naskh Arabic, ~38em, line-height 2.25, RTL). `/read#shirogav/sh22`, `/read#<chapter-slug>` or `/read#<tale_id>` open a place. Features: draft English summary above a section (draft badge until `status: "reviewed"`), optional `translation_en` shown as a facing page, story-map side panel (bottom sheet under 760px) with breadcrumb, teller label (verified tellers only), verses as couplets, Arabic spans in green-grey with tap-to-show translation, glossary words with dotted underline and popover, bookmarks, progress bar, previous/next section (buttons and arrow keys, ← = next), 3 font sizes, light/sepia/dark. localStorage keys: `hashiyeh-bookmarks`, `hashiyeh-last`, `hashiyeh-fs`, `hashiyeh-theme` (all in try/catch).
- Reader data (all built by `scripts/build_reader_data.py`; `python3 scripts/build_reader_data.py` rebuilds machine-made files, files marked once are kept unless `--force`): `chapters.json` (EN titles are drafts), `tellers.json` (only the 7 verified tellers), `tale_tree.json` (Lion and Ox from `lion_ox_aligned.json`; other chapters detected from cues, flat, `verified:false`), `arabic_spans.json` (heuristic, `verified:false`), `arabic_translations.json` (starts with the Minovi couplet; other entries empty), `glossary.json` (47 words, draft meanings, `verified:false`), `summaries_en.json` (keyed by section id; 14 draft summaries for the Lion and Ox tales read by the model; all other sections `status:"empty"`; optional `translation_en`).
- `/experience/lion-and-hare` (experimental, not linked from the menu, `noindex`): scroll-driven well scene made from the single finished illustration `assets/lion-hare-well.jpg` (pinned stage, native scrolling; approach, rim, reflection; click/tap or "Stir the water" makes short ripples clipped to the water; reduced motion gives three static crops in normal flow; "Read the original passage" panel). Files: `experience/lion-and-hare/{index.html,scene.css,scene.js}`; visuals in `data/scenes/lion_and_hare.config.json` (normalized crop rects, water ellipse, timeline); interface text in `...content.json` (Persian wording is a draft); verbatim Ganjoor lines 8-9 of shirogav/sh22 in `...passage.json`, built by `scripts/build_scene.py`. No translation of the passage is shown because none exists in the project.
- **One page per illustrated story** (rule from the project owner: the landing page stays the cypress cover + intro + chapter list; each story has its own page, listed in the "Illustrated stories" section of `/`). First story: `/stories/lion-and-hare/` (`stories/lion-and-hare/index.html`). To add a story: copy that page, point `data-story` on `<main class="spage">` to a new story JSON, make a new `scripts/build_story*.py` / frames / audio folder, and add a line to the landing list.
- Story page mechanics (component in `assets/story/`): scroll-driven, 7 scenes (no player, autoplay or controls; native scrolling only; no wheel interception or snapping). A tall `.story` section (height set by JS = stage + sum of scene `scrollVh`) holds a sticky 100svh stage; scroll position picks scene and frame (down = forward, stop = hold, up = reverse), drawn on a `<canvas>` from webp frames `assets/story/frames/s1..s7/NNN.webp` (cut from the Kling clips by `scripts/build_story_frames.py`; scene 1 = the 5 s 4:3 clip, scenes 2-7 = the six shots of the 20 s clip; hard cuts, no crossfades, per-scene letterboxing in a constant 16:9 box). Scene config + verbatim Persian beats (cut from Ganjoor shirogav/sh22 by start/end phrase) + full passage + audio config: `data/story/lion_and_hare.story.json`, built by `scripts/build_story.py` (edit scrollVh, hold, beat anchors there). Modules: `story.js` (glue), `story-render.js`, `story-scroll.js`, `story-text.js` (Beats, Panel = native `<dialog>`, restores scroll and focus), `story-audio.js`, `story.css`.
- Story sound: the Kling clips carry their own soundtrack; it is cut per scene into `assets/story/audio/s1..s7.m4a` (scene 1 from the 5 s clip, scenes 2-7 from the 20 s clip at the shot cuts; 3-5 s each). "Sound off/on" button, off by default. A scene's sound plays once from its start on a FORWARD entry only (never scrubbed or reversed, not synced to scroll speed, 6 s re-trigger guard); it fades when the scene changes, the story leaves the screen or the tab is hidden. The audio cut commands are not in a script yet (ffmpeg, afade 0.12 in / 0.25 out, aac 96k).
- Static mode (no JS, reduced motion, frame failure): `<ol class="sseq">` stills + Persian beats + `<details>` full passage + reader link. "Skip story" goes to `#after`. Debug: `?storydebug` exposes `window.__story`. Persian UI strings are drafts. Only Persian text is shown: no reviewed English exists. Known issues: Kling watermark in every frame; scenes 5-6 show two hares; the closing verse is missing in the source and not supplied; slight background tone seam between scenes (`bg` per scene). Source videos are not in the repo.
- `design/*.dc.html`: three landing-page drafts made in Claude's Design canvas. They are NOT plain HTML (they need the canvas runtime), so use them as reference for layout, copy and both languages:
  - `Main.dc.html`: opening section, "A book that travelled" timeline, three ways in, method and data, footer.
  - `TreeLanding.dc.html`: the tale tree as nested frames, with a margin panel.
  - `CypressVersion.dc.html`: the latest direction. A cypress intro screen, "The Persian life of a world book", the narrative atlas with margin panel, "Enter a story. Find another inside.", "How the margin is made".
- `assets/cypress-wind.mp4` / `.webm`: web-compressed loop of the cypress swaying in the wind (AI-generated, 20 s, no audio), used on the landing page with `cypress.jpg` as poster.
- `design/assets/`: `cypress.jpg` (hero) and `lion-court.jpg` (Dimna presents the ox to the Lion).
- `assets/lion-hare-well.jpg`: AI-generated image for the Lion and the Hare, shown in the /tales margin panel for that tale (`IMG` map in `tales/index.html`). `assets/lion-court.jpg` is shown at the top of /tales. Both labelled AI-generated.

## Notes
- Cover background is the video's own colour (#F6ECDD, sampled from the frames) so no rectangle shows; the cover stays light even in dark mode. Tree is 78vh tall; nothing scrolls on desktop.
- English tales start at their opening question and end at the teller's own moral (spans in `scripts/ocr_clean.py`); the previous hand-set ranges are gone. They start at each tale's opening question ("How runs the story about him?"), with a few obvious OCR name typos fixed.
- Contact links on /about come from the `CONTACT` object in `about/index.html`; empty CV/LinkedIn values are not shown.

## Cover behaviour
The cover has no story content: the cypress video (soft-edged) centred, name and tagline above, four margin-note links around it (The Journey and The Tales left, Method and About right; stacked under the tree on phones) that fade in and softly light their side of the tree on hover. Persian mirrors the layout. Draft tale summaries on /tales are labelled as not yet reviewed; tellers show only for the seven verified tales.

## Visual direction
Ivory paper #F8F0E4 / #F7F1E3, ink #1F1B16, lapis #2E4A9E, burnt orange #A2471F, gold #B8963E (thin rules only), sage green. Ruled borders (jadval) and nested frames as the structural motif. Avoid arabesque backgrounds, parchment textures, gradients and emoji.

## Next steps (in order)
1. Rebuild the site as a real static site (suggested: Astro or SvelteKit, deployed on a personal domain) based on `CypressVersion.dc.html`, with the full 12-tale dataset connected.
2. Add back the "A book that travelled" journey section from `Main.dc.html`.
3. Make the cypress data-driven: a "literary organism" tree where leaves are tales or passages and blue leaves are Monshi's verses (inspired by Stefanie Posavec's *Writing Without Words*).
4. Tales as arguments: label teller, listener, purpose and outcome for every tale (LLM draft, then manual review).
5. Verse sources: match Monshi's verses against the whole Ganjoor corpus (fuzzy matching plus embeddings). First check what Ganjoor's "related poems" already covers.
6. Agent experiment: Dimna picks tales from a library to persuade, scored against the text, with renamed controls for memorisation.

## References
Closest existing project: Kalila wa-Dimna Edition, FU Berlin (kalila-and-dimna.fu-berlin.de), focused on Arabic manuscripts. Models: Decameron Web (Brown), Intertextual Dante (Columbia), Shakespeare and Company Project (Princeton), Atlante Calvino (Geneva + DensityDesign), Kindred Britain (Stanford).

## OCR post-correction (done, human review pending)
Rule: fix only clear OCR errors, never reword, log every change. Applied by a model; a human has NOT yet checked the sample, so never say the English is human-reviewed. Next: fill `correct? (y/n)` in `review_sample.csv`, report the error rate, and re-OCR the scans only if it is too high. Doubtful spots are in `UNRESOLVED`.
