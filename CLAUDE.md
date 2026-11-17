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
- `keith_falconer_1885_ocr.txt`: archive.org OCR of Keith-Falconer, *Kalilah and Dimnah* (Cambridge, 1885). Public domain. Still noisy.
- `lion_ox_aligned.json`: 12 tales from the chapter "The Lion and the Ox", hand-aligned. Persian sections (whole Ganjoor sections, which can include frame dialogue), English line spans from the OCR, parent/child nesting, teller.
  - Tellers checked against the text: Ape and Carpenter (Kalila → Dimna), Three Fishes (Dimna → Lion), Camel (Ox → Dimna), Sandpiper (Dimna → Ox), Apes and Glow-worm (Kalila → Dimna), Two Partners (Kalila → Dimna), Tortoise and Geese (hen-bird → her mate). The rest still need labelling.
  - Finding: the Frog and the Snake (nested in the Two Partners) is in Monshi but not in the later Syriac version.

## Scripts (in /scripts)
- `fetch_kelile.py`: downloads the whole book from the Ganjoor API into `data/kelile_monshi.json`.
- `build_aligned.py`: builds `lion_ox_aligned.json` from the two sources. The English line ranges are hard-coded and were set by hand.

## What exists
- `reader/lion_ox_reader.html`: a working, self-contained side-by-side reader for the 12 tales (data embedded).
- `design/*.dc.html`: three landing-page drafts made in Claude's Design canvas. They are NOT plain HTML (they need the canvas runtime), so use them as reference for layout, copy and both languages:
  - `Main.dc.html`: opening section, "A book that travelled" timeline, three ways in, method and data, footer.
  - `TreeLanding.dc.html`: the tale tree as nested frames, with a margin panel.
  - `CypressVersion.dc.html`: the latest direction. A cypress intro screen, "The Persian life of a world book", the narrative atlas with margin panel, "Enter a story. Find another inside.", "How the margin is made".
- `design/assets/`: `cypress.jpg` (hero) and `lion-court.jpg` (Dimna presents the ox to the Lion).

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
