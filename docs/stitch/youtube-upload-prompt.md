# YouTube video upload: Google Stitch prompt set

Prompts for designing Zetca's **YouTube upload & schedule** screens in [Google Stitch](https://stitch.withgoogle.com/).

The user connects their YouTube channel, uploads a video (a Short or a long video), fills in every YouTube detail in clear sections, and schedules it. Zetca uploads it to YouTube right away as private, with the chosen publish time, and YouTube makes it public at that moment.

**How to use**
1. Start a new Stitch project in **Web** mode.
2. Paste the **Master prompt** together with **Screen 1**, and let Stitch build it.
3. Paste the **Screen rules** block as its own message.
4. Paste each remaining screen on its own, in order, in the same project.
5. If a screen drifts (invented fields, jargon, extra panels), reply: "Follow the screen rules strictly. Remove anything not listed in the screen prompt."
6. Use the follow-up prompts at the end for the other states and for mobile.
7. Export each screen as HTML and send it over.

**What YouTube lets apps set.** Every field in Screens 3–4 can be set by Zetca through YouTube's API, except the items in the **"Finish in YouTube Studio"** card. YouTube doesn't let apps change those (collaborations, comment settings, automatic chapters, Shorts remixing, age restriction and copyright-check results), so the design shows them as a short list with a link to YouTube Studio rather than as controls.

---

## Master prompt (paste once, with Screen 1)

```
Design desktop web app screens for "Zetca", an AI social media content platform. These screens are where a creator uploads a video to their YouTube channel, fills in all of YouTube's video details, and schedules when it goes public.

Feel: calm, organised, trustworthy. Like YouTube Studio's upload flow, but simpler and friendlier: clear sections, plain words, nothing hidden.

App shell (every screen):
- Left sidebar, 248px wide, dark navy #0B1220. At the top, the Zetca logo: a 36px rounded square with an indigo-to-blue gradient and a white box icon, then "Zetca" in white bold with a small indigo dot, and "CONTENT OS" in tiny letter-spaced grey caps underneath. Then the label "PLATFORM SUITE" in tiny grey caps, then the nav items (white-grey text with thin outline icons): Dashboard, Strategist, Copywriter, Scheduler (active: solid indigo #4F46E5 pill), Designer, Publisher, Analysis, Profile.
- White top header bar, 78px tall: a rounded search field ("Search campaigns, generated drafts, schedules…"), and on the right a mail icon, a bell icon with a small red dot, and the user: an indigo circle avatar with an initial, name "Alex Vance" and a small grey role "Head of Growth".
- Page background #EEF2F7.

Design system (use exactly):
- Colors: primary indigo #4F46E5 (hover #4338CA, tint #EEF2FF); cards pure white with a 1px #E2E8F0 border and 16px corner radius; headings #0B1C30; body text #464555; muted text #777587; success emerald #10B981; warning amber #F59E0B; error red #BA1A1A with tint #FFDAD6; YouTube red #FF0000 used only for the YouTube logo.
- Font: Plus Jakarta Sans everywhere.
- Icons: thin outline icons (Material Symbols / Lucide style).
- Buttons: primary = solid indigo, white text, 12px radius; secondary = white with a light border; text links in indigo.
- Inputs: 44px tall, 12px radius, #F8F9FF fill, indigo focus ring. Character counters sit at the bottom-right of a field in small muted text (e.g. "42 / 100").
- Toggles are indigo when on. Radio options are full-width rows with a title and one short grey line of explanation.
- Soft shadows only, generous white space, no gradients except the logo.

Page layout (Screens 2–4):
- Page title row: "New YouTube video" (28px bold) with, to the right, the connected channel as a pill: round channel avatar, channel name "Alex Vance Studio", and a small "Change" link.
- Two columns. LEFT (about 65%): the form, as a vertical stack of white section cards, each with a bold 17px title and a one-line grey description. RIGHT (about 35%), sticky: a "Your video" card (video preview, file details, status) and below it the publish summary with the main button.
- A slim section navigator at the top of the left column: pill tabs that scroll to each section: Details, Thumbnail, Playlists, Audience, Disclosures, More options, Visibility.
```

---

## Screen rules (paste right after Screen 1 is built)

