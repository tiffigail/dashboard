# Integration Brief — For the Claude Working in VS Code

*This document is a handoff. It tells you (the Claude with access to Abi's actual codebase) what has been designed at the architectural level and what you need to discover, decide, and build at the implementation level.*

*Read this document first. Then read the rest of `/advisor-context/` for full context. Then read the codebase. Then come back with questions before writing code.*

---

## The high-level picture

Abi is building a longitudinal corpus of her writing and life data across the five-year Pareto Experiment (2024-2028). The corpus has two purposes:

1. **In-the-moment retrieval** — when something she has written before is relevant now, the advisor surfaces it
2. **Synthesis across time** — weekly summaries, yearly summaries, and an eventual book of her theories in her own words at year five

The advisor (a Claude integration on her dashboard) is one source feeding the corpus. It is **not the only source**. Her solo journals, dashboard activity, flashcards, study logs, voice memos, dreams, and any other writing or tracking she does are also sources.

Your job in VS Code is to wire the corpus to the actual data sources in her codebase — without redesigning what has already been decided at the architectural level, and without losing fidelity to the principles below.

---

## Non-negotiable principles

These are decisions Abi has made. Do not relitigate them.

1. **Her actual words are preserved verbatim.** Every text-bearing entry has a `raw` field that is untouched. Summaries are for retrieval; raw is for the work. The advisor never paraphrases over her words.

2. **Three tag dimensions, not one.** Every entry is tagged across three independent axes:
   - `axis` (locked vocabulary, one of seven)
   - `themes` (free-form, hierarchical under axes, growing)
   - `voice_markers` (small fixed list, grows slowly)
   See `themes_registry.md` and `corpus_protocol.md` for the full specs.

3. **Forward-first, backfill-later.** The system should work for new data starting now. Backfilling old entries comes later, after the system has been proven for ~3 months.

4. **Firestore primary, markdown export secondary.** Firestore is the live store; markdown is the portable archive. They mirror each other 1:1.

5. **Privacy default is `false` (surfaceable). Sensitive entries can opt in to `private: true`** to be excluded from general queries.

---

## The architectural decision you need to honor

The corpus has **two layers**, but the split between them is more subtle than "writing vs. activity":

### Writing corpus
**Anything with text content that captures Abi's voice.** Conversations, journals, essays, dreams, voice memos, **and also**: epiphany entries, despair entries, flashcard answers that include her reasoning, study log entries that include her reflection. The common thread: there is text she wrote that should be preserved verbatim.

These all live in `/users/{abi_uid}/corpus/` in Firestore (and `/journal/YYYY/raw/` in markdown export). They share the same frontmatter schema. They differ in their `type` field.

### Activity layer
**Pure structured data with no text content.** Daily axis check-in scores, habit completion booleans, flashcard interval timing, routine adherence percentages, dashboard widget tallies that are just numbers.

These live in `/users/{abi_uid}/activity/` in Firestore. Different schema per data type. Used for cross-referencing during weekly synthesis, not as standalone content.

### Where the boundary lives

The test is: **does this data have text Abi wrote that matters as her voice?**

- An epiphany entry with the text "the gearshift clicked when I stopped trying to push and just observed the mechanism" → writing corpus. Type: `epiphany`.
- A daily count that says "epiphanies: 3" with no text attached → activity layer.
- A flashcard answer that just says "true" → activity layer (or skip entirely if it's not informative).
- A flashcard answer that says "true, because the witness is the part that doesn't need to act, only see" → writing corpus. Type: `flashcard`. Her reasoning is the signal.

When in doubt, ask Abi. The cost of putting something in the writing corpus that should have been activity is small (a slightly noisier corpus). The cost of putting something in activity that should have been in the writing corpus is large (her words get lost as numbers).

---

## What you need to discover in the codebase

Before you write any integration code, find and document the following:

### Data sources to inventory

For each data source, identify:
- **Where it lives** (Firestore collection path? Local JSON? Third-party API like Anki?)
- **What its current schema is** (field names, types, relationships)
- **How frequently it's written to** (real-time? daily? on-demand?)
- **Whether it has text content** (the boundary question above)
- **Whether it has axis/theme metadata already** (or whether tagging needs to be added)

Likely sources to look for:
- [ ] Daily axis check-in scores (the dashboard's per-axis daily rating)
- [ ] Epiphany entries (text + count)
- [ ] Despair entries (text + count)
- [ ] AM routine completion logs
- [ ] PM routine completion logs
- [ ] Flashcard system (deck name, prompt, answer, confidence, intervals)
- [ ] Study log entries
- [ ] Weekly reset entries (if Abi's dashboard captures these)
- [ ] Habit tracker data (gym, treadmill, premise writing, etc.)
- [ ] Any voice memo or audio capture system
- [ ] Any dream journal feature
- [ ] Existing journal or freeform writing fields

There may be others. Look broadly.

### Questions to bring back to Abi

After your inventory, you'll likely have decisions that need her input. Bring them back as a single batch — don't ping-pong. Likely decisions:

- For each data source you found: writing corpus or activity layer?
- For sources currently lacking axis/theme metadata: should the dashboard UI be modified to capture this at entry time, or should the advisor add it asynchronously?
- For high-volume sources (e.g., flashcards): should every entry go into the corpus, or only those above a confidence/significance threshold?
- For real-time sources (axis check-ins): should they sync to the corpus immediately, or batch nightly?
- For any data source where the schema doesn't match the corpus frontmatter: what's the migration plan?

### What to build

Once decisions are made, the actual implementation work likely includes:

1. **Firestore collection setup** for `corpus/` and `activity/` if they don't exist, with proper indexes (see `corpus_protocol.md` section 9).
2. **Write paths from each source** into the appropriate collection. For text-bearing sources without existing tagging, this means hooking into the entry UI or adding a tagging step.
3. **The end-of-conversation logging flow for the advisor** — the advisor drafts frontmatter + summary, presents for one-tap confirmation, files on confirmation. See `corpus_protocol.md` section 4.
4. **The weekly synthesis function** — a scheduled job (Cloud Function or similar) that runs every Sunday, pulls writing entries and activity data for the week, generates the unified weekly summary, and writes it to `/weekly/`.
5. **Markdown export** — a separate scheduled job that mirrors the prior week's Firestore data to a markdown archive (cloud storage or Git repo, Abi's choice).
6. **Retrieval functions** — the advisor needs to be able to query the corpus by axis, theme, voice marker, date range, significance, and combinations of these. Spec these as the advisor needs them.

---

## The voice marker situation

Abi's voice markers (`dear_abi`, `higher_self`, `pay_attention`, `instruction`, `unfinished_idea`, `breakthrough`) are not just topical — they're a record of *what kind of utterance* an entry is. This dimension is essential for the year-five synthesis (see `corpus_protocol.md` section 11).

When integrating sources that already exist (especially flashcards or study logs), check whether voice markers are applicable to that source type. Not every source uses every marker. A flashcard answer probably doesn't have voice markers. A journal entry frequently does. Use judgment, ask Abi when uncertain.

---

## The synthesis architecture

The weekly summary is the linchpin of the whole system. It's where the writing corpus and activity layer come together. Get this right and everything else works.

A weekly summary should:

1. Pull all writing entries from the week (joined by date range)
2. Pull all activity data from the week (axis scores, completion percentages, counts)
3. Identify state arc, axes active, themes active, voice markers present
4. Identify high-significance entries (significance ≥4) and breakthrough entries
5. Generate a 200-400 word narrative that weaves activity data and writing content together
6. List "pulls for next week" — unfinished ideas and explicit follow-ups Abi flagged

The yearly summary pulls all 52 weekly summaries plus high-significance raw entries plus quarterly themes documents, and generates a draft in the form of Abi's existing 2024 and 2025 year summaries (which are in her project files — read them to understand the form she expects).

The five-year synthesis (2028+) is a months-long collaborative project. You don't need to build for it now — but don't make decisions that lock it out.

---

## What to read before starting

1. This document.
2. `/advisor-context/corpus.md` — the lightweight session-loaded summary
3. `/advisor-context/corpus_protocol.md` — the full operational reference
4. `/advisor-context/themes_registry.md` — the taxonomy
5. `/advisor-context/profile.md` and `/advisor-context/coaching.md` — to understand who Abi is and how to interact with her if you need to ask questions
6. Abi's existing 2024 and 2025 year summaries in her project files — to see the form yearly synthesis should target

---

## What to do, in order

1. **Discovery pass.** Read this brief. Read the corpus docs. Read the codebase. Map all data sources. Do not write any integration code yet.
2. **Decision document.** Produce a single document listing every data source you found, your recommendation for writing corpus vs. activity layer, and any decisions that need Abi's input.
3. **Bring it back to Abi.** Have the conversation. Get decisions.
4. **Build the foundations first.** Firestore schema, indexes, security rules. Then the advisor's logging flow (highest-leverage). Then the simplest writing-corpus source (probably manual journal entries). Verify it end-to-end.
5. **Add sources incrementally.** One data source at a time. Verify each before adding the next.
6. **Build the weekly synthesis last.** It depends on having real data flowing in to test against. Don't build it on synthetic data; wait until at least 2-3 weeks of real corpus exist.

---

## Final note

This system is the substrate for a body of work that should outlast any single tool, framework, or AI generation. Build accordingly. Prefer simple, portable, well-documented choices over clever ones. Prefer Abi's words preserved literally over any layer of abstraction that could re-paraphrase them.

She is not building this for productivity. She is building it because she found something real underneath her life and wants infrastructure to stay in contact with it — and to help others find theirs. The corpus is part of that infrastructure. Treat it accordingly.
