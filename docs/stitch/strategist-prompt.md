# Strategist page: Google Stitch prompt set

Prompts for designing the new **AI Strategy Generator** experience in [Google Stitch](https://stitch.withgoogle.com/).

**How to use**
1. Start a new Stitch project in **Web** mode.
2. Paste the **Master prompt** together with **Screen 1**, and let Stitch build it.
3. Paste the **Quiz screen rules** block as its own message.
4. Paste each remaining screen on its own, in order, letting Stitch build each one before the next. Stay in the same project so the style stays consistent.
5. If a screen drifts (jargon, extra panels, long text), reply: "Follow the quiz screen rules strictly. Remove anything not listed in the screen prompt."
6. Use the follow-up prompts at the end for states and mobile.

Research and reasoning behind each choice: [Strategist redesign reference board](https://claude.ai/artifact/We5YybdbKEtLKnSTwDzxD4).

---

## Master prompt (paste once, with Screen 1)

```
Design a desktop web app flow for "Zetca", an AI social media content platform. We are designing the "AI Strategy Generator": a fun, interactive, card-by-card quiz that collects information about a creator's brand, then generates a multi-platform content strategy and SEO-optimised channel/profile descriptions.

Feel: friendly, modern SaaS, confident, playful but clean. Like Typeform's one-question-at-a-time flow combined with Duolingo's personalised onboarding: every answer visibly shapes what the user sees next.

Design system (use exactly):
- Colors: primary indigo #4F46E5 (hover #4338CA, tint #EEF2FF); page background #EEF2F7; cards pure white #FFFFFF with a 1px #E2E8F0 border and 14px corner radius; headings #0F172A; body text #64748B; muted text #94A3B8; success emerald #10B981; accents purple #A855F7, amber #F59E0B, sky #0EA5E9, rose #F43F5E.
- Font: Plus Jakarta Sans everywhere. Headings bold with tight letter spacing.
- Icons: thin outline icons (Lucide style), 1.5–2px stroke.
- Buttons: primary = solid indigo #4F46E5, white text, 10px radius; secondary = white with #E2E8F0 border.
- Selectable options are large tappable cards or pill chips, never dropdowns. Selected state: indigo border #4F46E5, indigo tint #EEF2FF background, small check badge in the corner.
- Generous whitespace, soft shadows (0 1px 2px rgba(15,23,42,0.04)), no heavy gradients.

Wizard layout (all quiz steps):
- Distraction-free: no app sidebar. Slim top bar with the Zetca logo (indigo-to-blue gradient rounded square with a white box icon + "Zetca"), a thin indigo progress bar with "Step 3 of 7" text, and an "Exit" text button on the right.
- Two columns: LEFT (60%) the question card, vertically centred; RIGHT (40%) a sticky "Your strategy is taking shape" live preview panel on a white card. It fills in as the user answers: persona card, selected platforms, content mix, keywords.
- Under the question card: "Back" (secondary), "Skip" (text link, only on optional steps), and "Continue" (primary, shows the hint "press Enter ↵").
- Each option shows a small keyboard hint letter (A, B, C…) like Typeform.
- After each answer, a small friendly AI assistant bubble (indigo spark avatar) appears above the question with a short personalised reaction, e.g. "Love it: fitness creators grow fast on Shorts!".
```

---

## Quiz screen rules (paste right after Screen 1 is built)

The master prompt alone left Stitch room to invent jargon labels, extra panels, footers, fake statistics and long copy. Paste this block on its own as a message straight after Screen 1 is built. If you already have screens, paste it and then regenerate them.

```
Rules for every screen in this project. Follow them strictly:

1. Keep it simple. Show ONLY the elements listed in each screen prompt. Do not add extra sections, cards, banners, tips, statistics, scores, badges, footers or labels.
2. One progress indicator only: the top bar ("Step 2 of 7" with a thin indigo bar). No second step or phase header, no percentages, no time-remaining text. The top bar holds only the Zetca logo, the step text with its bar, an "Exit" link and the user avatar: no "AI Strategist" tag, no "Discovery Flow" label. No bottom footer bar on any screen.
3. Use plain, friendly words a creator would use. Never use jargon such as: engine, anchor, matrix, semantic, algorithm, foundation, spec, cohesion, index, synergy, flywheel, module, high-intent, saturation, context memory.
4. Text limits: question headline max 8 words; helper text max one line (about 10 words); AI bubble one short sentence (max 12 words); option labels 1–3 words.
5. Type hierarchy: the question headline is the biggest, most obvious thing on screen (32px bold #0F172A). Helper text 15px #64748B. Option labels 15px semibold. Everything else 13px or smaller.
6. Left column contains only three things, top to bottom: the AI bubble, the white question card (40px padding, 32px gap between groups), and the nav row. Nothing else.
7. AI bubble: one line, 14px, indigo spark avatar, light indigo tint background. No title, label or heading on the bubble.
8. Keyboard hints: a tiny muted letter (A, B, C…) in the corner of each option, 11px #94A3B8. No written instructions like "Press 1–9 to select".
9. Nav row: "← Back" text button on the left, solid indigo "Continue →" button on the right, a small muted "or press Enter" next to it. Nothing below the nav row.
10. Right column: one white card titled "Your strategy". It shows only what the user has already answered. Anything not answered yet is a faint grey skeleton bar with no text: no locks, no step numbers, no "upcoming" lists, no scores.
```

---

## Screen 1: Welcome

```
Screen 1, "Welcome". Slim top bar with the Zetca logo and an "Exit" text button only: no step counter or progress bar on this screen. One white card centred on the #EEF2F7 page, max-width 560px, 48px padding. Calm and welcoming, with lots of white space.

Inside the card, top to bottom:
1. A 56px indigo spark icon in a soft indigo-tint rounded square.
2. Headline, 32px bold: "Let's build your content strategy"
3. One line, 16px grey: "A few quick questions, then we'll do the rest."
4. Three short rows, each a small outline icon plus one plain line of 14px text (no badges, no second lines):
   - "7 quick questions"
   - "About 2 minutes"
   - "Bios for YouTube, Instagram, TikTok, LinkedIn & X"
5. A full-width solid indigo button, 52px tall: "Start building →"
6. A small grey text link, centred: "View saved strategies"

Do NOT add: badges or pills above or inside the card (like "Ready to begin" or version numbers), descriptions under the three rows, tags like "Guided" or "Instant", a footer strip, security or encryption notes, keyboard hints, or any jargon.
```

## Screen 2: Brand & platforms

```
Screen 2, "Brand & platforms". Top bar shows "Step 1 of 7" with the progress bar about 14% filled. Follow the quiz screen rules strictly.

LEFT COLUMN, top to bottom:
1. AI bubble (one line): "Hi! Let's start with the basics."
2. White question card containing:
   a. Headline, 32px bold: "What's your channel called?"
   b. A large text input, 52px tall, with "Fit with Ade" typed in it. No character counter, no "valid" badge.
   c. 32px of space, then sub-heading, 18px semibold: "Where do you want to grow?"
   d. Helper, one line, 15px grey: "Pick all that apply."
   e. A 3 × 2 grid of equal platform cards, about 88px tall. Each card has the platform's logo and its name only: YouTube, Instagram, TikTok, LinkedIn, X, Facebook. YouTube and Instagram are selected (indigo border, indigo tint, check badge in the corner). Tiny muted keyboard letters A–F in each card's corner.
3. Nav row: "← Back" (disabled grey) on the left, "Continue →" on the right.

RIGHT COLUMN, the "Your strategy" card:
- Profile row: round initials avatar "FA", "Fit with Ade", and small YouTube and Instagram logos, with a soft indigo glow because they just updated.
- Below that, four faint grey skeleton bars with no text.

Do NOT add: a phase or step header above the card, time estimates, step eyebrow labels, description lines under the platform cards, "platforms active" counters, locked or upcoming module lists, tips, statistics, footers or security badges.
```

## Screen 3: Niche & core topic

```
Screen 3, "Niche & core topic". Top bar shows "Step 2 of 7" with the progress bar about 28% filled. Follow the quiz screen rules strictly. It should feel light and quick: one obvious question, big friendly chips, lots of white space.

LEFT COLUMN, top to bottom:
1. AI bubble (one line): "Nice, two platforms is a great start!"
2. White question card containing:
   a. Headline, 32px bold: "What's your channel about?"
   b. Helper, one line, 15px grey: "Pick a niche, or add your own."
   c. Niche chips: 8 rounded pill chips wrapping over two rows. Each chip is an emoji plus a 1-word label: 💪 Fitness, 💻 Tech, 💰 Finance, 🍳 Cooking, 🎮 Gaming, 📚 Education, ✈️ Travel, 💄 Beauty, then a dashed-outline chip "+ Other". Chips are 44px tall, fully rounded, white with a 1px #E2E8F0 border, 12px gap between chips. "Fitness" is selected: indigo #4F46E5 border, #EEF2FF fill, indigo text, small check icon.
   d. 32px of space, then a smaller sub-heading, 18px semibold: "Narrow it down"
   e. Topic chips, smaller pills (36px tall), same style: Home workouts, Weight loss, Strength, Yoga, Running, Nutrition, "+ Other". "Home workouts" is selected.
3. Nav row: "← Back" on the left, "Continue →" on the right.

RIGHT COLUMN, the "Your strategy" card:
- Profile row: round initials avatar "FA", the name "Fit with Ade", and small YouTube and Instagram logos.
- "Niche" label (12px grey) with one indigo-tint chip "💪 Fitness › Home workouts". Give it a soft indigo glow to show it just updated.
- Below that, three faint grey skeleton bars (no text) for the parts not answered yet.

Do NOT add: a free-text input box, a second progress or phase header, percentages or time remaining, labels like "Mandatory", "Anchor", "Level 2" or "Spec", content pillar lists, upcoming steps or locked modules, scores, tips, statistics, footers or security badges.
```

## Screen 4: Who's watching?

```
Screen 4, "Who's watching?". Top bar shows "Step 3 of 7" (about 43% filled). Follow the quiz screen rules strictly. Same layout and chip/card styles as Screen 3.

LEFT COLUMN, top to bottom:
1. AI bubble (one line): "Home workouts, love it! Who are they for?"
2. White question card containing:
   a. Headline, 32px bold: "Who's watching?"
   b. Helper, one line, 15px grey: "Pick all the ages that fit."
   c. Age chips in one row: 13–17, 18–24, 25–34, 35–44, 45+. Pill chips 44px tall. 25–34 and 35–44 are selected (indigo selected style).
   d. 32px of space, then sub-heading, 18px semibold: "Their skill level"
   e. Three equal cards side by side, each about 120px tall: a large emoji on top, a bold label, and a 3–4 word grey line. 🌱 Beginner "Just getting started", 🌿 Intermediate "Knows the basics", 🌳 Pro "Ready for more". Beginner is selected (indigo border, indigo tint, check badge in the corner).
3. Nav row: "← Back" on the left, "Continue →" on the right.

RIGHT COLUMN, the "Your strategy" card:
- Same profile row and Niche chip as Screen 3.
- New "Audience" row: label (12px grey) and two chips, "25–44" and "🌱 Beginner", with a soft indigo glow because they just updated.
- Two faint grey skeleton bars (no text) for the parts not answered yet.

Do NOT add: extra explanation text, persona illustrations, demographic statistics, a second progress header, percentages, upcoming steps, tips or footers.
```

## Screen 5: Interests & pain points

```
Screen 5, "Interests & pain points". Top bar shows "Step 4 of 7" (about 57% filled). Follow the quiz screen rules strictly. Same layout and styles as the previous steps.

LEFT COLUMN, top to bottom:
1. AI bubble (one line): "Here are some ideas. Tap to add, or type your own."
2. White question card containing:
   a. Headline, 32px bold: "What do they care about?"
   b. Sub-heading, 18px semibold: "Interests"
   c. A tag input box (white, 1px #E2E8F0 border, 12px radius, min 52px tall). Inside it are two selected indigo chips with a small ×: "Healthy eating ×", "Quick workouts ×", then a grey placeholder "Type to add…". Directly below, a row of suggestion chips, white with a dashed border and a "+": "+ Meal prep", "+ Home gym gear", "+ Mental health".
   d. 32px of space, then sub-heading, 18px semibold: "Struggles"
   e. The same tag input pattern, with chips in a soft rose tint (#FFF1F2 fill, rose text): "No time ×", "Where to start? ×". Suggestions below: "+ Low motivation", "+ Gym anxiety", "+ Plateaus".
3. Nav row: "← Back" on the left, "Continue →" on the right.

RIGHT COLUMN, the "Your strategy" card:
- Same profile, Niche and Audience rows as before.
- New "Interests" row with two small indigo chips, and a "Struggles" row with two small rose chips. Soft glow on the new rows.
- One faint grey skeleton bar (no text) for what's left.

Do NOT add: helper paragraphs, a "Suggest more" link, AI labels, counts or limits text, a second progress header, percentages, tips or footers.
```

## Screen 6: What do you create?

```
Screen 6, "What do you create?". Top bar shows "Step 5 of 7" (about 71% filled). Follow the quiz screen rules strictly. Same layout and styles as the previous steps.

LEFT COLUMN, top to bottom:
1. AI bubble (one line): "Beginners love step-by-step videos!"
2. White question card containing:
   a. Headline, 32px bold: "What do you create?"
   b. Helper, one line, 15px grey: "Pick all that apply."
   c. A 4 × 2 grid of equal square-ish cards (about 96px tall). Each card has a 24px outline icon on top and a bold 1–2 word label under it, with no description lines: Tutorials, Reviews, Vlogs, Tips, Fun & challenges, Shorts / Reels, Live, Podcast. Tutorials, Tips and Shorts / Reels are selected (indigo border, indigo tint, check badge in the corner).
   d. 32px of space, then one row: label "How often?" (18px semibold) on the left, and on the right a stepper: a "−" circle button, a big "3", a "+" circle button, then the grey text "per week".
3. Nav row: "← Back" on the left, "Continue →" on the right.

RIGHT COLUMN, the "Your strategy" card:
- Same rows as before (profile, Niche, Audience, Interests, Struggles).
- New "Content" row: three small chips (Tutorials, Tips, Shorts) and a "3× / week" chip. Soft glow on the new row.
- One faint grey skeleton bar (no text) for keywords.

Do NOT add: description lines under the content cards, charts or donut graphs, hints like "consistency beats volume", a second progress header, percentages, tips or footers.
```

## Screen 7: Keywords & goals

```
Screen 7, "Keywords & goals". Top bar shows "Step 6 of 7" (about 86% filled). Follow the quiz screen rules strictly. Same layout and styles as the previous steps.

LEFT COLUMN, top to bottom:
1. AI bubble (one line): "People search for these in your niche."
2. White question card containing:
   a. Headline, 32px bold: "Pick your keywords"
   b. Helper, one line, 15px grey: "Star your main one, then pick up to 3 more."
   c. Keyword chips wrapping over 2–3 rows, pill chips 40px tall, each with a small ☆ star icon on its left:
      - "home workouts for beginners": the MAIN keyword, shown as a solid indigo #4F46E5 chip with white text and a filled ★.
      - "no equipment workout", "15 minute workout", "beginner fitness": selected, indigo border, #EEF2FF fill, indigo text.
      - "full body workout", "workout at home", "fat burning workout": unselected, white with a grey border.
   d. 32px of space, then sub-heading, 18px semibold: "Your main goal"
   e. Four equal cards in one row, each with a big emoji and a 2-word bold label: 📈 Grow audience, 🏆 Build authority, 🛍️ Sell products, 🤝 Build community. "Grow audience" is selected.
3. Nav row: "← Back" on the left, "Continue →" on the right.

RIGHT COLUMN, the "Your strategy" card:
- Same rows as before.
- New "Keywords" row: the main keyword as a solid indigo chip, then three outline chips. And a "Goal" row: "📈 Grow audience". Soft glow on the new rows. No skeleton bars left: the card is complete.

Do NOT add: search volume numbers or dots, a "primary/secondary" legend, SEO explanations, a second progress header, percentages, tips or footers.
```

## Screen 8: Review

```
Screen 8, "Review". Top bar shows "Step 7 of 7" (bar full). Follow the quiz screen rules strictly. This screen is ONE centred column, max-width 720px: no right "Your strategy" card, because this page is the summary.

Top to bottom:
1. AI bubble (one line): "Looking great! Check everything before we build."
2. Headline, 32px bold: "Review your answers"
3. A white card containing six rows separated by thin #E2E8F0 lines. Each row is 56–64px tall: a grey 20px outline icon, a grey 13px label, the answer as chips or short text, and a small pencil "Edit" text button on the far right.
   - Brand: "Fit with Ade" + YouTube and Instagram logos
   - Niche: chip "💪 Fitness › Home workouts"
   - Audience: chips "25–44", "🌱 Beginner"
   - Interests & struggles: 2 indigo chips + 2 rose chips
   - Content: chips "Tutorials", "Tips", "Shorts", "3× / week"
   - Keywords & goal: solid indigo chip "home workouts for beginners", "+3 more", and "📈 Grow audience"
4. A full-width, large solid indigo button, 56px tall: "✨ Generate my strategy", with one small grey line under it: "Takes about 30 seconds".
5. "← Back" text button.

Do NOT add: a right-side panel, scores, completion percentages, extra explanations, tips or footers.
```

## Screen 9: Generating

```
Screen 9, "Generating". Same slim top bar but with no step text and no progress bar. One white card centred on the page, max-width 480px, 48px padding. Calm and minimal.

Inside the card, top to bottom:
1. A soft indigo glowing orb or spark icon, about 64px.
2. Headline, 24px bold: "Building your strategy…"
3. A checklist of four rows, 15px, 16px apart:
   - ✓ (emerald) "Reading your niche"
   - ✓ (emerald) "Picking keywords"
   - small indigo spinner, "Writing descriptions", in bold dark text (this is the current step)
   - ○ (light grey), "Planning your schedule", in grey text
4. A thin indigo progress bar, about 60% full.

Do NOT add: tips, statistics, percentages, extra text, buttons or any second card.
```

## Screen 10: Result + Channel Description builder

```
Screen 10, "Your strategy". This screen is back inside the normal dashboard: dark navy #0B1220 left sidebar (248px) with "Strategist" active as a solid indigo pill, and a white top header with search and avatar. Page background #EEF2F7. The quiz rules about short copy and no invented extras still apply: no jargon, no scores, no made-up statistics.

Top to bottom:
1. Page header row: title, 28px bold, "Fit with Ade"; under it two small chips "💪 Fitness" and "🌱 Beginners 25–44". On the right: "Edit answers" (white secondary button) and "Save strategy" (solid indigo button).

2. HERO CARD (full width, white, 32px padding), titled "Channel descriptions" (20px bold):
   a. Platform tabs as a row of pills with logos: YouTube (active, indigo), Instagram, TikTok, LinkedIn, X.
   b. The description as normal paragraph text, 16px, line height 1.8, dark #0F172A. Each of its five parts has a soft colour highlight behind the text (like a highlighter pen), with a tiny round number badge at its start:
      ① indigo #EEF2FF: "Home workouts for beginners that actually fit your busy schedule, no gym or equipment needed."
      ② emerald #ECFDF5: "Whether you're brand new to fitness or getting back into it, these no equipment workouts meet you where you are."
      ③ sky #F0F9FF: "Expect 15 minute workouts, full-body routines and simple beginner fitness tips you can follow from your living room."
      ④ amber #FFFBEB: "New beginner-friendly workouts every Monday, Wednesday and Friday."
      ⑤ purple #FAF5FF: "Hit subscribe and start your first workout today 💪"
      Keywords inside the text are bold and underlined.
   c. One small legend row of five coloured dots: Hook, Audience, Content, Value, Call to action.
   d. Bottom row: on the left, a thin character bar with "412 / 1,000" and a small marker at the start labelled "First 100 characters show in search ✓". On the right: "↻ Regenerate" (white button) and "Copy" (solid indigo button).

3. Below the hero, a 3-column grid of six equal white cards. Each has a bold title and a short list of 3–4 items:
   Content pillars · Posting schedule (a row of 7 day circles M T W T F S S, with Mon, Wed and Fri filled indigo) · Platforms (YouTube "High" and Instagram "Medium" chips, one short line each) · Content themes · Engagement ideas · Image ideas.

Do NOT add: scores, keyword check panels, analytics, extra banners, or long paragraphs inside the grid cards.
```

---

## Follow-up prompts (states and variants)

**Instagram tab (short bios)**
```
On Screen 10, switch the Channel descriptions card to the Instagram tab. Show a compact phone-style profile preview (avatar, name, bio) with the bio limited to 150 characters: "🏠 Home workouts for beginners | 15-min, no equipment | New routines Mon/Wed/Fri 👇 Start today". Counter "118 / 150". The 5 segments are condensed into one line, colour-coded the same way.
```

**Validation state**
```
On Screen 3, show the state where the user clicks Continue without choosing a niche: nothing is selected, a one-line rose message appears under the niche chips, "Pick a niche to continue", and the niche chips get a soft rose outline. Nothing else changes.
```

**Error state**
```
On Screen 9, show the error state: the checklist stops at "Writing channel descriptions" with a rose ✕, message "Something went wrong while generating. Your answers are saved.", and buttons "Try again" (primary) and "Back to review" (secondary).
```

**Saved strategies**
```
Design the "Saved strategies" view in the dashboard shell: a grid of white cards, each with brand name, niche tag, platform logo chips, created date and a "View" link. Include an empty state with an illustration, "No strategies yet", and a "Build your first strategy" primary button.
```

**Mobile**
```
Create the mobile version (390px wide) of Screen 5. The question card is full width, the option chips wrap, Back/Continue are pinned to the bottom, and the live preview collapses into a bottom sheet handle labelled "Preview your strategy ▲".
```
