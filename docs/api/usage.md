# API use and error contract

The generated [endpoint inventory](endpoints.md) and [OpenAPI snapshot](openapi.json) describe the implemented surface, not the full planned platform. Interactive development docs: `/docs`; schema: `/openapi.json`. Collection routes use bounded pagination where supported; not all requested search/filter capabilities are complete.

1. Login with a JSON email/password body at `/api/v1/auth/login` from an allowed Origin. Never place credentials in URLs.
2. Keep the returned bearer access token in memory. The browser stores the HttpOnly refresh cookie; JavaScript never reads it.
3. Read `/api/v1/auth/me` and select an authorized facility. Send `Authorization: Bearer …` and `X-Facility-ID: <uuid>` for facility-scoped operations.
4. Side-effecting creation routes require `Idempotency-Key` as specified in OpenAPI. Persist the same key for retries of the same user intent; changing the payload with the same key returns 409. Current authorization is rechecked before replay.
5. Versioned mutations require `expected_version`. A 409 requires rereading and an explicit user decision, not an automatic overwrite.

Success envelope: `{"success":true,"data":{...},"meta":{"request_id":"...","timestamp":"..."}}`. Errors contain `success:false`, a safe error code/message/details and request ID. Relevant statuses include 401 authentication, 403 authorization, 404 scoped absence, 409 duplicate/version/booking conflict, 413 body limit, 422 schema failure, 429 throttling and 503 unavailable dependency. Do not surface raw provider errors, SQL or stack traces.

Payment/insurance/clinical authoring/inference and email challenge delivery are deliberate unavailable responses, not completed external workflows. Reset/verification consumption and optional TOTP are implemented; see ../operations/independent-workflows.md. MFA login accepts `second_factor` in the JSON body. A valid patient with an insurance reference is retained as PENDING. A draft invoice is never evidence of a charge. Prediction unavailability can still produce durable encrypted request/audit evidence; ordinary failed domain mutations roll back.

Logout and session revocation invalidate authoritative session state. Refresh is single-flight in the client and requires a valid Origin. Unsafe mutations are not silently replayed under a fresh idempotency key. Tokens and sensitive responses must never be put in persistent browser storage or public caches.

Document upload and exchange contracts are bounded internal schemas, not vendor APIs. Document content is base64 in the request body; production storage/scanning are unavailable. CSV approvals/cancellations use expected versions. TTL expiry denies access and is not deletion.
