---
name: High-Contrast Studio Canvas
colors:
  surface: '#f6faff'
  surface-dim: '#d6dadf'
  surface-bright: '#f6faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f4f9'
  surface-container: '#eaeef3'
  surface-container-high: '#e4e9ed'
  surface-container-highest: '#dfe3e8'
  on-surface: '#171c20'
  on-surface-variant: '#464555'
  inverse-surface: '#2c3135'
  inverse-on-surface: '#edf1f6'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#585e6f'
  on-secondary: '#ffffff'
  secondary-container: '#d9dff4'
  on-secondary-container: '#5c6274'
  tertiary: '#8f0055'
  on-tertiary: '#ffffff'
  tertiary-container: '#b6166f'
  on-tertiary-container: '#ffcede'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#dce2f6'
  secondary-fixed-dim: '#c0c6da'
  on-secondary-fixed: '#151b2a'
  on-secondary-fixed-variant: '#404757'
  tertiary-fixed: '#ffd9e4'
  tertiary-fixed-dim: '#ffb0cd'
  on-tertiary-fixed: '#3e0022'
  on-tertiary-fixed-variant: '#8c0053'
  background: '#f6faff'
  on-background: '#171c20'
  surface-variant: '#dfe3e8'
typography:
  display-lg:
    fontFamily: Syne
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Syne
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-md:
    fontFamily: Syne
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-md-mobile:
    fontFamily: Syne
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system powers an AI social media engine and visual creator workspace. The emotional tone balances high-utility productivity software with punchy, creative editorial energy: disciplined framing on the outside, hyper-saturated creative output on the inside. 

