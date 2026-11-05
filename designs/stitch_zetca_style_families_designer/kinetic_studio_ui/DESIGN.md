---
name: Kinetic Studio UI
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
  tertiary: '#005338'
  on-tertiary: '#ffffff'
  tertiary-container: '#006e4b'
  on-tertiary-container: '#67f4b7'
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
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f6faff'
  on-background: '#171c20'
  surface-variant: '#dfe3e8'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.025em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The design system powers an enterprise-grade AI social media generation and scheduling suite. It balances the utility of high-output generative workflows with the refined aesthetics of a tier-one creative agency. The UI evokes confidence, swift execution, and bespoke visual curation.

The aesthetic blends **Modern Corporate SaaS** with **Curated Editorial Minimalism**:
- Dark navigation structure anchoring the platform for sustained focus during content planning.
- Ultra-clean, cool-grey canvas prioritizing visual assets and social post artifacts.
- High-contrast graphic mockups styled like agency portfolio presentations rather than standard data grids.

## Colors
The color architecture relies on high-contrast pairings to balance operational controls with vibrant, generated social collateral.

### Palette Implementation
- **Primary Indigo (`#4F46E5`)**: Primary actions, focused states, and dynamic status badges.
- **Deep Indigo / Hover (`#4338CA`)**: Pressed and hover states for primary buttons and interactive nodes.
- **Indigo Tint (`#EEF2FF`)**: Active surface fills, light chip backgrounds, and highlighted text selections.
- **Surface Navy (`#0B1220`)**: Fixed sidebar background, creating a high-density, authoritative navigational frame.
- **Background Canvas (`#EEF2F7`)**: Neutral cool-grey field reducing visual glare across multi-column dashboards.
- **Surface Elevated (`#FFFFFF`)**: Pure white cards, panels, and modals.
- **Borders & Dividers (`#E2E8F0`)**: Hairline 1px structural framing.
- **Typography Deep Navy (`#0B1C30`)**: Primary headlines and high-priority labels.
- **Typography Slate (`#464555`)**: Body copy, inputs, and functional text.
- **Typography Muted (`#777587`)**: Captions, timestamps, secondary navigation labels, and placeholders.
- **Success Emerald (`#10B981`)**: Platform health indicators, publishing confirmations, and reach growth analytics.

## Typography
Plus Jakarta Sans is utilized system-wide to deliver a crisp geometric cadence with modern humanist qualities.

- **Tracking and Kerning**: Headings leverage tight letter-spacing (`-0.02em` to `-0.03em`) to anchor density and eliminate visual slack in high-impact text.
- **Editorial Legibility**: Feed post previews and AI generative copy areas utilize `body-lg` with relaxed line-heights (`26px`) to ensure immediate scanability during content review.
- **Labels & Numbers**: Metadata, chip tags, and scheduling badges use semi-bold and bold weights to retain presence against surrounding imagery.

## Layout & Spacing
The layout leverages a persistent two-panel shell composed of a dedicated 248px dark navy navigation sidebar coupled with a fluid, multi-column dynamic content workspace.

- **Navigation Rail**: Fixed `248px` width spanning 100vh, locked to the left viewport.
- **Main Canvas**: Fluid responsive layout with auto-fitting grid templates for content streams, calendar grids, and campaign boards.
- **Grid Structure**: 12-column desktop grid with `1.5rem` (`24px`) gutters; collapses to single-column feeds with `1rem` (`16px`) gutters on viewports under 768px.
- **Responsive Adaptations**:
  - *Desktop (>1024px)*: 248px fixed sidebar, multi-column dashboard, 32px canvas margin.
  - *Tablet (768px - 1023px)*: 80px iconized collapsed sidebar, 2-column card grid, 24px canvas margin.
  - *Mobile (<767px)*: Off-canvas drawer navigation, single-column stacked view, 16px canvas margin.

## Elevation & Depth
Elevation is maintained using crisp hairline boundaries paired with diffused ambient shadows, avoiding heavy drops to preserve a modern digital agency feel.

