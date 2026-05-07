# Nano Dataset Standard

This folder defines the safe dataset layout for Aillame Nano training and evaluation. JSONL data files are intentionally ignored by default; commit schemas, README files, and small fixtures only when they are reviewed and non-sensitive.

## Layout

- `raw/`: untrusted source captures before cleanup.
- `cleaned/`: normalized records after dedupe and safety review.
- `instruction/`: instruction-following samples.
- `classification/`: routing, intent, and safety classification samples.
- `project-aware/`: project-scoped samples with explicit `projectId`.
- `safety/`: refusal, fallback, and safe-routing samples.
- `eval/`: evaluation samples with expected outputs or labels.
- `feedback/`: approved feedback candidates before promotion.

## JSONL Record Types

Every JSONL line must be a JSON object with:

- `id`: stable unique string.
- `type`: one of `instruction`, `classification`, `project-aware`, `safety-fallback`, `eval`, `feedback-candidate`.
- `instruction`: non-empty user/task instruction.
- `expectedOutput`: non-empty expected response, label, or evaluation target.
- `mode`: one of `general`, `education`, `code`, `economy`.
- `intent`: one of `conversation`, `analysis`, `planning`, `coding`, `math`, `research`, `education`, `creative`, `image`, `safety`, `fallback`, `unknown`.
- `projectId`: required for `project-aware`, optional elsewhere.

Optional fields: `input`, `metadata`, `source`, `language`, `createdAt`, `safetyTags`.

The validator checks parseability, duplicate IDs, required fields, allowed `type`/`mode`/`intent` values, empty instruction/output fields, and common Turkish mojibake markers.
