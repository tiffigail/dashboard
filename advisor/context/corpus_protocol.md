# Corpus Protocol — Operational Reference

*This is the working document for the longitudinal writing system. The advisor consults this when logging entries, doing synthesis, or running consolidation. It is not loaded into every session — it is referenced when needed.*

---

## 1. Folder structure (markdown export)

```
/journal/
  /2026/
    /raw/
      2026-05-03_advisor_n+1-calibration.md
      2026-05-04_journal_food-forest-design.md
      2026-05-05_dream_underwater-backflip.md
      2026-05-06_epiphany_cello-voice-clicked.md
      2026-05-07_despair_anna-call.md
      2026-05-08_flashcard_witness-vs-driver.md
      ...
    /weekly/
      2026-W18_summary.md
    /quarterly/
      2026-Q2_themes.md
    /year/
      2026_summary.md
      2026_themes.md

  /2027/
    [same structure]

  /registry/
    themes_registry.md
    voice_markers.md
    axes.md

/activity/
  /2026/
    daily_scores.jsonl
    routine_completions.jsonl
    flashcard_intervals.jsonl
    [other pure-structured sources]
```

**Filename convention for raw entries:**
`YYYY-MM-DD_type_short-slug.md`

Where `type` is one of: `advisor`, `journal`, `essay`, `voice_memo`, `dream`, `letter`, `protocol`, `book`, `epiphany`, `despair`, `flashcard`, `study`. Slug is 2-5 lowercase hyphenated words capturing the gist. If multiple entries occur on the same day, append `_a`, `_b`, etc.

---

## 1a. Writing corpus vs. activity layer

The corpus has two layers, and the boundary matters more than it first appears.

**Writing corpus** (`/journal/` in markdown, `/users/{abi_uid}/corpus/` in Firestore): anything with text content that captures Abi's voice. Conversations, journals, essays, dreams, voice memos, **and also**: epiphany entries, despair entries, flashcard answers with reasoning, study log reflections. The common thread is that there is text she wrote that should be preserved verbatim.

**Activity layer** (`/activity/` in markdown, `/users/{abi_uid}/activity/` in Firestore): pure structured data with no text content. Daily axis check-in scores, habit completion booleans, flashcard interval timing, routine adherence percentages, dashboard widget tallies that are just numbers. Used for cross-referencing during weekly synthesis, not as standalone content.

**The test:** does this data have text Abi wrote that matters as her voice? An epiphany entry with text → writing corpus, type `epiphany`. A daily count "epiphanies: 3" with no text → activity layer. A flashcard answer with reasoning → writing corpus, type `flashcard`. A flashcard answer that's just "true" → activity layer or skip.

When in doubt, put it in the writing corpus. The cost of a slightly noisier writing corpus is small. The cost of losing her words to a numeric collection is large.

For implementation specifics on which sources go where, see `integration_brief.md`.

---

## 2. Frontmatter schema (final)

Every entry begins with this YAML block:

```yaml
---
date: 2026-05-03
type: advisor
axis: [mental]                    # required, one or more from the locked list
themes: [n+1, calibration]        # free-form, hierarchical under axes
voice_markers: [breakthrough]     # from the fixed list; empty array if none
state: flow                       # one word: flow | redline | meh | curious | despair | grief | depleted | settled
people: [tiffany]                 # only if directly relevant; omit otherwise
season: 2026_q2                   # ties to season.md
significance: 4                   # 1-5; default 2; 4-5 reserved for entries that genuinely matter
private: false                    # true = sensitive, do not surface unless explicitly asked
---
```

### Field reference

- **date** — ISO format. Required.
- **type** — kind of entry. See list above.
- **axis** — array. Locked vocabulary: `physical`, `mental`, `spiritual`, `environment`, `financial`, `rest_prep`, `on_track`. At least one. Rarely more than two.
- **themes** — free-form array. Lowercase, snake_case, no spaces. Hierarchical under axes (the registry tracks parentage). Add new themes freely; they will be reviewed in quarterly consolidation.
- **voice_markers** — array, can be empty. Drawn from `voice_markers.md` registry.
- **state** — single word capturing the felt sense of the entry. Used for state-pattern queries ("show me everything from a redline state").
- **people** — array, only when directly relevant. `tiffany`, `izi`, `mom`, `amanda`, `anna`, `dad`, `nayely`, etc.
- **season** — `YYYY_qN` format. Maps to the `season.md` document active when this was written.
- **significance** — 1-5. Default is 2. 1 = mundane log. 3 = noteworthy. 4 = important. 5 = "this is one of the things that matters about my life." Be conservative with 4-5 so they remain meaningful.
- **private** — boolean. Defaults to false. Set true for entries the advisor should not surface unless Abi explicitly asks (sensitive content, raw grief, things she might want to revisit alone first).

---

## 3. Entry body structure

Below the frontmatter, every entry has two sections:

