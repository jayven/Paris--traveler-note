# Paris Pocket — Visual Style Specification v1.1

**Reference source:** user-provided `my-pm-tool.zip`, especially `my-pm-tool/src/App.jsx` (the `C` design-token object, style helpers, `ProjectCard`, dashboard header, tabs, sidebar, and task components).  
**Product source:** Paris Pocket PRD v1.0; itinerary test baseline `Paris_Itinerary_v4_12_Cruise_Mon_Thu_Optional.pdf`.  
**Scope:** **VISUAL RESTYLING ONLY.** Do not transplant the PM tool's project data, work flows, sidebar, or React state model.

## 1. Design intent

Match the supplied PM tool's playful, precise **pastel / light neo-brutalist** visual language: stark near-black outlines, squared edges, pastel panels, typographic hierarchy, green actionable accents, restrained hard-edge shadows. The PM tool is a desktop-oriented React app; Paris Pocket is a Chinese-first, iPhone-first PWA. **Transfer the visual design, not the desktop information architecture.**

## 2. Design tokens — reference source and approved selected-state override

| Token | Reference / approved value | Intended use |
|---|---|---|
| Ink | `#0D0D0D` | Primary text, outlines and hard-edge shadows |
| Selected background | `#58443E` | Dark-filled active navigation, dates and filter/status controls |
| Selected text | `#FFFFFF` | Labels and currentColor icons on the selected background |
| White | `#FFFFFF` | Cards, menus, primary surfaces |
| Page gray | `#FAFAFA` | Scrolling page background |
| Secondary text | `#666666` | Secondary descriptions and metadata |
| Border | `1px solid #0D0D0D` | Cards, pills, tabs, fields, panels |
| Peach translucent | `rgba(255,214,158,0.4)` | Main page title/header, warm highlights |
| Peach solid | `#FFD69E` | Small active accents when needed |
| Pink translucent | `rgba(251,207,224,0.4)` | Secondary heading/panel band, selected grouping |
| Pink solid | `#FBCFE0` | Alternate badge/area accent |
| Blue translucent | `rgba(209,234,255,0.4)` | Informational context / light secondary panel |
| Green translucent | `rgba(232,245,233,0.4)` | Positive/ready/complete supporting surface |
| Green action | `#57B886` | Primary affirmative buttons, check state, progress accents |
| Red | `#EF4444` | Destructive action / explicit error, not arbitrary decoration |
| Base font | `'Space Grotesk','DM Sans',system-ui,sans-serif` | Reference App.jsx root; include Chinese system fallback |
| Default card shadow | `2px 2px 0 #0D0D0D` | Key interactive cards (not every list item) |
| Hover card shadow | `4px 4px 0 #0D0D0D` | Desktop pointer interaction; touch uses pressed feedback |
| Modal shadow | `6px 6px 0 #0D0D0D` | Dialogs only |

**Important:** This specific reference uses **1px** outlines and pale washes; avoid substituting the generic 3–5px neon-brutalist treatment, thick colored drop shadows, gradients, blur, glassmorphism, or highly rounded cards.

### Suggested CSS variables

```css
:root {
  --ink: #0d0d0d;
  --selected-bg: #58443e;
  --selected-text: #ffffff;
  --paper: #ffffff;
  --canvas: #fafafa;
  --muted: #666;
  --line: 1px solid var(--ink);
  --peach: rgba(255, 214, 158, .4);
  --peach-solid: #ffd69e;
  --pink: rgba(251, 207, 224, .4);
  --pink-solid: #fbcfe0;
  --blue: rgba(209, 234, 255, .4);
  --mint: rgba(232, 245, 233, .4);
  --green: #57b886;
  --danger: #ef4444;
  --hard-shadow: 2px 2px 0 var(--ink);
  --font-display: 'Space Grotesk', 'DM Sans', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Noto Sans CJK SC', sans-serif;
}
```

Do not self-host or share font files; use licensed standard web loading or system fallback. Ensure Chinese characters remain legible even when Space Grotesk lacks CJK coverage.

## 3. Component mapping to Paris Pocket

| Paris Pocket surface | Visual treatment, not new behavior |
|---|---|
| App header / selected travel day | Pale peach background; near-black bottom border; bold title, small uppercase spaced-out English overline |
| Date strip | Flat, squared date tabs separated by near-black outlines; muted dark chocolate selected fill (`--selected-bg`) with white text (`--selected-text`); horizontal overflow on iPhone |
| Daily itinerary | White boxed list against `#FAFAFA`; black 1px borders; time in compact strong type, name in bold; **no extra badges, blurbs or tags on timeline cards; NO VERTICAL COLUMN DIVIDER between time and activity title**. Separate activities with horizontal row rules only (as agreed in PRD) |
| Activity detail sheet | White panel with black boundaries, peach header, clear section labels, pink/blue/mint accent strips only as useful separation |
| Notes field | Plain white rectangular text area, black stroke; 16px+ input text on iPhone; clear focus treatment; keep existing local save logic |
| To-do | Squared checkbox, green checked fill, compact item rows separated by dark fine rules; priority badges use pale pink/peach/blue, not saturated all-over fills |
| Daily map | Keep the genuine map tiles untouched; apply the style to surrounding panel, filter chips, route legends, selected-place popovers and buttons; do not draw fake routes |
| Sync/refresh | Green prominent button with black outline; concise local data safety text in muted type |
| Bottom navigation | Retain iPhone-friendly bottom navigation (no persistent desktop sidebar). Active item: selected brown background/white text; subdued inactive tabs; honor safe-area inset |
| Dialogs, backup, errors | Square white panels; solid 1px borders; hard shadows; danger red only when appropriate |

