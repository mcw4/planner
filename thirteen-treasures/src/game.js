// Game logic: the player, screens, entities, story events and drawing.
(function () {
  'use strict';
  var TT = window.TT;
  var UI = TT.UI;
  var TS = 16, W = 256, H = 176;
  var WALK = { '.': 1, ',': 1, '=': 1, 's': 1, 'H': 1, 'g': 1, 'a': 1, 'i': 1, 'd': 1 };
  var CART_OK = { '.': 1, ',': 1, '=': 1, 'a': 1, 'g': 1 };
  var DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  var MERLIN = 'Merlin (in the Shard)';
  var GAP = { tx: 8, ty: 8 };

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function parseId(id) {
    var m = /^(-?\d+),(-?\d+)$/.exec(id);
    return m ? { c: +m[1], r: +m[2] } : null;
  }

  function Game(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.tiles = TT.buildTiles();
    this.npcSprites = {};
    var self = this;
    Object.keys(TT.VILLAGERS).forEach(function (k) { self.npcSprites[k] = TT.makeNPC(TT.VILLAGERS[k]); });
    this.mode = 'title';
    this.t = 0;
    this.fadeA = 0;
    this.nightA = 0;
    this.fx = null;
  }

  // ---------- Starting and saving ----------
  Game.prototype.newGame = function (name, look) {
    this.start({ v: 1, name: name, look: look, flags: {}, screen: 'home', x: 4 * TS, y: 4 * TS, dir: 'down', mounted: false, talks: {} });
    var self = this;
    this.fadeA = 1;
    this.fadeTo(0, 40, function () {
      self.say([
        'Blackmill. Early morning. Mist hangs over the river, where the Ogwr Fach meets the Ogwr Fawr.',
        'Cadi, your corgi, is at the door, barking like mad.',
        '(Move with the arrows or WASD. Press Space, or A on a touchscreen, to talk and look at things. Tab opens your journal.)'
      ]);
    });
  };

  Game.prototype.start = function (s) {
    this.name = s.name || 'Wren';
    this.look = s.look || { hair: 0, skin: 0, tunic: 0 };
    this.flags = s.flags || {};
    this.talks = s.talks || {};
    this.hero = TT.makeHero(this.look);
    this.player = { x: s.x, y: s.y, dir: s.dir || 'down', frame: 0, anim: 0, moving: false, pushT: 0, bumpT: 0 };
    this.mounted = !!s.mounted;
    this.horseDir = 'right';
    this.cadi = { x: s.x - 12, y: s.y, dir: 'right', frame: 0, anim: 0, bark: 0, barkT: 0 };
    this.trail = [];
    this.slide = null;
    this.fade = null;
    this.fadeA = 0;
    this.nightA = 0;
    this.mode = 'play';
    this.enterScreen(s.screen || 'home');
    this.refreshHUD();
  };

  Game.prototype.serialize = function () {
    return {
      v: 1, name: this.name, look: this.look, flags: this.flags, talks: this.talks,
      screen: this.screenId, x: Math.round(this.player.x), y: Math.round(this.player.y),
      dir: this.player.dir, mounted: this.mounted
    };
  };
  Game.prototype.autosave = function () { return TT.store.save(this.serialize()); };

  // ---------- Screens ----------
  Game.prototype.enterScreen = function (id) {
    this.screenId = id;
    this.screen = TT.SCREENS[id];
    this.map = this.screen.map;
    this.entities = [];
    var self = this;
    TT.spawnFor(id, this.flags).forEach(function (o) { self.addEntity(o); });
    if (this.screen.interior && this.mounted) {
      this.mounted = false;
      UI.toast('Your horse waits outside.');
    }
    this.flags.visited = this.flags.visited || {};
    this.flags.visited[id] = true;
    if (id !== 'home') this.flags.leftHome = true;
    this.refreshHUD();
  };

  Game.prototype.addEntity = function (o) {
    var e = { type: o.type, x: o.tx * TS, y: o.ty * TS, t: 0, dir: 'right', frame: 0 };
    for (var k in o) if (!(k in e) && k !== 'tx' && k !== 'ty') e[k] = o[k];
    e.tx = o.tx; e.ty = o.ty;
    if (e.type === 'pony') { e.state = 'graze'; e.timer = 60; e.vx = 0.35; }
    this.entities.push(e);
    return e;
  };
  Game.prototype.removeEntity = function (e) {
    var i = this.entities.indexOf(e);
    if (i >= 0) this.entities.splice(i, 1);
  };
  Game.prototype.find = function (type) {
    for (var i = 0; i < this.entities.length; i++) if (this.entities[i].type === type) return this.entities[i];
    return null;
  };

  Game.prototype.tileAt = function (tx, ty) {
    if (ty < 0 || ty >= this.map.length || tx < 0 || tx >= 16) return null;
    return this.map[ty].charAt(tx);
  };

  function entBox(e) {
    if (e.type === 'cart') return { x: e.x + 1, y: e.y + 3, w: 14, h: 11 };
    if (e.type === 'shard' || e.type === 'eyes') return null;
    if (e.type === 'pony' || e.type === 'horse') return { x: e.x + 1, y: e.y + 7, w: 14, h: 8 };
    return { x: e.x + 3, y: e.y + 8, w: 10, h: 8 };
  }
  Game.prototype.playerBox = function (x, y) {
    var p = this.player;
    return { x: (x === undefined ? p.x : x) + 3, y: (y === undefined ? p.y : y) + 10, w: 10, h: 6 };
  };

  // Is this rectangle blocked by tiles or solid entities? Off-map counts as open (for screen exits).
  Game.prototype.blocked = function (r, ignore) {
    var x0 = Math.floor(r.x / TS), x1 = Math.floor((r.x + r.w - 1) / TS);
    var y0 = Math.floor(r.y / TS), y1 = Math.floor((r.y + r.h - 1) / TS);
    for (var ty = y0; ty <= y1; ty++) {
      for (var tx = x0; tx <= x1; tx++) {
        var ch = this.tileAt(tx, ty);
        if (ch !== null && !WALK[ch]) return { tile: ch, tx: tx, ty: ty };
      }
    }
    for (var i = 0; i < this.entities.length; i++) {
      var e = this.entities[i];
      if (e === ignore) continue;
      var b = entBox(e);
      if (b && overlap(r, b)) return { ent: e };
    }
    return null;
  };

  // ---------- Talking ----------
  Game.prototype.say = function (lines, done) {
    if (!lines || !lines.length) { if (done) done(); return; }
    UI.say(lines, this.name, done, this.player && this.player.y > 84);
  };
  Game.prototype.talkCount = function (who) { return this.talks[who] || 0; };

  // ---------- Fades ----------
  Game.prototype.fadeTo = function (target, frames, done) {
    this.fade = { from: this.fadeA, to: target, t: 0, dur: frames, done: done };
  };

  // ---------- Update ----------
  Game.prototype.update = function () {
    this.t++;
    if (this.mode !== 'play') return;

    if (this.fade) {
      var f = this.fade;
      f.t++;
      this.fadeA = f.from + (f.to - f.from) * Math.min(1, f.t / f.dur);
      if (f.t >= f.dur) { this.fade = null; if (f.done) f.done(); }
    }
    if (this.fx) { this.fx.t++; if (this.fx.t > this.fx.dur) this.fx = null; }

    if (this.slide) {
      this.slide.t++;
      if (this.slide.t >= this.slide.dur) this.slide = null;
      this.animateCadi(true);
      return;
    }

    var busy = UI.talking || UI.anyOverlay() || this.fade || this.locked;
    this.updateEntities(busy);
    this.animateCadi(false);
    if (busy) return;

    var input = TT.input;
    if (input.pressed.menu) {
      var self = this;
      this.mode = 'menu';
      UI.openMenu(this, function () { self.mode = 'play'; });
      return;
    }
    if (input.pressed.b) this.toggleMount();
    this.updatePlayer();
    if (input.pressed.a) this.interact();
    this.updateHum();
  };

  Game.prototype.updatePlayer = function () {
    var p = this.player, input = TT.input;
    var d = input.dir();
    var sneaking = !!input.down.sneak && !this.mounted;
    var speed = this.mounted ? 2.1 : sneaking ? 0.6 : 1.25;
    p.moving = false;
    p.sneaking = sneaking;
    if (!d) { p.pushT = 0; p.bumpT = 0; return; }
    p.dir = d;
    if (d === 'left' || d === 'right') this.horseDir = d;
    var v = DIRV[d];
    var dx = v[0] * speed, dy = v[1] * speed;
    var nx = p.x + dx, ny = p.y + dy;
    var hit = this.blocked(this.playerBox(nx, ny));
    if (!hit) {
      p.x = nx; p.y = ny; p.moving = true; p.pushT = 0; p.bumpT = 0;
    } else {
      // Slide round tile corners a little so you don't snag on edges (not round things you push).
      var nudged = false;
      for (var n = 1; n <= 5 && !nudged && !hit.ent; n++) {
        var ox = v[1] !== 0 ? n : 0, oy = v[0] !== 0 ? n : 0;
        var tries = [[ox, oy], [-ox, -oy]];
        for (var k = 0; k < 2; k++) {
          var tx = p.x + tries[k][0] + dx, ty = p.y + tries[k][1] + dy;
          if (!this.blocked(this.playerBox(tx, ty))) {
            p.x += tries[k][0] * 0.6; p.y += tries[k][1] * 0.6;
            p.moving = true; nudged = true; break;
          }
        }
      }
      if (!nudged) this.handleBump(hit, d);
    }
    if (p.moving) {
      p.anim++;
      if (p.anim % (this.mounted ? 6 : sneaking ? 14 : 9) === 0) p.frame ^= 1;
      this.trail.push({ x: p.x, y: p.y });
      if (this.trail.length > 40) this.trail.shift();
    }
    // Doormat inside: step on it going down to leave.
    if (this.screen.interior && d === 'down') {
      var ftx = Math.floor((p.x + 8) / TS), fty = Math.floor((p.y + 14) / TS);
      if (this.tileAt(ftx, fty) === 'd') this.useDoor(ftx, fty);
    }
    this.checkExit();
    this.checkPickups();
  };

  Game.prototype.handleBump = function (hit, d) {
    var p = this.player;
    if (hit.ent && hit.ent.type === 'cart') {
      p.pushT++;
      var e = hit.ent, pc = { x: p.x + 8, y: p.y + 12 }, ec = { x: e.x + 8, y: e.y + 9 };
      var aligned = (d === 'up' || d === 'down') ? Math.abs(pc.x - ec.x) < 8 : Math.abs(pc.y - ec.y) < 9;
      if (p.pushT > 14 && aligned) { p.pushT = 0; this.pushCart(e, d); }
      return;
    }
    p.pushT = 0;
    if (hit.tile === 'D' || hit.tile === 'Q') {
      p.bumpT++;
      if (p.bumpT === 8) this.useDoor(hit.tx, hit.ty);
    }
  };

  Game.prototype.useDoor = function (tx, ty) {
    var self = this;
    for (var i = 0; i < TT.DOORS.length; i++) {
      var dr = TT.DOORS[i];
      if (dr.from === this.screenId && dr.tx === tx && dr.ty === ty) {
        this.locked = true;
        TT.audio.tone(330, 0.08, 'triangle', 0.05);
        this.fadeTo(1, 14, function () {
          self.enterScreen(dr.to);
          self.player.x = dr.px * TS;
          self.player.y = dr.py * TS;
          self.player.dir = dr.to === 'home' ? 'up' : 'down';
          self.cadi.x = self.player.x; self.cadi.y = self.player.y + (dr.to === 'home' ? 10 : -8);
          self.trail = [];
          self.fadeTo(0, 14, function () { self.locked = false; self.afterEnter(); });
        });
        return;
      }
    }
    var msg = TT.LOCKED[this.screenId + ':' + tx + ',' + ty];
    if (msg) this.say([msg]);
  };

  Game.prototype.afterEnter = function () {
    // Morning after: Merlin nudges you outside.
  };

  Game.prototype.checkExit = function () {
    var p = this.player;
    var cx = p.x + 8, fy = p.y + 13, dx = 0, dy = 0;
    if (cx < 0) dx = -1; else if (cx >= W) dx = 1; else if (fy < 0) dy = -1; else if (fy >= H) dy = 1;
    if (!dx && !dy) return;
    var here = parseId(this.screenId);
    var nid = here ? (here.c + dx) + ',' + (here.r + dy) : null;
    if (!nid || !TT.SCREENS[nid]) {
      p.x = clamp(p.x, -2, W - 14);
      p.y = clamp(p.y, -10, H - 16);
      return;
    }
    var oldMap = this.map, oldId = this.screenId;
    this.enterScreen(nid);
    p.x -= dx * W;
    p.y -= dy * H;
    this.slide = { dx: dx, dy: dy, t: 0, dur: 28, oldMap: oldMap, oldId: oldId };
    this.cadi.x = p.x - dx * 14; this.cadi.y = p.y - dy * 14;
    this.trail = [];
  };

  Game.prototype.checkPickups = function () {
    var pb = this.playerBox();
    var s = this.find('shard');
    if (s && overlap(pb, { x: s.x + 3, y: s.y + 3, w: 10, h: 10 })) this.pickShard(s);
  };

  // ---------- Interacting ----------
  Game.prototype.interact = function () {
    var p = this.player, v = DIRV[p.dir];
    var reach = [10, 17];
    for (var r = 0; r < reach.length; r++) {
      var fx = p.x + 8 + v[0] * reach[r], fy = p.y + 12 + v[1] * reach[r];
      for (var i = this.entities.length - 1; i >= 0; i--) {
        var e = this.entities[i];
        var box = { x: e.x - 1, y: e.y, w: 18, h: 17 };
        if (fx >= box.x && fx < box.x + box.w && fy >= box.y && fy < box.y + box.h) {
          if (this.interactEntity(e)) return;
        }
      }
      var tx = Math.floor(fx / TS), ty = Math.floor(fy / TS);
      var ch = this.tileAt(tx, ty);
      if (ch === 'D' || ch === 'Q') { this.useDoor(tx, ty); return; }
      var fn = ch && TT.TILE_TEXT[ch];
      if (fn) {
        var lines = fn(this, tx, ty);
        if (lines) this.say(lines);
        return;
      }
    }
  };

  Game.prototype.interactEntity = function (e) {
    var self = this;
    switch (e.type) {
      case 'npc':
        this.talks[e.who] = (this.talks[e.who] || 0) + 1;
        this.say(TT.TALK[e.who](this));
        return true;
      case 'sign':
        this.say(e.text);
        return true;
      case 'cart':
        this.say([this.flags.cartInGap ? 'The old cart is wedged snugly in the gap.' : 'Mr Pritchard\'s old cart. Walk into it to push it.']);
        return true;
      case 'pony':
        if (this.flags.cartInGap && e.state === 'wary') this.calmPony(e);
        else { this.ponyBolt(e); }
        return true;
      case 'horse':
        this.meetHorse(e);
        return true;
      case 'shard':
        this.pickShard(e);
        return true;
    }
    return false;
  };

  // ---------- Story events ----------
  Game.prototype.pickShard = function (s) {
    if (this.flags.haveShard) return;
    this.flags.haveShard = true;
    this.removeEntity(s);
    TT.audio.chime();
    var self = this;
    this.say([
      'Something glints in the shallows, half buried in the gravel: a shard of glass, glowing faintly blue.',
      'You pick it up. It\'s warm.',
      [MERLIN, '…{name}? Can you hear me? Good. Good.'],
      [MERLIN, 'I\'m in the glass. Merlin. Yes, that Merlin. Please don\'t drop me.'],
      [MERLIN, 'My Glass House on Bardsey has shattered. The Thirteen Treasures of the Island of Britain have scattered back into the old stories they came from.'],
      [MERLIN, 'Bring them home, {name}. When a Treasure is near, this Shard will hum.'],
      [MERLIN, '…It\'s humming now. Somewhere south and west of here, I think.']
    ], function () { self.refreshHUD(); self.autosave(); });
  };

  Game.prototype.afancStir = function () {
    if (this.flags.sawAfanc) {
      return ['The deep pool is dark and still. Too still.'];
    }
    this.flags.sawAfanc = true;
    var p = this.player, v = DIRV[p.dir];
    var ex = clamp(Math.floor((p.x + 8 + v[0] * 20) / TS), 0, 15) * TS, ey = clamp(Math.floor((p.y + 12 + v[1] * 20) / TS), 0, 10) * TS;
    var eyes = this.addEntity({ type: 'eyes', tx: 0, ty: 0 });
    eyes.x = ex; eyes.y = ey; eyes.life = 150;
    TT.audio.splash();
    var lines = ['Bubbles rise from the deep pool…', 'Two huge yellow eyes slide up out of the dark water and stare at you. Then, slowly, they sink.'];
    if (this.flags.haveShard) lines.push([MERLIN, 'An Afanc. Old as the river, and twice as bad-tempered. I\'d wager that\'s what frightened the pony.']);
    return lines;
  };

  Game.prototype.useWell = function () {
    TT.audio.save();
    var ok = this.autosave();
    return [
      'You drink from the holy well. The water is ice-cold and tastes of stone.',
      ok ? '(Your journey is saved.)' : '(Saving isn\'t possible in this browser, so your progress will be lost when you close the page.)'
    ];
  };

  Game.prototype.useBed = function () {
    if (this.flags.haveHalter && !this.flags.slept) { this.sleep(); return null; }
    if (this.flags.slept) return ['You\'ve had your sleep. Adventure\'s waiting outside.'];
    return ['Your bed. You\'re not tired: it\'s barely morning.'];
  };

  Game.prototype.sleep = function () {
    var self = this;
    this.say([
      'You tie the Halter of Clydno Eiddyn to the foot of your bed.',
      'You close your eyes and wish for a horse. A good one. A brave one.'
    ], function () {
      self.locked = true;
      self.fadeTo(1, 40, function () {
        self.nightA = 0.75;
        self.player.x = 2 * TS; self.player.y = 2 * TS; self.player.dir = 'down';
        self.cadi.x = 6 * TS; self.cadi.y = 8 * TS;
        self.fadeTo(0.35, 30, function () {
          self.say([
            'Night falls over Blackmill.',
            'Far away on Dimbath, something howls. Cadi growls in her sleep.'
          ], function () {
            self.fadeTo(1, 40, function () {
              self.nightA = 0;
              self.flags.slept = true;
              self.refreshHUD();
              self.autosave();
              self.fadeTo(0, 40, function () {
                self.locked = false;
                TT.audio.bark();
                self.say([
                  'Morning. Cadi is at the door, barking her head off.',
                  [MERLIN, 'Well, {name}? Go and look outside.']
                ]);
              });
            });
          });
        });
      });
    });
  };

  Game.prototype.meetHorse = function (e) {
    var self = this;
    TT.audio.neigh();
    this.say([
      'A horse is standing outside your door: tall and chestnut, with a white blaze down its nose. The Halter of Clydno Eiddyn is on its head.',
      'It nuzzles your pocket, hoping for bara brith.',
      [MERLIN, 'The Halter never fails. Whenever you want your horse, it will be there.'],
      [MERLIN, 'Press K to ride, or B on a touchscreen. Press it again to get down.']
    ], function () {
      self.flags.haveHorse = true;
      self.removeEntity(e);
      self.mounted = true;
      self.horseDir = 'right';
      TT.audio.treasure();
      self.flags.chapterDone = true;
      self.autosave();
      self.refreshHUD();
      self.mode = 'card';
      UI.showChapter({
        kicker: 'Chapter 1 complete',
        title: TT.LEGENDS.halter.title,
        power: 'New power: summon your horse with K (or B). Gallop around the valley. Some things can only be cleared on horseback.',
        legend: TT.LEGENDS.halter.text.join(' ')
      }, function () { self.mode = 'play'; });
    });
  };

  Game.prototype.toggleMount = function () {
    if (!this.flags.haveHorse) return;
    if (this.screen.interior) { UI.toast('Not indoors!'); return; }
    if (!this.mounted) {
      // Need room for the horse.
      if (this.blocked({ x: this.player.x + 1, y: this.player.y + 7, w: 14, h: 9 })) { UI.toast('No room for your horse here.'); return; }
    }
    this.mounted = !this.mounted;
    if (this.mounted) TT.audio.neigh(); else TT.audio.bump();
  };

  // ---------- The cart ----------
  Game.prototype.pushCart = function (e, d) {
    if (e.slide) return;
    if (this.flags.cartInGap) { TT.audio.bump(); UI.toast('The cart is wedged tight in the gap.'); return; }
    var v = DIRV[d], ntx = e.tx + v[0], nty = e.ty + v[1];
    var ch = this.tileAt(ntx, nty);
    var dest = { x: ntx * TS + 1, y: nty * TS + 3, w: 14, h: 11 };
    var pb = this.playerBox();
    if (!ch || !CART_OK[ch] || this.blocked(dest, e) || overlap(dest, pb)) { TT.audio.bump(); return; }
    TT.audio.push();
    e.slide = { fx: e.x, fy: e.y, t: 0 };
    e.tx = ntx; e.ty = nty;
    this.flags.cart = { tx: ntx, ty: nty };
    var plugged = this.screenId === '3,4' && ntx === GAP.tx && nty === GAP.ty;
    if (plugged && !this.flags.cartInGap) {
      this.flags.cartInGap = true;
      var self = this;
      setTimeout(function () {
        TT.audio.chime();
        UI.toast('The cart plugs the gap in the fence!');
        self.refreshHUD();
      }, 200);
    }
  };

  // ---------- The pony ----------
  Game.prototype.ponyBolt = function (e) {
    if (this.flags.cartInGap) { e.state = 'flee'; e.timer = 40; return; }
    if (e.state !== 'bolt' && e.state !== 'bank') {
      e.state = 'bolt';
      TT.audio.neigh();
      if (!this.flags.ponyBolted) { this.flags.ponyBolted = true; UI.toast('The pony bolts through the gap in the fence, down to the river!', 220); }
    }
  };

  Game.prototype.calmPony = function (e) {
    var self = this;
    e.state = 'calm';
    this.say([
      'You creep up slowly, one hand out. The pony\'s ears flick… but it stays.',
      'It snorts and lowers its head, and lets you stroke its nose. It\'s trembling.',
      'Gently, you lift the old rope halter off its head. The Shard flares bright blue.',
      [MERLIN, 'The Halter of Clydno Eiddyn! One of the Thirteen, {name}. One of mine.'],
      [MERLIN, 'Something frightened that poor pony up out of the river. Something old.'],
      [MERLIN, 'Tonight, tie the Halter to your bedpost and make a wish. Then we\'ll see what we\'ll see.']
    ], function () {
      self.flags.haveHalter = true;
      self.flags.legend_halter = true;
      TT.audio.treasure();
      UI.toast('Treasure found: the Halter of Clydno Eiddyn', 240);
      e.state = 'leave';
      self.refreshHUD();
      self.autosave();
    });
  };

  Game.prototype.updatePony = function (e, busy) {
    var p = this.player;
    var dx = (p.x + 8) - (e.x + 8), dy = (p.y + 12) - (e.y + 10);
    var dist = Math.sqrt(dx * dx + dy * dy);
    var sneaking = TT.input.down.sneak && !this.mounted;
    var plugged = !!this.flags.cartInGap;
    var minX = 4 * TS, maxX = 12 * TS, minY = 6 * TS, maxY = 7 * TS;
    e.moved = false;
    function step(tx, ty, sp) {
      var mx = clamp(tx - e.x, -sp, sp), my = clamp(ty - e.y, -sp, sp);
      if (mx) e.dir = mx > 0 ? 'right' : 'left';
      e.x += mx; e.y += my;
      e.moved = !!(mx || my);
      return Math.abs(tx - e.x) < 0.5 && Math.abs(ty - e.y) < 0.5;
    }
    if (busy && e.state !== 'leave') { return; }
    // The gap got plugged while the pony was out: it trots round to the east gate.
    if (plugged && (e.state === 'bolt' || e.state === 'bolt2' || e.state === 'bank' || e.state === 'return')) {
      if (e.y > 7 * TS + 2) { e.state = 'around'; e.wp = 0; }
      else e.state = 'graze';
    }
    switch (e.state) {
      case 'graze':
      case 'wary':
        var trigger = dist < (sneaking ? 22 : 50);
        if (trigger && !(sneaking && plugged)) { this.ponyBolt(e); break; }
        if (sneaking && plugged && dist < 56) { e.state = 'wary'; e.dir = dx > 0 ? 'right' : 'left'; break; }
        e.state = 'graze';
        e.timer--;
        if (e.timer <= 0) { e.timer = 60 + ((Math.random() * 90) | 0); e.vx = (Math.random() < 0.5 ? -1 : 1) * 0.35; if (Math.random() < 0.3) e.vx = 0; }
        if (e.vx) {
          var nx = clamp(e.x + e.vx, minX, maxX);
          if (nx === e.x) e.vx = -e.vx;
          e.dir = e.vx > 0 ? 'right' : 'left';
          e.x = nx; e.moved = true;
        }
        break;
      case 'flee':
        e.timer--;
        var away = dx > 0 ? -1 : 1;
        var fx = clamp(e.x + away * 1.7, minX, maxX);
        if (fx === e.x) { // cornered: dodge vertically
          var fy = e.y < (minY + maxY) / 2 ? maxY : minY;
          step(e.x, fy, 1.2);
        } else { e.dir = away > 0 ? 'right' : 'left'; e.x = fx; e.moved = true; }
        if (e.timer <= 0) e.state = 'graze';
        break;
      case 'bolt':
        if (Math.abs(e.x - GAP.tx * TS) > 0.5 || Math.abs(e.y - 7 * TS) > 0.5) step(GAP.tx * TS, 7 * TS, 2);
        else e.state = 'bolt2';
        break;
      case 'bolt2':
        if (step(GAP.tx * TS, 9 * TS, 2)) { e.state = 'bank'; e.timer = 160; }
        break;
      case 'bank':
        e.timer--;
        if (e.timer <= 0 || dist < 34) e.state = 'return';
        break;
      case 'return':
        if (step(GAP.tx * TS, 7 * TS, dist < 34 ? 2 : 1)) { e.state = 'graze'; e.timer = 30; }
        break;
      case 'around':
        var WP = [[e.wp === 0 ? e.x : 14 * TS, 9 * TS], [14 * TS, 9 * TS], [14 * TS, 7 * TS], [12 * TS, 7 * TS]];
        if (step(WP[e.wp][0], WP[e.wp][1], 1.6)) { e.wp++; if (e.wp >= WP.length) { e.state = 'graze'; e.timer = 40; } }
        break;
      case 'calm':
        e.dir = dx > 0 ? 'right' : 'left';
        break;
      case 'leave':
        step(16 * TS, 7 * TS, 1.2);
        e.dir = 'right';
        if (e.x >= 15 * TS) this.removeEntity(e);
        break;
    }
    if (e.moved) { e.t++; if (e.t % 8 === 0) e.frame ^= 1; }
  };

  Game.prototype.updateEntities = function (busy) {
    var list = this.entities.slice();
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.type === 'pony') this.updatePony(e, busy);
      if (e.type === 'cart' && e.slide) {
        e.slide.t++;
        var k = Math.min(1, e.slide.t / 10);
        e.x = e.slide.fx + (e.tx * TS - e.slide.fx) * k;
        e.y = e.slide.fy + (e.ty * TS - e.slide.fy) * k;
        if (k >= 1) e.slide = null;
      }
      if (e.type === 'eyes') { e.life--; if (e.life <= 0) this.removeEntity(e); }
      if (e.type === 'horse') { e.t++; if (e.t % 50 === 0) e.frame ^= 1; }
    }
  };

  // ---------- Cadi ----------
  Game.prototype.animateCadi = function (sliding) {
    var c = this.cadi, p = this.player;
    var target = null;
    if (this.screenId === '4,3' && !this.flags.haveShard) target = { x: 9 * TS, y: 5 * TS - 2 };
    else if (this.screenId === 'home' && !this.flags.leftHome) target = { x: 7 * TS, y: 8 * TS };
    else if (this.screenId === 'home' && this.flags.slept && !this.flags.haveHorse) target = { x: 8 * TS, y: 9 * TS };
    if (!target) {
      var idx = this.trail.length - 18;
      target = idx >= 0 ? this.trail[idx] : null;
      if (!target) {
        var ddx = p.x - c.x, ddy = p.y - c.y;
        if (Math.abs(ddx) + Math.abs(ddy) > 26) target = { x: p.x - Math.sign(ddx) * 14, y: p.y - Math.sign(ddy) * 6 };
      }
    }
    var moved = false;
    if (target) {
      var mx = target.x - c.x, my = target.y - c.y;
      var dist = Math.sqrt(mx * mx + my * my);
      if (dist > 1) {
        var sp = Math.min(dist, sliding ? 4 : (this.mounted ? 2.4 : 1.6));
        c.x += mx / dist * sp; c.y += my / dist * sp;
        if (Math.abs(mx) > 0.3) c.dir = mx > 0 ? 'right' : 'left';
        moved = true;
      }
    }
    if (moved) { c.anim++; if (c.anim % 7 === 0) c.frame ^= 1; }
    // Barking at something interesting
    var excited = (this.screenId === '4,3' && !this.flags.haveShard) ||
      (this.screenId === 'home' && (!this.flags.leftHome || (this.flags.slept && !this.flags.haveHorse)));
    c.barkT++;
    if (excited && c.barkT > 100 && !moved) {
      c.barkT = 0; c.bark = 30;
      if (!UI.talking) TT.audio.bark();
    }
    if (c.bark > 0) c.bark--;
  };

  // ---------- HUD ----------
  Game.prototype.objective = function () {
    var f = this.flags;
    if (!f.haveShard) return 'Cadi is barking at something down by the river.';
    if (!f.haveHalter) return f.cartInGap ? 'Sneak up on the pony: hold Shift (or Sneak).' : 'Follow the Shard\'s hum.';
    if (!f.slept) return 'Tie the Halter to your bedpost tonight. Go home to bed.';
    if (!f.haveHorse) return 'Something is waiting outside your front door.';
    return 'Chapter 1 complete. Explore Blackmill on horseback.';
  };
  Game.prototype.refreshHUD = function () {
    if (!this.screen) return;
    UI.setPlace(this.screen.name);
    UI.setObjective(this.objective());
    this.updateHum();
  };
  Game.prototype.updateHum = function () {
    var f = this.flags;
    if (!f.haveShard || f.haveHalter) { UI.setHum(0); return; }
    var here = parseId(this.screenId) || { c: 4, r: 4 };
    var tc = 3, tr = 4;
    var sd = Math.abs(here.c - tc) + Math.abs(here.r - tr);
    var level = sd === 0 ? 3 : sd === 1 ? 2 : 1;
    var ns = tr > here.r ? 'south' : tr < here.r ? 'north' : '';
    var ew = tc > here.c ? 'east' : tc < here.c ? 'west' : '';
    var word = sd === 0 ? 'right here' : (ns && ew ? ns + '-' + ew : ns || ew);
    if (this._hum !== level + word) { this._hum = level + word; UI.setHum(level, word); }
  };

  // ---------- Drawing ----------
  Game.prototype.drawMap = function (map, ox, oy) {
    var ctx = this.ctx, tiles = this.tiles;
    var frame = (this.t >> 5) & 1;
    for (var j = 0; j < map.length; j++) {
      var row = map[j];
      for (var i = 0; i < 16; i++) {
        var ch = row.charAt(i), key = ch;
        if (ch === 'f') {
          var l = row.charAt(i - 1), r = row.charAt(i + 1);
          key = (l === 'f' || l === 'g' || r === 'f' || r === 'g') ? 'f' : 'fv';
        } else if (ch === 'H') {
          key = (row.charAt(i - 1) === '=' || row.charAt(i + 1) === '=') ? 'Hh' : 'H';
        }
        var variants = tiles[key] || tiles['.'];
        var v = variants[(i * 7 + j * 13) % variants.length];
        ctx.drawImage(v[frame % v.length], ox + i * TS, oy + j * TS);
      }
    }
  };

  Game.prototype.shadow = function (x, y, w) {
    var ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(x + 8, y + 15, w || 6, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  Game.prototype.drawPlayer = function (ox, oy) {
    var p = this.player, ctx = this.ctx;
    var x = Math.round(p.x + ox), y = Math.round(p.y + oy);
    var spr = this.hero[p.dir][p.moving ? p.frame : 0];
    if (this.mounted) {
      var hs = TT.SPR.horse[this.horseDir][p.moving ? p.frame : 0];
      this.shadow(x, y, 8);
      ctx.drawImage(spr, 0, 0, 16, 11, x, y - 7, 16, 11);
      ctx.drawImage(hs, x, y);
      // Rider's legs over the horse's side
      ctx.fillStyle = TT.LOOKS.tunic[this.look.tunic][1];
      ctx.fillRect(x + 6, y + 6, 3, 3);
    } else {
      this.shadow(x, y);
      if (p.sneaking) { ctx.globalAlpha = 0.85; }
      ctx.drawImage(spr, x, y);
      ctx.globalAlpha = 1;
    }
  };

  Game.prototype.drawEntity = function (e, ox, oy) {
    var ctx = this.ctx;
    var x = Math.round(e.x + ox), y = Math.round(e.y + oy);
    switch (e.type) {
      case 'npc':
        this.shadow(x, y);
        ctx.drawImage(this.npcSprites[e.who], x, y);
        break;
      case 'sign':
        ctx.drawImage(TT.SPR.sign, x, y);
        break;
      case 'cart':
        this.shadow(x, y, 7);
        ctx.drawImage(TT.SPR.cart, x, y);
        break;
      case 'pony':
        this.shadow(x, y, 8);
        ctx.drawImage(TT.SPR.pony[e.dir][e.frame], x, y);
        if (e.state === 'wary') this.bubble(x + 10, y - 6, '?');
        break;
      case 'horse':
        this.shadow(x, y, 8);
        ctx.drawImage(TT.SPR.horse.left[0], x, y + (e.frame ? -1 : 0));
        break;
      case 'shard':
        var pulse = 0.5 + 0.5 * Math.sin(this.t / 10);
        var g = ctx.createRadialGradient(x + 8, y + 7, 1, x + 8, y + 7, 14);
        g.addColorStop(0, 'rgba(159,227,240,' + (0.55 + 0.35 * pulse) + ')');
        g.addColorStop(1, 'rgba(159,227,240,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 8, y - 8, 32, 32);
        ctx.drawImage(TT.SPR.shard, x, y + Math.round(pulse));
        break;
      case 'eyes':
        var a = Math.min(1, e.life / 40);
        ctx.globalAlpha = a;
        ctx.drawImage(TT.SPR.eyes, x, y + (e.life < 40 ? Math.round((40 - e.life) / 8) : 0));
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(200,230,255,' + (0.6 * a) + ')';
        for (var b = 0; b < 3; b++) {
          var by = y + 4 - ((this.t + b * 20) % 40) / 3;
          ctx.beginPath(); ctx.arc(x + 3 + b * 5, by, 1.5, 0, Math.PI * 2); ctx.stroke();
        }
        break;
    }
  };

  Game.prototype.drawCadi = function (ox, oy) {
    var c = this.cadi;
    var x = Math.round(c.x + ox), y = Math.round(c.y + oy);
    this.shadow(x, y, 6);
    this.ctx.drawImage(TT.SPR.cadi[c.dir][c.frame], x, y);
    if (c.bark > 0) this.bubble(x + (c.dir === 'right' ? 12 : 0), y + 0, '!');
  };

  Game.prototype.bubble = function (x, y, mark) {
    var ctx = this.ctx;
    ctx.fillStyle = '#f2efe6';
    ctx.fillRect(x - 3, y - 4, 7, 9);
    ctx.fillRect(x - 4, y - 3, 9, 7);
    ctx.fillStyle = '#1d1a24';
    if (mark === '!') { ctx.fillRect(x, y - 2, 1, 4); ctx.fillRect(x, y + 3, 1, 1); }
    else { ctx.fillRect(x - 1, y - 2, 3, 1); ctx.fillRect(x + 1, y - 1, 1, 2); ctx.fillRect(x, y + 1, 1, 1); ctx.fillRect(x, y + 3, 1, 1); }
  };

  Game.prototype.render = function () {
    var ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (this.mode === 'title' || !this.screen) {
      this.drawMap(TT.SCREENS['4,3'].map, 0, 0);
      ctx.fillStyle = 'rgba(20,18,28,0.35)';
      ctx.fillRect(0, 0, W, H);
      return;
    }
    var ox = 0, oy = 0;
    if (this.slide) {
      var s = this.slide, k = s.t / s.dur;
      k = k * k * (3 - 2 * k);
      var offX = s.dx * W, offY = s.dy * H;
      this.drawMap(s.oldMap, Math.round(-offX * k), Math.round(-offY * k));
      ox = Math.round(offX * (1 - k)); oy = Math.round(offY * (1 - k));
    }
    this.drawMap(this.map, ox, oy);

    // Draw everything sorted by the y of their feet.
    var self = this, items = [];
    this.entities.forEach(function (e) { items.push({ y: e.y + (e.type === 'eyes' ? -100 : 0), draw: function () { self.drawEntity(e, ox, oy); } }); });
    items.push({ y: this.cadi.y, draw: function () { self.drawCadi(ox, oy); } });
    items.push({ y: this.player.y + 0.5, draw: function () { self.drawPlayer(ox, oy); } });
    items.sort(function (a, b) { return a.y - b.y; });
    items.forEach(function (it) { it.draw(); });

    if (this.nightA > 0) {
      ctx.fillStyle = 'rgba(8,12,36,' + this.nightA + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (this.fadeA > 0) {
      ctx.fillStyle = 'rgba(0,0,0,' + this.fadeA + ')';
      ctx.fillRect(0, 0, W, H);
    }
  };

  TT.Game = Game;
})();
