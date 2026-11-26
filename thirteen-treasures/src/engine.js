// Engine basics: input, sound, saving, random numbers.
(function () {
  'use strict';
  var TT = (window.TT = window.TT || {});

  // ---------- Input ----------
  var KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    Space: 'a', KeyJ: 'a', Enter: 'a', KeyE: 'a',
    KeyK: 'b', KeyX: 'b',
    ShiftLeft: 'sneak', ShiftRight: 'sneak',
    Tab: 'menu', KeyI: 'menu', Escape: 'menu'
  };

  var input = {
    down: {},      // currently held
    pressed: {},   // went down this frame
    order: [],     // direction keys in the order pressed (last = newest)
    press: function (k) {
      if (!this.down[k]) {
        this.pressed[k] = true;
        if (k === 'up' || k === 'down' || k === 'left' || k === 'right') {
          this.order = this.order.filter(function (x) { return x !== k; });
          this.order.push(k);
        }
      }
      this.down[k] = true;
      TT.audio.unlock();
    },
    release: function (k) {
      this.down[k] = false;
      this.order = this.order.filter(function (x) { return x !== k; });
    },
    endFrame: function () { this.pressed = {}; },
    clear: function () { this.down = {}; this.pressed = {}; this.order = []; },
    // The direction to move in: the newest direction key still held.
    dir: function () {
      for (var i = this.order.length - 1; i >= 0; i--) {
        if (this.down[this.order[i]]) return this.order[i];
      }
      return null;
    }
  };
  TT.input = input;

  function typingInForm(e) {
    var t = e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
  }

  window.addEventListener('keydown', function (e) {
    if (typingInForm(e)) return;
    var k = KEYMAP[e.code];
    if (!k) return;
    // Let Enter/Space activate focused buttons in menus.
    if ((e.code === 'Enter' || e.code === 'Space') && e.target && e.target.tagName === 'BUTTON') return;
    e.preventDefault();
    input.press(k);
  });
  window.addEventListener('keyup', function (e) {
    var k = KEYMAP[e.code];
    if (k) input.release(k);
  });
  window.addEventListener('blur', function () { input.clear(); });

  // Touch buttons: any element with data-key.
  TT.bindTouch = function (root) {
    var active = {}; // pointerId -> key
    function keyAt(x, y) {
      var el = document.elementFromPoint(x, y);
      while (el && el !== root) {
        if (el.dataset && el.dataset.key) return el;
        el = el.parentElement;
      }
      return null;
    }
    function set(id, el) {
      var prev = active[id];
      if (prev && (!el || prev !== el)) {
        prev.classList.remove('on');
        input.release(prev.dataset.key);
        delete active[id];
      }
      if (el && active[id] !== el) {
        active[id] = el;
        el.classList.add('on');
        input.press(el.dataset.key);
      }
    }
    root.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      set(e.pointerId, keyAt(e.clientX, e.clientY));
    });
    root.addEventListener('pointermove', function (e) {
      if (!(e.pointerId in active)) return;
      var el = keyAt(e.clientX, e.clientY);
      // Slide between d-pad buttons, but don't drop an action button while sliding.
      if (el) set(e.pointerId, el);
    });
    function end(e) { set(e.pointerId, null); }
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);
    root.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  };

  // ---------- Sound (tiny WebAudio synth) ----------
  var audio = {
    ctx: null,
    on: true,
    unlock: function () {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      } catch (e) { this.ctx = null; }
    },
    tone: function (freq, dur, type, vol, when, slideTo) {
      if (!this.on || !this.ctx) return;
      var c = this.ctx, t = c.currentTime + (when || 0);
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.02);
    },
    blip: function () { this.tone(660, 0.03, 'square', 0.02); },
    select: function () { this.tone(520, 0.06, 'square', 0.04); this.tone(780, 0.08, 'square', 0.04, 0.05); },
    bump: function () { this.tone(110, 0.08, 'triangle', 0.06); },
    bark: function () { this.tone(420, 0.06, 'sawtooth', 0.05, 0, 260); this.tone(380, 0.07, 'sawtooth', 0.05, 0.1, 240); },
    neigh: function () { this.tone(700, 0.35, 'sawtooth', 0.04, 0, 400); },
    push: function () { this.tone(90, 0.12, 'triangle', 0.08); },
    splash: function () { this.tone(200, 0.25, 'sine', 0.06, 0, 60); },
    chime: function () {
      var notes = [523, 659, 784, 1047];
      for (var i = 0; i < notes.length; i++) this.tone(notes[i], 0.25, 'triangle', 0.05, i * 0.09);
    },
    treasure: function () {
      var notes = [392, 494, 587, 784, 988];
      for (var i = 0; i < notes.length; i++) this.tone(notes[i], 0.35, 'triangle', 0.06, i * 0.12);
    },
    save: function () { this.tone(880, 0.12, 'sine', 0.05); this.tone(1320, 0.2, 'sine', 0.04, 0.1); }
  };
  TT.audio = audio;

  // ---------- Saving ----------
  var SAVE_KEY = 'thirteen-treasures-save-v1';
  TT.store = {
    load: function () {
      try {
        var raw = window.localStorage.getItem(SAVE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },
    save: function (data) {
      try {
        window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        return true;
      } catch (e) { return false; }
    },
    getPref: function (k, dflt) {
      try {
        var v = window.localStorage.getItem('thirteen-treasures-' + k);
        return v === null ? dflt : JSON.parse(v);
      } catch (e) { return dflt; }
    },
    setPref: function (k, v) {
      try { window.localStorage.setItem('thirteen-treasures-' + k, JSON.stringify(v)); } catch (e) { /* ignore */ }
    }
  };

  // ---------- Random ----------
  TT.rng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
})();
