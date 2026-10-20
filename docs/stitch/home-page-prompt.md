# Home page redesign: Google Stitch prompt set

Prompts for redesigning Zetca's public home page (https://zetca.pro) in [Google Stitch](https://stitch.withgoogle.com/).

**Why it matters beyond looks:** Google's app review (needed before customers can connect YouTube) checks that the home page accurately describes what the app does and links to its Privacy Policy and Terms. The current page claims "Trusted by 50K startups" and shows sample statistics, which can count against it. Every claim on the new page must be true today, with anything not built yet clearly marked **Coming soon**.

**What's live today (update this list before each redesign):**
- Live: Strategist, Copywriter, Scheduler, automatic publishing to **LinkedIn**.
- Coming soon: automatic publishing to YouTube, Instagram, Facebook, X and TikTok; **Graphic Designer**; **Video Editor**; **Analytics**.
- The Copywriter already *writes* copy for X, Instagram, TikTok, LinkedIn, Facebook and YouTube. Only *auto-publishing* is limited to LinkedIn so far.

**Before going live, confirm:** pricing (the prompt uses "Free during early access", replace it if you have real plans), the contact email (the prompt uses hello@zetca.pro, which needs email forwarding set up at Porkbun), and the FAQ answers.

**How to use**
1. Start a new Stitch project in **Web** mode.
2. Paste the **Master prompt**, then the **Page rules**, then **Part 1**. Let Stitch build it.
3. Paste **Part 2** and **Part 3** to continue the same page.
4. Use the follow-ups for mobile.
5. Export as HTML and send it over.

---

## Master prompt

```
Design the public marketing home page for "Zetca", at zetca.pro. Zetca is an AI content team for creators and small businesses: it plans a content strategy, writes platform-ready posts, schedules them, and publishes them automatically. More tools (a Graphic Designer and a Video Editor) are coming soon.

Feel: modern, confident and honest SaaS. Clean and light, generous white space, real product screenshots instead of abstract art. Similar quality to Linear or Notion's marketing pages, but warmer.

Design system (use exactly):
- Colors: primary indigo #4F46E5 (hover #4338CA, tint #EEF2FF); page background #F7F9FC with a very soft indigo glow behind the hero; cards white with a 1px #E2E8F0 border and 16px radius; headings #0B1C30; body #464555; muted #777587; "Live" status green #10B981 on tint #ECFDF5; "Coming soon" status amber #B45309 on tint #FEF3C7.
- Font: Plus Jakarta Sans. Headings bold with tight letter spacing; hero headline about 64px.
- Logo: a 36px rounded square with an indigo-to-blue gradient and a white box icon, then "Zetca" in bold with a small indigo dot after it, and "CONTENT OS" in tiny letter-spaced grey caps underneath.
- Buttons: primary solid indigo, white text, 12px radius; secondary white with a light border.
- Status pills: small rounded pills reading "Live" (green) or "Coming soon" (amber), 12px semibold.
- Icons: thin outline icons. Platform logos (LinkedIn, YouTube, Instagram, Facebook, X, TikTok) in their brand colours, small.
- Screenshots of the app show a dashboard with a dark navy (#0B1220) left sidebar and white cards on a light grey background, framed in a soft rounded browser window with a subtle shadow.
```

---

## Page rules (paste right after the master prompt)

```
Rules for this page. Follow them strictly:

1. Every claim must be true. Do NOT add: user counts ("Trusted by 50K…"), customer logos, star ratings, testimonials, quotes, awards, made-up statistics, "#1" claims or percentage improvements.
2. Anything not built yet carries an amber "Coming soon" pill: the Graphic Designer, the Video Editor, Analytics, and automatic publishing to YouTube, Instagram, Facebook, X and TikTok. Built features carry a green "Live" pill.
3. Show ONLY the sections listed in Parts 1–3, in that order. No extra sections, banners, pop-ups or chat widgets.
4. Plain, friendly words. Never use: revolutionise, supercharge, synergy, leverage, seamless, cutting-edge, game-changer, 10x.
5. Headline max 8 words; section subheadings max one line; card descriptions max 2 lines.
6. The footer must link to "Privacy Policy" and "Terms of Service".
```

---

## Part 1: Navigation, hero, how it works

