# Strategist chat: Google Stitch prompt set

Prompts for designing **Talk to Zetca**, a chat layer on top of the Strategist, in [Google Stitch](https://stitch.withgoogle.com/).

The existing Strategist (the step-by-step quiz and the manual form) stays exactly as it is. Talk to Zetca sits on top of it. The user types or speaks what they're trying to do and pastes any links (website, social profiles). Zetca then:

1. Reads their website and whatever is public about them online.
2. Builds their **brand kit**: logo, colours, fonts and the look of their posts.
3. Finds 2–3 competitors in the same niche and studies what they post, how often, when, and what gets engagement.
4. Recommends a strategy: how to position the brand, what to post, where, how often and when.
5. On a yes, writes the posts, makes the visuals in the brand kit, and fills the schedule.
6. Shows everything for review before anything is posted.

It can also offer to connect the user's LinkedIn (Instagram comes later) to understand the brand better.

**How to use**
1. Start a new Stitch project in **Web** mode.
2. Paste the **Master prompt** together with **Screen 1**, and let Stitch build it.
3. Paste the **Screen rules** block as its own message.
4. Paste each remaining screen on its own, in order, in the same project.
5. If a screen drifts (invented features, jargon, extra panels), reply: "Follow the screen rules strictly. Remove anything not listed in the screen prompt."
6. Use the follow-up prompts at the end for the other states and for mobile.
7. Export each screen as HTML and save it under `designs/strategist-chat/`.

---

## Master prompt (paste once, with Screen 1)

```
Design desktop web app screens for "Zetca", an AI social media content platform. These screens are "Talk to Zetca": a chat where a business owner says what they're trying to do, pastes links to their website or social profiles, and Zetca researches the brand and its competitors, recommends a content strategy, then writes the posts, makes the visuals and schedules them.

Feel: like talking to a sharp marketing strategist who did their homework. Calm, confident and fast. While Zetca works, the user sees real findings appear (their logo, colours, competitors, posting times), so it feels like real research, not a spinner. One obvious next step at a time.

App shell (every screen):
- Left sidebar, 248px wide, dark navy #0B1220. At the top, the Zetca logo: a 36px rounded square with an indigo-to-blue gradient and a white box icon, then "Zetca" in white bold with a small indigo dot, and "CONTENT OS" in tiny letter-spaced grey caps underneath. Then the label "PLATFORM SUITE" in tiny grey caps, then the nav items (white-grey text with thin outline icons): Dashboard, Strategist (active: solid indigo #4F46E5 pill), Copywriter, Scheduler, Designer, Publisher, Analysis, Billing, Profile.
- White top header bar, 78px tall: a rounded search field ("Search campaigns, generated drafts, schedules…"), and on the right a small credits pill (coin icon, "1,450 credits"), a mail icon, a bell icon with a small red dot, and the user: an indigo circle avatar with an initial, name "Adaeze Okafor" and a small grey role "Founder".
- Page background #EEF2F7.

Design system (use exactly):
- Colors: primary indigo #4F46E5 (hover #4338CA, tint #EEF2FF); cards pure white with a 1px #E2E8F0 border and 16px corner radius; headings #0B1C30; body text #464555; muted text #777587; success emerald #10B981; warning amber #F59E0B; error red #BA1A1A with tint #FFDAD6.
- Font: Plus Jakarta Sans everywhere.
- Icons: thin outline icons (Lucide style).
- Buttons: primary = solid indigo, white text, 12px radius; secondary = white with a light border; text links in indigo.
- Inputs: 12px radius, #F8F9FF fill, indigo focus ring.
- Chat: Zetca's messages sit on the left in white bubbles with a small Zetca logo avatar; the user's messages sit on the right in indigo bubbles with white text. Links the user pasted show as small link chips (favicon + domain).
- The message box is always at the bottom of the chat: a rounded box with a link icon button, a large round microphone button, and a send arrow.

Example brand (use everywhere): "Crumb & Co.", a small artisan bakery in Lagos, Nigeria, run by Adaeze Okafor. Website crumbandco.ng, Instagram @crumbandco.lagos. Brand colours: warm cream #FFF4E0, deep cocoa brown #4A2C1D, mustard #E0A526. Logo: a simple round brown badge with a wheat stalk and "CRUMB & CO." in cream. Fonts: a chunky serif for headings (like Fraunces) and a clean sans for body.
Example competitors: "Butter Lane Bakery" (butterlane.ng), "The Daily Loaf" (thedailyloaf.com.ng), "Kneaded Lagos" (@kneadedlagos).
```

---

## Screen rules (paste right after Screen 1 is built)

```
Rules for every screen in this project. Follow them strictly:

1. SHOW, DON'T TELL. Every finding is visual first: real photos from the brand's website and posts, video thumbnails with a play icon, logo, colour swatches, font samples, platform icons, small numbers. Words are labels and short tags, never paragraphs.
2. Text limits: a card title of 2-4 words; at most ONE sentence of 15 words or fewer per card; everything else is chips/tags of 1-3 words. No bullet lists longer than 3 items. No walls of text anywhere.
3. Show ONLY the sections, controls and labels listed in each screen prompt. Do not invent extra features, analytics dashboards, scores, tips, banners, team features or footers.
4. Plain, friendly words a small business owner would use. Never use: asset, pipeline, workflow, scrape, crawl, payload, optimise, AI-powered, leverage, synergy, KPI.
5. Every finding says where it came from as a tiny grey source chip with the site's favicon (e.g. "crumbandco.ng", "Instagram").
6. Use the Crumb & Co. example content from the master prompt and realistic numbers (e.g. "3× a week", "Tue & Fri, 7–9 am", "Reels: 4× more likes").
7. Every screen uses the same app shell: dark navy sidebar with Strategist active (Scheduler active on Screen 9), white top header. No second header, no breadcrumbs.
8. Screens 2-8 use the SAME dark style as the Screen 1 hero: the dark looping purple video behind everything (darkened), the white dot-matrix pixel font for page and section titles, dark glass cards (6% white fill, 10% white border, background blur, 24px corners), white text with 60% white for secondary text, white pill chips with a faint border. The user's chat bubbles are white with dark text; Zetca's are translucent white with white text. No light cards on these screens.
9. One primary button per screen or panel. Where something costs credits, show it in small muted text next to the button (e.g. "Uses 20 credits").
```

---

## Screen 1: Strategist home with Talk to Zetca

```
The Strategist page. At the top, a full-width dark hero card (28px corners) with a looping dark background video (abstract purple and black shapes) and a soft black fade at the bottom.

Inside the hero, centred:
- A row of 4 overlapping small white circles inside dark rings (Instagram, TikTok, LinkedIn, YouTube icons in black), joined to a dark pill: "Studies your brand and competitors".
- A huge two-line headline in a white retro dot-matrix pixel font: "Tell Zetca / What You're Building".
- One light-grey line under it: "Say what you're trying to do and paste a link. Zetca does the research."
- A large white rounded chat box with a soft white glow: placeholder "I run a bakery in Lagos and want more cake orders online…", and in its bottom row an "Add a link" pill, a round grey microphone button and a round black send arrow. Muted text under it: "Uses 20 credits · about 2 minutes".
- Three translucent example chips: "Grow my bakery's Instagram", "Get more leads for my agency", "Launch my new clothing line".
- At the bottom of the hero, 4 small stats in white with dot-matrix symbols above them: "~2 min · To study your brand", "3 · Competitors compared", "6 · Platforms planned", "24/7 · Posting on schedule".

Below the hero, on the light page: "Your strategies" with 2 saved strategy cards and a secondary "Answer the questions" button for the step-by-step quiz.
```

---

## Screen 2: Speaking to Zetca

```
The same Strategist home, but the user is speaking instead of typing.

The hero message box has grown into a listening state:
- The microphone button is now large, filled indigo, with soft pulsing rings around it.
- A live sound wave line next to it.
- The words appear as the user speaks, in dark text in the box: "I run a small bakery in Lagos called Crumb and Co. We sell cakes and pastries and I want more people ordering online for birthdays and weddings. Our website is crumbandco dot n g."
- Small muted text: "Listening… tap to stop".
- Two buttons under the box: secondary "Cancel" and primary "Send".

Everything else on the page is dimmed slightly.
```

## Screen 3: Zetca is researching

```
The chat view after the user sends their message. Two columns.

Right column (400px): the chat. The user's indigo bubble with a link chip "crumbandco.ng". Zetca's short reply: "On it. Give me about two minutes."

Left column (wide): "What Zetca found", filling in live as a visual board, not text:
- A thin 4-step progress bar across the top with tiny labels: "Website", "Online", "Brand kit", "Competitors" (first two done with green checks, third in progress).
- A photo mosaic appearing tile by tile: 6 real-looking photos from the bakery's website and Instagram (cakes, pastries, the shop), each with a tiny source chip in the corner; one tile is a video thumbnail with a white play button.
- Under the mosaic, a row of small chips appearing: "Custom cakes", "Pastries", "Lekki, Lagos", "Weddings", "Birthdays".
- A shimmering placeholder where the brand kit will appear.
```

---

## Screen 4: Your brand at a glance

```
The same two-column view. The left board is now "Your brand at a glance", a visual summary with almost no sentences.

Top: a wide header card showing the brand like a mini profile: the round logo (left), the name "Crumb & Co." in its own chunky serif font, one line "Celebration cakes, baked in Lekki", and the platform icons where they were found (website, Instagram, TikTok).

Then a bento grid of cards:
- "Colours": a full-width strip of 4 tall swatches (cream #FFF4E0, cocoa #4A2C1D, mustard #E0A526, white) with the hex code tiny at the bottom of each.
- "Fonts": "Fraunces" shown large as "Aa Fresh", and "Inter" small, side by side.
- "Your look": 3 example photos from their site in a row, with tags under them: "Warm light", "Close-ups", "Cream backgrounds".
- "Your customers": 3 tag chips with tiny icons: "Young families", "Couples", "Party planners".
- "How you sound": 3 word chips: "Warm", "Playful", "Proud".
- "Videos": 2 video thumbnails with play buttons and their source chip (YouTube, Instagram).

Right column chat: Zetca: "Here's your brand. Anything I got wrong?" with two small reply chips: "Looks right" and "Fix something".
```

---

## Screen 5: Connect your accounts

```
The same two-column chat view. In the chat column, a special Zetca message card (white, with an indigo top border):

- Heading: "Want me to look at your own accounts too?"
- Text: "I can see your public posts, but connecting lets me see your real posting times and which posts did best. I'll only read; I won't post anything without asking."
- Two account rows, each with the platform logo:
  - LinkedIn: primary button "Connect".
  - Instagram: a small grey pill "Coming soon".
- A text link: "Not now, use what's public".

The left column still shows the brand kit from Screen 4, slightly dimmed.
```

## Screen 6: Bakeries like yours

```
The same two-column view. The left board is "Bakeries like yours": Crumb & Co. next to 3 competitors, compared visually.

A row of 4 tall cards (Crumb & Co. first, with an indigo border and a small "You" pill). Each card:
- A cover photo from that brand's website or posts.
- Round logo overlapping the cover, the name, and a site chip.
- Their colour palette as 4 tiny dots.
- 3 small stat rows with icons: "📅 6× a week", "🎬 Mostly Reels", "❤ 940 avg likes". If a number isn't known, show a grey dash, never a guess.
- A row of 3 tiny thumbnails of their posts.

Below, "What works for them": 3 compact cards, each with a small photo from the competitor that shows it, a 3-5 word title ("Behind-the-scenes videos", "Early-morning posts", "Clear prices"), and one short line. Each has a tiny source chip.

Right column chat: Zetca: "You post half as often and almost no videos. That's the gap to close."
```

---

## Screen 7: Zetca's recommended plan

```
The same two-column view. The left board is "Your plan", visual and scannable.

- A bold one-line positioning statement in a large card with the brand's cream background and cocoa text: "Lagos's go-to bakery for celebration cakes".
- "What to post": 4 tiles, each a photo from their site with a short label over a dark overlay: "Cakes being made", "Real celebrations", "This week's menu", "Baking tips".
- "Where and how often": 3 platform rows, each with the platform icon and a row of filled/empty dots for posts per week (Instagram ●●●●●, TikTok ●●●, Facebook ●●●).
- "Best times": a compact heatmap (Mon–Sun × morning/afternoon/evening) with the best slots in indigo.
- "Your goal": a big number card: "20 → 40 cake orders a month".

Under the board: primary button "Make my posts and visuals" with muted text "Uses about 60 credits · 2 weeks of posts", and a text link "Change the plan in the form".

Right column chat: Zetca: "Want me to make the first two weeks?" The message box at the bottom.
```

---

## Screen 8: Making everything

```
The same two-column chat view. The left card is "Making your first 2 weeks", with 4 stacked steps, each with an icon, a title, a count and a status:
1. ✓ "Plan saved": "Saved to Your strategies".
2. ✓ "Posts written": "22 of 22".
3. In progress, with a progress bar: "Visuals": "14 of 22, in your brand kit". Under it, a row of small finished post thumbnails in the cream/cocoa/mustard brand style, with the last few as grey placeholders.
4. Greyed: "Schedule": "Best times from your plan".

Right column chat: Zetca says "Writing your posts now. You can leave this page; I'll keep going." The message box at the bottom.
```

## Screen 9: Review before posting

```
The Scheduler page (Scheduler active in the sidebar), opened from Talk to Zetca. A banner card at the top, indigo tint: "Your first 2 weeks are ready to review. Nothing posts until you approve it." with a primary button "Approve all 22 posts" and a secondary "Review one by one".

Below: a week calendar (Mon–Sun) with post cards in their time slots. Each card: platform icon, time, a small visual thumbnail in the Crumb & Co. brand style, the first line of the caption, and a small amber "Needs approval" pill.

On the right, a 340px panel showing one selected post in full: the visual, the full caption ("Saturday's wedding cake, three tiers of vanilla and passion fruit 🎂 Order on WhatsApp: link in bio"), hashtags, platform and time, and buttons: primary "Approve", secondary "Edit".

At the bottom of the panel, a small switch, off: "Post automatically next time (skip review)".
```

---

## Follow-up prompts

**Couldn't read the website**
```
On Screen 3, show the case where the website couldn't be read. The "Your business" row has an amber warning icon: "I couldn't open crumbandco.ng (the site didn't load)." Zetca's chat message: "No problem. Tell me a bit about what you sell and who buys it, or paste another link." Keep everything else the same.
```

**Not much found online**
```
On Screen 6, show the case where only one competitor was found. One competitor card, plus a dashed empty card: "I couldn't find more bakeries like yours with public posts. Know one? Paste their link." Keep everything else the same.
```

**Out of credits**
```
On Screen 7, show the case where the user doesn't have enough credits. The primary button is disabled; under it, an amber note: "This needs about 60 credits and you have 25. Make 1 week instead, or see plans." with "Make 1 week (30 credits)" as the primary button instead.
```

**Mobile**
```
Make a mobile version (390px wide) of Screens 1, 3 and 7. The sidebar becomes a bottom tab bar. The two columns stack: the chat is the main view, and "What Zetca found" becomes a card you tap to expand above the message box.
```
