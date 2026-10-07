# My Planner

A simple weekly routine and daily check-in planner for a teenager. It's a static web page with no install, accounts or server.

## Using it

Live at **https://mcw4.github.io/planner/** (GitHub Pages, served from the repo root of the default branch). You can also open `index.html` directly in a browser.

On a phone, open the link and use **Add to Home Screen** so it opens like an app.

- **My Week**: set up the routine that repeats every week in 30-minute slots. Tap an empty slot to add something, or tap a block to edit it. Use **Copy a day…** to copy Monday onto Tuesday–Friday. Put the school timetable in the notes of the School block. **Load school-day example** fills Mon–Fri with a starter routine.
- **Today**: the daily page shows today's focus, priorities, do later, everything else, habits & self care, brain dump, productivity, mood and energy. The daily schedule comes from that weekday's routine. You can tick items off, skip an item for today only, or add one-offs.
- **Summary**: a weekly recap with average mood, check-ins done, habits kept and things ticked off. It also shows mood, productivity and energy for each day, and a habit grid with streaks. Use the arrows to look back at earlier weeks.
- **Settings**: pick a theme (Pastel, Rainbow, Emo, Sporty or Cats), install the app, set reminders, change the hours shown and the habits list, and back up or restore your data.

## Installing and reminders

The planner is an installable web app (PWA): add it to the home screen from Settings → *Put it on your phone*. Once installed it opens full screen and works offline.

A static site can't send push notifications on its own when it's closed. Reminders work in two ways instead:

- **Calendar reminders (main option).** Settings → Reminders → *Add reminders to my calendar* downloads an `.ics` file. It has a repeating morning "Plan my day" and evening "How did today go?" event, plus, optionally, an alert 5 minutes before each activity in the weekly routine. The phone's calendar app delivers the alerts, so they work when the planner is closed. Download it again after changing the reminders or the routine.
  - iPhone: open the file and tap *Add All*. Delete the old *My Planner* events first when re-adding.
  - Android / Google Calendar: import at calendar.google.com → Settings → Import & export. Re-importing updates the same events.
- **In-app notifications.** Pop-ups at the reminder times while the planner is open, even in a background tab. Handy on a laptop. On iPhone this needs the app to be installed first.

The installed app's icon also shows a badge when today's check-in is still waiting, where the device supports it.

Data is saved in the browser (`localStorage`), so it stays on one device. Use **Download backup** to keep a copy or move it to another device.

## Themes

Each theme is a block of CSS variables in `styles.css` under `[data-theme="…"]`: colours, fonts, the stripe at the top, background pattern and title emoji. The rating icons and mood faces are in the `THEMES` list in `app.js`. To add a theme, copy one of the blocks and add a matching entry there.
