# Aillame Beta Readiness Checklist

This checklist tracks the foundation pieces required before releasing Aillame as a Beta Local AI Hub.

## Foundation Readiness
- [x] Local Text Runtime Foundation
- [x] Project Memory Foundation
- [x] External Provider API
- [x] Code Agent Safety Foundation
- [x] Image Workflow Foundation
- [x] Vector Memory & RAG Ingestion Foundation
- [x] Nano Intelligence Loop Foundation

## Productization (Phase 5)
- [x] CLI Foundation built (`scripts/aillame-cli.mjs`)
- [x] Desktop Boot Strategy defined (`docs/desktop-readiness.md`)
- [x] Security / API Key / Permission Types defined
- [x] Audit Log / Rate Limit / Production Guards defined
- [x] Persistent Memory Strategy defined
- [x] Health Aggregator interface built

## Verification Pipeline
- [x] `npm run typecheck` passes
- [x] `npm run build` passes (app builds)
- [x] `npm run smoke:foundation` passes
- [x] `npm run smoke:project-provider` passes
- [x] `npm run smoke:code-agent` passes
- [x] `npm run smoke:image-rag-nano` passes
- [x] `npm run smoke:productization` passes

## Final Release Checks
- [ ] Manual QA of UI Dashboard
- [ ] Clean up of `aillame_old_core_backup` (if no longer needed)
- [ ] Review and sanitize `.env.example`
- [ ] Build desktop bundle and verify `offline-mode` works
