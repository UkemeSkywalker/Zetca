# Designer: Google Stitch prompt set

Prompts for designing Zetca's **Designer** screens in [Google Stitch](https://stitch.withgoogle.com/).

The Designer makes the images and short videos that go with posts. Users pick a design style, describe a post in a prompt, or start from a blank template, then edit it in a simple template editor. In the Copywriter, each post shows whether it gets a visual; Instagram and TikTok posts always do.

Visuals come from four sources. The free ones are used by default, so AI is only spent where it earns it:

| Source | Cost | What it is |
|---|---|---|
| Text design | Free | Bold text on a solid or gradient background. The text colour always contrasts with the background. |
| Stock photo + text | Free | A Pexels or Pixabay photo (or clip), a black see-through overlay, and bold text on top. |
| AI image | 1 credit | Made by AI from the prompt (Higgsfield). |
| AI video | 5 credits | A 5–8 second clip made by AI (Higgsfield). |

Each plan includes monthly AI credits. When they run out, the free sources still work.

**How to use**
1. Start a new Stitch project in **Web** mode.
2. Paste the **Master prompt** together with **Screen 1**, and let Stitch build it.
3. Paste the **Screen rules** block as its own message.
4. Paste each remaining screen on its own, in order, in the same project.
5. If a screen drifts (invented features, jargon, extra panels), reply: "Follow the screen rules strictly. Remove anything not listed in the screen prompt."
6. Use the follow-up prompts at the end for the other states and for mobile.
7. Export each screen as HTML and save it under `designs/designer/`.

---

## Master prompt (paste once, with Screen 1)

```
Design desktop web app screens for "Zetca", an AI social media content platform. These screens are the "Designer": where a user makes the images and short videos that go with their social media posts. It works like a much simpler Canva: pick a style, type what the post is about, then tweak the text and colours.

Feel: visually striking but effortless. The app chrome stays calm and light; the designs themselves are loud: big bold type, saturated high-contrast colours, dark photo overlays. One obvious main action per screen.

App shell (every screen):
- Left sidebar, 248px wide, dark navy #0B1220. At the top, the Zetca logo: a 36px rounded square with an indigo-to-blue gradient and a white box icon, then "Zetca" in white bold with a small indigo dot, and "CONTENT OS" in tiny letter-spaced grey caps underneath. Then the label "PLATFORM SUITE" in tiny grey caps, then the nav items (white-grey text with thin outline icons): Dashboard, Strategist, Copywriter, Scheduler, Designer (active: solid indigo #4F46E5 pill), Publisher, Analysis, Profile.
- White top header bar, 78px tall: a rounded search field ("Search campaigns, generated drafts, schedules…"), and on the right a mail icon, a bell icon with a small red dot, and the user: an indigo circle avatar with an initial, name "Alex Vance" and a small grey role "Head of Growth".
- Page background #EEF2F7.

Design system (use exactly):
- Colors: primary indigo #4F46E5 (hover #4338CA, tint #EEF2FF); cards pure white with a 1px #E2E8F0 border and 16px corner radius; headings #0B1C30; body text #464555; muted text #777587; success emerald #10B981; warning amber #F59E0B; error red #BA1A1A with tint #FFDAD6.
- Font: Plus Jakarta Sans everywhere in the app UI. Inside the designs themselves, use heavy display fonts (Plus Jakarta Sans 800, Anton, Bebas Neue, Archivo Black).
- Icons: thin outline icons (Lucide style).
- Buttons: primary = solid indigo, white text, 12px radius; secondary = white with a light border; text links in indigo.
- Inputs: 44px tall, 12px radius, #F8F9FF fill, indigo focus ring.
- Chips: 32px tall pills; selected = indigo fill with white text; unselected = white with a light border.

Design examples (use these inside thumbnails and canvases; they must look like real, finished social posts):
- Bold text designs on solid colours with strong contrast: green #16A34A with white text; yellow #FACC15 with navy #0B1C30 text; red #DC2626 with white text; black #0B0B0F with yellow #FACC15 text; indigo #4F46E5 with white text; cream #FFF7E6 with black text.
- Photo designs: a stock photo (gym, coffee shop, city street, sneakers, a modern house) under a black overlay at about 45% opacity, with bold white text on top.
- Text is always large, tight and left-aligned or centred, 2–4 short lines. Never low-contrast text.

Cost badges (always visible where a source is chosen):
- "Free" = small emerald-tint pill with emerald text.
- "1 credit" / "5 credits" = small indigo-tint pill with a tiny sparkle icon.
```

