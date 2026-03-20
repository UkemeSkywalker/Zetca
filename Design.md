```markdown
# Design System Strategy: The Editorial Architect

## 1. Overview & Creative North Star: "The Digital Curator"
This design system moves beyond the "SaaS-in-a-box" aesthetic to create a high-end, editorial experience for social media professionals. Our North Star is **The Digital Curator**: a philosophy that treats social media management not as a series of data points, but as a sophisticated publishing house.

Instead of a rigid, claustrophobic grid of lines and borders, we utilize **Intentional Asymmetry** and **Tonal Depth**. By breaking the "template" look with varying surface heights and expansive white space, we create a UI that feels like a premium workspace. We prioritize action through high-contrast primary accents while maintaining a calm, focused environment through a sophisticated palette of muted violets and cool grays.

## 2. Colors & Surface Philosophy
The palette is a curated spectrum of `primary` (electric indigo) and `secondary` (royal purple), grounded by a deep `on-surface` navy.

### The "No-Line" Rule
**Standard 1px solid borders are strictly prohibited for sectioning.**
Boundaries must be defined solely through background color shifts. For example:
- A sidebar uses `surface-container-low`.
- The main content area uses `surface`.
- Nested widgets use `surface-container-lowest`.
This creates a seamless, modern interface that feels "carved" rather than "drawn."

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of premium materials. Use the surface tiers to define importance:
- **Base Layer:** `surface` (#f6f6ff)
- **Recessed Areas (Sidebars/Backgrounds):** `surface-container-low` (#eef0ff)
- **Primary Interactive Cards:** `surface-container-lowest` (#ffffff) — This creates a "pop" against the background without needing a stroke.
- **High-Intensity Callouts:** `surface-container-highest` (#d1dcff)

### The "Glass & Gradient" Rule
To elevate the dashboard from functional to premium:
- **Floating Elements:** Modals and dropdowns must use `surface` with a 80% opacity and a `20px` backdrop-blur.
- **Signature Gradients:** Use a subtle linear gradient from `primary` (#4a40e0) to `primary_container` (#9795ff) at a 135° angle for primary CTAs and active calendar states. This adds "soul" and depth that flat hex codes cannot achieve.

## 3. Typography: The Editorial Voice
We use a dual-typeface system to balance authority with readability.

* **Display & Headlines (Plus Jakarta Sans):** Our "Editorial" voice. Use `display-md` and `headline-lg` with tight tracking (-0.02em) to create a bold, confident brand presence.
* **Body & UI (Inter):** Our "Functional" voice. Highly legible at small scales. Use `body-md` for standard dashboard text and `label-sm` for metadata (timestamps, character counts).

**Visual Hierarchy Tip:** Always pair a `headline-sm` in `on-surface` with a `label-md` in `outline` (#6f768e) to create a clear "Title/Description" relationship without using dividers.

## 4. Elevation & Depth
We eschew traditional drop shadows for **Tonal Layering**.

* **The Layering Principle:** Depth is achieved by stacking. A `surface-container-lowest` card placed on a `surface-container-low` background creates a natural, soft lift.
* **Ambient Shadows:** For floating elements (like a "New Post" composer), use an ultra-diffused shadow: `box-shadow: 0 20px 40px rgba(39, 46, 66, 0.06);`. The shadow color is a low-opacity version of `on-surface`, never pure black.
* **The "Ghost Border" Fallback:** If a border is required for accessibility (e.g., in the Calendar grid), use the `outline_variant` (#a5adc6) at **15% opacity**. Never use 100% opaque lines.
* **Glassmorphism:** Navigation rails should use a semi-transparent `surface_container_low` with a backdrop blur to let the vibrant "Postiz-style" brand colors bleed through from the background.

## 5. Components & UI Patterns

### Buttons
- **Primary:** Gradient (`primary` to `primary_container`), white text (`on_primary`), `DEFAULT` (0.5rem) roundedness. No border.
- **Secondary:** `surface_container_high` background with `primary` text.
- **Tertiary/Ghost:** No background. `primary` text. Transitions to `surface_container_low` on hover.

### The Calendar Grid (The Hero Component)
- **The Structured Grid:** Use the Spacing Scale `4` (0.9rem) for gutters.
- **Cell Styling:** Do not use borders. Use `surface_container_lowest` for empty days and `surface_container_high` for "today."
- **Event Cards:** Use `secondary_container` with `on_secondary_container` text. Apply a `sm` (0.25rem) left-accent bar in `secondary` to denote the category.

### Inputs & Fields
- **Container:** `surface_container_low` with a 0px border.
- **Focus State:** 2px "Ghost Border" using `primary` at 40% opacity.
- **Error:** Background shifts to `on_error` (#ffefef) with text in `error`.

### Lists & Cards
- **Forbid Dividers:** Separation is achieved through `12` (2.75rem) vertical spacing or subtle alternating background tints between `surface` and `surface_container_low`.

## 6. Do’s and Don’ts

### Do
- **Do** use `20` (4.5rem) or `24` (5.5rem) spacing for major section headers to create an "Editorial" feel.
- **Do** use `tertiary` (#983772) sparingly for "Warning" or "High Priority" alerts to maintain the professional blue/purple balance.
- **Do** ensure all interactive elements have a minimum touch/click target of 44px, even if the visual element is smaller.

### Don’t
- **Don't** use 1px solid black or dark gray borders. It breaks the "Digital Curator" immersion.
- **Don't** use high-saturation backgrounds for large areas. Keep the "vibrancy" restricted to CTAs, progress bars, and active states.
- **Don't** use "Drop Shadows" on cards that sit directly on the background; use tonal shifting instead.