```
Rules for every screen in this project. Follow them strictly:

1. Show ONLY the sections, fields and labels listed in each screen prompt. Do not invent extra fields, analytics, scores, tips, badges, banners, footers or AI suggestions.
2. Use YouTube's own field names exactly as written in the prompts (Title, Description, Tags, Category, Made for kids, Paid promotion, Altered or synthetic content, Visibility…). Plain, friendly helper text: one short line, max 12 words.
3. No jargon. Never use: engine, pipeline, sync, metadata, payload, asset, workflow, optimise, AI-powered.
4. Required fields have a small red asterisk. Nothing else is marked required.
5. The right column always contains just two cards: "Your video" and the publish summary. Nothing else.
6. Use realistic example content for a fitness creator called "Alex Vance Studio" (e.g. a video titled "15-Minute Full Body Workout — No Equipment").
7. Every screen uses the same app shell: dark navy sidebar with Scheduler active, white top header. Do not add a second header or breadcrumbs.
```

---

## Screen 1: Connect YouTube (no channel connected yet)

```
Screen 1, "Connect YouTube". The app shell with Scheduler active. Page title "New YouTube video" (no channel pill yet).

In the centre of the content area, one white card, max-width 560px, 48px padding, centred:
1. The YouTube logo (red rounded rectangle with white play triangle) in a soft red-tint rounded square, 56px.
2. Headline, 26px bold: "Connect your YouTube channel"
3. One line of grey text: "Upload and schedule videos straight from Zetca."
4. Three short rows, each with a small outline icon and one line of text:
   - "Upload Shorts and long videos"
   - "Set every YouTube detail in one place"
   - "YouTube publishes at the time you choose"
5. A full-width solid indigo button, 52px tall: "Connect YouTube"
6. One small muted line under the button: "You'll sign in with Google. You can disconnect any time in Profile."

Nothing else on the page.
```

---

## Screen 2: Upload the video

```
Screen 2, "Upload". Same shell and page title row, now with the connected channel pill ("Alex Vance Studio", "Change").

Left column: one large white card with a dashed 2px #C7C4D8 border and 16px radius, about 360px tall, centred content:
1. An upload icon in an indigo-tint circle, 64px.
2. "Drag and drop a video file" (20px bold)
3. "or" in muted text, then a secondary button "Select file"
4. One muted line: "MP4, MOV or WebM. Vertical videos under 3 minutes become Shorts."

Right column: the "Your video" card in its empty state: a 16:9 light grey rounded placeholder with a faint film icon, and one muted line "No video yet". Below it the publish summary card, with the primary button "Schedule video" disabled.

No other content.
```

---

## Screen 3: Video details (the main form)

