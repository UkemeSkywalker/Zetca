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

1. Show ONLY the sections, controls and labels listed in each screen prompt. Do not invent extra features, analytics dashboards, scores, tips, banners, team features or footers.
2. Plain, friendly words a small business owner would use. Never use: asset, pipeline, workflow, scrape, crawl, payload, optimise, AI-powered, leverage, synergy, KPI.
3. Every finding Zetca shows says where it came from, as a small grey source line or link chip (e.g. "From crumbandco.ng", "From 30 public posts on Instagram").
4. Use the Crumb & Co. example content from the master prompt, and realistic numbers (e.g. "Posts 3 times a week", "Best times: Tue and Fri, 7–9 am", "Reels get 4× more likes than photos").
5. Every screen uses the same app shell: dark navy sidebar with Strategist active (Scheduler active on Screen 9), white top header. No second header, no breadcrumbs.
6. One primary indigo button per screen or panel.
7. Where something costs credits, show it in small muted text next to the button (e.g. "Uses about 20 credits").
```

---

## Screen 1: Strategist home with Talk to Zetca

```
The Strategist page, where users start. The new chat entry sits at the top; the existing ways to build a strategy stay below it.

Top: a large white hero card, centred, max 860px wide.
- A small indigo-tint pill: "New".
- Heading: "Tell Zetca about your business".
- Subtext: "Say what you're trying to do and paste a link to your website or social profile. Zetca does the research and builds your plan."
- A large rounded message box (3 lines tall) with placeholder "I run a bakery in Lagos and want more people to order cakes online…". Inside it, bottom row: a link icon button "Add a link", a large round indigo microphone button, and an indigo send arrow button.
- Under the box, three small example chips the user can tap: "Grow my bakery's Instagram", "Get more leads for my agency", "Launch my new clothing line".

Below, a section titled "Or build it step by step" with two smaller white cards side by side:
- "Answer a few questions": a short quiz, about 3 minutes. Button: secondary "Start the quiz".
- "Fill in the form": for when you know exactly what you want. Button: secondary "Open the form".

Below that, "Your strategies": a short list of 2 saved strategy cards (name, platforms as small icons, date), exactly like a simple list.
```

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

Right column (420px): the chat.
- The user's message in an indigo bubble, with a link chip "crumbandco.ng".
- Zetca's reply: "Got it. I'll look at your website and what's public about Crumb & Co., then find a few bakeries like yours to compare. This takes about a minute."
- The message box at the bottom.

Left column (wide): a white card titled "What Zetca found so far", filling in live. Each row has a small icon, a short finding, and a source line:
- ✓ "Your business": "Artisan bakery in Lekki, Lagos. Custom cakes, pastries and bread. Orders on WhatsApp and the website." Source: "From crumbandco.ng".
- ✓ "Your customers": "Mostly young families and couples planning birthdays and weddings." Source: "From your website and reviews".
- A row in progress with a small spinner: "Looking at your Instagram…".
- Two greyed rows still to come: "Your brand kit", "Bakeries like yours".

A slim progress bar at the top of the card: "Step 2 of 4".
```

## Screen 4: Your brand kit

```
The same two-column chat view. The left card is now "Your brand kit".

- Your logo: the round brown Crumb & Co. badge on a light checkerboard, with a small "From crumbandco.ng" line.
- Your colours: four large rounded swatches with their hex codes under them: cream #FFF4E0, cocoa #4A2C1D, mustard #E0A526, white #FFFFFF.
- Your fonts: "Fraunces" shown as a big sample word "Fresh", and "Inter" shown as a sample sentence.
- How your posts look: a row of 3 example post designs made in this brand kit (a cream square with a big cocoa headline "Weekend cake drop", a photo of a cake under a dark overlay with mustard text, a cocoa square with a cream quote). Label: "New posts will look like this".
- A secondary button: "Change something".

Right column chat: Zetca says "Here's your brand kit. I'll use it for every visual. Next I'm looking at bakeries like yours." The message box at the bottom.
```

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
The same two-column chat view. The left card is now "Bakeries like yours", comparing Crumb & Co. with 3 competitors.

A row of 4 compact cards (Crumb & Co. first, highlighted with an indigo border and a "You" pill):
- Each card: small round logo, name, link chip, then 4 short lines: "Posts 3× a week", "Best times: Tue & Fri, 7–9 am", "Mostly: photos" or "Mostly: Reels", "Avg. 120 likes a post".
- Competitor values: Butter Lane Bakery "Posts 6× a week · Reels · 940 likes"; The Daily Loaf "Posts daily · photos + offers · 410 likes"; Kneaded Lagos "Posts 4× a week · behind-the-scenes Reels · 1.3k likes".

Below the cards, a box titled "What works for them":
- "Behind-the-scenes videos of cakes being made get the most likes (Kneaded Lagos, Butter Lane)."
- "Posting before 9 am on weekdays, when people plan orders."
- "Clear prices and a 'Order on WhatsApp' line in every post."
Each line has a small source line: "From 90 public posts".

Right column chat: Zetca says "Your cakes look better than theirs, but you post half as often and almost no videos. That's the gap I'd close first."
```

## Screen 7: Zetca's recommended plan

```
The same two-column chat view. The left card is now "Your plan", the strategy Zetca recommends.

- Heading: "Be Lagos's go-to bakery for celebration cakes".
- "Where you stand": a short paragraph comparing Crumb & Co. to the 3 bakeries.
- "What to post": 4 content pillar chips with a short line each: "Cakes being made", "Real celebrations", "This week's menu & prices", "Baking tips".
- "Where and how often": 3 rows with platform icons: Instagram "5 posts a week, 3 of them Reels"; TikTok "3 videos a week"; Facebook "3 posts a week".
- "Best times to post": a small week grid (Mon–Sun columns, morning/afternoon/evening rows) with the best slots filled indigo.
- "Your goal": "More cake orders on WhatsApp: from about 20 to 40 a month."

Under the card: primary button "Make my posts and visuals", with muted text "Uses about 60 credits · 2 weeks of posts". A text link: "Change the plan in the form".

Right column chat: Zetca says "Here's what I'd do. Want me to make the first two weeks?" The message box at the bottom, with the user typing "Add more posts about weddings".
```

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
