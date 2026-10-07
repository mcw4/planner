(() => {
  "use strict";

  // ---------- Constants ----------
  const STORAGE_KEY = "planner.v1";
  const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const DAY_NAMES = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
  const CATEGORIES = {
    routine: "Routine",
    school: "School",
    travel: "Travel",
    homework: "Homework / study",
    activity: "Activity / sport",
    family: "Family / friends",
    free: "Free time",
  };
  const LISTS = { priorities: 3, later: 3, other: 5 };
  // Colours, fonts and decorations live in styles.css under [data-theme="…"];
  // this holds the bits that are content rather than style.
  // `star` is the productivity icon: one emoji, or five (one per level).
  // `dark` marks themes that are dark already, so the dark-mode switch leaves them alone.
  const THEMES = {
    pastel: { group: "Classic", name: "Pastel", meta: "#dcc6f2", star: "⭐", moods: ["😢", "😕", "😐", "🙂", "😄"] },
    rainbow: { group: "Classic", name: "Rainbow", meta: "#ff9f1a", star: "🌟", moods: ["😢", "😕", "😐", "🙂", "🥳"] },
    minimal: { group: "Classic", name: "Minimal", meta: "#ffffff", star: "⭐", moods: ["😞", "🙁", "😐", "🙂", "😄"] },
    cottagecore: { group: "Aesthetic", name: "Cottagecore", meta: "#f6dfe0", star: "🌸", moods: ["🥀", "😔", "🌿", "🌼", "🌻"] },
    y2k: { group: "Aesthetic", name: "Y2K", meta: "#ffd6f0", star: "💿", moods: ["😭", "🙄", "😐", "😊", "💅"] },
    academia: { group: "Aesthetic", name: "Dark Academia", meta: "#7b2d26", star: "🕯️", moods: ["😩", "😔", "😐", "🙂", "😌"] },
    kawaii: { group: "Aesthetic", name: "Kawaii", meta: "#ffd9ea", star: "🍓", moods: ["😢", "🥺", "😶", "😊", "🥰"] },
    emo: { group: "Aesthetic", name: "Emo", meta: "#0d0d10", star: "💜", moods: ["💀", "😒", "😶", "🙂", "🤘"], dark: true },
    grunge: { group: "Aesthetic", name: "Grunge", meta: "#23241d", star: "⚡", moods: ["😵", "😒", "😐", "🙂", "🤘"], dark: true },
    ocean: { group: "Nature", name: "Ocean", meta: "#bfeaf2", star: "🐚", moods: ["🌧️", "🌥️", "⛅", "🌤️", "🐬"] },
    space: { group: "Nature", name: "Space", meta: "#0b0a1f", star: "⭐", moods: ["🌑", "🌒", "🌓", "🌔", "🌕"], dark: true },
    sunset: { group: "Nature", name: "Sunset", meta: "#ff9671", star: "☀️", moods: ["🌧️", "😕", "😐", "🙂", "😎"] },
    forest: { group: "Nature", name: "Forest", meta: "#2f6b3a", star: ["🌱", "🌿", "☘️", "🪴", "🌳"], moods: ["🥀", "🍂", "🍃", "🌿", "🌻"] },
    sporty: { group: "Interests", name: "Sporty", meta: "#13315c", star: "🔥", moods: ["😫", "😕", "😐", "😀", "💪"] },
    music: { group: "Interests", name: "Music", meta: "#111114", star: "💚", moods: ["😖", "😕", "😐", "🙂", "🤩"], dark: true },
    gaming: { group: "Interests", name: "Gaming", meta: "#1d2b53", star: "❤️", moods: ["💀", "😵", "😐", "😀", "🏆"], dark: true },
    art: { group: "Interests", name: "Art", meta: "#fffdf8", star: "🖌️", moods: ["😢", "😕", "😐", "🙂", "🤩"] },
    cats: { group: "Animals", name: "Cats", meta: "#ffe9ee", star: "🐾", moods: ["😿", "😾", "🐱", "😺", "😸"] },
    dogs: { group: "Animals", name: "Dogs", meta: "#d64545", star: "🦴", moods: ["😢", "😕", "😐", "🙂", "🐶"] },
    horses: { group: "Animals", name: "Horses", meta: "#9a5b2c", star: "🐎", moods: ["😢", "😕", "😐", "🙂", "🐴"] },
    frogs: { group: "Animals", name: "Frogs", meta: "#7cc35f", star: "🪷", moods: ["😢", "😕", "😐", "🙂", "🐸"] },
  };
  const starIcon = (t, i) => (Array.isArray(t.star) ? t.star[i] : t.star);

  const defaultState = () => ({
    settings: {
      dayStart: "06:00",
      dayEnd: "22:30",
      habits: ["Drink water", "Move my body", "Read for 20 minutes", "Screen-free hour before bed"],
      theme: "pastel",
      dark: "off",
      reminders: {
        morning: { on: true, time: "07:00" },
        evening: { on: true, time: "20:30" },
        days: [...DAYS],
        routine: false,
        notify: false,
      },
    },
    routine: Object.fromEntries(DAYS.map((d) => [d, []])),
    days: {},
  });

  // ---------- Storage ----------
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const base = defaultState();
      return {
        settings: {
          ...base.settings,
          ...parsed.settings,
          reminders: { ...base.settings.reminders, ...parsed.settings?.reminders },
        },
        routine: { ...base.routine, ...parsed.routine },
        days: parsed.days || {},
      };
    } catch {
      return defaultState();
    }
  }

  let state = load();
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
    }, 250);
  }
  window.addEventListener("beforeunload", () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  });

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const uid = () => Math.random().toString(36).slice(2, 10);
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const fromMin = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  function pretty(t) {
    const m = toMin(t);
    const h = Math.floor(m / 60) % 24;
    const suffix = h < 12 ? "am" : "pm";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m % 60).padStart(2, "0")}${suffix}`;
  }
  const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const weekdayKey = (d) => DAYS[(d.getDay() + 6) % 7];
  const sortByStart = (a, b) => toMin(a.start) - toMin(b.start);

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) if (c != null) node.append(c);
    return node;
  }

  // ---------- Tabs ----------
  function showView(name) {
    $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === name));
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
    if (name === "today") renderToday();
    if (name === "week") renderWeek();
    if (name === "settings") renderSettings();
    if (name === "summary") renderSummary();
  }
  $$(".tab").forEach((t) => t.addEventListener("click", () => showView(t.dataset.view)));

  // =========================================================
  // TODAY
  // =========================================================
  let currentDate = new Date();

  function getDay(key) {
    if (!state.days[key]) {
      state.days[key] = {
        focus: "",
        lists: Object.fromEntries(Object.entries(LISTS).map(([k, n]) => [k, Array.from({ length: n }, () => ({ text: "", done: false }))])),
        rewards: { priorities: "", later: "", other: "" },
        habits: {},
        done: {},     // routine block id -> true
        skipped: [],  // routine block ids hidden for this day only
        extra: [],    // one-off blocks for this day only
        brainDump: "",
        productivity: 0,
        mood: 0,
        energy: 0,
      };
    }
    return state.days[key];
  }

  function renderToday() {
    const key = dateKey(currentDate);
    const day = getDay(key);
    const isToday = key === dateKey(new Date());

    $("#date-label").textContent = currentDate.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
    $("#go-today").hidden = isToday;

    // Focus + brain dump
    $("#focus").value = day.focus;
    $("#brain-dump").value = day.brainDump;

    // To-do lists
    $$(".list-card").forEach((card) => {
      const name = card.dataset.list;
      const ul = $(".todo", card);
      ul.replaceChildren(...day.lists[name].map((item) => {
        const li = el("li", { class: item.done ? "done" : "" });
        const cb = el("input", { type: "checkbox", class: "tick", "aria-label": "Done" });
        cb.checked = item.done;
        cb.addEventListener("change", () => { item.done = cb.checked; li.classList.toggle("done", item.done); changed(); });
        const input = el("input", { type: "text", value: item.text });
        input.addEventListener("input", () => { item.text = input.value; changed(); });
        li.append(cb, input);
        return li;
      }));
      const reward = $(".reward input", card);
      reward.value = day.rewards[name] || "";
      reward.oninput = () => { day.rewards[name] = reward.value; changed(); };
    });

    // Habits
    const habits = state.settings.habits;
    $("#habit-list").replaceChildren(...(habits.length ? habits.map((h) => {
      const cb = el("input", { type: "checkbox", class: "tick", "aria-label": h });
      cb.checked = !!day.habits[h];
      cb.addEventListener("change", () => { day.habits[h] = cb.checked; changed(); });
      return el("li", {}, el("span", { text: h }), cb);
    }) : [el("li", { class: "empty", text: "Add habits in Settings" })]));

    renderSchedule(day, isToday);
    renderRatings(day);
    renderProgress(day);
  }

  function scheduleFor(day, date) {
    const routine = (state.routine[weekdayKey(date)] || [])
      .filter((b) => !day.skipped.includes(b.id))
      .map((b) => ({ ...b, oneoff: false }));
    const extra = day.extra.map((b) => ({ ...b, oneoff: true }));
    return [...routine, ...extra].sort(sortByStart);
  }

  function renderSchedule(day, isToday) {
    const items = scheduleFor(day, currentDate);
    const wk = weekdayKey(currentDate);
    $("#schedule-source").textContent = `From your ${DAY_NAMES[wk]} routine`;
    $("#reset-schedule").hidden = day.skipped.length === 0;

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const ul = $("#schedule-list");
    if (!items.length) {
      ul.replaceChildren(el("li", { class: "gap" }, el("span"), el("span", { text: "Nothing planned yet — build your routine in My Week." }), el("span")));
      return;
    }

    const rows = [];
    let lastEnd = null;
    for (const b of items) {
      if (lastEnd != null && toMin(b.start) - lastEnd >= 30) {
        rows.push(el("li", { class: "gap" },
          el("span", { class: "s-time", text: `${pretty(fromMin(lastEnd))}` }),
          el("span", { text: "free time" }), el("span")));
      }
      lastEnd = Math.max(lastEnd ?? 0, toMin(b.end));

      const done = !!day.done[b.id];
      const isNow = isToday && nowMin >= toMin(b.start) && nowMin < toMin(b.end);
      const li = el("li", { class: `cat-${b.cat}${done ? " done" : ""}${isNow ? " now" : ""}` });
      const cb = el("input", { type: "checkbox", class: "tick", "aria-label": `Done: ${b.title}` });
      cb.checked = done;
      cb.addEventListener("change", () => {
        if (cb.checked) day.done[b.id] = true; else delete day.done[b.id];
        li.classList.toggle("done", cb.checked);
        changed();
      });
      const remove = el("button", {
        class: "s-del", title: b.oneoff ? "Delete" : "Skip today", "aria-label": b.oneoff ? "Delete" : "Skip today",
        text: "✕",
        onclick: () => {
          if (b.oneoff) day.extra = day.extra.filter((x) => x.id !== b.id);
          else day.skipped.push(b.id);
          delete day.done[b.id];
          changed();
          renderToday();
        },
      });
      const titleBox = el("div", {},
        el("div", { class: "s-title" }, b.title, b.oneoff ? el("span", { class: "s-oneoff", text: "today only" }) : null),
        b.notes ? el("div", { class: "s-notes", text: b.notes }) : null);
      if (b.oneoff) {
        titleBox.style.cursor = "pointer";
        titleBox.addEventListener("click", () => openBlockDialog({ mode: "oneoff", block: day.extra.find((x) => x.id === b.id) }));
      }
      li.append(el("span", { class: "s-time", text: `${pretty(b.start)} – ${pretty(b.end)}` }), titleBox, el("span", { class: "s-actions" }, cb, remove));
      rows.push(li);
    }
    ul.replaceChildren(...rows);
  }

  function renderRatings(day) {
    const rating = (container, field, count, render) => {
      container.replaceChildren(...Array.from({ length: count }, (_, i) => {
        const value = i + 1;
        const on = field === "mood" ? day[field] === value : day[field] >= value;
        const btn = el("button", { type: "button", class: on ? "on" : "", "aria-label": `${field} ${value} of ${count}`, "aria-pressed": String(on) });
        btn.textContent = render(i);
        btn.addEventListener("click", () => {
          day[field] = day[field] === value ? 0 : value;
          changed();
          renderRatings(day);
          renderProgress(day);
        });
        return btn;
      }));
    };
    const t = currentTheme();
    rating($("#productivity"), "productivity", 5, (i) => starIcon(t, i));
    rating($("#mood"), "mood", 5, (i) => t.moods[i]);
    rating($("#energy"), "energy", 5, () => "");
  }

  function checkinSteps(day) {
    return [
      ["focus", !!day.focus.trim()],
      ["priorities", day.lists.priorities.some((p) => p.text.trim())],
      ["habits", Object.values(day.habits).some(Boolean)],
      ["productivity", day.productivity > 0],
      ["mood", day.mood > 0],
      ["energy", day.energy > 0],
    ];
  }

  function renderProgress(day) {
    const steps = checkinSteps(day);
    const done = steps.filter(([, ok]) => ok).length;
    const box = $("#checkin-progress");
    const hour = new Date().getHours();
    let msg;
    if (done === steps.length) msg = "Check-in complete — nice one! 🎉";
    else if (!day.focus.trim() && hour < 12) msg = "Morning! Start by picking today's focus and your top priorities.";
    else if (hour >= 18 && !(day.productivity && day.mood && day.energy)) msg = "How did today go? Rate your productivity, mood and energy at the bottom.";
    else msg = `Daily check-in: ${done} of ${steps.length} done`;
    box.replaceChildren(el("div", { text: msg }), el("div", { class: "bar" }, el("div", { style: `width:${(done / steps.length) * 100}%` })));
    updateBadge();
  }

  // Throttled re-render of progress after typing.
  function changed() {
    save();
    renderProgress(getDay(dateKey(currentDate)));
  }

  $("#focus").addEventListener("input", (e) => { getDay(dateKey(currentDate)).focus = e.target.value; changed(); });
  $("#brain-dump").addEventListener("input", (e) => { getDay(dateKey(currentDate)).brainDump = e.target.value; changed(); });
  const shiftDay = (n) => { currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + n); renderToday(); };
  $("#prev-day").addEventListener("click", () => shiftDay(-1));
  $("#next-day").addEventListener("click", () => shiftDay(1));
  $("#go-today").addEventListener("click", () => { currentDate = new Date(); renderToday(); });
  $("#add-oneoff").addEventListener("click", () => {
    const now = new Date();
    const start = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 30) * 30;
    openBlockDialog({ mode: "oneoff", start: fromMin(Math.min(start, 23 * 60)) });
  });
  $("#reset-schedule").textContent = "Bring back skipped items";
  $("#reset-schedule").addEventListener("click", () => {
    getDay(dateKey(currentDate)).skipped = [];
    changed();
    renderToday();
  });

  // =========================================================
  // WEEK
  // =========================================================
  let mobileDay = weekdayKey(new Date());

  function renderWeek() {
    const startMin = toMin(state.settings.dayStart);
    const endMin = Math.max(toMin(state.settings.dayEnd), startMin + 60);
    const slotCount = (endMin - startMin) / 30;
    const slotH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--slot-h")) || 30;
    const todayKey = weekdayKey(new Date());

    $("#day-picker").replaceChildren(...DAYS.map((d) => el("button", {
      type: "button", class: d === mobileDay ? "active" : "", text: DAY_NAMES[d].slice(0, 3),
      onclick: () => { mobileDay = d; renderWeek(); },
    })));

    const timeCol = el("div", { class: "time-col" }, el("div", { class: "col-head" }),
      Array.from({ length: slotCount }, (_, i) => {
        const m = startMin + i * 30;
        return el("div", { class: "time-label", text: m % 60 === 0 ? pretty(fromMin(m)).replace(":00", "") : "" });
      }));

    const dayCols = DAYS.map((d) => {
      const slots = el("div", { class: "slots" });
      for (let i = 0; i < slotCount; i++) {
        const m = startMin + i * 30;
        slots.append(el("div", {
          class: `slot${(m + 30) % 60 === 0 ? " hour" : ""}`,
          title: `Add at ${pretty(fromMin(m))}`,
          onclick: () => openBlockDialog({ mode: "routine", day: d, start: fromMin(m) }),
        }));
      }
      for (const b of [...state.routine[d]].sort(sortByStart)) {
        const top = Math.max(toMin(b.start), startMin);
        const bottom = Math.min(toMin(b.end), endMin);
        if (bottom <= top) continue;
        const heightPx = ((bottom - top) / 30) * slotH - 2;
        slots.append(el("div", {
          class: `block cat-${b.cat}`,
          style: `top:${((top - startMin) / 30) * slotH + 1}px;height:${heightPx}px`,
          title: `${b.title} (${pretty(b.start)}–${pretty(b.end)})`,
          onclick: () => openBlockDialog({ mode: "routine", day: d, block: b }),
        },
        el("b", { text: b.title }),
        heightPx > 30 ? el("small", { text: `${pretty(b.start)}–${pretty(b.end)}` }) : null,
        heightPx > 70 && b.notes ? el("span", { class: "b-notes", text: b.notes }) : null));
      }
      return el("div", { class: `day-col${d === todayKey ? " today" : ""}${d === mobileDay ? " shown" : ""}` },
        el("div", { class: "col-head", text: DAY_NAMES[d].slice(0, 3) }), slots);
    });

    $("#week-grid").replaceChildren(timeCol, ...dayCols);
  }

  function loadExample() {
    const hasWeekday = DAYS.slice(0, 5).some((d) => state.routine[d].length);
    if (hasWeekday && !confirm("This will replace your Monday–Friday routine with the example. Carry on?")) return;
    const example = [
      ["06:30", "07:00", "Wake up & breakfast", "routine", ""],
      ["07:00", "08:00", "Get ready for school", "routine", ""],
      ["08:00", "08:30", "Get to school", "travel", ""],
      ["08:30", "14:30", "School", "school", "Tap to add your timetable, e.g.\nP1 Maths\nP2 English"],
      ["14:30", "15:00", "Get home", "travel", ""],
      ["15:00", "16:00", "Snack & chill", "free", ""],
      ["16:00", "17:00", "Homework", "homework", ""],
      ["18:00", "18:30", "Dinner", "family", ""],
      ["21:30", "22:00", "Wind down — no screens", "routine", ""],
    ];
    for (const d of DAYS.slice(0, 5)) {
      state.routine[d] = example.map(([start, end, title, cat, notes]) => ({ id: uid(), start, end, title, cat, notes }));
    }
    save();
    renderWeek();
  }
  $("#load-example").addEventListener("click", loadExample);

  // ---------- Block dialog (routine blocks + one-offs) ----------
  const dlg = $("#block-dialog");
  let dlgCtx = null;
  $("#b-cat").replaceChildren(...Object.entries(CATEGORIES).map(([v, label]) => el("option", { value: v, text: label })));

  function overlaps(list, start, end, ignoreId) {
    return list.find((b) => b.id !== ignoreId && toMin(start) < toMin(b.end) && toMin(end) > toMin(b.start));
  }

  function openBlockDialog(ctx) {
    dlgCtx = ctx;
    const b = ctx.block;
    const isNew = !b;
    const start = b ? b.start : ctx.start;
    $("#block-dialog-title").textContent = ctx.mode === "oneoff"
      ? (isNew ? "Add for today only" : "Edit today's item")
      : `${isNew ? "Add to" : "Edit"} ${DAY_NAMES[ctx.day]} routine`;
    $("#b-title").value = b ? b.title : "";
    $("#b-start").value = start;
    $("#b-end").value = b ? b.end : fromMin(Math.min(toMin(start) + 30, 24 * 60 - 30));
    $("#b-cat").value = b ? b.cat : "routine";
    $("#b-notes").value = b ? b.notes || "" : "";
    $("#b-error").textContent = "";
    $("#b-delete").hidden = isNew;

    const showDays = ctx.mode === "routine" && isNew;
    $("#b-days-wrap").hidden = !showDays;
    if (showDays) {
      $("#b-days").replaceChildren(...DAYS.filter((d) => d !== ctx.day).map((d) =>
        el("label", {}, el("input", { type: "checkbox", value: d }), DAY_NAMES[d].slice(0, 3))));
    }
    dlg.showModal();
    $("#b-title").focus();
  }

  $("#block-form").addEventListener("submit", (e) => {
    const title = $("#b-title").value.trim();
    const start = $("#b-start").value;
    const end = $("#b-end").value;
    const cat = $("#b-cat").value;
    const notes = $("#b-notes").value.trim();
    const err = (msg) => { e.preventDefault(); $("#b-error").textContent = msg; };

    if (!title) return err("Give it a name.");
    if (!start || !end || toMin(end) <= toMin(start)) return err("The end time needs to be after the start time.");

    const ctx = dlgCtx;
    if (ctx.mode === "oneoff") {
      const day = getDay(dateKey(currentDate));
      if (ctx.block) Object.assign(ctx.block, { title, start, end, cat, notes });
      else day.extra.push({ id: uid(), title, start, end, cat, notes });
      save();
      renderToday();
      return;
    }

    const targets = [ctx.day, ...$$("#b-days input:checked").map((i) => i.value)];
    for (const d of targets) {
      const clash = overlaps(state.routine[d], start, end, ctx.block?.id);
      if (clash) return err(`That overlaps “${clash.title}” on ${DAY_NAMES[d]} (${pretty(clash.start)}–${pretty(clash.end)}).`);
    }
    if (ctx.block) Object.assign(ctx.block, { title, start, end, cat, notes });
    else for (const d of targets) state.routine[d].push({ id: uid(), title, start, end, cat, notes });
    save();
    renderWeek();
  });

  $("#b-cancel").addEventListener("click", () => dlg.close());
  $("#b-delete").addEventListener("click", () => {
    const ctx = dlgCtx;
    if (ctx.mode === "oneoff") {
      const day = getDay(dateKey(currentDate));
      day.extra = day.extra.filter((x) => x.id !== ctx.block.id);
      renderToday();
    } else {
      state.routine[ctx.day] = state.routine[ctx.day].filter((x) => x.id !== ctx.block.id);
      renderWeek();
    }
    save();
    dlg.close();
  });

  // ---------- Copy day ----------
  const copyDlg = $("#copy-dialog");
  $("#copy-day").addEventListener("click", () => {
    $("#copy-from").replaceChildren(...DAYS.map((d) => el("option", { value: d, text: DAY_NAMES[d] })));
    $("#copy-from").value = mobileDay;
    $("#copy-to").replaceChildren(...DAYS.map((d) =>
      el("label", {}, el("input", { type: "checkbox", value: d }), DAY_NAMES[d].slice(0, 3))));
    copyDlg.showModal();
  });
  $("#copy-cancel").addEventListener("click", () => copyDlg.close());
  $("#copy-form").addEventListener("submit", () => {
    const from = $("#copy-from").value;
    for (const d of $$("#copy-to input:checked").map((i) => i.value)) {
      if (d === from) continue;
      state.routine[d] = state.routine[from].map((b) => ({ ...b, id: uid() }));
    }
    save();
    renderWeek();
  });

  // =========================================================
  // SETTINGS
  // =========================================================
  function renderSettings() {
    $("#set-start").value = state.settings.dayStart;
    $("#set-end").value = state.settings.dayEnd;
    $("#set-habits").value = state.settings.habits.join("\n");
    renderThemePicker();
    renderInstall();
    renderReminders();
  }

  // ---------- Themes ----------
  const currentTheme = () => THEMES[state.settings.theme] || THEMES.pastel;

  const darkQuery = matchMedia("(prefers-color-scheme: dark)");
  const darkOn = () => state.settings.dark === "on" || (state.settings.dark === "auto" && darkQuery.matches);

  function applyTheme() {
    const key = THEMES[state.settings.theme] ? state.settings.theme : "pastel";
    const root = document.documentElement;
    root.dataset.theme = key;
    if (darkOn()) root.dataset.dark = "on"; else delete root.dataset.dark;
    const meta = darkOn() && !THEMES[key].dark ? "#121216" : THEMES[key].meta;
    $('meta[name="theme-color"]').setAttribute("content", meta);
  }
  darkQuery.addEventListener("change", () => { if (state.settings.dark === "auto") applyTheme(); });

  $$("#dark-mode button").forEach((b) => b.addEventListener("click", () => {
    state.settings.dark = b.dataset.dark;
    save();
    applyTheme();
    renderThemePicker();
  }));

  function renderThemePicker() {
    $$("#dark-mode button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.dark === (state.settings.dark || "off"))));
    const current = THEMES[state.settings.theme] ? state.settings.theme : "pastel";
    const dots = ["--purple-ink", "--pink-ink", "--blue-ink", "--green-ink", "--peach-ink"];
    const card = ([key, t]) => el("button", {
      type: "button",
      class: `theme-card${key === current ? " selected" : ""}`,
      "data-theme": key,
      "aria-pressed": String(key === current),
      onclick: () => {
        state.settings.theme = key;
        save();
        applyTheme();
        renderThemePicker();
        renderRatings(getDay(dateKey(currentDate)));
      },
    },
    el("div", { class: "tc-stripe" }),
    el("div", { class: "tc-body" },
      el("span", { class: "tc-name", text: t.name }),
      el("div", { class: "tc-dots" }, dots.map((v) => el("span", { style: `background:var(${v})` })))));

    const groups = [...new Set(Object.values(THEMES).map((t) => t.group))];
    $("#theme-grid").replaceChildren(...groups.flatMap((g) => [
      el("h3", { class: "theme-group", text: g }),
      el("div", { class: "theme-grid" }, Object.entries(THEMES).filter(([, t]) => t.group === g).map(card)),
    ]));
  }
  const roundToSlot = (t) => fromMin(Math.round(toMin(t) / 30) * 30);
  $("#set-start").addEventListener("change", (e) => { if (e.target.value) { state.settings.dayStart = roundToSlot(e.target.value); save(); } });
  $("#set-end").addEventListener("change", (e) => { if (e.target.value) { state.settings.dayEnd = roundToSlot(e.target.value); save(); } });
  $("#set-habits").addEventListener("input", (e) => {
    state.settings.habits = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean);
    save();
  });

  $("#export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = el("a", { href: URL.createObjectURL(blob), download: `planner-backup-${dateKey(new Date())}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  });
  $("#import").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.routine || !data.settings) throw new Error("not a planner backup");
      if (!confirm("Replace everything in this planner with the backup?")) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      state = load();
      renderSettings();
      alert("Backup restored.");
    } catch (err) {
      alert(`Couldn't read that file: ${err.message}`);
    } finally {
      e.target.value = "";
    }
  });

  // =========================================================
  // INSTALL
  // =========================================================
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  let installPrompt = null;

  function renderInstall() {
    const box = $("#install-box");
    if (isStandalone()) {
      box.replaceChildren(el("p", { class: "installed", text: "✓ Installed — you're using the app." }));
      return;
    }
    if (installPrompt) {
      box.replaceChildren(
        el("p", { class: "hint", text: "Install the planner so it opens from your home screen like a normal app, and works without internet." }),
        el("button", {
          class: "primary-btn", text: "Install app",
          onclick: async () => {
            installPrompt.prompt();
            await installPrompt.userChoice;
            installPrompt = null;
            renderInstall();
          },
        }));
      return;
    }
    const steps = isIOS
      ? ["Open this page in Safari.", "Tap the Share button (square with an arrow).", "Choose “Add to Home Screen”, then “Add”."]
      : isAndroid
        ? ["Open this page in Chrome.", "Tap the ⋮ menu (top right).", "Choose “Add to Home screen” or “Install app”."]
        : ["In Chrome or Edge, click the install icon at the right of the address bar.", "Or on a phone, open this page and add it to the home screen."];
    box.replaceChildren(
      el("p", { class: "hint", text: "Add the planner to your home screen so it opens like a normal app, and works without internet:" }),
      el("ol", { class: "install-steps" }, steps.map((t) => el("li", { text: t }))));
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installPrompt = e;
    renderInstall();
  });
  window.addEventListener("appinstalled", () => { installPrompt = null; renderInstall(); });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => { /* offline support is a bonus */ });
  }

  // =========================================================
  // REMINDERS
  // =========================================================
  const APP_URL = new URL("./", location.href).href;
  const ICS_DAYS = { mon: "MO", tue: "TU", wed: "WE", thu: "TH", fri: "FR", sat: "SA", sun: "SU" };
  const reminders = () => state.settings.reminders;

  function renderReminders() {
    const r = reminders();
    $("#r-morning-on").checked = r.morning.on;
    $("#r-morning-time").value = r.morning.time;
    $("#r-evening-on").checked = r.evening.on;
    $("#r-evening-time").value = r.evening.time;
    $("#r-routine").checked = r.routine;
    $("#r-notify").checked = r.notify && notifyPermission() === "granted";
    $("#r-days").replaceChildren(...DAYS.map((d) => {
      const cb = el("input", { type: "checkbox", value: d });
      cb.checked = r.days.includes(d);
      cb.addEventListener("change", () => {
        r.days = DAYS.filter((x) => x === d ? cb.checked : r.days.includes(x));
        save();
      });
      return el("label", {}, cb, DAY_NAMES[d].slice(0, 3));
    }));

    $("#r-calendar-help").textContent = isIOS
      ? "On iPhone: open the downloaded file (it may land in Files → Downloads) and tap “Add All”. If you change your reminders later, delete the old “My Planner” events before adding the new file."
      : isAndroid
        ? "On Android: open the downloaded file with your calendar app. If it won't open in Google Calendar, import it on a computer at calendar.google.com → Settings → Import & export, and it will sync to your phone. Re-import after changing your reminders and the events update."
        : "Open the downloaded file to add it to your calendar app, or import it at calendar.google.com → Settings → Import & export. The reminders then sync to your phone.";
    renderNotifyStatus();
  }

  const notifyPermission = () => ("Notification" in window ? Notification.permission : "unsupported");
  function renderNotifyStatus() {
    const p = notifyPermission();
    $("#r-notify-status").textContent =
      p === "unsupported" ? (isIOS && !isStandalone()
        ? "On iPhone, notifications only work after installing the planner to your home screen."
        : "This browser can't show notifications. Use the calendar option above.")
      : p === "denied" ? "Notifications are blocked for this site. Turn them on in your browser settings to use this."
      : reminders().notify && p === "granted" ? "On. Only works while the planner is open (it can be in the background)."
      : "";
  }

  $("#r-morning-on").addEventListener("change", (e) => { reminders().morning.on = e.target.checked; save(); });
  $("#r-evening-on").addEventListener("change", (e) => { reminders().evening.on = e.target.checked; save(); });
  $("#r-morning-time").addEventListener("change", (e) => { if (e.target.value) { reminders().morning.time = e.target.value; save(); } });
  $("#r-evening-time").addEventListener("change", (e) => { if (e.target.value) { reminders().evening.time = e.target.value; save(); } });
  $("#r-routine").addEventListener("change", (e) => { reminders().routine = e.target.checked; save(); });
  $("#r-notify").addEventListener("change", async (e) => {
    const r = reminders();
    if (!e.target.checked) { r.notify = false; save(); renderNotifyStatus(); return; }
    if (notifyPermission() === "unsupported") { e.target.checked = false; renderNotifyStatus(); return; }
    const p = notifyPermission() === "granted" ? "granted" : await Notification.requestPermission();
    r.notify = p === "granted";
    e.target.checked = r.notify;
    save();
    renderNotifyStatus();
    if (r.notify) notify("Reminders are on 👍", "You'll get a nudge at your check-in times while the planner is open.", "test");
  });

  // ---------- Calendar (.ics) export ----------
  // Everything below fires from the phone's own calendar app, so it works when the planner is closed.
  function icsEscape(text) {
    return String(text).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }

  // RFC 5545: lines longer than 75 octets are folded with CRLF + space.
  function icsFold(line) {
    const enc = new TextEncoder();
    const out = [];
    let cur = "";
    let bytes = 0;
    for (const ch of line) {
      const n = enc.encode(ch).length;
      if (bytes + n > (out.length ? 74 : 75)) { out.push(cur); cur = ""; bytes = 0; }
      cur += ch;
      bytes += n;
    }
    out.push(cur);
    return out.join("\r\n ");
  }

  const icsDate = (d, minutes) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}` +
    `T${String(Math.floor(minutes / 60)).padStart(2, "0")}${String(minutes % 60).padStart(2, "0")}00`;

  // First date from today whose weekday is in `days`, so DTSTART is a real occurrence.
  function firstOccurrence(days) {
    const d = new Date();
    for (let i = 0; i < 7; i++) {
      const c = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
      if (days.includes(weekdayKey(c))) return c;
    }
    return d;
  }

  function hashString(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  function icsEvent({ uid, title, description, days, start, end, alarmBefore }) {
    const first = firstOccurrence(days);
    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")}`,
      `DTSTART:${icsDate(first, start)}`,
      `DTEND:${icsDate(first, end)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${DAYS.filter((d) => days.includes(d)).map((d) => ICS_DAYS[d]).join(",")}`,
      `SUMMARY:${icsEscape(title)}`,
      `DESCRIPTION:${icsEscape(description)}`,
      `URL:${APP_URL}`,
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsEscape(title)}`,
      `TRIGGER:-PT${alarmBefore}M`,
      "END:VALARM",
      "END:VEVENT",
    ];
  }

  function buildCalendar() {
    const r = reminders();
    const events = [];
    if (r.days.length && r.morning.on) {
      const s = toMin(r.morning.time);
      events.push(icsEvent({
        uid: "planner-morning@my-planner", title: "📝 Plan my day",
        description: `Pick today's focus and top priorities: ${APP_URL}`,
        days: r.days, start: s, end: Math.min(s + 10, 24 * 60 - 1), alarmBefore: 0,
      }));
    }
    if (r.days.length && r.evening.on) {
      const s = toMin(r.evening.time);
      events.push(icsEvent({
        uid: "planner-evening@my-planner", title: "🌙 How did today go?",
        description: `Tick off your day and rate productivity, mood and energy: ${APP_URL}`,
        days: r.days, start: s, end: Math.min(s + 10, 24 * 60 - 1), alarmBefore: 0,
      }));
    }
    if (r.routine) {
      // Same activity at the same time on several days becomes one weekly event.
      const groups = new Map();
      for (const d of DAYS) {
        for (const b of state.routine[d]) {
          const key = [b.title, b.start, b.end, b.notes || ""].join("|");
          if (!groups.has(key)) groups.set(key, { b, days: [] });
          groups.get(key).days.push(d);
        }
      }
      for (const [key, { b, days }] of groups) {
        events.push(icsEvent({
          uid: `planner-routine-${hashString(key)}@my-planner`, title: b.title,
          description: [b.notes, `My Planner: ${APP_URL}`].filter(Boolean).join("\n\n"),
          days, start: toMin(b.start), end: toMin(b.end), alarmBefore: 5,
        }));
      }
    }
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//My Planner//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:My Planner",
      ...events.flat(),
      "END:VCALENDAR",
    ];
    return { text: lines.map(icsFold).join("\r\n") + "\r\n", count: events.length };
  }

  $("#r-calendar").addEventListener("click", () => {
    const { text, count } = buildCalendar();
    if (!count) {
      alert("Turn on at least one reminder (and pick some days) first.");
      return;
    }
    const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
    const a = el("a", { href: URL.createObjectURL(blob), download: "my-planner-reminders.ics" });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  });

  // ---------- In-app notifications (while the planner is open) ----------
  async function notify(title, body, tag) {
    const opts = { body, tag, icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: APP_URL } };
    try {
      const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
      if (reg) { await reg.showNotification(title, opts); return; }
      new Notification(title, opts);
    } catch { /* notifications are best-effort */ }
  }

  const FIRED_KEY = "planner.fired";
  function firedToday() {
    const today = dateKey(new Date());
    try {
      const f = JSON.parse(localStorage.getItem(FIRED_KEY));
      if (f && f.date === today) return f;
    } catch { /* ignore */ }
    return { date: today, ids: [] };
  }

  // Reminders due today, as minutes after midnight.
  function dueToday() {
    const r = reminders();
    const now = new Date();
    const wk = weekdayKey(now);
    const day = getDay(dateKey(now));
    const list = [];
    if (r.days.includes(wk)) {
      if (r.morning.on && !day.focus.trim()) {
        list.push({ id: "morning", at: toMin(r.morning.time), title: "📝 Plan your day", body: "Pick today's focus and your top priorities." });
      }
      if (r.evening.on && !(day.productivity && day.mood && day.energy)) {
        list.push({ id: "evening", at: toMin(r.evening.time), title: "🌙 How did today go?", body: "Tick off your day and rate your productivity, mood and energy." });
      }
    }
    if (r.routine) {
      for (const b of scheduleFor(day, now)) {
        list.push({ id: `block-${b.id}`, at: toMin(b.start) - 5, title: `${b.title} at ${pretty(b.start)}`, body: b.notes || "Coming up in 5 minutes." });
      }
    }
    return list;
  }

  function checkReminders() {
    if (!reminders().notify || notifyPermission() !== "granted") return;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const fired = firedToday();
    for (const item of dueToday()) {
      // A small window so a throttled background tab still catches it, without
      // firing a whole morning of stale reminders when the app is opened at lunch.
      if (nowMin >= item.at && nowMin < item.at + 5 && !fired.ids.includes(item.id)) {
        fired.ids.push(item.id);
        notify(item.title, item.body, item.id);
      }
    }
    try { localStorage.setItem(FIRED_KEY, JSON.stringify(fired)); } catch { /* ignore */ }
  }
  setInterval(checkReminders, 30 * 1000);

  // App icon badge: a dot when today's check-in still needs doing (installed app only).
  function updateBadge() {
    if (!("setAppBadge" in navigator)) return;
    const now = new Date();
    const r = reminders();
    const day = state.days[dateKey(now)];
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const pending = r.days.includes(weekdayKey(now)) && (
      (r.morning.on && nowMin >= toMin(r.morning.time) && !day?.focus.trim()) ||
      (r.evening.on && nowMin >= toMin(r.evening.time) && !(day?.productivity && day?.mood && day?.energy)));
    (pending ? navigator.setAppBadge() : navigator.clearAppBadge()).catch(() => {});
  }

  // =========================================================
  // SUMMARY
  // =========================================================
  let summaryWeekStart = mondayOf(new Date());

  function mondayOf(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  }
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  // Consecutive days up to today with the habit ticked. Today counts only once
  // it's ticked, so the streak doesn't look broken first thing in the morning.
  function currentStreak(habit) {
    let d = new Date();
    if (!state.days[dateKey(d)]?.habits[habit]) d = addDays(d, -1);
    let n = 0;
    while (state.days[dateKey(d)]?.habits[habit]) { n++; d = addDays(d, -1); }
    return n;
  }

  function renderSummary() {
    const t = currentTheme();
    const todayKey = dateKey(new Date());
    const thisWeek = dateKey(summaryWeekStart) === dateKey(mondayOf(new Date()));
    const dates = DAYS.map((_, i) => addDays(summaryWeekStart, i));
    // Read without creating empty day records.
    const week = dates.map((d) => ({ date: d, key: dateKey(d), day: state.days[dateKey(d)], future: dateKey(d) > todayKey }));
    const elapsed = week.filter((w) => !w.future);

    const end = dates[6];
    const fmt = (d, opts) => d.toLocaleDateString(undefined, opts);
    $("#week-label").textContent = thisWeek ? `This week · ${fmt(dates[0], { day: "numeric", month: "short" })} – ${fmt(end, { day: "numeric", month: "short" })}`
      : `${fmt(dates[0], { day: "numeric", month: "short" })} – ${fmt(end, { day: "numeric", month: "short", year: "numeric" })}`;
    $("#go-this-week").hidden = thisWeek;
    $("#next-week").disabled = thisWeek;

    // ---- Headline numbers ----
    const moods = elapsed.map((w) => w.day?.mood || 0).filter(Boolean);
    const avgMood = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : 0;
    const checkins = elapsed.filter((w) => w.day && checkinSteps(w.day).every(([, ok]) => ok)).length;
    const habits = summaryHabits(week);
    const habitSlots = habits.length * elapsed.length;
    const habitDone = elapsed.reduce((n, w) => n + habits.filter((h) => w.day?.habits[h]).length, 0);
    const tasksDone = elapsed.reduce((n, w) => n + (w.day ? Object.values(w.day.lists).flat().filter((i) => i.done && i.text.trim()).length : 0), 0);

    const tile = (label, value, sub) => el("div", { class: "stat" },
      el("div", { class: "stat-label", text: label }),
      el("div", { class: "stat-value", text: value }),
      el("div", { class: "stat-sub", text: sub }));
    $("#sum-stats").replaceChildren(
      tile("Average mood", avgMood ? t.moods[Math.round(avgMood) - 1] : "–", avgMood ? `${avgMood.toFixed(1)} out of 5` : "No moods yet"),
      tile("Daily check-ins", `${checkins}/${elapsed.length}`, "days fully done"),
      tile("Habits kept", habitSlots ? `${Math.round((habitDone / habitSlots) * 100)}%` : "–", `${habitDone} of ${habitSlots} ticks`),
      tile("Things ticked off", String(tasksDone), "from your to-do lists"));

    // ---- Gentle note ----
    const lowDays = moods.filter((m) => m <= 2).length;
    let note = "";
    if (lowDays >= 3) note = "Looks like there were a few tough days this week. That's okay. It might help to talk to someone you trust about how you're feeling. 💛";
    else if (elapsed.length === 7 && checkins === 7) note = "You checked in every single day this week. Amazing! 🎉";
    else if (moods.length >= 3 && avgMood >= 4) note = "Lots of good days this week. Nice one! ✨";
    $("#sum-note").textContent = note;
    $("#sum-note").hidden = !note;

    // ---- Mood / productivity / energy by day ----
    const head = el("tr", {}, el("th", { scope: "col" }), dates.map((d, i) => el("th", {
      scope: "col", class: week[i].key === todayKey ? "is-today" : "",
    }, DAY_NAMES[DAYS[i]].slice(0, 3), el("small", { text: String(d.getDate()) }))));
    const cell = (w, render) => {
      if (w.future) return el("td", { class: "na", text: "" });
      return render(w.day);
    };
    const moodRow = el("tr", {}, el("th", { scope: "row", text: "Mood" }), week.map((w) => cell(w, (day) => {
      const m = day?.mood || 0;
      return el("td", { class: "mood-cell", title: m ? `Mood ${m}/5` : "Not recorded" }, m ? t.moods[m - 1] : el("span", { class: "dash", text: "·" }));
    })));
    const prodRow = el("tr", {}, el("th", { scope: "row", text: "Productivity" }), week.map((w) => cell(w, (day) => {
      const p = day?.productivity || 0;
      return el("td", { title: p ? `Productivity ${p}/5` : "Not recorded" }, p ? el("span", { class: "score" }, el("span", { class: "score-icon", text: starIcon(t, p - 1) }), `${p}`) : el("span", { class: "dash", text: "·" }));
    })));
    const energyRow = el("tr", {}, el("th", { scope: "row", text: "Energy" }), week.map((w) => cell(w, (day) => {
      const e = day?.energy || 0;
      return el("td", { title: e ? `Energy ${e}/5` : "Not recorded" }, e
        ? el("span", { class: "mini-energy", "aria-label": `Energy ${e} of 5` }, Array.from({ length: 5 }, (_, i) => el("i", { class: i < e ? "on" : "" })))
        : el("span", { class: "dash", text: "·" }));
    })));
    $("#sum-mood").replaceChildren(el("thead", {}, head), el("tbody", {}, moodRow, prodRow, energyRow));

    // ---- Habits grid ----
    $("#sum-habits-sub").textContent = thisWeek ? "🔥 = days in a row" : "";
    const hHead = el("tr", {}, el("th", { scope: "col" }), dates.map((d, i) => el("th", {
      scope: "col", class: week[i].key === todayKey ? "is-today" : "",
    }, DAY_NAMES[DAYS[i]].slice(0, 1))), el("th", { scope: "col", text: "Done" }), thisWeek ? el("th", { scope: "col", text: "🔥" }) : null);
    const rows = habits.map((h) => {
      const done = elapsed.filter((w) => w.day?.habits[h]).length;
      const pct = elapsed.length ? (done / elapsed.length) * 100 : 0;
      const streak = thisWeek ? currentStreak(h) : 0;
      return el("tr", {},
        el("th", { scope: "row", class: "habit-name", text: h }),
        week.map((w) => w.future ? el("td", { class: "na" })
          : el("td", { title: `${h}: ${w.day?.habits[h] ? "done" : "not done"}` },
            el("span", { class: `hdot${w.day?.habits[h] ? " done" : ""}`, "aria-label": w.day?.habits[h] ? "done" : "not done" }))),
        el("td", { class: "count" },
          el("span", { class: "meter" }, el("span", { style: `width:${pct}%` })),
          el("span", { text: `${done}/${elapsed.length}` })),
        thisWeek ? el("td", { class: "streak", text: streak >= 2 ? String(streak) : "" }) : null);
    });
    $("#sum-habits").replaceChildren(el("thead", {}, hHead), el("tbody", {}, rows.length ? rows
      : [el("tr", {}, el("td", { class: "empty", colspan: "9", text: "Add some habits in Settings to track them here." }))]));
  }

  // Current habits, plus any ticked this week that have since been removed from Settings.
  function summaryHabits(week) {
    const list = [...state.settings.habits];
    for (const w of week) {
      for (const [h, on] of Object.entries(w.day?.habits || {})) if (on && !list.includes(h)) list.push(h);
    }
    return list;
  }

  const shiftWeek = (n) => { summaryWeekStart = addDays(summaryWeekStart, 7 * n); renderSummary(); };
  $("#prev-week").addEventListener("click", () => shiftWeek(-1));
  $("#next-week").addEventListener("click", () => shiftWeek(1));
  $("#go-this-week").addEventListener("click", () => { summaryWeekStart = mondayOf(new Date()); renderSummary(); });

  // ---------- Start ----------
  applyTheme();
  renderToday();
  // Keep the "now" highlight fresh if the page stays open.
  setInterval(() => { if ($("#view-today").classList.contains("active") && !document.querySelector("dialog[open]") && !document.activeElement?.matches("input, textarea")) renderToday(); }, 5 * 60 * 1000);
})();