---

## Screen rules (paste right after Screen 1 is built)

```
Rules for every screen in this project. Follow them strictly:

1. Show ONLY the sections, controls and labels listed in each screen prompt. Do not invent extra features, analytics, scores, tips, banners, templates marketplaces, team features or footers.
2. Text in every design must contrast strongly with its background (white on dark or saturated colours, near-black on light or yellow). Never grey text on a photo, never light text on a light background.
3. Wherever the user picks between Text design, Stock photo, AI image or AI video, show its cost badge: "Free", "Free", "1 credit", "5 credits".
4. Plain, friendly words. Never use: asset, pipeline, workflow, render, payload, optimise, AI-powered, leverage.
5. Use realistic example content for a fitness creator brand called "Alex Vance Studio" (e.g. "15-minute full body workout", "No gym? No problem.", "Day 12 of 30").
6. Every screen uses the same app shell: dark navy sidebar with Designer active (Copywriter active on Screens 7–8), white top header. No second header, no breadcrumbs.
7. Keep it simple: one primary indigo button per screen or panel.
```

---

## Screen 1: Designer home

```
Screen 1, "Designer home". The app shell with Designer active.

Top of the content area, a striking hero card spanning the full width (24px radius), background: a deep indigo-to-violet gradient (#312E81 → #4F46E5 → #7C3AED) with a few large, softly blurred colour blobs. Inside, centred:
1. Headline, 40px extra-bold, white: "What are we making today?"
2. One line in light indigo #C7D2FE: "Describe a post and we'll design it. Or pick a style below."
3. A big white prompt bar, 64px tall, 16px radius, with a sparkle icon on the left, placeholder "e.g. A bold quote about consistency for my fitness page", and a solid indigo "Design it" button inside the bar on the right.
4. Under the bar, a row of format chips on the gradient (white outline, selected = white fill with indigo text): "Square 1:1" (selected), "Portrait 4:5", "Story 9:16".

To the right of the page title row above the hero: a small white pill showing the credits meter: a sparkle icon, "12 of 20 AI credits left", and a thin indigo progress bar inside the pill.

Below the hero:
- Section title "Start from a style" (20px bold), with filter chips on the same row: All (selected), Bold text, Photo + text, Quote, Announcement, Product, AI image, AI video.
- A grid of style cards, 4 per row, 2 rows. Each card: a large 4:5 thumbnail of a finished example design, then the style name in bold and its cost badge. The thumbnails must be loud and varied:
  1. "Bold statement": green #16A34A, white heavy text "NO GYM? / NO PROBLEM." — Free
  2. "Photo + text": gym photo under a black overlay, white text "15-MIN / FULL BODY" — Free
  3. "Quote card": cream background, huge black quote marks, black text "Small steps every day." with "— Alex Vance" — Free
  4. "Countdown": red #DC2626, white text "DAY 12 / OF 30" — Free
  5. "Announcement": black background, yellow text "NEW / PROGRAM / DROPS FRIDAY" — Free
  6. "Product spotlight": photo of sneakers under an overlay, white text "TRAIN IN COMFORT", small white pill "Shop now" — Free
  7. "AI image": a vivid AI-looking image of an athlete in neon light, small label "Made with AI" — 1 credit
  8. "AI video": a 9:16 frame of a runner at sunrise with a white play icon and "0:06" pill — 5 credits
  Hovering a card lifts it slightly and shows a "Use this style" button over the thumbnail.
- Section title "My designs" with a "See all" link, and a single horizontal row of 5 smaller design thumbnails, each with a tiny caption ("Instagram post · 2 days ago").
```

