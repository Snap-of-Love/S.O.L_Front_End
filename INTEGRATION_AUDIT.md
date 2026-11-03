# S.O.L frontend/backend integration follow-up

> Historical pre-repair audit. See [README.md](README.md) for current features, verification and deployment limits. The proposed visual renovation was reverted; features adapt to the original design.

**Date:** 3 November 2026, Asia/Makassar. **Decision:** integration remediation is required before production approval.

This follow-up tests the actual frontend API client against the backend over local HTTP. It accompanies the [backend audit](https://github.com/Snap-of-Love/S.O.L_Back_End/blob/main/BACKEND_AUDIT.md) and the existing [frontend architecture audit](ARCHITECTURE_AUDIT.md). Application behavior has not been changed or repaired by these reports.

## Revisions and method

- Frontend reviewed: `4e5cef82c44cc93c25a5053f05862031f6bec064`. Application files are unchanged from the previous audit's `a1c9bc2` source.
- Backend reviewed: `9d05ea7e10c97448ebaa22f30f957d9c63e240c2` in `Snap-of-Love/S.O.L_Back_End`.
- Node 26.0.0, macOS arm64; disposable servers bound to loopback with ephemeral ports, fixture images and fake credentials.
- The real `src/lib/api.ts` was compiled using the installed frontend TypeScript compiler. Build-time environment values and Firebase imports were replaced with controlled fixtures. REST/session/request logic was preserved.
- The HTTP suite completed 22 cases: six working-control checks and 16 defect/configuration observations. Seventeen boundary assertions and one isolated raw-HTTP crash check supplement it. These are 40 diagnostic cases, not 40 passing security controls or 40 independent new vulnerabilities.
- No production records, personal photos, payment provider or live Firestore were used. This pass did not repeat browser Core Web Vitals or WCAG measurements.

## What worked

The frontend created and fetched a captioned share from the local test backend. Actual 404 responses became missing-share results and 410 responses became expired-share results. Captions fell back to the curated source with Gemini disabled. CORS correctly reflected the configured Origin, permitted required preflight headers, and rejected a different Origin with 403.

These controls are useful, but they do not establish storage durability, user ownership, provider payment integrity or deployed browser compatibility.

## Contract failures and cross-repository impact

| Area / evidence | Observed behavior | Shared correction |
| --- | --- | --- |
| Authorization — H11/H13 | Another anonymously issued session can list/delete a previous session's share over HTTP. Transaction SSE returns an unauthenticated snapshot. | Backend must enforce resource ownership and route scopes; frontend must use those scoped credentials and handle denied operations. Public photo viewing must be distinct from administration. |
| Payment authority — boundary/H14/H15 | Clients can create completed transactions; missing webhook secrets allow unsigned updates. Raw-byte signatures with whitespace are rejected, identical signed callbacks publish twice, and completed state can regress to pending. | Make provider events authoritative, verify original bytes, deduplicate events and enforce atomic state transitions. A local support flag is not payment proof. |
| Durability — boundary probes | Firestore 403 can still produce successful creation; updates touch only memory and deletion can claim success after remote denial. | Confirm durable server writes before returning success. The UI should distinguish local export from confirmed cloud storage. |
| SDK/expiry — H18/H19 | The client expects expiry strings; an SDK Timestamp fixture is not recognized as expired. Caption/expiry fields conflict with checked-in Firestore allowed keys. | Normalize timestamp types and agree on one schema; enforce expiry before serving data. Test rules/emulator behavior before changing either side. |
| Configuration — H20/H21 | No frontend API base chooses direct Firestore, rather than the Vite REST proxy. Backend's documented copied `.env` is not loaded by its entrypoint. | Make storage/API mode explicit, validate config, load environment values deliberately and reject unsafe production defaults. |
| Error contract — H06 | Backend returns Problem Details, but frontend throws only a generic HTTP-status message, losing field errors and request IDs. | Preserve safe structured errors and show actionable 401/403/413/422/429/5xx states. |
| Response validation — H09 | A successful `{}` response is accepted with an undefined share ID. | Runtime-validate IDs, MIME, timestamps and required fields before updating UI state or constructing links. |
| Sessions/retries — H07/H08 | Concurrent creates issue two sessions. A 401 does not renew the session, and another invocation uses a new idempotency key. | Share the pending handshake; renew once safely; retain a key for one user operation across controlled retries. Backend idempotency must also be atomic/durable. |
| Amounts — H12/H22 | HTTP accepts 0.5 despite the schema minimum of 1; the storage adapter truncates 12.75 to integer 12. | Define currency/minor units and enforce one exact representation across UI, API, provider and database. |
| Image budget — H16 | An 800,000-byte binary image exceeds the 1 MiB JSON body limit after base64 encoding, despite fitting the described decoded limit. | Validate total payload bytes, set compatible client limits, or use bounded binary storage plus metadata. |
| Public URLs — H10 | OG HTML points at `https://snapoflove.id/?share=...`, while this router recognizes `/share?id=...`; generated links do not use the metadata endpoint. | Choose one public origin/route and serve correct crawler-readable metadata at the actual shared URL. |
| Availability — isolated raw HTTP | An invalid Host header caused a disposable backend child to exit with `ERR_INVALID_URL`. | Parse inside the server error boundary and catch top-level handler rejections. Verify actual ingress sanitization; no production crash was attempted. |

Some observations confirm earlier source findings; the Timestamp, malformed-success, raw-body/replay/state-transition and real-process failure checks extend the available evidence. Passing mock-based tests did not catch these cross-layer problems.

## Synchronization and architecture

The frontend does not consume `src/client/solClient.ts` from the backend repository. It maintains a separate API client with different error handling and session behavior. Both clients and OpenAPI can drift independently. Local React state is sufficient for this product, but share requests need cancellation/stale-result guards and consistent state resets. Installing a state-management library alone would not fix these issues.

The backend also retains process-local documents, idempotency entries and SSE listeners. A deployment with multiple instances can serve conflicting state even when the frontend behaves correctly. Direct Firestore access adds another security/data path. Establish one authoritative persistence and authorization boundary before adding frontend caching or automatic retries.

The backend report includes a 300-request synthetic HTTP profile, database/index/connection analysis, dependency review and reproduction instructions. Those loopback/in-memory figures must not be interpreted as production API latency or isolated server CPU/RAM utilization. The previous frontend browser measurements remain historical evidence, not new measurements in this pass.

The independently resolved backend dependency snapshot reports four high-severity package entries in one Firebase/Firestore/gRPC chain, and backend type checking fails with six diagnostics. Backend source does not import the Firebase SDK, so the advisory chain is not proof of a reachable application exploit. No dependency remediation was applied.

## Reproduction and release criteria

Executable scripts and logs are in [backend audit evidence](https://github.com/Snap-of-Love/S.O.L_Back_End/tree/main/audit/2026-11-03). With both repositories checked out and frontend dependencies installed, run from the backend:

```sh
node audit/2026-11-03/http-contract-probes.mjs ../S.O.L_Front_End
node audit/2026-11-03/boundary-probes.mjs .
node audit/2026-11-03/raw-http-probe.mjs
node audit/2026-11-03/local-profile.mjs
```

The probes intentionally assert the audited defects and therefore must be rewritten to assert denied/safe behavior after fixes. They are review artifacts, not a release test gate that should remain green when vulnerabilities are repaired.

Before release, verify scoped ownership, durable writes across restart/instances, signed provider events, Firestore rules and retention, correct timestamp/money/MIME contracts, meaningful UI error recovery, and the exact shared URL. Then complete the real staging capture/edit/export/share journey, relevant WCAG checks and production real-user performance monitoring. Production infrastructure and provider configuration remain unverified.

## Conclusion

The basic frontend/backend happy path works locally, but the integration does not yet offer trustworthy authorization, persistence, payment state or consistent expiry/error behavior. Both repositories need coordinated changes; fixing only presentation or only REST routes leaves the parallel Firestore path and duplicated client contracts unresolved. Resolve the security/data boundaries first, then rerun these checks with safe-behavior expectations against staging before granting production approval.