The aesthetic merges **Corporate / Modern workspace discipline** with **High-Contrast graphic confidence**:
- **Outer Shell**: Strict, structural, dark command navigation (#0B1220) delivering deep focus and institutional software credibility.
- **Middle Stage**: Soft, neutral-cool workspace canvas (#EEF2F7) with pure, crisp white surfaces (#FFFFFF) to isolate work surfaces without visual fatigue.
- **Inner Canvas**: Vivid, high-density social templates utilizing high-contrast typography, loud saturation, and expressive scale to mirror the fast-paced, thumb-stopping nature of modern social media.

## Colors

The system uses an intentional triadic split between operational UI chrome, primary interactive accents, and high-energy creative elements:

- **Primary (`#4F46E5` - Electric Indigo)**: Reserved for key system actions, focus rings, generative AI trigger states, active navigation indicators, and primary CTAs.
- **Secondary (`#0B1220` - Obsidian Navy)**: Anchor color for the persistent application sidebar, primary display typography, and high-contrast structural framing.
- **Tertiary (`#EC4899` - Hyper Pink)**: Creative accelerator color used for AI generation highlights, badge notifications, analytics trend vectors, and canvas design accents.
- **Neutral Surface (`#EEF2F7` - Crisp Mist)**: Low-glare canvas neutral providing separation between pure white workspace cards and deep navy navigation.
- **Surface Canvas (`#FFFFFF` - Pure White)**: Applied to interactive canvas cards, modular inspector panels, and active asset tiles.
- **Border / Divider (`#E2E8F0` / `#CBD5E1`)**: Subtle structural boundaries to preserve contrast hierarchy without introducing heavy visual noise.

## Typography

The type system creates a high-tension dialogue between structural workspace utility and editorial impact:

- **Display Hierarchy (`Syne`)**: Deployed exclusively for creative social post mockups, hero metrics, generation banners, and high-impact social preview cards. Heavy weights (700/800) create intentional visual weight that commands attention.
- **Product UI Hierarchy (`Plus Jakarta Sans`)**: Powers the operational dashboard, toolbars, inspector panes, and tables. Its geometric foundation keeps operational workflows legible, fast, and neutral.
- **Pacing & Micro-copy**: Labels and system tags leverage increased letter tracking (`0.01em` to `0.04em`) with semi-bold to bold weights to guarantee quick scannability against dense content matrices.

## Layout & Spacing

The system runs on an anchored sidebar and fluid workspace model:

- **Desktop (1024px and up)**: Persistent fixed-width sidebar (260px) in `#0B1220`, accompanied by a 12-column fluid grid canvas with `gutter-desktop` (24px) and outer canvas margins of `margin-desktop` (32px). Secondary inspector sidecars dock flush right at 320px fixed width.
- **Tablet (768px – 1023px)**: Sidebar collapses to an icon-only rail (72px). The workspace converts to an 8-column layout with 20px gutters and 24px margins. Right inspector panels convert to overlay drawers.
- **Mobile (Below 768px)**: Single-column flow with 16px margins. Primary navigation converts to a persistent bottom utility bar or slide-out sheet. Social post preview cards take full viewport width with a 1:1 or 4:5 aspect ratio lock.
- **Rhythm**: All paddings and internal component gaps strictly align to an 8px base rhythm (`space-xs` through `space-xl`) to maintain structural alignment across toolbars, metric strips, and asset grids.

## Elevation & Depth

Visual depth is expressed through crisp, low-diffusion ambient shadows paired with structural border delineation:

- **Level 0 (Base Canvas)**: Flat `#EEF2F7` neutral background with zero elevation.
- **Level 1 (Workspace Cards & Panels)**: Pure `#FFFFFF` surfaces with a crisp hairline border (`1px solid #E2E8F0`) and an ambient tinted drop shadow: `0 1px 3px rgba(11, 18, 32, 0.05), 0 1px 2px rgba(11, 18, 32, 0.03)`.
- **Level 2 (Hovered Cards & Social Asset Tiles)**: Translated -2px on Y-axis with elevated shadow: `0 10px 15px -3px rgba(11, 18, 32, 0.08), 0 4px 6px -2px rgba(11, 18, 32, 0.04)`.
- **Level 3 (Dropdowns, Command Palette & Floating Inspector)**: Crisp white surfaces elevated with: `0 20px 25px -5px rgba(11, 18, 32, 0.12), 0 10px 10px -5px rgba(11, 18, 32, 0.04)` and a distinct border (`1px solid #CBD5E1`).
- **Level 4 (Modals & Focus Dialogs)**: Backed by a high-contrast dimming scrim (`rgba(11, 18, 32, 0.6)` with 4px backdrop blur) and a sharp, expansive shadow envelope.

## Shapes

The design system employs **Rounded (Level 2)** geometry to maintain crisp, high-performance UI structure while feeling tactile and modern:

- **Standard Elements (0.5rem / 8px)**: Default for input fields, workspace action buttons, dropdown items, filter chips, and inner asset cells.
- **Containers & Panels (1rem / 16px)**: Applied to workspace cards, design templates, editor viewports, and floating tool palettes.
- **Featured Cards & Dialogs (1.5rem / 24px)**: Outer boundary radius for modal dialogs and primary template showcases.
- **Micro-Badges & Pills (Full rounded / 9999px)**: Reserved strictly for status badges, live platform indicator tags (e.g., LinkedIn, Instagram, X), and quick-action prompt chips.

## Components

### Buttons
- **Primary**: Solid `#4F46E5` with `#FFFFFF` text. Bold weight, 8px radius, height 40px (desktop) / 44px (touch). Subdued hover transition to `#4338CA`.
- **Secondary / Studio**: Solid `#0B1220` with `#FFFFFF` text. Used for "Publish", "Render", or high-consequence studio triggers.
- **Tertiary / Outline**: Pure white background with `1px solid #CBD5E1` border and `#0B1220` text. Hover shifts to `#F8FAFC` surface with border `#94A3B8`.
- **AI Action**: Gradient accent border or subtle `#4F46E5` to `#EC4899` gradient wash with high-contrast text and sparkle iconography.

### Chips & Badges
- **Status Chips**: 24px height, full pill radius (9999px), `label-sm` typography. 
- **Platform Badges**: High-contrast icon with subdued background fills (e.g., subtle indigo, emerald, or neutral slate tints) and crisp 1px borders.

### Input Fields & Controls
- **Text & Prompt Inputs**: Height 42px, crisp white background, `1px solid #CBD5E1` border, 8px radius. Active focus: crisp `2px solid #4F46E5` with an outer soft halo (`0 0 0 3px rgba(79, 70, 229, 0.15)`).
- **Checkboxes & Radios**: 18px square/circle with `1.5px solid #94A3B8`. Active checked state fills `#4F46E5` with crisp white SVG check icon.

### Cards & Canvas Panels
- **Workspace Cards**: `#FFFFFF` background, 16px border-radius, `1px solid #E2E8F0` hairline border, Level 1 shadow. Padding scaled using `space-lg` (24px).
- **Social Post Preview Cards**: High-contrast inner canvas wrapper. Outer frame holds clean metadata and publishing analytics; inner stage presents borderless, high-impact template rendering featuring loud type and saturated imagery.

### Asset Grid & Studio Lists
- **Studio Asset Tiles**: 1:1, 4:5, or 9:16 aspect ratios. Subtle border, hidden overlay bar appearing on hover featuring quick prompt remakes, schedule actions, and download triggers.
- **Navigation Items (Sidebar)**: 40px height, 8px radius, text color `#94A3B8`. Active item uses `#1E293B` background with `#FFFFFF` text and a left-aligned 3px `#4F46E5` indicator bar.