---

## Screen 2: Create from a prompt

```
Screen 2, "Create from a prompt". Same shell. Page title "New design" (28px bold) with a small "Back to Designer" text link above it.

Two columns.

LEFT column (about 38%), one white card, top to bottom:
1. Label "What's the post about?" and a 4-line textarea filled with: "A bold motivational post about showing up even on low-energy days, for my fitness page."
2. Label "Format" and three chips: Square 1:1, Portrait 4:5 (selected), Story 9:16.
3. Label "Make it with" and a 2×2 grid of selectable source cards, each with an outline icon, a name, one line of grey text and a cost badge:
   - "Text design" — "Bold text on a colour" — Free (selected: indigo border and tint)
   - "Stock photo" — "Real photo with text on top" — Free
   - "AI image" — "A new image made by AI" — 1 credit
   - "AI video" — "A short clip made by AI" — 5 credits
4. Label "Text on the design" and a 2-line input pre-filled with "SHOW UP / ANYWAY.", with a small "Write it for me" text link.
5. A full-width primary button "Create 4 designs", and a muted line under it: "Free · uses no credits".

RIGHT column (about 62%): a light card titled "Pick one" with a 2×2 grid of four 4:5 results, each a finished bold text design with "SHOW UP / ANYWAY.":
- green #16A34A with white text,
- black with yellow text,
- red #DC2626 with white text,
- yellow #FACC15 with navy text.
Each result has, on hover, two buttons: "Edit" (secondary) and "Use" (primary). Under each result, a tiny emerald badge "High contrast ✓".
A "Try 4 more" secondary button below the grid.
```

---

## Screen 3: Template editor

```
Screen 3, "Editor". Same shell. The content area becomes the editor.

Top bar (white, 64px, full width of the content area):
- Left: a back arrow, the design name "Show up anyway" (editable, with a small pencil), and a muted "Saved" with a check.
- Centre: the size switcher, a dropdown showing "Portrait 4:5 · Instagram", and undo / redo icon buttons.
- Right: secondary button "Download", secondary button "Save", primary button "Attach to post".

Below, three areas:

LEFT panel (300px, white), with a vertical icon tab rail on its left edge: Styles, Text, Background, Photos, Brand. "Text" is active. The panel shows:
- Buttons "Add heading", "Add subheading", "Add small text" (each a wide row showing the text in its own size).
- A "Text styles" list: 4 small preview rows of heavy display font pairings.

CENTRE: the canvas on a light grey dotted backdrop. A 4:5 design: green #16A34A background, huge white heavy text "SHOW UP / ANYWAY." left-aligned, a small white "@alexvancestudio" at the bottom left, and a small round brand logo top right. The headline is selected: a thin indigo selection box with round handles at the corners and a small floating toolbar above it (bold, alignment, colour dot, duplicate, delete). Under the canvas, a zoom control "100%" and a page indicator.

RIGHT panel (280px, white), titled "Text":
- Font dropdown "Anton", size stepper "96", weight chips (Regular, Bold, Black — Black selected), alignment buttons, line height slider.
- "Text colour": a row of colour dots with white selected, and next to it an emerald pill "High contrast ✓ 4.9:1".
- "Letter case": Aa / AA chips.
- A small grey divider, then "Background" with the green swatch and a link "Change".
```

---

## Screen 4: Stock photo + overlay

