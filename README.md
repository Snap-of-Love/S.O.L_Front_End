# Snap of Love frontend

Snap of Love is a browser photobooth for taking camera bursts, editing them in preset frames and exporting photostrips or animated GIFs.

Use Node >=22.18, `npm ci`, then `npm run dev`. Copy `.env.example` if needed. Local development uses a `/v1` proxy to `http://127.0.0.1:4000`; start the paired backend. For production, set `VITE_API_BASE_URL` to your deployed HTTPS API origin or configure a real same-origin `/v1` proxy. Never put signing keys, management tokens, admin keys or cloud service credentials in VITE variables.

## Feature locations

- **Capture:** select Enter Studio, allow camera access and choose a preset frame and pose interval.
- **Draft recovery:** open Local session recovery in the lobby or review. Drafts expire after seven days and stay in this browser. See [local draft recovery](docs/DRAFT_RECOVERY.md).
- **Per-photo crop:** choose a slot in the original Burst Frame & Slot Editor, then expand Crop & align. Zoom, position, quarter-turn rotation, mirror and reset apply to that photo. Keyboard sliders work. Preview, downloads and cloud copies use the same transform.
- **Stickers/drawings:** expand Stickers & drawings in the original sidebar. Add/select a sticker and position it with sliders, or draw on the preview. Undo/redo retains the last 30 decoration changes. Up to 40 layers and 400 points per stroke are accepted. Final layers survive draft recovery; undo history does not survive reload.

Original local JPG/PNG/GIF download controls remain. Cloud sharing is an explicit “Create cloud link / QR” action: it uploads a bounded JPEG snapshot, then returns a QR/link. Anyone with the link can view it. Later edits require a new link. Save the private management JSON to revoke a link later; import it via “Manage previous cloud link.” Do not share the management file with photo recipients. The default lifetime is 24 hours; permanent links need deliberate selection. Local downloads do not depend on cloud availability.

## Verification

Run `npm run lint`, `npm test`, `npm run build` and `npm audit` to verify a checkout. The paired backend includes an explicit staging/migration rollout in its README.

## Release connection

The frontend feature release was merged into `main` in PR #4. The Vercel project is `s-o-l` in `andi-muhammad-abigails-projects`, serving `https://s-o-l.vercel.app/`. Its old Git connection retained the previous `AndiAbi4925/S.O.L` identity after the repository moved to `Snap-of-Love/S.O.L_Front_End`. Reconnection was rejected because Vercel Hobby does not support Git connections to private organization repositories. The stale connection was removed; the project, domain and production environment were retained.

The owner chose manual deployment instead of creating a broader team token. No CI token or automatic deployment workflow is installed. A GitHub push alone therefore does not update production. Vercel CLI can deploy to this existing project without a Git connection:

```sh
npx vercel@65.11.0 login
npx vercel@65.11.0 link --yes --project s-o-l --scope andi-muhammad-abigails-projects
npx vercel@65.11.0 pull --yes --environment=production --scope andi-muhammad-abigails-projects
npm ci
npm run lint
npm test
npx vercel@65.11.0 build --prod --scope andi-muhammad-abigails-projects
npx vercel@65.11.0 deploy --prebuilt --prod --skip-domain --yes --scope andi-muhammad-abigails-projects
# Test the returned deployment URL, then promote its ID:
npx vercel@65.11.0 promote <deployment-id> --yes --scope andi-muhammad-abigails-projects
```

Use a checkout of the intended `main` revision and verify the returned URL before promotion. `.vercel/` and environment files are ignored because the CLI downloads local deployment configuration and credentials. The 2026-11-04 manual release deployed application source `3f314c6688b11eff1abe76ebd1a205f66a926b66` as `dpl_6zwkuzx3Fpr2ivJc6j5EeJoHnBsX`; the public `/release.json` identifies that build. Subsequent documentation changes do not imply a different application build. Native Chrome checks on the new deployment verified four-photo import, crop controls, sticker undo/redo, PNG download, draft recovery, custom frame save/apply and Figma guide download. Production cloud sharing still requires a configured backend API origin; local editing and exports do not.