```markdown
## Summary

[1-3 sentences, advisor-written or self-written, compressing what this entry is about and why it matters. Used for retrieval. Never a substitute for the raw.]

## Raw

[The actual conversation, journal entry, or thought. Verbatim. Untouched. This is what gets pulled for synthesis.]
```

For advisor conversations, `Raw` is the full conversation transcript including both Abi's messages and the advisor's responses. The advisor's responses are part of the record — they are what Abi was hearing and reacting to.

For solo journal entries, `Raw` is what Abi wrote.

---

## 4. The advisor's end-of-conversation logging protocol

Run this at the close of every conversation unless Abi has opted out.

```
At the close, the advisor writes:

"Logging this conversation. Tagging:

  axis: [mental]
  themes: [n+1, calibration]
  voice_markers: [breakthrough]
  state: flow
  significance: 3

  Summary: [1-3 sentences]

Confirm or correct?"
```

Abi responds with one of:

- **"Confirm"** or **"Yes"** → entry is filed as drafted
- **"Correct: [what to change]"** → advisor revises, files
- **"Skip"** or **"Don't log this"** → entry is not filed (still saved as conversation history; just not added to the corpus)
- **"Private"** → filed with `private: true`

If Abi does not respond before closing the chat, file with the draft tags and a note that confirmation was not received. She can correct it later.

---

## 5. Weekly synthesis protocol

Run every Sunday during the weekly reset, or whenever Abi initiates one.

The advisor pulls from **both layers** — the writing corpus and the activity layer — and weaves them into a single narrative.

**From the writing corpus:**
- All `/raw/` entries for the week (advisor conversations, journals, epiphanies, despairs, flashcard reflections, study notes, dreams, voice memos)
- Identify high-significance entries (significance ≥4) and breakthrough entries
- Identify voice markers present (`dear_abi`, `higher_self`, `pay_attention`, etc.)
- Identify themes active

**From the activity layer:**
- Daily axis check-in scores (compute weekly averages and trajectory)
- Routine completion percentages (AM, PM)
- Habit completions (gym, treadmill, etc.)
- Tallies (epiphany count, despair count, flashcards reviewed)
- Any other structured signal

Returns a summary file at `/weekly/YYYY-Wnn_summary.md` with both layers represented:

```yaml
---
week: 2026-W18
dates: 2026-04-27 to 2026-05-03
axes_active: [mental, on_track, financial]
themes_active: [n+1, calibration, wealth_protocol]
voice_markers_present: [breakthrough, dear_abi, higher_self]
state_arc: [meh, curious, flow, flow, depleted, settled, settled]
breakthroughs: [n+1_calibration_clicked]
unfinished: [food_forest_app_blockers]

# from activity layer
axes_avg:
  physical: 3.4
  mental: 4.8
  spiritual: 4.0
  environment: 3.0
  financial: 4.6
  rest_prep: 4.2
  on_track: 4.6
am_routine_completion_pct: 86
pm_routine_completion_pct: 71
epiphany_count: 7
despair_count: 1
flashcards_reviewed: 42
gym_sessions: 3

# from writing corpus
significant_entries: [2026-05-01_advisor_n+1-clicked, 2026-05-03_journal_food-forest-design]
significance_total: 17
---

## Week summary

[200-400 words. The advisor weaves activity data and writing content into one narrative.

Example: "This was a high-flow week — Mental and On Track ran at 4.8 and 4.6 averages, AM routine completion at 86%. The breakthrough on Tuesday came in the advisor session on n+1 calibration; you wrote about it again in the journal that night, and the next day's flashcard review showed high confidence on the related concepts. One despair on Thursday afternoon, in the advisor session about Anna — and within four hours you had written a dear_abi entry to yourself. The system caught you. Environment was the lowest axis at 3.0 average, which tracks with the food_forest entry where you noted the yard project is stalled. Carrying forward: the food_forest_app_blockers question, and the higher_self note from Sunday morning that you flagged pay_attention."]

## Pulls for next week

[Specific things Abi has named she wants to return to. Carryover items from `unfinished_idea` voice markers.]
```

Abi reviews and edits. The edited version is canonical.

The narrative is the point. Activity data without writing context is a numbers report. Writing without activity context misses the patterns. **Together they tell the story.**

---

## 6. Quarterly theme consolidation

Every three months, the advisor runs theme consolidation:

1. Pull every theme used in the quarter, with frequency counts.
2. Identify near-duplicates (`food_forest` vs `food-forest` vs `little_food_forest`).
3. Identify themes that have appeared >5 times — propose them as durable themes for the registry.
4. Identify themes that appeared once and never again — propose archiving or merging.
5. Identify clusters that suggest a new theme should be created (e.g., five entries about parenting Izi during work stress could cluster into `parenting_under_load`).

Output: a proposed update to `themes_registry.md`. Abi confirms or revises. The advisor then updates any past entries that used the now-consolidated tags so the corpus stays consistent.

