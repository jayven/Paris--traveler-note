# Copy into Codex as your first task

You are taking over an existing deployed mobile-first PWA called **Paris Pocket / 巴黎手帐**. Its live address is https://stirring-cheesecake-37698e.netlify.app/ . You have the complete source code in this repository.

Read `AGENTS.md` and `PRODUCT_BRIEF.md`, then inspect the existing application (`index.html`, `app.js`, `trip-data.js`, `styles.css`, `sw.js`, `manifest.webmanifest`). Don't rebuild from scratch and don't create a new Netlify site.

My goal: turn this prototype into an iPhone-ready, maintainable Paris travel planner that we can keep updating before and during our December 7–14, 2026 Paris trip. Daily itineraries, accurate map pins, booking status, personal notes and offline travel info should feel like a real app. Preserve all current itinerary information and user localStorage data.

Please:
1. Audit current architecture, iPhone usability, map accuracy, PWA behavior, and user-data risks.
2. Briefly propose prioritized improvements, then actually implement a small, valuable first slice: editing an existing itinerary activity's time and description with changes persisting across reloads and participating in backup/restore, without breaking existing bookings and notes.
3. Add basic tests or a reproducible verification routine, run it, and report results.
4. Improve project README with local run instructions and a safe path to GitHub -> the existing Netlify site. Do not deploy to production without asking me.
5. Explain what you changed, how I can test on iPhone, and what should be implemented next.

Design preference: elegant and minimal Paris travel journal, but usability above aesthetics. All app text primarily Chinese; write maintainable code and avoid unnecessary dependencies/framework rewrites.
