# Aillame Model Download Manager

Aillame provides an Ollama-like model management workflow without depending on
Ollama, LM Studio or cloud providers.

This foundation is for GGUF LLM models only. IGM/diffusion model downloads are
handled in a later phase.

## Workflow

1. Browse the curated GGUF starter catalog.
2. Review compatibility, quantization, license and hardware notes.
3. Create a download plan.
4. Approve the download job explicitly.
5. Provide a manual GGUF file or enable a reviewed download source later.
6. Verify the local `.gguf` file.
7. Select a verified model as active.
8. Run `npm run smoke:live-text-runtime`.

## Safety Defaults

- `approvalRequired=true`
- `canAutoStart=false`
- `AILLAME_MODEL_DOWNLOADS_ENABLED=false`
- Download jobs start as `waiting-approval` or `manual-required`
- Model files are written outside source code, under the configured model
  library/data directory
- GGUF files must never be staged in git

## Config

```bash
AILLAME_MODEL_LIBRARY_DIR=./models
AILLAME_MODEL_DOWNLOADS_ENABLED=false
AILLAME_MODEL_DOWNLOAD_MAX_BYTES=0
AILLAME_MODEL_DOWNLOAD_REQUIRE_APPROVAL=true
AILLAME_GGUF_MODEL_DIR=./models/gguf
AILLAME_GGUF_ACTIVE_MODEL=
```

## Admin API Foundation

- `GET /api/admin/models/catalog`
- `POST /api/admin/models/download/plan`
- `GET /api/admin/models/download/jobs`
- `POST /api/admin/models/download/jobs`
- `POST /api/admin/models/download/jobs/[jobId]/approve`
- `POST /api/admin/models/download/jobs/[jobId]/cancel`
- `GET /api/admin/models/installed`
- `GET /api/admin/models/active`
- `POST /api/admin/models/active`

## Acceptance

The manager does not make `finalAcceptanceReady=true` by itself. Final LLM
acceptance still requires a verified local GGUF file, an Aillame-controlled
runtime binary and a real non-empty model response.
