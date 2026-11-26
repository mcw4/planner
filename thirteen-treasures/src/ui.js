// The HTML layer: HUD, dialogue box, toasts, title, new game, menu, chapter card.
(function () {
  'use strict';
  var TT = window.TT;
  function $(id) { return document.getElementById(id); }

  var UI = {
    init: function () {
      this.el = {
        place: $('hud-place'), objective: $('hud-objective'), hum: $('hud-hum'), humText: $('hud-hum-text'),
        dlg: $('dialogue'), who: $('dlg-who'), text: $('dlg-text'), next: $('dlg-next'),
        toast: $('toast'), title: $('title'), newgame: $('newgame'), menu: $('menu'), chapter: $('chapter'),
        btnContinue: $('btn-continue'), sound: $('btn-sound')
      };
      this.dialog = null;
      this.toastTimer = 0;
      var self = this;
      this.el.dlg.addEventListener('click', function () { TT.input.press('a'); setTimeout(function () { TT.input.release('a'); }, 30); });
      this.el.sound.addEventListener('click', function () {
        TT.audio.on = !TT.audio.on;
        TT.store.setPref('sound', TT.audio.on);
        self.syncSound();
        TT.audio.unlock();
      });
      TT.audio.on = TT.store.getPref('sound', true);
      this.syncSound();
    },

    syncSound: function () {
      this.el.sound.textContent = TT.audio.on ? 'Sound on' : 'Sound off';
      this.el.sound.setAttribute('aria-pressed', String(TT.audio.on));
    },

    setPlace: function (t) { this.el.place.textContent = t; },
    setObjective: function (t) { this.el.objective.textContent = t || ''; },
    setHum: function (level, dirWord) {
      if (!level) { this.el.hum.hidden = true; return; }
      this.el.hum.hidden = false;
      this.el.hum.dataset.level = String(level);
      var words = ['', 'Shard: faint hum', 'Shard: steady hum', 'Shard: humming hard'];
      this.el.humText.textContent = words[level] + (dirWord ? ', ' + dirWord : '');
    },

    toast: function (t, frames) {
      this.el.toast.textContent = t;
      this.el.toast.hidden = false;
      this.toastTimer = frames || 180;
    },

    // ----- Dialogue -----
    // lines: array of strings (narration) or [who, text]
    say: function (lines, name, done, top) {
      this.dialog = { lines: lines, i: -1, name: name, done: done, shown: 0, full: '', fresh: true };
      this.el.dlg.classList.toggle('top', !!top);
      this.el.dlg.hidden = false;
      this.nextLine();
    },
    nextLine: function () {
      var d = this.dialog;
      d.i++;
      if (d.i >= d.lines.length) {
        this.el.dlg.hidden = true;
        this.dialog = null;
        if (d.done) d.done();
        return;
      }
      var line = d.lines[d.i];
      var who = '', text = line;
      if (Array.isArray(line)) { who = line[0]; text = line[1]; }
      text = String(text).replace(/\{name\}/g, d.name || 'Wren');
      this.el.who.textContent = who;
      d.full = text;
      d.shown = 0;
      this.el.text.textContent = '';
      this.el.next.classList.add('hide');
    },
    get talking() { return !!this.dialog; },

    update: function () {
      if (this.toastTimer > 0) {
        this.toastTimer--;
        if (this.toastTimer === 0) this.el.toast.hidden = true;
      }
      var d = this.dialog;
      if (!d) return;
      // Ignore the button press that opened this dialogue.
      var pressed = TT.input.pressed.a && !d.fresh;
      d.fresh = false;
      if (d.shown < d.full.length) {
        d.shown = Math.min(d.full.length, d.shown + 2);
        this.el.text.textContent = d.full.slice(0, d.shown);
        if (d.shown % 6 === 0) TT.audio.blip();
        if (pressed) { d.shown = d.full.length; this.el.text.textContent = d.full; }
        if (d.shown >= d.full.length) this.el.next.classList.remove('hide');
      } else if (pressed) {
        this.nextLine();
      }
    },

    // ----- Overlays -----
    anyOverlay: function () {
      return !this.el.title.hidden || !this.el.newgame.hidden || !this.el.menu.hidden || !this.el.chapter.hidden;
    },
    showTitle: function (hasSave, onNew, onContinue) {
      this.el.title.hidden = false;
      this.el.btnContinue.hidden = !hasSave;
      $('btn-new').onclick = function () { TT.audio.unlock(); TT.audio.select(); onNew(); };
      this.el.btnContinue.onclick = function () { TT.audio.unlock(); TT.audio.select(); onContinue(); };
      (hasSave ? this.el.btnContinue : $('btn-new')).focus();
    },
    hideTitle: function () { this.el.title.hidden = true; },

    showNewGame: function (onBegin, onBack) {
      var self = this;
      this.el.title.hidden = true;
      this.el.newgame.hidden = false;
      var look = { hair: 0, skin: 0, tunic: 0 };
      var preview = $('ng-preview');
      function draw() {
        var set = TT.makeHero(look);
        var x = preview.getContext('2d');
        x.clearRect(0, 0, 16, 16);
        x.drawImage(set.down[0], 0, 0);
      }
      function pickers(id, key, colours) {
        var box = $(id);
        box.innerHTML = '';
        colours.forEach(function (col, i) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'swatch';
          b.style.background = Array.isArray(col) ? col[0] : col;
          b.setAttribute('aria-label', key + ' option ' + (i + 1));
          b.setAttribute('aria-pressed', String(i === look[key]));
          b.onclick = function () {
            look[key] = i;
            Array.prototype.forEach.call(box.children, function (c, j) { c.setAttribute('aria-pressed', String(j === i)); });
            TT.audio.blip();
            draw();
          };
          box.appendChild(b);
        });
      }
      pickers('pick-hair', 'hair', TT.LOOKS.hair);
      pickers('pick-skin', 'skin', TT.LOOKS.skin);
      pickers('pick-tunic', 'tunic', TT.LOOKS.tunic);
      draw();
      var name = $('ng-name');
      name.value = '';
      setTimeout(function () { name.focus(); }, 30);
      $('newgame-form').onsubmit = function (e) {
        e.preventDefault();
        var n = name.value.trim().replace(/[<>]/g, '').slice(0, 12) || 'Wren';
        self.el.newgame.hidden = true;
        TT.audio.select();
        onBegin(n, { hair: look.hair, skin: look.skin, tunic: look.tunic });
      };
      $('ng-back').onclick = function () { self.el.newgame.hidden = true; onBack(); };
    },

    openMenu: function (game, onClose) {
      var self = this;
      var f = game.flags;
      function list(id, items, emptyText) {
        var ul = $(id);
        ul.innerHTML = '';
        if (!items.length) {
          var li = document.createElement('li'); li.className = 'empty'; li.textContent = emptyText; ul.appendChild(li);
        }
        items.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      }
      var treasures = [];
      if (f.haveHalter) treasures.push('Halter of Clydno Eiddyn (power: summon your horse, press K or B)');
      list('menu-treasures', treasures, 'None yet. Thirteen to find.');
      var items = [];
      if (f.haveShard) items.push('The Glass Shard (Merlin is inside it)');
      if (f.haveShard) items.push('Bara brith, slightly squashed');
      list('menu-items', items, 'Just your pockets.');
      var leg = $('menu-legends');
      leg.innerHTML = '';
      var any = false;
      Object.keys(TT.LEGENDS).forEach(function (k) {
        if (!f['legend_' + k]) return;
        any = true;
        var L = TT.LEGENDS[k];
        var h = document.createElement('h4'); h.textContent = L.title; leg.appendChild(h);
        L.text.forEach(function (t) { var p = document.createElement('p'); p.textContent = t; leg.appendChild(p); });
      });
      if (!any) { var p = document.createElement('p'); p.textContent = 'Empty for now. Each Treasure you find adds its story here.'; leg.appendChild(p); }
      this.el.menu.hidden = false;
      $('menu-close').focus();
      $('menu-close').onclick = function () { self.el.menu.hidden = true; onClose(); };
    },
    closeMenu: function () { this.el.menu.hidden = true; },

    showChapter: function (opts, onClose) {
      var self = this;
      $('ch-kicker').textContent = opts.kicker;
      $('ch-title').textContent = opts.title;
      $('ch-power').textContent = opts.power;
      $('ch-legend').textContent = opts.legend;
      this.el.chapter.hidden = false;
      $('ch-close').focus();
      $('ch-close').onclick = function () { self.el.chapter.hidden = true; onClose(); };
    }
  };

  TT.UI = UI;
})();
