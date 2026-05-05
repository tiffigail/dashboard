# /advisor-context/

Context documents loaded into the advisor's system prompt. Each file has a specific role; do not collapse them.

## Files (slow-moving, loaded every session)

- **`profile.md`** — Who Abi is. Life roles, family (Tiffany and Izi as the Why; family of origin), health, work, money, the texture of her life. Read first.
- **`spiritual.md`** — Belief system, language, practices, teachers and texts. How to speak to her.
- **`system.md`** — The seven-axis architecture (Physical, Gear, Misdirect, Environment, Financial, Rest & Preparation, On Track / N+1) plus the N-system and the spinning-plates structure.
- **`coaching.md`** — How she wants to be met. Directness, what helps, what doesn't, permission scope, sensitive topics.
- **`corpus.md`** — Tells the advisor that the longitudinal writing system exists and how to write into it. Lightweight summary.

## Files (fast-moving)

- **`season.md`** — What is most alive right now. ~100 words. Abi rewrites monthly. Tells the advisor what to weight heavily this month.

## Files (advisor-maintained)

- **`learnings.md`** — Observations the advisor records across conversations. Structured entries. Tentative vs. confirmed patterns. So the advisor gets smarter about her over time rather than starting fresh.

## Files (operational reference, not loaded every session)

- **`corpus_protocol.md`** — Full operational reference for the corpus system. Folder structure, frontmatter schema, Firestore data model, weekly/quarterly/yearly synthesis protocols. Consulted when logging or doing synthesis work.
- **`themes_registry.md`** — The living taxonomy. Axes (locked), themes (growing under axes), voice markers, people. Updated quarterly through theme consolidation.
- **`integration_brief.md`** — Handoff document for whoever (or whichever Claude) implements the actual Firestore plumbing and dashboard integration. Read this if you are doing implementation work.

## Loading order

**Every session:** `profile.md` + `coaching.md` + `season.md` + `corpus.md`. These are the minimum for the advisor to be Abi-aware, know how to show up, know what's current, and know to log the conversation.

**Loaded as needed for depth:** `system.md`, `spiritual.md` — when the conversation goes deep enough that the architecture or the spiritual frame is operational.

**Loaded for memory:** `learnings.md` — when relevant observations from past conversations would inform the present.

**Loaded for corpus operations:** `corpus_protocol.md` + `themes_registry.md` — when logging an entry, doing weekly/quarterly/yearly synthesis, or running consolidation.

If context is constrained: profile + coaching + season + corpus is the floor. Everything else can be retrieved as needed.
