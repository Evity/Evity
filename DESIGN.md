# Evity profile design

## 1. Atmosphere & identity

A personal field log: code on the left, life beyond code underneath. Keep the
existing Go developer identity and pronunciation `[i:viti]`, with no invented
biography or statistics. The signature is a large lowercase wordmark beside a
layered orbital illustration. This redesign follows the audit-first rules in
`omo:frontend`'s `redesign-skill.md`: replace the unrelated card styles and two
Spotify embeds with one visual language. The user authorized a free redesign.

## 2. Color

The SVG assets deliberately keep the same dark palette in both GitHub themes.

| Token | Value | Use |
| --- | --- | --- |
| background | `#0d1117` | Outer surface |
| surface | `#161b22` | Raised panels |
| border | `#30363d` | Rules and fine outlines |
| text | `#f0f6fc` | Primary text |
| muted | `#a9b6c7` | Secondary text |
| accent | `#79ddd2` | Go identity and primary highlights |
| accent-deep | `#163d3a` | Atmospheric glow |
| accent-soft | `#b6f2e9` | Lit orbital edge |
| warning | `#e6bd7a` | Waiting or unavailable states |

## 3. Typography

Use system sans-serif (`-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`)
with system monospace for small metadata. No remote font requests. SVG display
type is 80px, metric type 36px, headings 24px, body 18px, labels 16px. Important
mobile copy remains in normal Markdown so it reflows at GitHub's native 16px.

## 4. Spacing & layout

Base spacing is 4px; use 8, 12, 16, 24, 32 and 40px steps. Artboard width is
840px on desktop and 420px on mobile, outer padding 32px, card radius 16px.
Header height is 280px. The `<picture>` mobile breakpoint is 600px. GitHub
cards are 448px high on desktop and 528px on mobile; Steam cards are 236/280px
for unavailable states and 384/424px when populated. GitHub
constrains images to the available width. Stack cards vertically rather than
putting them in a table that overflows mobile. Native Markdown carries headings,
introductory copy, links, and accessible summaries.

## 5. Components

- **Hero:** wordmark, Go developer subtitle, original orbital SVG art. Static,
  no navigation inside the image. Native introductory copy repeats the identity.
- **Card frame:** shared SVG container, eyebrow, section title, update date.
- **Metric:** tabular number, compact label, optional separator.
- **Activity row:** clipped-to-length repository/game name, source metadata and
  date or hours. Never interpret an upstream string as SVG markup.
- **State panel:** ready, waiting for credentials, empty/private, and unavailable
  variants. Missing keys and fetch failures cannot appear as zero playing time.
- **Native links/details:** GitHub controls keyboard, focus, hover, and disclosure.
  Every destination is real; setup instructions stay in repository docs.

## 6. Motion & interaction

No SVG animation or script: GitHub serves README images in a restricted context.
This also respects reduced motion. The only interactions are native links and
an optional Markdown details disclosure for data provenance.

## 7. Depth & surface

Use tonal shifts, fine borders, an off-center radial light and layered orbital
curves. The artwork is original vector art; data cards use the same primitives
and tokens rather than third-party themed image services.

## 8. Accessibility constraints & platform limits

Meaningful alt text on every image. Repeat dynamic values in generated Markdown
inside a native details block for assistive technology and narrow displays.
Long names truncate in cards but stay complete in the Markdown summary. Escape
upstream text in both SVG and Markdown, including links. No credentials in SVG,
README, committed snapshots or logs. Show UTC update dates and label GitHub
activity as repository updates, not contribution counts. Do not claim live
gaming presence from a scheduled snapshot.

GitHub owns page CSS, image scaling, caching, keyboard behavior and Lighthouse
results; this repository ships a README rather than a web application. Validate
the GitHub-compatible rendered Markdown at mobile, tablet and desktop widths,
plus the generated state variants. Steam live verification awaits the keys the
user explicitly plans to provide later.
