---
name: Kinetic Obsidian
colors:
  surface: '#101419'
  surface-dim: '#101419'
  surface-bright: '#353940'
  surface-container-lowest: '#0a0e14'
  surface-container-low: '#181c22'
  surface-container: '#1c2026'
  surface-container-high: '#262a31'
  surface-container-highest: '#31353b'
  on-surface: '#dfe2eb'
  on-surface-variant: '#c5c9ac'
  inverse-surface: '#dfe2eb'
  inverse-on-surface: '#2d3137'
  outline: '#8f9378'
  outline-variant: '#444932'
  surface-tint: '#b0d500'
  primary: '#ffffff'
  on-primary: '#2a3400'
  primary-container: '#caf300'
  on-primary-container: '#596c00'
  inverse-primary: '#536600'
  secondary: '#d3fbff'
  on-secondary: '#00363a'
  secondary-container: '#00eefc'
  on-secondary-container: '#00686f'
  tertiary: '#ffffff'
  on-tertiary: '#412d00'
  tertiary-container: '#ffdea8'
  on-tertiary-container: '#845d00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#caf300'
  primary-fixed-dim: '#b0d500'
  on-primary-fixed: '#171e00'
  on-primary-fixed-variant: '#3e4c00'
  secondary-fixed: '#7df4ff'
  secondary-fixed-dim: '#00dbe9'
  on-secondary-fixed: '#002022'
  on-secondary-fixed-variant: '#004f54'
  tertiary-fixed: '#ffdea8'
  tertiary-fixed-dim: '#ffba20'
  on-tertiary-fixed: '#271900'
  on-tertiary-fixed-variant: '#5e4200'
  background: '#101419'
  on-background: '#dfe2eb'
  surface-variant: '#31353b'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 60px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.03em
  metric-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 44px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  metric-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: 0em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.08em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system delivers a high-performance, precision-engineered atmosphere for athletes and dedicated lifters. The aesthetic merges **minimalist technical utility** with **high-voltage kinetic energy**. It avoids decorative clutter in favor of crisp metrics, high-contrast visual hierarchies, and instant legibility under harsh gym lighting.

The visual tone is disciplined, intense, and empowering. Obsidian surfaces establish an immersive void, allowing luminous metrics, progressive overload data, and biometric rings to stand forward with absolute clarity. Interfaces feel like a precision sports instrument—taut, responsive, and uncompromising.

## Colors

The palette is engineered around dark-adapted environments and optical vibration that commands action:

- **Primary (`#D4FF00` - Electric Lime):** The core kinetic driver. Reserved for primary actions, active timers, completed sets, peak achievements, and interactive active states. Never dilute with low-contrast pairings; it sits strictly on `#0D0F12` or `#171B21`.
- **Secondary (`#00F0FF` - Hyper Cyan):** Designates aerobic capacity, tempo cadences, target ranges, and secondary analytical readouts.
- **Tertiary (`#FFB800` - High-Voltage Amber):** Signals maximum threshold, RPE 9–10 zones, strain limits, and streak maintenance warnings.
- **Surface & Background Architecture:**
  - Base Canvas: Deep Obsidian (`#0D0F12`).
  - Card Tier 1: Slate Primary (`#171B21`).
  - Card Tier 2 / Elevated Insets: Slate Active (`#1E232B`).
  - Structural Hairlines: `#282F3A` at 60% opacity.
- **Typography & Content:**
  - High Emphasis: Pure White (`#FFFFFF`).
  - Medium Emphasis: Cool Steel (`#94A3B8`).
  - Low Emphasis / Disabled: Slate Muted (`#475569`).

## Typography

The typography leverages **Plus Jakarta Sans** for its geometric clarity, tight apertures, and chiseled terminals. 

All key numerical outputs (load, reps, volume, percentage splits) must be rendered in `tabular-nums` to eliminate layout wobble during real-time rep updates and stopwatch ticks. Use `label-caps` in uppercase format with wide tracking for metadata tags (e.g., `SET 03`, `RPE 8.5`, `HEART RATE`).

