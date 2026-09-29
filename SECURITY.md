# Security status and reporting

## Current status

This repository now contains a functioning synthetic engineering foundation. Automated security tests and dependency/container/source scans have been executed; see `docs/testing/validation.md` and `docs/security/controls.md` for exact evidence and limitations. Independent penetration testing, compliance assessment and clinical validation have not occurred. No release is approved for real patient data.

Do not commit credentials, private keys, `.env` files, patient data, medical documents, database dumps or identifiable training datasets. Do not paste them into issue reports or this conversation. Future runtime secrets must be provisioned through an approved external mechanism.

## Reporting

No project owner, security contact or repository private-reporting channel has been configured. The owner must establish a private disclosure channel and response ownership before implementation is externally deployed. Do not post exploit details or sensitive records in a public issue. Contact the responsible organization using an independently verified private channel.

## Required controls

See `docs/architecture/architecture-proposal.md` for proposed controls and `docs/requirements/requirements-matrix.md` for binding requirements. The production-readiness report is authoritative for implementation status: documented designs are not active security controls.

## Deployment restriction

Only synthetic non-identifying development/test data may be used until jurisdiction, data isolation, identity, consent/legal-purpose, encryption, access auditing, retention, incident ownership and recovery policies are approved and verified. An available staging server alone does not satisfy these conditions.