```
Screen 4, "Editor: stock photo". Same editor layout as Screen 3.

LEFT panel: the "Photos" tab is active.
- A search input with "gym" typed in, and a small grey line under it: "Free photos from Pexels and Pixabay".
- Filter chips: Photos (selected), Videos.
- A 2-column masonry grid of 8 real-looking stock photo thumbnails (gym, dumbbells, a runner, a woman stretching, kettlebells, a city run, a yoga mat, a boxing bag). One is selected with an indigo border and check.

CENTRE canvas: a 4:5 design using the selected gym photo, covered by a black overlay at about 45%, with huge white heavy text "15-MIN / FULL BODY / WORKOUT" centred, and a small white pill "No equipment" under it. A tiny white credit line at the bottom: "Photo by Anna Shvets on Pexels".

RIGHT panel, titled "Photo":
- "Overlay" with a colour dot (black selected) and an opacity slider at 45%.
- "Fit": chips Fill (selected), Fit.
- "Position": a small 3×3 focus grid.
- An emerald pill "Text stays readable ✓".
- A "Replace photo" secondary button.
- A cost row at the bottom: "Stock photo" with a "Free" badge.
```

---

## Screen 5: AI is making it

```
Screen 5, "AI generating". Same shell. Page title "New design".

Centre of the content area, one white card, max-width 640px:
1. A 9:16 preview area on the left side of the card (about 200px wide) showing an animated shimmer over a soft indigo-violet gradient, with a pulsing sparkle icon in the middle.
2. On the right side of the card:
   - Title, 22px bold: "Making your AI video"
   - The prompt in a light grey box: "A runner on a city bridge at sunrise, cinematic, slow motion"
   - A progress bar (indigo) at about 60%, with "About 1 minute left" in muted text.
   - A small checklist: "Prompt read ✓", "Scenes planned ✓", "Video being made…" (spinner).
   - A row: sparkle icon, "Uses 5 credits · 7 left after this".
   - A muted line: "You can leave this page. We'll let you know when it's ready."
3. Under the card, a quiet suggestion row in a light card: an image icon, "Want it free and instant? Use a stock video with text instead." and a secondary button "Use stock video".
```

---

## Screen 6: AI video result

```
Screen 6, "AI video ready". Same editor top bar as Screen 3 (design name "Sunrise run", size "Story 9:16 · TikTok / Reels").

CENTRE: a 9:16 video player on the dotted backdrop: a runner on a bridge at sunrise, with a white heavy text overlay at the top "RUN BEFORE / THE CITY WAKES" and a small white "@alexvancestudio" at the bottom. Under the player: a play/pause button, a thin timeline with a playhead, "0:03 / 0:06", and a mute icon.

LEFT panel ("Video" tab active in the icon rail):
- "Text on video": the headline input, plus "Text appears" chips: At start (selected), After 1s, Whole video.
- "Cover frame": a row of 5 small frame thumbnails with the second selected.
- "Sound": chips None, Soft beat (selected), Upbeat.

RIGHT panel:
- A small card "Made with AI" with a sparkle icon and the prompt in grey.
- Secondary button "Regenerate" with a "5 credits" badge.
- A muted line "12 of 20 AI credits left".
```

---

## Screen 7: Copywriter with visuals per post

```
Screen 7, "Copywriter: visuals". The app shell with Copywriter active.

Page title "Copywriter" (28px bold) with, on the right, a strategy pill "Summer fitness push" and a primary button "Schedule all".

Under the title, a slim indigo-tint banner card (#EEF2FF, 16px radius): a sparkle icon, "7 posts need a visual · 5 free · 2 use AI (6 credits)", a text link "Change", and a primary button "Create all visuals".

Below, a grid of post cards, 3 per row. Each card:
- Top: platform icon and name (Instagram, TikTok, LinkedIn, X, Facebook), and the post's angle as a grey tag.
- The post text (3–4 lines, then "…"), and hashtags in indigo.
- At the bottom, a "Visual" row: a small 56px thumbnail (or an empty dashed square), and a dropdown chip showing the chosen source with its cost badge. The dropdown options are: None, Text design (Free), Stock photo + text (Free), AI image (1 credit), AI video (5 credits).

Show these 6 cards:
1. Instagram — thumbnail of a green bold text design — "Text design · Free". A tiny grey label "Visual required".
2. TikTok — thumbnail of a 9:16 runner clip — "AI video · 5 credits". "Visual required".
3. LinkedIn — no thumbnail — "None".
4. X — thumbnail of a black/yellow announcement design — "Text design · Free".
5. Instagram — dashed empty thumbnail with a spinner — "Stock photo + text · Free", muted "Creating…".
6. Facebook — thumbnail of a gym photo with overlay text — "Stock photo + text · Free".
On the Instagram and TikTok cards, the "None" option in the dropdown is shown disabled with the note "Instagram needs an image or video".
Hovering a thumbnail shows an "Edit" pencil button.
```

