# Evity profile design

## 1. Atmosphere & identity

A personal GitHub profile with a short introduction and direct project links.
Keep the existing Go developer identity and pronunciation `[i:viti]`, with no
invented biography or statistics. The signature remains a large lowercase
wordmark beside a layered orbital illustration. The lower section replaces the generated statistics disclosure with Douban
collections and QQ Music listening history, using the existing palette.

Copy uses literal labels: GitHub, Steam, recent updates, and playtime. Avoid
slogans, numbered editorial chapters, descriptions of what a personal homepage
is for, and personified API errors. Empty states say what data is missing.
Technical setup and aggregation details belong in `docs/dynamic-content.md`.

Reference profiles actually reviewed for their writing, not their biographies:
[antfu](https://github.com/antfu/antfu),
[DIYgod](https://github.com/DIYgod/DIYgod), and
[jvns](https://github.com/jvns/jvns). Borrow the short factual introductions,
named project links, and ordinary section labels; do not copy personal facts.

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
putting them in a table that overflows mobile. Native Markdown carries headings, introductory copy and source links.
The culture SVG contains two independent 408 × 296px cards separated by 24px
on the 840px artboard; at the mobile breakpoint they stack as 420 × 296px
cards on a 420 × 616px artboard. Each shows at most three entries.

## 5. Components

- **Hero:** wordmark, Go developer subtitle, original orbital SVG art. Static,
  no navigation inside the image. Native introductory copy repeats the identity.
- **Card frame:** shared SVG container, eyebrow, section title, update date.
- **Metric:** tabular number, compact label, optional separator.
- **Activity row:** clipped-to-length repository/game name, source metadata and
  date or hours. Never interpret an upstream string as SVG markup.
- **State panel:** ready, waiting for credentials, empty/private, and unavailable
  variants. Missing keys and fetch failures cannot appear as zero playing time.
- **Culture cards:** Douban recent collections and QQ Music listening history,
  with ready, empty, unavailable and unconnected states. A shared card primitive
  uses 24px headings, 18px entry titles, 16px metadata, 32px padding and 64px
  row spacing. Book spines and record grooves identify the two empty panels.
- **Native source links:** GitHub controls keyboard, focus and hover. Every
  destination is real; setup instructions stay in repository docs.

## 6. Motion & interaction

No SVG animation or script: GitHub serves README images in a restricted context.
This also respects reduced motion. The only interactions are native links. The homepage has no data-details
disclosure; repeated statistics and collection methodology stay in docs.

## 7. Depth & surface

Use tonal shifts, fine borders, an off-center radial light and layered orbital
curves. The artwork is original vector art; data cards use the same primitives
and tokens rather than third-party themed image services.

## 8. Accessibility constraints & platform limits

Meaningful alt text on every image. Include the current card values in image alt text for assistive technology.
Long names truncate visually but stay complete in alt text. Escape upstream
text in both SVG and HTML attributes, including links. No credentials in SVG,
README, committed snapshots or logs. Show UTC update dates and label GitHub
activity as repository updates, not contribution counts. Do not claim live
gaming presence from a scheduled snapshot.

GitHub owns page CSS, image scaling, caching, keyboard behavior and Lighthouse
results; this repository ships a README rather than a web application. Validate
the GitHub-compatible rendered Markdown at mobile, tablet and desktop widths,
plus the generated state variants. Preserve existing Steam snapshots when generating only culture cards locally;
valid Steam credentials already exist in the user’s remote environment. QQ
listening history needs the user’s authorized source; do not invent records or
substitute playlist contents for listening history.

## 9. Current implementation plan

1. Remove the generated statistics disclosure from both README and updater.
2. Read Evity’s official Douban collection RSS; normalize public entries only.
3. Render two responsive culture cards, with an honest QQ history pending state
   until an authorized history source is configured. No new dependencies.
4. Stage the new assets in CI, document configuration, and verify feed parsing,
   escaping, source failures, regeneration and all three browser breakpoints.
