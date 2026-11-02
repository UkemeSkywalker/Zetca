# Design styles: Google Stitch prompt set

Prompts for designing Zetca's **style library** in [Google Stitch](https://stitch.withgoogle.com/).

A style is a **recipe**, not a fixed picture. It sets the layout, type, colour rules and how the AI should make the image. A user picks one style for a campaign or account, and every post follows it, each with its own words and its own AI-made image.

| Stays the same on every post | Changes on every post |
|---|---|
| Layout, fonts, colour rules, kind of image, logo position | The words, the image, the subject |

**How to use**
1. Start a new Stitch project in **Web** mode.
2. Paste the **Master prompt** together with **Screen 1**, and let Stitch build it.
3. Paste the **Screen rules** block as its own message.
4. Paste each remaining screen on its own, in order, in the same project.
5. If a screen drifts (invented features, jargon, extra panels), reply: "Follow the screen rules strictly. Remove anything not listed in the screen prompt."
6. Use the follow-up prompts at the end for the other states and for mobile.
7. Export each screen as HTML and save it under `designs/design-styles/`.

---

## Master prompt (paste once, with Screen 1)

```
Design desktop web app screens for "Zetca", an AI social media content platform. These screens are the "Style library": a big, inspiring gallery of ready-made design styles. A user picks a style for a campaign, and every post Zetca makes follows it, with new words and a new AI-made image each time.

Feel: like walking through a wall of award-winning ad posters. The app chrome stays calm and light so the designs are the loud part. Hardly any words. One obvious next step per screen.

App shell (every screen):
- Left sidebar, 248px wide, dark navy #0B1220. At the top, the Zetca logo: a 36px rounded square with an indigo-to-blue gradient and a white box icon, then "Zetca" in white bold with a small indigo dot, and "CONTENT OS" in tiny letter-spaced grey caps underneath. Then the label "PLATFORM SUITE" in tiny grey caps, then the nav items (white-grey text with thin outline icons): Dashboard, Strategist, Copywriter, Scheduler, Designer (active: solid indigo #4F46E5 pill), Publisher, Analysis, Billing, Profile.
- White top header bar, 78px tall: a rounded search field, then on the right a small credits pill (coin icon, "1,450 credits"), a mail icon, a bell icon with a small red dot, and the user: an indigo circle avatar, name "Adaeze Okafor", small grey role "Founder".
- Page background #EEF2F7.

Design system (use exactly):
- Colors: primary indigo #4F46E5 (hover #4338CA, tint #EEF2FF); cards pure white with a 1px #E2E8F0 border and 16px corner radius; headings #0B1C30; body text #464555; muted text #777587; success emerald #10B981.
- Font: Plus Jakarta Sans for the app UI.
- Icons: thin outline icons (Lucide style).
- Buttons: primary = solid indigo, white text, 12px radius; secondary = white with a light border.
- Chips: 32px tall pills; selected = indigo fill with white text; unselected = white with a light border.

The styles (use these as the thumbnails; each must look like a real, finished, high-end social post with its own design, never a grey placeholder). Use only the made-up brands named here. No real company logos, no real products with real logos, no real or famous people.

Family "Cutout on colour":
1. "Marble Thinker": flat golden yellow #FFB000 background, a classical marble statue of a bearded thinker at a laptop, cut out, bottom right. Huge black bold sans headline top left: "Marketing is not advertising." Small logo top right, small hashtag bottom left.
2. "Blueprint Thinker": black background with a thin grey grid, the same marble statue with a white sticker outline. White serif headline "Your brand deserves better content", with "better content" in italics inside a blue text-selection box with two blue handles.
3. "Sticker Portrait": deep navy background, a smiling caricature woman with a big head, red sunglasses, holding a phone and camera, white sticker outline. Headline top centre "SOCIAL MEDIA MANAGER", three short callouts with dashed curved arrows.
4. "Collage Zine": cream paper texture, a person whose head is an old TV with "IS A GENZ…" on its screen, heavy black and purple display type "Social Media Manager", a red script word above, a dotted red arrow.

Family "One-colour hero":
5. "Mono Studio": everything in one saturated orange: backdrop, chair, a young man in a white and orange tracksuit holding a large orange phone toward the camera. Big white type top right "NOVA 7 PRO MAX".
6. "Neon Lime Set": lime green backgrounds, large silver phone, people in lime clothes, floating glass cubes, thin circles. Headline "Level up your gadgets" with a white "Shop Now" pill.
7. "Electric Blue Retail": bright blue, curved white footer bar with address, phone and social icons and a round "Order now" button. Tight white stacked headline "Hold Greatness", a neon green accent word on some.
8. "Brand Red Offers": deep red and white, a large glossy 3D red shape with tiny people on it. Headline "No buffering, just fast internet". Small "T&C apply" note.

Family "Giant word":
9. "Word Behind": warm photo of a man in a green armchair wrapped in yellow tape, a huge thin yellow serif word "OOPS" passing BEHIND his head. Small corner text in all four corners and a glass pill "Read the caption".
10. "Glow Numeral": dark blue, a huge glowing white "11" behind a woman holding a smartwatch toward the camera. Three small feature icons in a row at the bottom.
11. "While Others Blur": dark crowd in heavy motion blur, one sharp woman in the centre eating fries, a heavy italic yellow word "BLUR" with a motion smear behind her head. "While others" above, "We make you clear" split below.

Family "Premium product":
12. "Sky Product": soft blue sky with clouds, a hand holding a tablet up. Thin plus bold two-weight headline "Tablet 11th Gen", three round feature icons at the bottom.
13. "Dark Luxe": near-black, a man in a dark jacket with a phone, light bold headline "Nova 15 Plus", a small glass tag "256 GB".

Family "Campaign and celebration":
14. "Celebration Script": a family in a playful studio scene in coral, royal blue, orange, yellow or lilac. A huge bold white word "PAPA" with a red script word written across it, a round date badge, a ribbon line looping around the people, small footer with logo and socials.

Family "Big idea":
15. "Reach Out": white room, a man reaching toward the camera with a huge blurred hand, a tilted orange ticket in front of him: "We make your brand impossible to ignore." Handwritten note "Let's build your growth story."
16. "Sharp in the Crowd": black and white crowd seen from behind, one woman in sunglasses facing the camera with one colour lens. Headline "Be the brand they all notice", with a blue script "they" over bold black type.
17. "3D Crew": a joyful Pixar-like 3D group selfie on white, with a big clean headline above "Find your tribe, build your network" and a dark pill button.

Family "Highlight and flyer":
18. "Marker Highlight": white grid paper, a yellow marker swipe behind a word in "What great founders know about marketing", a low-poly portrait of a made-up founder, a jar of gold coins on a hand, "Share it" with an arrow at the bottom.
19. "Street Flyer": warm peach, a young man in orange kicking a boot toward the camera and holding a printed tumbler, big orange-red type on both sides, a search-bar style link in the footer, a white footer strip with logos, socials and phone.
```