This is the single most important maintenance ritual. Without it, the corpus becomes unsearchable as it grows. With it, the taxonomy stays useful for years.

---

## 7. Yearly synthesis protocol

Run each January for the previous year.

The advisor pulls:
- All 52 weekly summaries
- All `breakthrough` and `pay_attention` entries (raw, not summary)
- All entries with significance ≥4 (raw)
- The four quarterly themes documents

Returns a draft of `YYYY_summary.md` and `YYYY_themes.md` in the form of Abi's existing 2024 and 2025 summaries — her voice, her structure, her rhythm. The advisor does not impose a different structure.

Abi reviews, edits, and finalizes. Final versions are canonical.

---

## 8. Five-year synthesis (2028 and beyond)

When the Pareto Experiment closes at the end of 2028:

The advisor pulls:
- All five year-summaries
- All five year-themes documents
- Targeted raw entries on demand for any theme being explored in depth

The output is not a generation. It is a months-long collaborative project where the advisor's role is to surface the right raw entries in the right sequence and let Abi do the writing. The book of theories is built from her words, organized by the patterns the corpus reveals.

The advisor never writes the book. The advisor enables the book.

---

## 9. Firestore data model (mirrors markdown 1:1)

### Writing corpus
```
/users/{abi_uid}/corpus/{entry_id}
  - date: timestamp
  - type: string                   # advisor | journal | essay | dream | voice_memo | epiphany | despair | flashcard | study | letter | protocol | book
  - axes: array<string>
  - themes: array<string>
  - voice_markers: array<string>
  - state: string
  - people: array<string>
  - season: string
  - significance: number
  - private: boolean
  - summary: string
  - raw: string                    # the verbatim content
  - source_id: string (optional)   # for entries that originated in another system (e.g. flashcard ID, dashboard event ID)
  - created_at: timestamp
  - confirmed: boolean
  - corrected_from: map (optional) # if Abi corrected the draft tags
```

### Activity layer
```
/users/{abi_uid}/activity/{entry_id}
  - date: timestamp
  - type: string                   # axis_score | routine_completion | habit | flashcard_interval | tally
  - source: string                 # which system produced this (dashboard, anki, etc.)
  - data: map                      # type-specific structured fields
```

The activity layer schema varies by `type`. Examples:

```
{ type: "axis_score", date: ..., data: { axis: "mental", score: 5 } }
{ type: "routine_completion", date: ..., data: { which: "am", completion_pct: 0.86 } }
{ type: "tally", date: ..., data: { metric: "epiphany_count", value: 3 } }
```

### Synthesis collections
```
/users/{abi_uid}/weekly/{week_id}
/users/{abi_uid}/quarterly/{quarter_id}
/users/{abi_uid}/yearly/{year_id}
/users/{abi_uid}/registry/themes
/users/{abi_uid}/registry/voice_markers
```

**Indexing.** Composite indexes on the corpus collection:
- `(axes, date)` — pull all mental entries in 2025
- `(themes, date)` — pull all premise_writing entries
- `(voice_markers, date)` — pull all dear_abi entries
- `(significance, date)` — pull high-significance entries from this year
- `(state, date)` — show me what redline weeks looked like
- `(type, date)` — pull only epiphany entries / only flashcard entries

**Indexes on activity layer:**
- `(type, date)` — pull all axis scores for a date range
- `(source, date)` — pull all dashboard-originated activity for a week

**Export to markdown.** A weekly Cloud Function reads the prior week's entries from both collections and writes them to `/journal/` and `/activity/` directories in cloud storage (or syncs to a Git repo if Abi prefers). This gives her the portable archive without her having to think about it.

---

## 10. Privacy and access

The corpus is Abi's. Only the advisor reads it on her behalf. No analytics, no training, no aggregate analysis without her explicit instruction. Entries marked `private: true` are not surfaced even by general queries — only when Abi explicitly asks for them.

If the advisor is ever uncertain whether an entry should be surfaced, the default is to err toward not surfacing. Abi can always ask. The advisor cannot un-mention something.

---

## 11. The voice-marker philosophy

The voice markers exist because not all utterances are the same kind of thing. A "dear_abi" entry is the witness Abi speaking to herself — pulling all of these together over five years gives a self-portrait of her own internal teacher. A "higher_self" entry is something she received rather than thought — pulling these gives a record of what she has been told from beyond her ordinary mind. A "pay_attention" entry is her flagging something for her future self — pulling these is like reading a letter from past Abi to present Abi.

These are not topical categories. They are kinds of speech. The corpus needs to honor this distinction because the synthesis at year five depends on it.

When the book is eventually written, the chapters might organize by axis and the sections within chapters by theme — but the voices that speak in the book are the voice markers. The witness Abi speaks in one register. The higher self speaks in another. The exhausted Abi speaks in another. The book is polyvocal because Abi is polyvocal, and the corpus structure preserves that.
