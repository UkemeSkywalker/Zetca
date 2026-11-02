---
name: Intelligent Social Studio
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
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
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
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
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
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
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
The design system powers an enterprise-grade AI social media generation and scheduling suite. It balances computational intelligence with high-efficiency creative production. The interface evokes precision, calm confidence, and effortless throughput. 

The aesthetic is Modern Corporate with subtle tactile cues: clean surfaces, structured high-density cards, crisp typographic contrast, and deliberate color punctuation. Dark structural frames anchor the peripheral navigation, while workspaces remain bright, clear, and content-forward.

## Colors
The color hierarchy establishes distinct functional domains across the platform:

- **Primary (`#4F46E5`):** The signature indigo, reserved for high-intent actions, generative trigger states, active tabs, and primary metrics. Active hover resolves to `#4338CA`. Subtle highlights and active backgrounds leverage the soft indigo tint `#EEF2FF`.
- **Secondary (`#0B1220`):** Dark navy reserved exclusively for peripheral housing and persistent structural chrome (navigation sidebar), establishing depth and focus.
- **Tertiary / Success (`#10B981`):** Emerald green, utilized for published states, viral score upticks, active channels, and platform balance confirmations.
- **Background & Canvas (`#EEF2F7`):** Cool-tinted slate neutral providing high contrast against elevated content cards.
- **Surfaces:** Pure `#FFFFFF` for dashboard tiles, feed cards, inspector panes, and modal sheets. Standard borders leverage `#E2E8F0`.
- **Text & Editorial Hierarchy:**
  - Primary Headings: `#0B1C30` for decisive legibility and visual weight.
  - Body Copy: `#464555` delivering balanced contrast for long-form captions and metadata.
  - Muted Text / Placeholder: `#777587` for subtext, timestamps, and secondary indicators.

## Typography
Plus Jakarta Sans serves as the singular typographic voice across display, interface, and operational levels. Its geometric foundations paired with sculpted apertures ensure clarity across dense post-generation matrices and high-velocity timeline views. 

Uppercase treatments are strictly limited to `label-sm` category badges and metric identifiers. Large display text enforces subtle negative tracking to preserve optical cohesion across variable title lengths.

## Layout & Spacing
The system employs an asymmetrical dashboard framework composed of a persistent desktop sidebar, fixed global utility header, and a fluid content canvas.

### App Shell Dimensions
- **Sidebar Navigation:** Fixed width of `248px`, background `#0B1220`, spanning full viewport height. Collapses into a slide-over drawer on screens smaller than 1024px.
- **Global Header:** Fixed height of `78px`, surface `#FFFFFF`, border-bottom `1px solid #E2E8F0`, padding `0 2rem`. Houses global search, workspace credit badges, quick notification triggers, and the Adaeze Okafor user profile cluster.
- **Main Canvas:** Fills remaining viewport space against `#EEF2F7`, utilizing a fluid 12-column grid system with 24px (`1.5rem`) gutters and 32px (`2rem`) content boundary margins.

### Responsive Breakpoints
- **Mobile (< 768px):** Single-column layout. Sidebar hidden; header adapts to 64px height; canvas margins compress to 16px.
- **Tablet (768px - 1023px):** 6-column fluid grid. Collapsed rail navigation.
- **Desktop (1024px+):** 12-column grid alongside persistent 248px navigation frame.

## Elevation & Depth
Depth is established primarily through structural borders and subtle ambient drop-shadows rather than intense layering.

- **Level 0 (Flat / Canvas):** Used for background canvas (`#EEF2F7`) and structural side navigation (`#0B1220`).
- **Level 1 (Card Surfaces):** Pure `#FFFFFF` with a crisp `1px solid #E2E8F0` border and an ambient shadow of `0 1px 3px rgba(11, 28, 48, 0.04), 0 1px 2px rgba(11, 28, 48, 0.02)`.
- **Level 2 (Hover & Active Drag):** Cards elevated on interaction gain `0 10px 15px -3px rgba(11, 28, 48, 0.08), 0 4px 6px -2px rgba(11, 28, 48, 0.04)` and maintain border fidelity.
- **Level 3 (Modals, Overlays, Menus):** High floating surfaces feature `0 20px 25px -5px rgba(11, 28, 48, 0.1), 0 10px 10px -5px rgba(11, 28, 48, 0.04)` with a `1px solid #E2E8F0` enclosure.

## Shapes
The shape philosophy merges structural modularity with approachable soft geometry. Surfaces balance architectural precision with interactive pill elements:

- **Cards & Panes:** Standardized at `16px` radius (`rounded-lg`), delivering soft contours that enclose post previews, analytics clusters, and editor inputs.
- **Interactive Controls (Buttons & Text Fields):** Standardized at `12px` radius for focused touch targets.
- **Chips, Badges & Avatars:** Fully rounded pill forms (`9999px`) to immediately signal interactive toggles, channel tags, and status indicators.

## Components

### Buttons
- **Primary:** Solid indigo (`#4F46E5`), text `#FFFFFF`, 12px border radius. Height: 44px (large) or 36px (medium). Padding: 16px horizontal. Hover transition to `#4338CA`. Active state: scale down to 0.98.
- **Secondary:** Pure white (`#FFFFFF`) surface, 1px solid `#E2E8F0`, text `#0B1C30`, 12px border radius. Hover transition to `#F8FAFC` background with border `#CBD5E1`.
- **Ghost / Icon:** Transparent background, 12px border radius, text `#464555`. Hover transition to `#EEF2FF` with text `#4F46E5`.
- **Icons:** Thin outline stroke (1.5px to 1.75px Lucide-style), sized at 18px within buttons.

### Chips & Filter Pills
- **Height & Radius:** Fixed 32px height, full pill radius (`9999px`), padding `0 14px`, typography `label-md`.
- **Unselected:** Pure white background, 1px solid `#E2E8F0`, text `#464555`. Hover: background `#F8FAFC`.
- **Selected:** Solid indigo (`#4F46E5`) fill, no border, text `#FFFFFF`, optional close icon in white.

### Cards & Canvas Containers
- **Visual Spec:** Pure white background (`#FFFFFF`), 16px border radius, 1px solid `#E2E8F0`. Padding default at 24px (`space-lg`).
- **Internal Headers:** Border-bottom `1px solid #F1F5F9`, padding-bottom 16px.

### Inputs & Text Areas
- **Spec:** Height 44px, 12px border radius, background `#FFFFFF`, border `1px solid #E2E8F0`, text `#0B1C30`, placeholder `#777587`.
- **Focus:** 1px solid `#4F46E5` accompanied by an outer tint ring: `0 0 0 3px #EEF2FF`.

### Selection Controls (Checkboxes & Radios)
- **Checkbox:** 18px × 18px, 4px border radius. Unchecked: white fill, 1.5px border `#CBD5E1`. Checked: indigo fill (`#4F46E5`) with white check icon.
- **Radio:** 18px × 18px circle. Checked: indigo border (`#4F46E5`) with centered 8px solid indigo dot.

### Specialized Shell Components
- **Top Header Bar:** 78px height, pure white surface with `1px solid #E2E8F0` bottom boundary. Integrates global search input (embedded search icon, max-width 360px), token/credit indicator pill (`#EEF2FF` fill with `#4F46E5` label), utility action icons, and the user profile component displaying "Adaeze Okafor" paired with a 40px circular avatar.
- **Left Navigation Drawer:** 248px width, `#0B1220` background. Nav links include thin Lucide outline icons, color `#94A3B8`, transitioning on active state to `#FFFFFF` with `#4F46E5` accent indicator pill.