# Snap of Love frontend

The original S.O.L lobby, launch animation, camera/review workspace, typography, colors and share-page presentation are retained. New features are added as compact controls using the existing monochrome/ruby styling. The proposed renovation was reverted.

Use Node >=22.18, `npm ci`, then `npm run dev`. Copy `.env.example` if needed. Local development uses a `/v1` proxy to `http://127.0.0.1:4000`; start the paired backend. For production, set `VITE_API_BASE_URL` to your deployed HTTPS API origin or configure a real same-origin `/v1` proxy. Never put signing keys, management tokens, admin keys or cloud service credentials in VITE variables.

## Feature locations

- **Import photos:** open “Import photos · recover session · custom frames” in the lobby, or “Import & session recovery” in review. Choose/drop 1–8 JPEG, PNG or WebP files. Imports are validated, decoded locally and matched to the photo count. No upload occurs on import.
- **Draft recovery:** the same controls offer Restore, Discard, opt-out and Clear. Drafts expire after seven days and stay in this browser. Keep a local export as backup; site-data clearing/private browsing/storage limits can remove drafts. Storage failure does not block editing.
- **Per-photo crop:** choose a slot in the original Burst Frame & Slot Editor, then expand Crop & align. Zoom, position, quarter-turn rotation, mirror and reset apply to that photo. Keyboard sliders work. Preview, downloads and cloud copies use the same transform.
- **Stickers/drawings:** expand Stickers & drawings in the original sidebar. Add/select a sticker and position it with sliders, or draw on the preview. Undo/redo retains the last 30 decoration changes. Up to 40 layers and 400 points per stroke are accepted. Final layers survive draft recovery; undo history does not survive reload.
- **Custom frames:** expand Make your own frame. Set exact paper dimensions and photo slots, download the Figma guide, import transparent PNG artwork and Save & use frame. The frame is saved locally, and template JSON export/import provides a portable backup. See [the Figma guide](docs/FIGMA_FRAMES.md). A 2 × 6 inch strip at 300 pixels/inch uses **600 × 1800 px**; use matching PNG export at 1× or 2×. Custom frame artwork controls the footer/date area.

Original local JPG/PNG/GIF download controls remain. Cloud sharing is an explicit “Create cloud link / QR” action: it uploads a bounded JPEG snapshot, then returns a QR/link. Anyone with the link can view it. Later edits require a new link. Save the private management JSON to revoke a link later; import it via “Manage previous cloud link.” Do not share the management file with photo recipients. The default lifetime is 24 hours; permanent links need deliberate selection. Local downloads do not depend on cloud availability.

## Verification

`npm run lint`, `npm test` (23 tests), `npm run build` and `npm audit` passed after the original design was restored. Dependency audit reported zero vulnerabilities at verification. Native Chrome checks exercised the original launch/lobby/review layout, recovered a synthetic photo/caption/sticker draft, applied crop controls, imported and saved a transparent custom frame, and tested the local sharing bridge. Earlier synthetic-image checks also verified JPEG/PNG export and the cloud viewer. No personal photo was uploaded.

Actual camera permission/capture across devices, production Firestore/IAM, production hosting configuration, field Core Web Vitals and full WCAG compliance remain outside those local checks. The paired backend includes an explicit staging/migration rollout in its README. Both repositories are on `feat/studio-repair-20261104`; no production environment settings or live data were changed.
