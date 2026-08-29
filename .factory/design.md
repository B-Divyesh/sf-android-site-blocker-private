# Visual thesis — Quietwall

## Direction and rationale

Quietwall uses a **pixel/demoscene control-room language**: the website is a small, offline machine that the owner can inspect. Pixel edges, one-bit diagrams, stepped dividers, and a compact status console evoke software that is finite and legible—not a glossy focus subscription. Decoration always explains either the local DNS path or the state of the block engine.

The treatment is deliberately single-mode, dark, and explicitly paints every surface. This is the night-console world of a privacy utility; it also keeps the lime “local circuit” signal visually unambiguous.

## Tokens

- `ink-950` `#090D0C`: page background, near-black with a green cast.
- `ink-900` `#101715`: primary surface.
- `ink-800` `#18221F`: raised surface.
- `paper` `#F2F5E9`: primary text, 17.2:1 on the background.
- `fog` `#AEBBB2`: secondary text, 9.4:1 on the background.
- `signal` `#B7F34A`: active/primary accent; dark ink is used on top.
- `aqua` `#6FE7D6`: informational/path accent.
- `amber` `#FFC857`: warning.
- `red` `#FF6B6B`: danger and stopped state.

Spacing follows a 4/8 px grid: 4, 8, 12, 16, 24, 32, 48, 64, 96. Corners are clipped at 8–14 px through CSS polygons instead of rounded SaaS cards. Hairlines are doubled selectively to resemble pixel raster scanlines.

## Typography

- Display and labels: the device's square monospace stack (`SFMono-Regular`, Consolas, Liberation Mono). Used sparingly at 12–15 px with tracking. This avoids any font request and reinforces the local-console voice.
- Reading and controls: the native `system-ui` sans stack. Body never drops below 16 px. No font files or third-party font calls are shipped.
- Numeric status uses tabular figures. The scale is 12 / 14 / 17 / 22 / 32 / clamp(44–72) px.

## Interaction grammar

- The single primary action is the “shield switch”: a physical-looking 56 px control whose label always states the outcome.
- Changes write immediately to local storage and acknowledge in a terse live console (“Saved on this device”).
- Domain rows enter downward from the input, can be toggled, and offer a specific remove confirmation plus undo.
- The app separates **Configure** and **Verify**: users can copy a known blocked-domain probe and see honest limits before installing the Android shell.
- Keyboard focus is a two-pixel signal outline with offset. Touch targets are at least 44 px.

## Motion policy

State changes use a 180 ms stepped fade/translate and the shield gate slides 220 ms along its physical track. Nothing loops. At `prefers-reduced-motion: reduce`, transforms and smooth scrolling are removed and all feedback becomes instant opacity/state changes. The circuit illustration remains completely static.

## Asset plan and provenance

- Hero: original hand-authored pixel-art “offline DNS gate” scene, used as an explanatory diagram—not a generic background. The required Azure OpenAI generation command was attempted three times on 2026-08-27 with the prompt “A compact isometric pixel art scene of an Android-shaped handheld device beside a tiny local DNS gate, a luminous lime barrier stopping red pixel packets while aqua packets travel locally in a closed loop, dark near-black green control room, crisp 1990s demoscene raster art, limited palette #090D0C #B7F34A #6FE7D6 #FF6B6B #F2F5E9, no gradients, no text, no people, no brand marks, no watermark, no logos, clean silhouette, wide editorial composition,” but the factory endpoint returned `RateLimitReached` after its retry window. To avoid shipping an unreviewed or incoherent fallback, the worker authored the scene as crisp SVG and optimized it to WebP. Source and prompt sidecar live in `assets/src/`; delivery asset lives in `public/assets/`. MIT licensed with the repository.
- Icons and UI glyphs: hand-authored inline SVG/pixel CSS, MIT with the repository.
- Walkthrough: three hand-authored SVG Android frames (`walkthrough-install.svg`, `walkthrough-add.svg`, and `walkthrough-start.svg`) added on 2026-08-28. They reuse the documented pixel grid and palette and contain no borrowed marks.
- Social preview: `social-card.png`, composed locally on 2026-08-28 from the original Quietwall gate art and self-rendered text. It is 1200 × 630 and MIT licensed with the repository.
- Generated imagery is disclosed in the footer. No real people, brands, copyrighted characters, or implied screenshots.

## Responsive intent

Desktop pairs the explanation and live utility in a 5/7 split. At 760 px, all controls become a single task column, the hero illustration crops to its meaningful gate, and tertiary explanatory copy moves after the working tool. At 390 px, header labels shorten, actions stack, and no fixed bar obscures Android safe areas.

Demo routes use the same control-room language but remove the marketing hero. A compact lime-edged status rack puts real sample rules and timing above the working controls, so the first post-click screen reads as an active utility rather than a second landing page.