## Layout & Spacing

A rhythmic, dense layout structure designed around 4px and 8px base units.

- **Mobile (< 768px):** 4-column fluid layout with dynamic bottom-sheet clearance. Margins are fixed at `1rem` (`16px`) to maximize screen estate for tracking tables and set logs.
- **Tablet (768px - 1024px):** 8-column layout. Split views pair real-time logging routines alongside historical rep charts.
- **Desktop (> 1024px):** 12-column layout pinned to a max container width of `1280px` to maintain focused visual lines without overextending data tables.

All metric containers and set-entry rows maintain strict `space-sm` or `space-md` gaps to guarantee thumb tap accuracy under physical fatigue.

## Elevation & Depth

Visual hierarchy is constructed via **tonal layering** accented with **neon photonic glow** rather than traditional heavy drop shadows:

- **Level 0 (Canvas):** Pure `#0D0F12` void.
- **Level 1 (Structural Cards & Modules):** `#171B21` with a sub-pixel border of `1px solid rgba(255, 255, 255, 0.06)`.
- **Level 2 (Active Modals & Flying Heads):** `#1E232B` paired with a focused, localized glow: `0px 8px 32px -4px rgba(0, 0, 0, 0.6)`.
- **Level 3 (High-Energy Glow):** Selected indicators, active recording rings, and primary action buttons emit a low-spread outer photonic haze: `0 0 24px -2px rgba(212, 255, 0, 0.28)`.

## Shapes

The shape system balances ergonomic card forms with aerodynamic pill geometries:

- **Cards & Data Modules:** `rounded-lg` (`16px`) for structural cards; `rounded-xl` (`24px`) for oversized summary tiles.
- **Interactive Badges, Toggles & Buttons:** Full pill geometry (`rounded-full` / `9999px`) to create high affordance distinct from square layout bounds.
- **Entry Cells & Inputs:** `rounded-md` (`8px`) to preserve maximum surface area for legible large numerical values.

## Components

### Action Buttons
- **Primary:** Full electric lime (`#D4FF00`) solid fill, pure black (`#000000`) bold typography, fully pill-shaped. Hover and active states deploy `box-shadow: 0 0 20px rgba(212, 255, 0, 0.4)`.
- **Secondary:** Transparent fill with a `1.5px` border in `#282F3A`, text in `#FFFFFF`. On press, shifts background to `#1E232B`.
- **Quick-Log Steppers (+ / -):** `44x44px` minimum hit-target pills in `#1E232B` with high-contrast glyphs.

### Metric Rings & Progress Indicators
- **Completion Rings:** Multi-layered SVG tracks. Unfilled track in `#1E232B`; stroke active segment in gradient transitioning from `#00F0FF` to `#D4FF00` with round stroke caps.
- **Consistency Heatmap:** 7-column or monthly matrix. Days rendered as `10x10px` rounded squares (`rounded-[2px]`). Inactive days use `#171B21`; active days scale through luminance steps (`#1E3A1A` → `#4D7C0F` → `#A3E635` → `#D4FF00`).

### Chips & Pill Badges
- Compact indicators using `label-caps`. 
- **Workout Intensity Tag:** `#1E232B` container with a `6px` solid status circle indicating cyan (aerobic), lime (hypertrophy), or amber (maximal/PR).

### Input Fields & Steppers
- Built specifically for speed. Dark charcoal background (`#13171D`), no vertical label clutter (labels float top-right in `label-caps`). 
- Numerical values appear in `headline-md` tabular-nums. Focus ring activates a `1.5px` boundary in `#D4FF00`.

### Progress Photo Cards with Stat Overlays
- `rounded-lg` image containers with aspect ratio `4:5`.
- Scrim gradient overlay from bottom up (`rgba(13, 15, 18, 0.92)` to `transparent` at 55% height).
- Stat row docked at bottom: High-visibility white weight metric, Electric Lime body fat percentage badge, and Cool Steel workout split pill label.