- **Level 0 (Flat Canvas)**: Hex `#EEF2F7` serving as the base layer.
- **Level 1 (Card Rest)**: Hex `#FFFFFF` background, structured with a continuous `1px solid #E2E8F0` border. Ambient shadow: `0 1px 3px rgba(11, 28, 48, 0.04), 0 1px 2px rgba(11, 28, 48, 0.02)`.
- **Level 2 (Card Hover & Dropdown Menus)**: Card hover raises via `translateY(-2px)` accompanied by an ambient soft shadow: `0 12px 24px -4px rgba(11, 28, 48, 0.08), 0 4px 8px -2px rgba(11, 28, 48, 0.03)`. Border shifts slightly to `#CBD5E1`.
- **Level 3 (Modals & Overlays)**: `0 20px 32px -6px rgba(11, 28, 48, 0.12), 0 8px 16px -4px rgba(11, 28, 48, 0.06)` with backdrop blur `backdrop-filter: blur(6px)` over `rgba(11, 18, 32, 0.4)`.

## Shapes
The visual framework balances architectural stability with approachable touchpoints.

- **Cards & Content Panels**: Standardized to `16px` (`1rem`) border radius, yielding soft containers for visual content.
- **Action Buttons**: Standardized to `12px` (`0.75rem`) border radius.
- **Chips, Pills, & Badges**: Fully rounded (`9999px`) pill geometries.
- **Form Controls**: Built with `10px` border radius to match nested container layouts.
- **Media Previews**: Locked to `12px` radius inside parent cards to retain harmonious concentric curves.

## Components

### Buttons
- **Primary**: Background `#4F46E5`, text `#FFFFFF`, border-radius `12px`, padding `10px 20px`, typography `label-md`. Hover: `#4338CA`. Active: scale `0.98`. Focus: `0 0 0 3px #EEF2FF, 0 0 0 5px #4F46E5`.
- **Secondary**: Background `#FFFFFF`, text `#0B1C30`, border `1px solid #E2E8F0`, border-radius `12px`, padding `10px 20px`. Hover: Background `#F8FAFC`, border `#CBD5E1`.

### Chips & Filter Badges
- Height: Fixed `32px`, pill radius `9999px`, font `label-sm`.
- **Active State**: Solid `#4F46E5` background, text `#FFFFFF`, shadow `0 2px 4px rgba(79, 70, 229, 0.2)`.
- **Inactive State**: Background `#FFFFFF`, text `#464555`, border `1px solid #E2E8F0`. Hover: Border `#CBD5E1`, text `#0B1C30`.

### Navigation Sidebar
- Width: Fixed `248px`, background `#0B1220`.
- Text items: Color `#777587`, font `label-md`, padding `10px 16px`, border-radius `8px`.
- Active items: Background `rgba(79, 70, 229, 0.12)`, text `#FFFFFF`, anchored by an active indigo vertical pill indicator on the outer edge (4px width, `#4F46E5`, rounded corners).

### Content Cards & Agency Portfolios
- Base: Pure white `#FFFFFF`, border `1px solid #E2E8F0`, radius `16px`, padding `16px`.
- Media Preview: High-contrast 4:5 aspect ratio graphic container (`aspect-ratio: 4 / 5`), overflow hidden, inner radius `12px`.
- Thumbnail Styling: Polished studio finishes with embedded platform tags (Instagram, LinkedIn, X) pinned to top-right via glass badges (`rgba(11, 18, 32, 0.6)` blur `4px`, text `#FFFFFF`).

### Input Fields & Prompt Editors
- Structure: Height `44px`, background `#FFFFFF`, border `1px solid #E2E8F0`, radius `10px`, padding `0 14px`, text `#0B1C30`.
- Placeholder: Color `#777587`.
- Focus State: Border color `#4F46E5`, box-shadow `0 0 0 3px #EEF2FF`.

### Checkboxes & Radios
- Size: `18px x 18px`, border `1.5px solid #CBD5E1`, radius `5px` (checkbox) or `9999px` (radio).
- Checked: Background `#4F46E5`, border-color `#4F46E5`, white checkmark or center pip.