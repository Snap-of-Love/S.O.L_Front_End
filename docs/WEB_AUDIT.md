# Snap of Love website audit

23 November 2026 · Frontend repository and production spot checks

## What the booth needs

| Area | Role |
| --- | --- |
| Lobby and studio entry | A clear path from the landing page to camera permissions and capture. Photostrip examples can help people choose a layout. |
| Capture | Live preview, built-in layouts, pose timer, burst capture, and retakes. These support the camera-first workflow. |
| Review | Keep frame selection, crops, themes, filters and captions. Stickers and drawing are useful secondary options that fit in collapsed controls. |
| Local exports | Keep JPG, PNG and animated GIF. Users can finish a session entirely in their browser. |
| Local recovery | Keep the restore, discard, and opt-out controls. Drafts protect work during reloads and stay in the same browser profile. Older drafts with custom artwork open in a built-in frame sized for the saved photos. |
| Sharing | Keep cloud links and the public share viewer as optional features once the production API is reachable. Link expiry and private management keys support revocation. |
| Creator support and feedback | The QRIS tip jar, Instagram and surveys are secondary to capture and export. Keep the tip jar optional and verify which feedback form is current before consolidating the links. |

## Removed in this change

- Lobby and review photo pickers, drag-and-drop, file validation and normalization for imports, and related instructions.
- Custom frame creation and selection, artwork uploads, template JSON import and export, and public Figma guide. Legacy draft recovery retains photo frames and editor settings.
- Unreachable sponsor countdown, frame-lock branch, and unused premium state. The voluntary QRIS tip jar still opens.
- Recovery now accepts the current monochrome filter and waits for decoding to succeed before marking a session restored. A new session also clears any pending single-slot retake.

## Priority findings

| Priority | Finding | Recommended change |
| --- | --- | --- |
| High | The first screen covers the whole app with a click handler on a generic element. Keyboard users have no launch control. The intro also runs for roughly six seconds after activation and has no reduced-motion path. [Launch screen](../src/components/Preloader.tsx) | Use a native button and allow immediate entry or a short transition for reduced motion. Move focus into the lobby when the intro closes. |
| High | The published JavaScript bundle uses a same-origin JSON API. A direct request to that endpoint for a synthetic share reference returned HTML with status 200. The app treats that response as an API failure. [Production endpoint](https://s-o-l.vercel.app/v1/shares/audit-check-nonexistent) · [API client](../src/lib/api.ts) | Configure the production API origin or a real `/v1` proxy. Exercise creation, viewing, expiration and revocation in staging before relying on cloud links in production. |
| High if deployed | The frontend uses a REST API, while the repository also contains legacy Firestore rules that allow unauthenticated creation and single-record reads for shares and transactions. Current deployed Firestore rules were outside this audit. [Legacy rules](../firestore.rules) · [Firebase config](../firebase.json) | Confirm which repository owns cloud storage configuration. Archive the frontend Firebase config if unused, or restrict and test the deployed rules from the owning repo. |
| Medium | A previously created or loaded cloud link remains in state during new captures and local exports. The download dialog can show a QR code for an older strip. [Booth state and export dialog](../src/components/Photobooth.tsx) | Scope the QR code to the shared snapshot. Keep previous links under the existing management action. |
| Medium | Export and tip dialogs do not expose dialog semantics, move focus, contain Tab navigation, or support Escape. The export close control is announced as a symbol. [Booth dialogs](../src/components/Photobooth.tsx) | Use accessible dialogs with an explicit close label and restore focus to the control that opened them. |
| Medium | All five showcase images are fetched on mount, totaling about 1.41 MB on disk, while previews are wired only to pointer hover. Pointer movement also updates lobby-wide React state. [Lobby](../src/components/Lobby.tsx) · [Specimen preload](../src/components/Photobooth.tsx) | Give examples tap and keyboard access, lazy-load the appropriate preview, and keep pointer updates local to the preview. |
| Medium | The SEO canonical URL uses `s-o-l.vercel.app`. The published sitemap and robots file point to `snapoflove-booth.vercel.app`. [Canonical markup](../index.html) · [Published robots](https://s-o-l.vercel.app/robots.txt) · [Sitemap](../public/sitemap.xml) | Use the same primary domain in canonical, sitemap and robots metadata. |
| Low | The frontend has a `/pay` rewrite, but the route table has no payment screen. The active tip jar displays a static QRIS image. [Hosting rewrites](../vercel.json) · [Route table](../src/App.tsx) | Confirm whether legacy external links still depend on `/pay`, then retire or redirect it. |
| Low | No in-repository source or build reference uses the direct dependencies `dotenv`, `@tailwindcss/postcss` or `autoprefixer`. The app uses Tailwind’s Vite plugin. [Package manifest](../package.json) · [Vite configuration](../vite.config.ts) | Check release tooling for consumers before removing the direct dependencies. |
| Low | The lobby, export dialog and share viewer link to multiple survey destinations. The tip jar also offers “I have Supported,” which only dismisses the dialog. [Lobby](../src/components/Lobby.tsx) · [Export and support UI](../src/components/Photobooth.tsx) · [Share viewer](../src/components/SharePage.tsx) | Use one verified feedback destination. A single close action is sufficient for the voluntary tip jar. |

## Verification

- Type checking, 15 tests, the production build, and the dependency audit passed.
- Chrome with a simulated camera exercised capture, preset selection, the absence of both removed features, JPG/PNG/GIF file signatures, and recovery after reload. The touch viewport check exercised denied camera permissions.
- A stub API exercised explicit sharing, QR generation, revocation and the public share viewer. The published release still lists photo upload and custom frames. [Production release metadata](https://s-o-l.vercel.app/release.json)

Physical camera testing, production backend permissions, payment settlement, and formal accessibility and performance certification require separate verification.
