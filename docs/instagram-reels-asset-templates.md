# Rent-Roll Reels — Reusable Asset Templates

Build these three once, save as templates, reuse in every Reel. Specs are pinned to
the visual direction (see the "Visual Direction" artifact) so the feed reads as one brand.

## Shared tokens (use everywhere)

**Canvas:** 1080 × 1920 (9:16). **Safe zones** — keep text/logo out of the top **250px**
and bottom **400px** (Instagram overlays caption + buttons there), and the right **110px**
(action buttons). Center your content in the middle ~1100px of height.

**Colors**
| Role | Hex |
|------|-----|
| Ink (dark ground) | `#17140F` |
| Bone (light text/ground) | `#ECE7DA` |
| Cobalt (signature accent) | `#2540FF` |
| Coral (negative / down) | `#FF5A3C` |
| Green (positive / money-up) | `#23C67A` |
| Amber (highlight number) | `#FFC93C` |

**Type**
- **Display:** **Anton** (free, Google Fonts + Canva) — heavy condensed, the "punchy" face. Tracking −1%, line-height 0.95. Use for hooks, big numbers, monogram.
- **Body / labels:** **Inter** (or Archivo) — captions, small labels, data values. Use `tabular-nums` wherever digits change.
- **Accent pill:** to emphasize a phrase, put it in a solid accent box (cobalt/amber) with the text in the ground color — matches the mockups. Padding 0.3em, corner radius 14px.

**On-screen text default:** Anton, bone `#ECE7DA`, ~72–96px for hook lines, centered, positioned in the upper-middle third. One idea per beat.

---

## 1. Brand card (outro) — used in every Reel

**Duration:** 1.5s. **Ground:** Cobalt `#2540FF` (default); rotate to Ink for variety.

**Layout (centered stack):**
- **Monogram:** 220 × 220px rounded square (radius 44px), **10px** bone border, transparent fill. "RR" in Anton ~110px, bone, optically centered.
- **Wordmark:** below monogram, gap 36px — "THE RENT ROLL", Inter Bold ~52px, letter-spacing 0.2em, bone.
- **CTA line:** above the monogram — "SAVE THIS ↓" or "FOLLOW FOR LANDLORD SYSTEMS", Inter Semibold ~40px, bone at 90%.
- **Handle:** near bottom safe edge — "@therentroll", Inter Medium ~36px, bone at 60%.

**Animation:** monogram scales 0.92 → 1.0 + fades in over ~8 frames; wordmark/CTA fade up 12px, 4-frame stagger. Hold, then hard cut.

**Build (Canva):** new 1080×1920 → cobalt background → rounded-square element (border only) with "RR" → text layers per above → animate with "Rise" / "Pop" presets → export as 1.5s MP4. Save as a Brand Kit template.

---

## 2. Animated bar chart — Reel 3 (and any data Reel)

**Ground:** Ink `#17140F`. **Duration:** ~1.0s for the grow, then hold.

**Bars:** 10 equal-width bars, bottom-aligned, gap = ~40% of bar width. Rounded top corners (8px). Heights follow the data.
- **"Up" bars:** Cobalt `#2540FF` (or Green `#23C67A` for money-up).
- **"Down" bars:** Coral `#FF5A3C` — for Reel 3, the 3 that dropped.
- **Baseline:** 2px bone line at 40% opacity under the bars.
- Optional value labels above each bar: Inter, tabular-nums, ~28px, bone.

**Animation:** each bar grows height 0 → full, **ease-out**, staggered 2 frames left-to-right (~0.6s total). For the "only 3 dropped" beat, keep the same bars and flip 3 to coral + dip on a second keyframe.

**Build (CapCut):** easiest as scaling rectangles — add rectangle stickers, set anchor to bottom, keyframe Scale-Y 0 → 100% with ease-out, stagger start times. Or build the frame in Canva and use a "Bar graph" element with the "Build" animation. Export MP4. Duplicate the draft for future data Reels and swap heights/colors.

---

## 3. Number counter — Reels 1 & 8 (and any money Reel)

**Ground:** Ink `#17140F`. **Duration:** ~1.2s count, then hold.

**Number:** Anton ~280–320px, **Amber `#FFC93C`** (or bone), centered. `$` prefix static; digits roll 0 → target with **ease-out** (fast then settling). Use tabular-nums so width doesn't jitter.
- **Label below:** Inter Semibold ~40px, bone at 85%, letter-spacing 0.12em, uppercase — e.g. "PER UNIT / PER YEAR" (Reel 1) or "THE REAL COST" (Reel 8).

**Build (CapCut):** use a **count-up number template/effect** (search "number counter" in stickers/effects), set start 0, end target, ease-out, ~1.2s. No native effect? Keyframe a text layer through values (0 → 600 → 1,400 → 2,400) on 3–4 keyframes, or use the typewriter-in then a quick scale-pop. Export MP4. Duplicate and change the target for any money stat.

---

## Reuse map
| Asset | Used in |
|-------|---------|
| Brand card | **All 8** (outro) |
| Bar chart | Reel 3; future market-data Reels |
| Number counter | Reels 1 & 8; future money/stat Reels |

**Save each as a CapCut draft + a Canva template.** After this, a new data or money Reel is: duplicate the draft → change numbers/colors → new hook text → done in minutes.
