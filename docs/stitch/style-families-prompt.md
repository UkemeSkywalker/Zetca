# Style families, carousels and colours: Google Stitch prompt set

Prompts for the next step of Zetca's style library, in [Google Stitch](https://stitch.withgoogle.com/).

**What's new**
- **Some styles become families.** A family has one look (colours, fonts, shapes, logo spot, footer) and several **layouts** inside it. Other styles keep their single layout. In the app we say "layouts", never "templates".
- **Single posts mix layouts.** A campaign on a family style can give each post a different layout, so the feed has variety but still looks like one brand.
- **Carousels.** A carousel in a style is a **cover slide**, then **content slides**, then a **closing slide** with the call to action. Every slide is in the same style.
- **Colours.** A user can swap a style's colours for their own. They choose whether that's **for this design only** or **for the whole campaign** (saved as the campaign's brand colours).
- **Text always sits right.** Every layout has fixed places for the headline, body, logo, button and footer, with fonts picked for it. Long or short words resize to fit their place.

| Stays the same in a style | Changes post to post |
|---|---|
| Colours, fonts, shapes, logo spot, footer, kind of image | The words, the image, and (in a family) the layout |

**How to use**
1. Start a new Stitch project in **Web** mode.
2. Paste the **Master prompt** together with **Screen 1**, and let Stitch build it.
3. Paste the **Screen rules** block as its own message.
4. Paste each remaining screen on its own, in order, in the same project.
5. If a screen drifts (invented features, jargon, extra panels), reply: "Follow the screen rules strictly. Remove anything not listed in the screen prompt."
6. Export each screen as HTML and save the export under `designs/style-families/`.

---

## Master prompt (paste once, with Screen 1)

```
Design desktop web app screens for "Zetca", an AI social media content platform. These screens add "style families" to the Designer: some design styles now hold several layouts that share one look, styles can make carousels, and users can switch a style to their own brand colours.

Feel: like flipping through an agency's best work. The app chrome stays calm and light so the designs are the loud part. Hardly any words. One obvious next step per screen.

App shell (every screen):
- Left sidebar, 248px wide, dark navy #0B1220. At the top, the Zetca logo: a 36px rounded square with an indigo-to-blue gradient and a white box icon, then "Zetca" in white bold with a small indigo dot, and "CONTENT OS" in tiny letter-spaced grey caps underneath. Then "PLATFORM SUITE" in tiny grey caps, then the nav items (white-grey text, thin outline icons): Dashboard, Strategist, Copywriter, Scheduler, Designer (active: solid indigo #4F46E5 pill, with a small caret and three sub-items under it: New Design, Photo Editor, My Designs), Publisher, Analysis, Billing, Profile.
- White top header bar, 78px tall: a rounded search field, then on the right a credits pill (coin icon, "1,450 credits"), a mail icon, a bell with a small red dot, and the user: indigo circle avatar, "Adaeze Okafor", small grey "Founder".
- Page background #EEF2F7.

Design system (use exactly):
- Colors: primary indigo #4F46E5 (hover #4338CA, tint #EEF2FF); cards white with a 1px #E2E8F0 border and 16px radius; headings #0B1C30; body #464555; muted #777587; success emerald #10B981.
- Font: Plus Jakarta Sans for the app UI.
- Icons: thin outline (Lucide style).
- Buttons: primary = solid indigo, white text, 12px radius; secondary = white with a light border.
- Chips: 32px pills; selected = indigo with white text; unselected = white with a light border.

The styles. Every thumbnail must look like a real, finished, high-end social post, never a grey box. Use only the made-up brands named here. No real company logos, no real products with real logos, no real or famous people.

FAMILY STYLES (several layouts, one look):
A. "Frame & Bubble" (6 layouts), brand "Northbeam Studio": a warm lifestyle photo inside a thin rounded white frame; coral #F47C64 and orange #EF5A2B speech-bubble shapes; logo mark top right; small "#brandclarity" top left; footer with a round profile photo, "Northbeam Studio · Brand Strategist" and a small green "Speak to us" pill. Layouts: (1) photo with the headline in a bubble in the lower corner, (2) a split coral/orange headline card across the top of a photo, (3) a bold "Happy New Week" sticker over a desk photo, (4) a solid orange top banner with a headline and a three-line list in a bubble below, (5) a quote-only card, (6) a full-bleed photo with one small bubble.
B. "Soft Pastel Money" (5 layouts), brand "Kobo Finance": each post on a different pastel (lilac #E9E3FF, mint #E6F7E6, peach #FFE8D6, sky #E3F0FF) or a strong violet #4B3FD9; a cut-out smiling person or a 3D object (padlock, safe, piggy bank); bold sans headline with one word heavier or italic; a white footer strip with a small licence line and two app-store badges. Layouts: (1) headline left, person right, (2) headline top, person centre, (3) 3D object hero on violet, (4) object bottom with headline over it, (5) person with floating labels "Rent", "Data", "Transport".
C. "Clinic Editorial" (5 layouts), brand "Lekki Vein Clinic": light grey #F1F2F4 page, big black serif headline, a glossy 3D object or photo, a white pill button with a round red arrow button beside it, and a footer line with website and phone. Layouts: (1) headline over a 3D heart, (2) headline overlapping a runner photo, (3) a chalkboard word in the middle of the headline, (4) a small photo inset between headline lines, (5) headline with polaroid photos and flying pages.
D. "Neon Lime Set" (6 layouts), brand "Volt Gadgets": lime green backgrounds, a large silver phone with no logo, people in lime clothes, floating glass cubes, thin circles, white or red "Shop now" pills. Layouts: (1) person leaping with phone, (2) group fan with phone in front, (3) person holding phone to camera, (4) side profile with phone to ear, (5) big headline top with person, (6) "Step into the future" with phone and person.
E. "Ribbon Celebration" (6 layouts), brand "Bloom Gifts": one strong colour per post (coral, orange, navy, yellow, purple), a flowing ribbon line, a round date stamp, a giant word with a script word across it, and a warm photo of a parent and child. Layouts: (1) photo left, word bottom, (2) big photo, word centre, (3) word top, photo bottom, (4) photo with the stamp top right, (5) giant word across the photo, (6) side-by-side photo and word.
F. "Brand Red Offers" (6 layouts), brand "Pulse Mobile": deep red and white, big glossy 3D red shapes with tiny people on them, tight bold headlines, a small "T&C apply" note.

SINGLE STYLES (one layout):
G. "Concept Object": a grey, monochrome 3D object (a dartboard with three teal darts in the bullseye) on light grey; a thin, mixed-weight headline with one word in bold and one in teal: "How Many Platforms Should One Studio Run?". Brand "Arcade Works".
H. "Strike Through": cream page, black sans headline "A Queen and her pawns Children" with "pawns" struck through in red and "Children" in blue; small gold and blue chess pieces on dark rocks at the bottom; small social icons in the footer. Brand "Heartnest".
I. "Torn Paper": orange paper torn open to show engraved eyes; ripped newspaper strips with heavy black and orange words "Why People Ignore Your Brand?"; a paper clip note top right. Brand "Owlmark".
J. "Miniature World": bright blue, a tiny badminton court with two tiny players on a racket's strings, a giant shuttlecock; small white headline "Winter Is Coming, Rally On." with one word in green.
K. "Fire & Money": red background, a burning banknote with sparks, headline "Your Studio Might Be Burning Your Budget" in heavy white type with a red ribbon behind the first and last lines.
L. "Big Date": soft cream page, a 3D blue desk calendar showing "OCTOBER 01", a script "Happy New" above a bold "Month", three small icons with labels in the footer. Brand "Bright Hub".

The user's own brand, for colour examples: Crumb & Co., an artisan bakery in Lagos (cream #FFF4E0, cocoa #4A2C1D, mustard #E0A526).
```

---

## Screen rules (paste right after Screen 1 is built)

```
Rules for every screen in this project. Follow them strictly:

1. The designs are the star. Every thumbnail is a finished post, different from the others, as described in the master prompt. Never grey boxes.
2. Hardly any UI text: a card title of 2-4 words, at most one sentence of 15 words or fewer per panel. No paragraphs.
3. Show ONLY the sections, controls and labels listed in each screen prompt. No invented features, scores, tips, banners, team features or footers.
4. Plain words. Say "style" and "layout", never "template". Never use: asset, pipeline, workflow, render, payload, optimise, AI-powered, leverage.
5. No real company logos, no real people. Only the made-up brands in the master prompt.
6. Every screen uses the same app shell: dark navy sidebar, white top header. Designer is active except on Screen 5 (Copywriter is active there). No second header, no breadcrumbs.
7. One primary indigo button per screen or panel. Where something costs credits, show it in small muted text next to the button.
8. Text inside the posts must look professionally placed: aligned to a clear margin, never touching the edges, never over a face or the product.
```

---

## Screen 1: Designer, styles with layouts

```
Screen 1: the Designer page, styles section.

At the top, a row of filter chips: All (selected), Families, Single, Cutout on colour, One-colour hero, Giant word, Premium product, Editorial.

Below, a 4-column grid of style cards. Each card: the style's thumbnail (a finished post, 4:5), then the style name in bold, then one small chip.
- Family styles show a stack effect: two thin card edges peeking behind the thumbnail, and a chip "6 layouts" (or 5) with a small layers icon.
- Single styles have a flat thumbnail and a chip "1 layout".

Show, in this order: Frame & Bubble, Soft Pastel Money, Concept Object, Clinic Editorial, Neon Lime Set, Strike Through, Ribbon Celebration, Torn Paper, Brand Red Offers, Miniature World, Fire & Money, Big Date.

On hover, one card (Frame & Bubble) shows its layouts fanned out slightly and a white "Use this style" pill.
```

## Screen 2: A family style, opened

```
Screen 2: a large pop-up over the Designer page for the style "Frame & Bubble".

Left (about 60%):
- Chips across the top: Single post (selected), Carousel, Story.
- A big preview of the selected layout (4:5).
- Under it, a horizontal strip of all 6 layouts as small thumbnails, each a different layout in the same look, the first one with an indigo ring. A small caption: "Each post can use a different layout."

Right (about 40%), a white card:
- Title "Frame & Bubble", a small chip "6 layouts", and one line: "Warm photos in a rounded frame, with speech-bubble headlines."
- "Colours": three swatch options in a row, each a small pill of 3 colour dots with a label: "Style colours" (selected; coral, orange, white), "Crumb & Co." (cream, cocoa, mustard), and "Custom" (a plus icon).
- "Layouts on each post": two radio rows, "Mix the layouts" (selected) and "Always use this one".
- Primary button "Use this style", with "6 credits a post" in muted text beside it.
```

## Screen 3: Carousel in a style

```
Screen 3: the same pop-up as Screen 2, with the "Carousel" chip selected.

Left: a horizontal row of 5 slides at 4:5, slightly overlapping like a fanned deck, all clearly in the Frame & Bubble look:
1. Cover: big headline "5 signs your brand needs a refresh" in a bubble over a photo, with a small "Swipe" arrow bottom right.
2-4. Content slides: each a big number (2, 3, 4) in a coral circle, a short headline and one line of body text, with a smaller photo.
5. Closing slide: "Ready for a fresh start?" with the green "Speak to us" pill made large, and the footer.
Small grey labels under the slides: Cover, Content, Content, Content, Closing.

Right: the same card as Screen 2, but instead of "Layouts on each post" show "Slides": a stepper "5 slides" with minus and plus buttons, and one muted line "Cover, content, then a closing call to action." Primary button "Make this carousel", "10 credits" in muted text.
```

## Screen 4: Editor with colours and slides

```
Screen 4: the design editor, editing slide 2 of a Frame & Bubble carousel for Crumb & Co.

Top bar: back arrow, the name "Bakery refresh carousel", a green "Saved" pill, then Undo and Redo, then "Download" (secondary) and "Save" (primary).

Left panel, tab "Colours" selected (other tabs: Text, Photos, Layers):
- "Theme": three swatch pills as in Screen 2, with "Crumb & Co." selected, so the whole design on the canvas uses cream, cocoa and mustard instead of coral and orange.
- "Main", "Text", "Accent": three rows, each a colour circle and its hex code.
- A small "Text stays readable" line with a green check.
- "Use these colours for": a two-option toggle "This design" (selected) and "Whole campaign".

Centre: the slide on a light canvas, in the bakery colours: a cocoa number "2" in a mustard circle, a headline "Your photos don't match your bread", a short body line, a photo of fresh bread.

Bottom of the centre area: a slide strip with 5 small slide thumbnails (Cover, 2, 3, 4, Closing), slide 2 with an indigo ring, and a "+ Add slide" tile before the closing slide.

Right panel: "Layout" with 3 small layout options for a content slide (number left, number top, photo top), the first selected.
```

## Screen 5: Copywriter, a campaign that mixes layouts

```
Screen 5: the Copywriter page for the campaign "Crumb & Co. · December" (Copywriter is active in the sidebar).

At the top, a white bar: a small thumbnail of Frame & Bubble, "Style: Frame & Bubble" with a "Change" link, a muted line "Mixing 6 layouts · Crumb & Co. colours", and a switch "Use on new posts" (on).

Below, a 3-column grid of 6 post cards for LinkedIn and Instagram. Each card shows the post's visual on top, all in the Frame & Bubble look with Crumb & Co. colours but each a different layout (bubble corner, split card, sticker, top banner, quote card, full photo), then a small layout label in muted text ("Layout 3 of 6"), then two lines of post text.
One card is a carousel: its visual shows a small stack with "1/5" in the corner.
```

---

## Follow-up prompts

```
Show Screen 2 for a single style, "Concept Object": no layout strip, the chip says "1 layout", and the "Layouts on each post" section is gone. Keep everything else.
```

```
Show Screen 4 with the "Custom" theme open: a colour picker under "Main", and one red warning line "This text colour is hard to read" with a "Fix it" link.
```

```
Show Screen 4 with "Whole campaign" selected, and a small confirmation line under the toggle: "Every post in Crumb & Co. · December will use these colours."
```