---

## Screen rules (paste right after Screen 1 is built)

```
Rules for every screen in this project. Follow them strictly:

1. The designs are the star. Every thumbnail is a finished post, different from the others, as described in the master prompt. Never grey boxes.
2. Hardly any UI text: a card title of 2-4 words, at most one sentence of 15 words or fewer per panel. No paragraphs.
3. Show ONLY the sections, controls and labels listed in each screen prompt. No invented features, scores, tips, banners, team features or footers.
4. Plain, friendly words. Never use: asset, pipeline, workflow, render, payload, template engine, optimise, AI-powered, leverage. Say "style", not "template".
5. No real company logos, no real people. Use the made-up brands in the master prompt, and Crumb & Co. (an artisan bakery in Lagos; cream #FFF4E0, cocoa #4A2C1D, mustard #E0A526) as the user's own brand.
6. Every screen uses the same app shell: dark navy sidebar, white top header, Designer active (except Screens 3 and 5). No second header, no breadcrumbs.
7. One primary indigo button per screen or panel. Where something costs credits, show it in small muted text next to the button.
```

---

## Screen 1: Style library

```
The Designer's style library.

Top: heading "Pick a style", one muted line "Every post follows it, with new words and a new image each time."

A row of family chips, "All" selected: All, Cutout on colour, One-colour hero, Giant word, Premium product, Campaign and celebration, Big idea, Highlight and flyer. On the right, a small switch: "Show in my brand colours".

Below: a large masonry wall of all 19 style thumbnails from the master prompt, portrait shape, 4 columns, tight 16px gaps, 16px corners. Under each, just the style name and a tiny tag: "Needs AI image" (indigo tint with a sparkle) or "Free" (emerald tint).

Hovering one thumbnail (show this on "Mono Studio"): it lifts slightly, with a white "Use this style" pill in its centre.
```

## Screen 2: One style, many posts

