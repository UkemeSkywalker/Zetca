# Strategist page: Google Stitch prompt set

Prompts for designing the new **AI Strategy Generator** experience in [Google Stitch](https://stitch.withgoogle.com/).

**How to use**
1. Start a new Stitch project in **Web** mode.
2. Paste the **Master prompt** together with **Screen 1**.
3. Generate the remaining screens one at a time, in order, in the same project so Stitch keeps the style consistent. Each screen prompt refers back to the earlier ones.
4. Budget 3–5 refinement rounds per screen. Use the follow-up prompts at the end for states and mobile.

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

## Screen 1: Welcome

```
Screen 1, "Welcome" (full width, no live preview panel yet).
Purpose: invite the user to start building their content strategy and set expectations.
Content:
- Centered white card, max-width 640px, on the #EEF2F7 background.
- Indigo spark icon inside a soft indigo-tinted circle.
- Headline: "Let's build your content strategy"
- Subtext: "Answer a few quick questions about your brand and audience. We'll craft a multi-platform strategy and SEO-ready channel descriptions."
- Three small feature rows with outline icons: "7 quick steps", "About 2 minutes", "Descriptions for YouTube, Instagram, TikTok, LinkedIn & X".
- Primary button: "Start building →". Below it a text link "View saved strategies (4)".
Style: calm, welcoming, lots of whitespace.
```

## Screen 2: Brand & platforms

```
Screen 2, "Brand & platforms" (Step 1 of 7), using the wizard layout from the master prompt.
Purpose: capture the brand name and which platforms to create a strategy for.
Left question card:
- Eyebrow label "STEP 1 · BRAND" in small indigo caps.
- Question: "What's your brand or channel called?"
- Large text input with placeholder "e.g. Fit with Ade".
- Second question: "Where do you want to grow?" with helper text "Pick all that apply".
- Grid of 6 selectable platform cards (3 × 2), each with platform logo, name and a tiny line: YouTube "Long-form & Shorts", Instagram "Reels & carousels", TikTok "Short video", LinkedIn "Professional audience", X "Real-time threads", Facebook "Communities". Show YouTube and Instagram selected.
Right live preview: a profile card with a placeholder avatar circle, the brand name "Fit with Ade", and small platform logo chips for the selected platforms. Below it, greyed placeholder rows: "Niche", "Audience", "Content mix", "Keywords".
```

## Screen 3: Niche & core topic

```
Screen 3, "Niche & core topic" (Step 2 of 7), same wizard layout.
Purpose: identify the creator's niche and specific core topic in a fun, low-effort way.
Left question card:
- AI bubble: "Nice! Two platforms is a great start."
- Question: "What's your channel all about?"
- Large text input with placeholder "Describe it in a few words…"
- "Popular niches" row of pill chips with emoji: 💪 Fitness, 💻 Tech, 💰 Personal finance, 🍳 Cooking, 🎮 Gaming, 📚 Education, ✈️ Travel, 💄 Beauty, + "Something else". Fitness is selected.
- When a niche is selected, a second row slides in: "Narrow it down: what's your core topic?" with sub-chips: Home workouts, Weight loss, Strength training, Yoga, Running, Nutrition. "Home workouts" selected.
Right live preview: persona card now shows a niche tag "Fitness › Home workouts" with a small indigo highlight animation.
```

## Screen 4: Who's watching?

```
Screen 4, "Who's watching?" (Step 3 of 7), same wizard layout.
Purpose: define the target audience's age group and skill level.
Left question card:
- AI bubble: "Home workouts: love it. Who are you making them for?"
- Question 1: "How old is your audience?" with a row of 5 selectable cards: 13–17, 18–24, 25–34, 35–44, 45+ (multi-select; 25–34 and 35–44 selected).
- Question 2: "What's their skill level?" with 3 larger cards with simple friendly illustrations: 🌱 Beginner "Just getting started", 🌿 Intermediate "Knows the basics", 🌳 Pro "Advanced & experienced". Beginner selected.
Right live preview: an audience persona card appears: avatar illustration, "Busy beginners, 25–44", skill badge "Beginner".
```

## Screen 5: Interests & pain points

```
Screen 5, "Interests & pain points" (Step 4 of 7), same wizard layout.
Purpose: capture audience interests and pain points with AI suggestions plus free typing.
Left question card:
- AI bubble: "Here are some ideas based on your niche. Tap to add, or type your own."
- Question 1: "What are they interested in?" A "pick or type" chip input field: selected chips inside the field (Healthy eating ×, Quick workouts ×), a text cursor to type more, and below it suggested chips with a "+" icon: Meal prep, Mental health, Home gym gear, Weight loss.
- Question 2: "What problems do they struggle with?" Same chip input pattern with rose-tinted chips: No time to work out ×, Don't know where to start ×; suggestions: + Lack of motivation, + Gym anxiety, + Plateaus, + Sore joints.
- Small sparkle link: "✨ Suggest more".
Right live preview: the persona card gains "Interests" and "Pain points" chip groups.
```

## Screen 6: What do you create?

```
Screen 6, "What do you create?" (Step 5 of 7), same wizard layout.
Purpose: identify the types of content the creator produces and how often they post.
Left question card:
- AI bubble: "Beginners love step-by-step content."
- Question: "What kind of content do you make?" with helper "Pick all that apply".
- Grid of 8 selectable icon cards (4 × 2), each with an outline icon and a one-line description: Tutorials "Step-by-step how-tos", Reviews "Gear & product reviews", Vlogs "Behind the scenes", Tips "Quick tips & hacks", Entertainment "Challenges & fun", Shorts / Reels "Under 60 seconds", Live "Streams & Q&As", Podcast "Long conversations". Tutorials, Tips and Shorts/Reels selected.
- Second question: "How often will you post?" A stepper control: [ − ] 3 [ + ] "videos per week", with the friendly hint "Consistency beats volume".
Right live preview: a "Content mix" donut chart (Tutorials / Tips / Shorts in indigo, emerald and purple) and "3× per week" cadence badge.
```

## Screen 7: Keywords & goals

```
Screen 7, "Keywords & goals" (Step 6 of 7), same wizard layout.
Purpose: choose the primary and secondary SEO keywords and the main goal.
Left question card:
- AI bubble: "These are terms people actually search for in your niche."
- Question 1: "Pick your keywords". Helper: "Star ⭐ one primary keyword, then choose up to 3 secondary ones." A wrap of keyword chips: "home workouts for beginners" (starred, solid indigo = PRIMARY label), "no equipment workout" (selected, indigo outline = Secondary), "15 minute workout" (secondary), "beginner fitness" (secondary), "full body workout", "workout at home", "fat burning workout". Small search-volume dots (●●●) on each chip.
- Question 2: "What's your main goal?" 4 cards: 📈 Grow my audience, 🏆 Build authority, 🛍️ Sell a product, 🤝 Build a community. "Grow my audience" selected.
Right live preview: a "Keywords" section showing the primary keyword in a solid indigo chip and secondary keywords in outline chips; a goal badge.
```

## Screen 8: Review

```
Screen 8, "Review your answers" (Step 7 of 7), same wizard layout but the right panel becomes the full persona summary.
Purpose: let the user check and edit everything before generating.
Left: heading "Looking good! Review your answers". A stack of compact white summary cards, each with an outline icon, label, the answer, and a pencil "Edit" button on the right: Brand & platforms (Fit with Ade · YouTube, Instagram); Niche (Fitness › Home workouts); Audience (25–44 · Beginner); Interests & pain points (chips); Content (Tutorials, Tips, Shorts · 3×/week); Keywords & goal (primary keyword chip + 3 secondary · Grow my audience).
Bottom: large primary button "✨ Generate my strategy", and the small note "Takes about 30 seconds".
```

## Screen 9: Generating

```
Screen 9, "Generating" (full width, centred, no progress bar).
Purpose: keep the user engaged while the AI works.
Content: centered card with an animated indigo spark/orb, headline "Crafting your strategy…", and a vertical checklist that ticks off one by one: ✓ Reading your niche, ✓ Picking the best keywords, ◌ Writing channel descriptions (in progress, indigo spinner), ○ Planning your posting schedule. A thin indigo progress bar at the bottom. A rotating tip in muted text: "Tip: the first 100 characters of a YouTube description show up in search."
```

## Screen 10: Result + Channel Description builder

```
Screen 10, "Your strategy" (back inside the normal dashboard shell: dark navy #0B1220 left sidebar with "Strategist" active in solid indigo, white top header with search and avatar).
Purpose: present the generated strategy, with the channel description builder as the hero.
Top: page title "Fit with Ade · Content strategy", badges "Fitness", "Beginners 25–44", and buttons "Edit answers" (secondary) and "Save strategy" (primary).

Hero card, "Channel descriptions":
- Platform tabs with logos: YouTube (active), Instagram, TikTok, LinkedIn, X.
- The generated YouTube description shown as flowing text, split into 5 colour-coded highlighted segments with numbered labels:
  1 Hook & primary keyword (indigo highlight): "Home workouts for beginners that actually fit your busy schedule, no gym or equipment needed."
  2 Audience & secondary keyword (emerald): "Whether you're brand new to fitness or getting back into it, these no equipment workouts meet you where you are."
  3 Content (sky): "Expect 15 minute workouts, full-body routines and simple beginner fitness tips you can follow from your living room…"
  4 Value & upload (amber): "New beginner-friendly workouts every Monday, Wednesday and Friday."
  5 Call to action (purple): "Hit subscribe and start your first workout today 💪"
- A legend row with the five colour dots and names.
- Keyword chips inside the text are underlined and highlighted.
- Under the text: a character counter bar "412 / 1,000"; a vertical marker at 100 characters labelled "Shown in search results ✓"; a "Keyword check: primary in first 100 chars ✓ · no stuffing ✓" row.
- Actions: "Copy", "Regenerate" (whole), and a small ↻ regenerate icon on hover of each segment.

Below the hero, a 3-column grid of white cards: Content pillars, Posting schedule (7-day mini grid M–S with 3 active days), Platform recommendations (each with priority badge High/Medium and a one-line rationale), Content themes, Engagement tactics, Visual prompts.
```

---

## Follow-up prompts (states and variants)

**Instagram tab (short bios)**
```
On Screen 10, switch the Channel descriptions card to the Instagram tab. Show a compact phone-style profile preview (avatar, name, bio) with the bio limited to 150 characters: "🏠 Home workouts for beginners | 15-min, no equipment | New routines Mon/Wed/Fri 👇 Start today". Counter "118 / 150". The 5 segments are condensed into one line, colour-coded the same way.
```

**Validation state**
```
On Screen 3, show the state where the user clicks Continue without choosing a niche: the input gets a soft rose border, a helper message "Pick a niche or type your own to continue", and the Continue button stays enabled but shakes gently.
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