```
Part 1 of the home page:

1. Top navigation: a floating rounded white bar (pill shape, subtle shadow), max-width 1100px, centred. Left: the Zetca logo. Middle: text links "Features", "How it works", "Pricing", "FAQ". Right: a text link "Log in" and a solid indigo button "Get started".

2. Hero, centred:
   - A small indigo-tint pill: "Strategy, copy, scheduling and publishing in one place"
   - Headline (64px bold, two lines): "Your AI content team" with "content team" in indigo.
   - One paragraph (18px, max 2 lines): "Zetca plans your strategy, writes posts for every platform, schedules them and publishes for you. Design and video tools are coming soon."
   - Two buttons: solid indigo "Get started free" and secondary "See how it works".
   - A muted line under the buttons: "Free during early access. No card needed."
   - Below, a large app screenshot in a rounded browser frame: the Copywriter workspace, with a grid of post cards on the left (X, Instagram and LinkedIn icons on the cards) and a chat panel on the right.

3. "How it works": section title "From idea to published in four steps", then four cards in a row, each with a number circle, an outline icon, a title and one line:
   1. "Build your strategy": "Answer a few quick questions about your brand and audience."
   2. "Get your posts written": "Platform-ready copy for every channel, written in seconds."
   3. "Schedule it": "Pick the times or let Zetca suggest the best ones."
   4. "Publish automatically": "Posts go out on time. LinkedIn today, more platforms soon."
```

---

## Part 2: Features and platforms

```
Part 2 of the home page, continuing below "How it works":

4. "Features": section title "Everything your content needs", one line under it: "The tools you can use today, and what's coming next."
   A grid of 3 columns × 3 rows of white feature cards. Each card: an outline icon in a tinted rounded square, a title, a status pill in the top-right corner, and a 2-line description.
   - "Strategist" (Live): "A content plan, keywords and channel bios from a quick quiz."
   - "Copywriter" (Live): "Chat with your AI copywriter and get posts for every platform."
   - "Scheduler" (Live): "A calendar for every post, with smart time suggestions."
   - "Auto-publishing" (Live): "Posts publish to LinkedIn on time, with retries if anything fails."
   - "YouTube publishing" (Coming soon): "Upload Shorts and long videos with every detail, scheduled."
   - "Graphic Designer" (Coming soon): "Create on-brand images and thumbnails for your posts."
   - "Video Editor" (Coming soon): "Trim, caption and resize videos for each platform."
   - "Analytics" (Coming soon): "See what's working across your channels."
   - "More platforms" (Coming soon): "Auto-publishing for Instagram, Facebook, X and TikTok."

5. Platforms strip: a white rounded panel with two rows.
   - Row 1 label "Write posts for" followed by six platform logos in colour with names: X, Instagram, TikTok, LinkedIn, Facebook, YouTube.
   - Row 2 label "Publish automatically to" followed by LinkedIn with a green "Live" pill, then YouTube, Instagram, Facebook, X and TikTok greyed out with small amber "Soon" pills.

6. Two feature highlight rows, alternating image left/right. Each has a small indigo label, a 3-word title, a 2-line paragraph, three short bullet points with check icons, and an app screenshot in a browser frame:
   - "STRATEGIST": "Know what to post": the screenshot shows a strategy result page with channel descriptions and colour-coded sections. Bullets: "Content pillars and themes", "SEO-ready channel bios", "Keywords for your niche".
   - "SCHEDULER": "Never miss a post": the screenshot shows a monthly calendar with coloured post chips. Bullets: "Drag posts to reschedule", "Auto-schedule a whole set", "See what's published or failed".
```

---

## Part 3: Pricing, FAQ, final call to action, footer

```
Part 3 of the home page, continuing below the feature highlights:

7. "Pricing": section title "Free while we're in early access", one line: "Use every live feature at no cost. Paid plans will come later."
   One centred white card (max-width 480px) with an indigo top border: plan name "Early access", price "$0" with "/month" in muted text, a list of 5 check items ("Strategist", "Copywriter", "Scheduler", "LinkedIn auto-publishing", "New tools as they launch"), and a full-width solid indigo button "Get started free".

8. "FAQ": section title "Questions, answered". An accordion of 5 rows, the first one open:
   - "Which platforms can Zetca publish to?": "LinkedIn today. YouTube, Instagram, Facebook, X and TikTok are coming soon, and Zetca already writes posts for all of them."
   - "Can I edit posts before they go out?"
   - "Do I need a card to sign up?"
   - "Is my data safe?"
   - "What are the Graphic Designer and Video Editor?"

9. Final call to action: a wide indigo rounded panel (solid #4F46E5) with white text: headline "Start creating with Zetca", one line "Free during early access.", and a white button with indigo text "Get started free".

10. Footer on white: the Zetca logo and one muted line "Your AI content team." on the left; link columns "Product" (Features, Pricing, FAQ), "Company" (Contact: hello@zetca.pro), "Legal" (Privacy Policy, Terms of Service). A bottom line: "© 2026 Zetca. All rights reserved."
```

---

## Follow-up prompts

```
Make a mobile (390px wide) version of the whole page. The navigation becomes the logo plus a menu icon that opens a full-width sheet with the links and buttons. Hero headline 40px. All grids become single columns; the platforms strip wraps the logos onto two lines; feature highlight rows show the text first, then the screenshot.
```

```
Make the "Privacy Policy" and "Terms of Service" pages in the same style: the same navigation and footer, a page title, a muted "Last updated" date, and a single readable column (max-width 720px) of headings and paragraphs with placeholder text. Add a sticky table of contents on the left on desktop.
```
