# Hashiyeh (حاشیه)

A digital reading of Nasrollah Monshi's Persian *Kelileh o Demneh*: the Persian life of a world book.

- `data/`: Persian full text (Ganjoor), Keith-Falconer 1885 English OCR, and the hand-aligned dataset for "The Lion and the Ox"
- `scripts/`: how the data was fetched and aligned
- `reader/`: side-by-side reader (served at /reader/)
- `design/`: landing-page drafts and images
- `CLAUDE.md`: project context and decisions, for Claude Code

To rebuild the data:

```
python3 scripts/fetch_kelile.py
python3 scripts/build_aligned.py
```

Run both from the repository root.

Sources: Persian text from ganjoor.net. English from I. G. N. Keith-Falconer, *Kalilah and Dimnah* (Cambridge, 1885), public domain via archive.org. Illustrations are AI-generated.
