# Engineering handover index

**Synthetic development only.** This is a working increment, not completion of all 101 sections. The readiness report and implementation ledger are authoritative for gaps. Latest increment: revisions 0006–0007; see [independent workflow runbook](operations/independent-workflows.md). Current evidence lives in `testing/evidence/increment-0007/`; the parent evidence directory is historical.

| Requested artifact | Location |
|---|---|
| 1. Requirements traceability | requirements/requirements-matrix.md; requirements/implementation-ledger.md |
| 2. Architecture | architecture/implemented-architecture.md; original architecture-proposal.md retained |
| 3. Repository tree | README.md |
| 4. Database/schema | database/schema.md; backend/alembic/versions/ |
| 5. API endpoint inventory | api/endpoints.md |
| 6. API schemas/auth/errors | api/openapi.json; api/usage.md |
| 7. Authentication and RBAC | security/controls.md; architecture/implemented-architecture.md; backend execution/context/identity |
| 8. Clinical/version/encryption safeguards | directives/engineering-workflows.md; backend core/encryption and execution/healthcare |
| 9. Integration interfaces/activation | security/controls.md; backend/app/integrations/ports.py |
| 10. AI limitations/governance | clinical-ai/governance.md |
| 11. Frontend implementation | frontend/src/; README local instructions |
| 12. Test/coverage evidence | testing/validation.md; testing/evidence/ |
| 13. Security scan/remediation evidence | testing/evidence/container-*.json, bandit.json, npm-audit.json, source-secret-scan.json |
| 14. CI/CD | .github/workflows/; deployment/guide.md — local checks only, no remote run |
| 15. Local commands | README.md; Makefile; .env.example |
| 16. Deployment and rollback | deployment/guide.md; docker-compose files; release gate |
| 17. Monitoring/logging | operations/runbook.md; infrastructure/monitoring/alerts.yml — not an installed monitoring service |
| 18. Backup/restore/DR | operations/runbook.md; scripts/backup.sh, restore_test.sh; restore-result.json |
| 19. Incident response | operations/runbook.md — owners and exercise approval pending |
| 20. Readiness/limitations/remaining work | production-readiness-report.md; requirements/implementation-ledger.md; requirements/open-decisions.md |

Original unavailable historical payloads/directives/model datasets were not reconstructed or assumed. Engineering directives here explicitly stop at the clinical/provider approval boundary. Do not share development secrets, wrapping identities, dump files or real patient data with this handover.