```
Screen 3, "Video details". Same shell and title row with the channel pill. The section navigator pills at the top of the left column (Details active).

RIGHT column (sticky):
- "Your video" card:
  - 16:9 video preview with a play button overlay and the duration "15:42" in a small dark pill.
  - Under it: file name "full-body-workout-final.mp4", "1.2 GB", and a green check with "Uploaded to Zetca".
  - A small grey line: "Format: Long video". (For a vertical video under 3 minutes this would show a red "Short" pill instead.)
- Publish summary card:
  - Rows: "Visibility" → "Public", "Publishes" → "Thu, 23 Oct, 6:00 PM (WAT)", "Notify subscribers" → "On".
  - A full-width solid indigo button "Schedule video".
  - A muted line under it: "Zetca uploads it now as private; YouTube makes it public at this time."

LEFT column, section cards in this order:

1. "Details": "Title, description and tags viewers see"
   - Title * (single line, counter "48 / 100").
   - Description (tall textarea, counter "812 / 5,000"). Above the textarea on the right, a small indigo text button with a spark icon: "Write with Copywriter".
   - Under the description, a light indigo-tint row titled "Chapters": "Add timestamps to split your video into chapters." with an example chip "00:00 Intro", and a small "Add chapter" link.
   - Tags: a chip input with removable pills ("full body workout", "no equipment", "home workout"), counter "86 / 500".
   - Two selects side by side: "Category" ("Howto & Style") and "Video language" ("English").
   - A collapsed row with a chevron: "Translations: add the title and description in other languages".

2. "Thumbnail": "Pick an image that shows what your video is about"
   - A row of three 16:9 tiles: the first is a dashed "Upload thumbnail" tile with an image icon; the other two show frames from the video, one selected with an indigo border and check badge.
   - A muted line: "1280 × 720, JPG or PNG, up to 2 MB. Custom thumbnails need a verified channel."

3. "Playlists": "Add your video to one or more playlists"
   - A list of 4 playlists with checkboxes (e.g. "Home Workouts" checked, "Beginner Series", "Quick Routines" checked, "Nutrition Tips"), each with its video count in muted text.
   - A small indigo text link: "+ New playlist".

4. "Audience": "This is required by YouTube's rules for children's content"
   - Required radio rows: "Yes, it's made for kids" and "No, it's not made for kids" (selected). Each has one grey line of explanation.

5. "Disclosures": "Let viewers know about promotions and AI use"
   - A toggle row: "Paid promotion": "My video has paid promotion like a product placement, sponsorship or endorsement."
   - "Altered or synthetic content" with radio rows "Yes" and "No" (selected) and one grey line: "Realistic content that was made or changed with AI or other tools."

6. "More options": "Captions, licence and other settings"
   - "Captions": a secondary button "Upload captions file" with muted ".srt or .vtt", and a "Caption language" select.
   - "Recording date": a date field.
   - "Licence": radio rows "Standard YouTube Licence" (selected) and "Creative Commons – Attribution".
   - Toggles: "Allow embedding" (on), "Show how many viewers like this video" (on).

7. "Visibility": "Choose when and how your video goes public"
   - Radio rows: "Public", "Unlisted", "Private". "Public" selected.
   - A segmented control: "Publish now" | "Schedule" (Schedule active), then a date field, a time field and a time-zone select ("West Africa Time").
   - A toggle: "Notify subscribers" (on).

8. "Finish in YouTube Studio": a muted grey-tint card (no white background), with a small info icon. One line: "YouTube only lets you change these in YouTube Studio:". Then a simple list with small grey icons: "Automatic chapters", "Collaborations", "Comments and ratings", "Shorts remixing", "Age restriction", "Copyright checks". A secondary button: "Open in YouTube Studio ↗".
```

---

## Screen 4: Scheduled

```
Screen 4, "Scheduled". Same shell. The form is gone; one success layout instead.

Centred white card, max-width 640px, 40px padding:
1. A 56px emerald circle with a white check.
2. Headline, 26px bold: "Your video is scheduled"
3. One grey line: "It goes public on Thu, 23 Oct at 6:00 PM (WAT)."
4. A row with the video thumbnail (16:9, 160px wide) and next to it the title "15-Minute Full Body Workout — No Equipment", the channel name, and a status pill "Scheduled on YouTube" (indigo tint).
5. Two buttons side by side: secondary "View in YouTube Studio ↗" and primary "Upload another video".
6. A small indigo text link: "See it in the calendar".
```

---

## Follow-up prompts (states and mobile)

Paste each on its own after Screens 1–4 exist.

```
Make a variant of Screen 3 while the video is still uploading to Zetca: in the "Your video" card, replace the preview with a grey 16:9 placeholder showing an indigo progress bar at "64%", the line "Uploading… 780 MB of 1.2 GB" and a small "Cancel" text link. The form stays fully editable. The "Schedule video" button is disabled with the muted line "Available when the upload finishes".
```

```
Make a variant of Screen 4 for a failed upload to YouTube: a red-tint circle with a white exclamation mark, headline "We couldn't upload your video", one grey line with the reason "Your YouTube sign-in has expired. Reconnect your channel to try again.", the same video row but with a red "Failed" status pill, and buttons secondary "Edit details" and primary "Reconnect and retry".
```

```
Make a variant of Screen 4 for when today's YouTube upload limit is reached: an amber-tint circle with a clock icon, headline "Scheduled for upload tomorrow", one grey line "YouTube's daily upload limit was reached. Zetca will upload it automatically tomorrow, before your publish time.", the video row with an amber "Waiting to upload" status pill, and one primary button "Go to calendar".
```

```
Make mobile (390px wide) versions of Screens 2 and 3. The sidebar becomes a top bar with the Zetca logo and a menu icon. The two columns stack: "Your video" card first, then the section cards, with the section navigator pills scrolling horizontally. The publish summary becomes a sticky bottom bar with the "Schedule video" button and the publish time in one line above it.
```
