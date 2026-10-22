# Prompt: Zetca home hero with curved reels

Adapted from the "Reelmark" hero prompt. This is the spec for **only the top hero section** of the home page (https://zetca.pro). Everything below it (workflow banner, How it works, Features, Platforms, highlights, pricing, FAQ, footer) stays as it is.

Build it in the site: a React client component in Next.js, styled with Tailwind plus inline styles for the per-frame geometry, and vanilla browser APIs (no animation library). The look keeps **Zetca's colours and logo**:
- a light page `#F7F9FC` with a soft indigo glow
- indigo accents `#4F46E5`
- an indigo-tint badge `#EEF2FF`
- a big bold `#0B1C30` headline
- an arched row of tall cards: video reels across creators, products, real estate and sport, plus text posts
- hand-drawn indigo notes and arrows

## Frame

- **Navbar:** the site's existing sticky navbar sits above the hero. Its logo is the Zetca box mark plus "Zetca • CONTENT OS", and its links are Tools · How it works · Channels · Pricing, with Sign in and Get started. It is not redrawn in the hero.
- **Frame:** the hero is one **1440×1000** frame, centred, scaled by `--u = min(100vw / 1440, (100vh − 80px) / 1000)`. Every element is placed in frame units.
- **Card row:** it runs the full width of the screen, not just the frame, so wide screens have no empty sides.

## Type

- **Headline:** Plus Jakarta Sans 800 (the site's heading font), 88u on a 92u line, tracking −0.035em (−0.022em on line 2), colour `#0B1C30`.
- **UI:** Plus Jakarta Sans 400/500. The subline is `#464555`.
- **Notes:** **Caveat 600**, indigo `#4F46E5`.

## Layout (1440×1000, below the navbar)

- **Badge:** an indigo-tint pill centred at top 35. Its text is "Your AI social media team", Plus Jakarta Sans 600 16u in indigo, with a small indigo dot before it.
- **Headline:** centred, top 96, in two lines: **"Never run out of / things to post"**, with line 2 in indigo.
- **Subline:** centred, top 314, 20.8u on a 32u line, max 3 lines: "Zetca plans your strategy, writes posts for every platform, schedules them and publishes for you. Design and video tools are coming soon."
- **Notes:**
  - a "//" doodle at about (263, 297)
  - "Write once, / post everywhere", rotated 12°, at about (1180, 230), with a long curving arrow that starts **below** the words (never crossing them) and curls down to the cards
  - "Free plan" rotated −10° at about (480, 840), with a small arrow pointing to the button
  - the doodle strokes draw themselves in
- **Card row: a curved video carousel.** Ten tall cards scroll continuously **right → left** at about 50u per second, looping seamlessly.
  - **Dragging:** the row can be dragged with a pointer or touch. It follows 1:1, coasts with momentum after release (velocity decays about 95% per second), then the slow drift carries on. The cursor is grab / grabbing.
  - **Curve:** each card's shape comes from its x position relative to the centre, like the inside of a cylinder.
    - Normalised distance d = |x − 720| / 706.
    - Width = (170 + 48·d²)u. Cards sit on an even 196u pitch, and each centre is pushed outward: x = 720 + t·(1 + 0.083·(t/706)²), where t is the unpushed offset from the centre.
    - Each vertical edge's height = (280 + 92·q^2.6)u, where q is that edge's own normalised distance.
    - The vertical centre sits at (607 − 12·d²)u.
    - Beyond the frame (wide screens), d is capped at 1.2.
  - **Result:** centre cards are upright 170×280 rectangles; cards near the edges grow to about 370u tall, outer edge taller than the inner edge.
  - **Drawing:** each card is a rounded quad (`clip-path: path()`, 15u corners) recomputed every frame. No drop shadow. A small frosted round play icon sits at each card's bottom-left.
- **Button:** an indigo "Start planning posts" pill (230×58) inside a dashed indigo ring (248×74), centred at top 821, linking to /signup. Under it, a muted line: "No card needed."

## Card media (light, from Pexels)

- **Mix:** the cards show the range of content Zetca helps with, never several of the same kind side by side:
  - creators: a ring-light setup (9384669), recording at a laptop (13929655)
  - products: showing make-up (7291758), a serum dropper bottle (6801666), coffee being poured (6963730)
  - real estate: an agent showing a house (8814190), a realtor opening the door to a family (7646491)
  - sport: a woman working out (6390400), a basketball portrait (8337359)
  - text posts, drawn in the page (no download): "LinkedIn post · 5 hooks that stop the scroll", "Just listed · 3-bed family home with a garden view", "Day 12 of 30 · No-gym full body workout in 15 minutes", on Zetca gradients, with lines that appear one after another on a loop (off with reduced motion). Text cards have no play icon.
- **Source:** the video clips are free Pexels stock (free for commercial use under the Pexels licence, no attribution required). They load straight from Pexels' CDN (`videos.pexels.com`, which sends `access-control-allow-origin: *` and a one-year cache). Later these move to Zetca's own AI-generated clips.
- **Files:** each clip is the 360×640 SD file (≈0.2–0.9 MB, ≈5 MB for all nine), with a poster from `images.pexels.com` at `w=360` (≈8–50 KB). The row cycles through the 12 reels. Cards that share a clip share one `src`, so each file downloads once.
- **Keeping it light:**
  - Posters show first. Videos start only after the page has loaded and the browser is idle.
  - Only cards on screen play; others pause. Everything pauses when the hero scrolls away or the tab is hidden.
  - With **reduced motion**, **Save-Data** or a **2G/3G connection**: posters only.
  - On **phones**, only the first four video clips play.
  - Each video fades in when its first frame is ready.
- **Fit:** inside each clipped card, the video covers the card (`object-fit: cover`). Text posts scale with the card (container query units).

## Motion (UI)

- **Entrance:** a one-time Web Animations sequence:
  1. The badge pops.
  2. Each headline line rises out of a blur.
  3. The subline appears.
  4. The card row rises in.
  5. The button scales in.
  6. The doodle strokes draw.
  7. The notes fade in.
- **Carousel clock:** time-based (requestAnimationFrame with real elapsed time), so the speed is the same at any frame rate. It pauses while the hero is off screen.
- **Reduced motion:** no entrance, no drift, no video (posters only). Dragging still works.

## Phones (≤ 820px)

- **Copy:** stacked and centred: the badge, the headline (clamp 38–56px) and the subline.
- **Cards:** the same drifting, draggable curved carousel, laid out on a 640-unit-wide frame scaled to the screen, in a 250px-tall band.
- **Below:** the button, "No card needed" and the "Free plan" note. The "Write once" note and "//" doodle are hidden.

## Honesty (Google's app review checks the home page)

- **No invented claims:** no user counts, customer logos, ratings or testimonials.
- **Copy:** all copy describes what Zetca does today. Unbuilt tools are "coming soon".
- **No real brand logos** in the cards (stock clips of creators only).

## Acceptance check (1440×1000 hero)

- The headline sits centred above the arched card row.
- The row keeps drifting left and can be flung by dragging.
- Cards play different clips, and edge cards are taller and lean like the inside of a cylinder.
- The page still loads fast: posters first, with videos only after load, on screen, and on a good connection.
- Everything below the hero is unchanged.