## 4. Typography and mobile adaptation

- Latin headings should visually match the reference's bold Space Grotesk, with `font-weight: 700–800` and modest tracking for section labels.
- Chinese body content should not be forced into uppercase or aggressively letter-spaced; the source tool's uppercase labels are primarily suitable for short English microcopy.
- On iPhone, normal text should be readable (typically 14–16px), while editable fields should remain at least 16px to avoid Safari focus zoom.
- Touch targets should be at least 44×44 CSS px; use non-hover focused/pressed states as well as desktop hover.
- Do not copy the PM tool's fixed 228px left sidebar, four-column KPI row, fixed desktop grid, or cramped small-font forms. Respect existing mobile navigation and PRD content hierarchy.
- Support widths ~320, 375, 390, 430 px; keep horizontal date chips scrollable without clipping; account for Dynamic Island / browser toolbar safe-area insets.

## 5. Non-goals / requirements that must remain unchanged

- No new itinerary drag-and-drop editor, scenario manager, multi-user sync or PM-dashboard functionality.
- Do not introduce React/Vite merely because the reference sample uses them; choose architecture based on the existing Paris Pocket repo and mini audit.
- Keep official trip facts and To-do definitions sourced from the authoritative v4.12 itinerary and subsequent approved revisions, not from PM-tool demo project data.
- Maintain stable activity/task identifiers, local notes and To-do states, backups, one-tap cloud refresh, offline itinerary, real daily routes, Google Maps handoff, and the current Netlify production origin.
- Do not add private booking confirmations or credentials to public code or JSON.
- Keep work on the existing feature branch and draft PR. No deployment (including a new Deploy Preview), Netlify configuration change or main merge without explicit user approval; preserve the `[skip netlify]` gates.

## 6. Review and visual acceptance checks

1. On an iPhone-width screenshot, the header/date tabs/card/list/button treatment immediately resembles the reference PM tool: pale peach/pink washes, sharp 1px black outlines, muted dark chocolate/white selected states, sturdy type, green CTAs.
2. Daily timeline cards display **only time and activity title**; no vertical rule divides time from title. Keep subtle horizontal separators between activities; details stay in activity detail view.
3. To-do unchecked/checked/archived states remain distinguishable by text or icon, not color alone.
4. Bottom navigation and Google Maps launch buttons remain easy to tap on 320–430px devices.
5. Embedded daily maps remain real maps, with attribution, valid place pins and route segments. Only the overlay UI is restyled.
6. After visual changes, full app regression, local storage migration, offline refresh and PWA update behavior still work.
7. Produce preview screenshots for **Home / Daily Timeline, Activity Detail, Daily Map, To-do**, at 390px iPhone width, for sign-off before production deployment.

**Decision:** Visual reference is accepted. **Design review status:** handoff-ready, no implementation/deployment authorized by this file alone.

## 7. Approved visual refinement — v1.1

The **DAILY ITINERARY** list must not look like a spreadsheet with separated time and activity columns. Remove the vertical black border to the right of the time cell, preserve the horizontal black rules between consecutive activity rows, and retain time/title alignment. This is a **visual-only** refinement, not a change to itinerary structure, labels, editing, or interactions. The date strip, to-do list, and other panels keep their existing border treatments.

## 8. Selected-state color refinement — 2026-11-09

**Review status:** the user approved commit `6ab2762`. Freeze this visual design and `#58443E`; preserve MapLibre + OpenFreeMap Positron. Further UI redesign is outside the current scope. The separately authorized HTTPS preview is for acceptance, not production release.

User-directed refinement: replace near-black **selected background fills only** with warm, muted dark chocolate `#58443E`. Use `--selected-bg` and `--selected-text` consistently for bottom navigation, selected dates, To-do status tabs, daily-map filter buttons, the legacy map filter and their isolated visual-preview equivalents. White text has **9.09:1** contrast against this brown; navigation icons inherit the same white via `currentColor`.

The requested P3 reference identifies a brown swatch by appearance; its `D7FF28` label is **not** the background color. No P3 image was available in this refinement's accessible attachments, so the implementation uses the user's explicitly suggested `#58443E`, without claiming an image-sampled match.

Do not replace `--ink` globally. Keep near-black body text, 1px outlines, hard-edge shadows, black informational toast/isolated-preview headers, peach/pink/mint surfaces, green actions/completion/location focus, error colors and walking/driving route colors. Preserve typography, spacing, navigation, horizontal-only itinerary row separators and existing pressed/focus feedback. This decision changes no itinerary, geometry, personal data, sync or booking state. The worker cache name advances only so the existing manual app-update flow can deliver the stylesheet; update logic is unchanged.

Review evidence: [390px black/brown comparisons and four-width regression results](../phase-3/selected-state/README.md). Screenshots use isolated synthetic profiles; real iPhone acceptance remains separate. This document does not authorize a deployment.
