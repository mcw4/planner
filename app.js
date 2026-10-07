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
  const MOODS = ["😢", "😕", "😐", "🙂", "😄"];

  const defaultState = () => ({
    settings: {
      dayStart: "06:00",
      dayEnd: "22:30",
      habits: ["Drink water", "Move my body", "Read for 20 minutes", "Screen-free hour before bed"],
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
        settings: { ...base.settings, ...parsed.settings },
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
    rating($("#productivity"), "productivity", 5, () => "⭐");
    rating($("#mood"), "mood", 5, (i) => MOODS[i]);
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

  // ---------- Start ----------
  renderToday();
  // Keep the "now" highlight fresh if the page stays open.
  setInterval(() => { if ($("#view-today").classList.contains("active") && !document.querySelector("dialog[open]") && !document.activeElement?.matches("input, textarea")) renderToday(); }, 5 * 60 * 1000);
})();