```
A style's own page, showing that the style stays the same while the content changes. Style: "Marble Thinker".

Left, large: a horizontally scrolling row of 4 posts in exactly this style (same yellow background, same layout, same bold type, statue bottom right), but each different:
- "Marketing is not advertising." statue at a laptop.
- "Good bread takes time." statue kneading dough.
- "Your customers can tell." statue holding a magnifying glass.
- "Post less. Mean it." statue holding a phone.

Right, a 320px white panel:
- The style name and a family chip.
- "Stays the same": 3 chips with icons: Layout, Fonts, Look.
- "Changes every post": 2 chips: Words, Image.
- "Colours": two small swatch choices: "Style colours" (yellow, selected) and "My brand" (cream, cocoa, mustard).
- "Image quality": three compact options in a row: Good (1 credit), Better (5 credits), Best (26 credits), "Better" selected.
- Primary button "Use this style". Secondary "Try it on one post".
```

## Screen 3: Pick a style for a campaign

```
Choosing a style for a campaign, in the dark Talk to Zetca look: the whole content area is a dark rounded panel (28px corners) with an abstract dark purple background, a white dot-matrix pixel font for the title, dark glass cards (6% white fill, 10% white border, blur), white text. Strategist is active in the sidebar.

Title: "Pick your campaign's look". One line: "Crumb & Co. · LinkedIn and Instagram · 2 weeks".

"Zetca recommends": 3 large portrait cards side by side, each showing that style made with the bakery's brand: a "Marble Thinker" post in cream and cocoa, a "Word Behind" post with a huge "RISE" behind a baker, a "Celebration Script" post with a birthday family and cake. Under each: the style name and a chip with the reason, 5 words or fewer ("Fits your warm voice"). One card is selected with a white ring and a check.

Below, a small link "See all 19 styles".

At the bottom: primary white pill button "Make my posts", with muted text "22 posts · about 110 credits". A small selector next to it: "Image quality: Better".
```

## Screen 4: Your posts in that style

```
The result: a grid of 8 finished Instagram and LinkedIn posts for Crumb & Co., all clearly the same "Word Behind" style (huge cream serif word behind the subject, warm photo, small corner text), each with a different word, subject and photo: "RISE" with a baker, "KNEAD" with hands in dough, "SWEET" with a cake, "FRESH" with bread from an oven, and so on. 2 of the 8 are still being made: soft shimmer with a small spinner.

Top: heading "Your campaign", a chip with the style name and a text link "Change style". A progress line "6 of 8 made".

Each post on hover shows two small icon buttons: "New image" and "Edit".

Primary button at the top right: "Send to Scheduler".
```

## Screen 5: Copywriter with a campaign style

```
The Copywriter (active in the sidebar). A list of post cards, each with the post's caption on the left in plain text and, on the right, its visual in the campaign's style ("Marble Thinker" in the bakery's colours).

Above the list, a slim bar: a tiny thumbnail of the style, "Style: Marble Thinker", a text link "Change". A switch: "Use on new posts" (on).

On one card, the small visual shows a shimmer with "Making the image…". On another, a small "Use a different style" link under the visual.
```

## Screen 6: Editor with image layers

```
The design editor showing a "Word Behind" post being edited. Three columns: left a tools panel, centre the design on a light dotted canvas, right the properties panel.

Top bar: back arrow, design name, "Saved" pill, size dropdown, undo, redo, Download, primary "Update post".

Centre: the post, with the person selected (a thin indigo outline with corner handles) and the huge word visibly passing behind the head.

Left panel, tab "Layers", a short stacked list with small thumbnails and drag handles, top to bottom: "Rise and shine" (text), "Baker" (image, selected), "RISE" (text), "Background" (colour). Each has an eye icon.

Right panel for the selected image: buttons "New AI image" (with "1 credit") and "Remove background", a size slider, a "Bring forward / Send back" pair, and a "Replace" text link.
```

---

## Follow-up prompts

**Filtered**
```
On Screen 1, select the "Giant word" chip: show only its 3 styles, larger, in 3 columns.
```

**Brand colours on**
```
On Screen 1, turn on "Show in my brand colours": the colour-led styles (Marble Thinker, Mono Studio, Electric Blue Retail, Brand Red Offers) now use cream, cocoa and mustard. Keep their layouts the same, and keep all text clearly readable.
```

**Out of credits**
```
On Screen 3, show the case where the user doesn't have enough credits. An amber note above the button: "This needs about 110 credits and you have 40." The primary button becomes "Make 8 posts (40 credits)", with a text link "See plans".
```

**Mobile**
```
Make a mobile version (390px wide) of Screens 1, 2 and 4. The sidebar becomes a bottom tab bar. The gallery becomes 2 columns, and the panel on Screen 2 stacks below the posts.
```