---

## Screen 8: Edit design drawer

```
Screen 8, "Edit design drawer". Screen 7 in the background, dimmed with a dark scrim. A white drawer slides in from the right, 480px wide, full height, 24px radius on its left corners.

Drawer contents, top to bottom:
1. Header: Instagram icon, "Edit visual", and a close (X) icon.
2. The post text in a light grey box, 3 lines with "…".
3. A large 4:5 preview of the design: green #16A34A, white heavy text "NO GYM? / NO PROBLEM.", "@alexvancestudio" small at the bottom.
4. "Style": a horizontal row of 5 small style thumbnails (green/white selected, black/yellow, red/white, cream/black, photo + overlay).
5. "Text": a 2-line input with "NO GYM? / NO PROBLEM."
6. "Colour": a row of colour dots with an emerald "High contrast ✓" pill next to them.
7. "Source": a segmented control: Text design · Free (selected), Stock photo · Free, AI image · 1 credit.
8. Sticky footer: a text link "Open in Designer" on the left, and on the right a secondary "Cancel" and a primary "Save visual".
```

---

## Screen 9: My designs

```
Screen 9, "My designs". The app shell with Designer active. Page title "My designs" with, on the right, a primary button "New design".

A filter row: a search input "Search designs", then chips: All (selected), Images, Videos; a "Format" dropdown (All formats); a "Made with" dropdown (All, Text design, Stock photo, AI); and a toggle "Attached to a post".

A grid of design cards, 4 per row, 3 rows, mixing square, 4:5 and 9:16 thumbnails (cards share one height, thumbnails letterboxed on a light grey background). Each card:
- The thumbnail; video ones show a play icon and duration pill.
- The design name in bold ("No gym? No problem.").
- A grey line: format and age ("Portrait 4:5 · 2 days ago").
- A small source badge: "Text design", "Stock photo" or "AI" (sparkle).
- If attached: a small pill with the platform icon, "Attached to Instagram post".
- A "⋯" menu (on hover) for Edit, Duplicate, Download, Delete.
```

---

## Follow-up prompts

### Out of AI credits

```
Make a variant of Screen 2 where the user has no AI credits left. The credits pill reads "0 of 20 AI credits left · Resets 1 Nov". The "AI image" and "AI video" source cards are greyed out with a small lock icon and the line "No credits left this month". Above the source grid, a small amber-tint note: "Free options still work: text designs and stock photos." with a text link "Get more credits". The "Text design" card stays selected and the main button still works.
```

### Empty states

```
Make the empty state of Screen 9 ("My designs"): centred in the content area, a playful illustration of three stacked tilted design cards (green with white text, black with yellow text, a photo with an overlay), the headline "No designs yet", one grey line "Make your first one in under a minute.", and a primary button "New design".

Also make the empty state of the left "Photos" panel in Screen 4 when a search finds nothing: a search icon, "No photos for "zumba aerobics"", and "Try a shorter word." in grey.
```

### Mobile

```
Make mobile versions (390px wide) of Screens 1, 3 and 8:
- Screen 1: the sidebar becomes a hamburger menu in a white top bar. The hero keeps the gradient and the prompt bar (button below the input). Style cards become 2 per row. "My designs" scrolls sideways.
- Screen 3: the canvas fills the width at the top. The side panels become a bottom toolbar with icon buttons (Styles, Text, Background, Photos, Brand); tapping one opens a bottom sheet with that panel's controls. The top bar keeps a back arrow, the design name and a primary "Attach" button; Download and Save move into a "⋯" menu.
- Screen 8: the drawer becomes a full-height bottom sheet with a drag handle.
```
