// All art is drawn in code: pixel sprites from text grids, tiles painted procedurally.
(function () {
  'use strict';
  var TT = window.TT;

  var PAL = {
    k: '#1d1a24', h: '#8a3b1e', s: '#e8b48a', S: '#b97a56', g: '#3f7d4e', G: '#2a5537',
    w: '#f2efe6', b: '#6b4a2f', B: '#4a3220', y: '#e8a33a', Y: '#ffd27a', o: '#d9823b',
    O: '#a85a22', c: '#9fe3f0', C: '#4fb3c9', a: '#c8c6d4', e: '#9a97a6', D: '#45405a',
    v: '#4f6b45', V: '#34492f', r: '#b23a3a', p: '#e889b0'
  };
  TT.PAL = PAL;

  // Character looks offered on the new-game screen.
  TT.LOOKS = {
    hair: ['#8a3b1e', '#2a2224', '#d9b45a', '#5a3a24'],
    skin: [['#e8b48a', '#b97a56'], ['#c48a5c', '#8f5f3a'], ['#8a5a3c', '#5e3b26']],
    tunic: [['#3f7d4e', '#2a5537'], ['#3b5f9e', '#283f6b'], ['#a8443a', '#702b25']]
  };

  function canvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  TT.canvas = canvas;

  // Build a 16x16 sprite canvas from 16 strings. `over` swaps palette letters.
  function sprite(rows, over, flip) {
    var c = canvas(16, 16), x = c.getContext('2d');
    for (var j = 0; j < 16; j++) {
      var r = (rows[j] || '').padEnd(16, '.');
      for (var i = 0; i < 16; i++) {
        var ch = r.charAt(i);
        if (ch === '.') continue;
        var col = (over && over[ch]) || PAL[ch];
        if (!col) continue;
        x.fillStyle = col;
        x.fillRect(flip ? 15 - i : i, j, 1, 1);
      }
    }
    return c;
  }
  TT.sprite = sprite;

  function withLegs(rows, legs) {
    return rows.slice(0, 16 - legs.length).concat(legs);
  }

  // ---------- Sprite grids ----------
  var HERO_DOWN = [
    '................',
    '.....kkkkkk.....',
    '....khhhhhhk....',
    '...khhhhhhhhk...',
    '...khsssssshk...',
    '...khsksskshk...',
    '....kssssssk....',
    '.....kSssSk.....',
    '....kggwwggk....',
    '...kggggggggk...',
    '...ksggggggsk...',
    '....kBByBBBk....',
    '....kggggggk....',
    '....kGgkkgGk....',
    '....kbbkkbbk....',
    '....kkk..kkk....'
  ];
  var HERO_DOWN_LEGS = ['....kGgkkgGk....', '....kbbk.kbk....', '....kkk...kk....'];
  var HERO_UP = [
    '................',
    '.....kkkkkk.....',
    '....khhhhhhk....',
    '...khhhhhhhhk...',
    '...khhhhhhhhk...',
    '...khhhhhhhhk...',
    '....khhhhhhk....',
    '.....kSssSk.....',
    '....kggggggk....',
    '...kggggggggk...',
    '...ksggggggsk...',
    '....kBBBBBBk....',
    '....kggggggk....',
    '....kGgkkgGk....',
    '....kbbkkbbk....',
    '....kkk..kkk....'
  ];
  var HERO_UP_LEGS = ['....kGgkkgGk....', '....kbk.kbbk....', '....kk...kkk....'];
  var HERO_SIDE = [
    '................',
    '.....kkkkkk.....',
    '....khhhhhhk....',
    '...khhhhhhhhk...',
    '...khhhhsssssk..',
    '...khhhsssksk...',
    '....khhssssssk..',
    '.....kkSsssk....',
    '......kggwgk....',
    '.....kgggggk....',
    '.....kgsgggk....',
    '.....kBByBBk....',
    '.....kggggk.....',
    '.....kGkkgGk....',
    '.....kbk.kbk....',
    '.....kk...kk....'
  ];
  var HERO_SIDE_LEGS = ['......kGGk......', '......kbbk......', '......kkkk......'];

  var CADI = [
    '................',
    '................',
    '................',
    '..........kk.kk.',
    '..........kOkkOk',
    '.........koooook',
    '.........koookok',
    '..kk.....kowwwwk',
    '.kookkkkkkowwwk.',
    '..koOOOOooowwk..',
    '..kooOOoooowwk..',
    '..kwoooooooowk..',
    '..kwwwwwwwwwwk..',
    '...kok....kok...',
    '...kwk....kwk...',
    '...kkk....kkk...'
  ];
  var CADI_LEGS = ['..kok......kok..', '..kwk......kwk..', '..kkk......kkk..'];

  var PONY = [
    '................',
    '...........kk...',
    '..........kaak..',
    '.........kDaaak.',
    '........kDaakaak',
    '........kDabaaak',
    '........kDbbbaak',
    '.kkkkkkkkDaaakk.',
    'kDaaaaaaaaaaak..',
    'kDaaaaaaaaaaak..',
    'kDaeaaaaaaaeak..',
    '.kaeeeeeeeeeak..',
    '..kak..kak.kak..',
    '..kak..kak.kak..',
    '..kDk..kDk.kDk..',
    '................'
  ];
  var PONY_LEGS = ['.kak...kak..kak.', '.kak....kak.kak.', '.kDk....kDk.kDk.', '................'];

  var CART = [
    '................',
    '................',
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kBbbbbbbbbbbBk.',
    '.kbBbbbbbbbbBbk.',
    '.kbbBbbbbbbBbbk.',
    '.kbbbbbbbbbbbbk.',
    '.kkkkkkkkkkkkkk.',
    '..kkk......kkk..',
    '.kaaak....kaaak.',
    '.kakak....kakak.',
    '.kaaak....kaaak.',
    '..kkk......kkk..',
    '................',
    '................'
  ];

  var SHARD = [
    '................',
    '................',
    '................',
    '.......k........',
    '......kck.......',
    '......kcck......',
    '.....kcCck......',
    '.....kccCck.....',
    '.....kCccck.....',
    '......kcck......',
    '.......kk.......',
    '................',
    '................',
    '................',
    '................',
    '................'
  ];

  var EYES = [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '...kkk....kkk...',
    '..kvYvk..kvYvk..',
    '..kvkvk..kvkvk..',
    '...kkk....kkk...',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................'
  ];

  var SIGN = [
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '..kbbbbbbbbbbk..',
    '..kbBBBBBBBBbk..',
    '..kbbbbbbbbbbk..',
    '..kbBBBBBBbbbk..',
    '..kbbbbbbbbbbk..',
    '..kkkkkkkkkkkk..',
    '.......kk.......',
    '.......bk.......',
    '.......bk.......',
    '.......bk.......',
    '.......bk.......',
    '......kkkk......',
    '................'
  ];

  // ---------- Sprite sets ----------
  TT.makeHero = function (look) {
    look = look || { hair: 0, skin: 0, tunic: 0 };
    var L = TT.LOOKS;
    var skin = L.skin[look.skin] || L.skin[0];
    var tun = L.tunic[look.tunic] || L.tunic[0];
    var over = { h: L.hair[look.hair] || L.hair[0], s: skin[0], S: skin[1], g: tun[0], G: tun[1] };
    return {
      down: [sprite(HERO_DOWN, over), sprite(withLegs(HERO_DOWN, HERO_DOWN_LEGS), over)],
      up: [sprite(HERO_UP, over), sprite(withLegs(HERO_UP, HERO_UP_LEGS), over)],
      right: [sprite(HERO_SIDE, over), sprite(withLegs(HERO_SIDE, HERO_SIDE_LEGS), over)],
      left: [sprite(HERO_SIDE, over, true), sprite(withLegs(HERO_SIDE, HERO_SIDE_LEGS), over, true)]
    };
  };

  // Villagers reuse the hero's front sprite with their own colours.
  TT.makeNPC = function (c) {
    var over = {
      h: c.hair, s: c.skin || '#e8b48a', S: c.skinShade || '#b97a56',
      g: c.shirt, G: c.shirtShade || c.shirt, y: c.belt || '#4a3220',
      b: c.legs || '#3a3a4a', w: c.collar || '#f2efe6'
    };
    return sprite(HERO_DOWN, over);
  };

  TT.SPR = {
    cadi: { right: [sprite(CADI), sprite(withLegs(CADI, CADI_LEGS))], left: [sprite(CADI, null, true), sprite(withLegs(CADI, CADI_LEGS), null, true)] },
    pony: { right: [sprite(PONY), sprite(withLegs(PONY, PONY_LEGS))], left: [sprite(PONY, null, true), sprite(withLegs(PONY, PONY_LEGS), null, true)] },
    horse: { right: [sprite(PONY, { a: '#8a5a3c', e: '#6b4a2f', D: '#2a2224' }), sprite(withLegs(PONY, PONY_LEGS), { a: '#8a5a3c', e: '#6b4a2f', D: '#2a2224' })],
             left: [sprite(PONY, { a: '#8a5a3c', e: '#6b4a2f', D: '#2a2224' }, true), sprite(withLegs(PONY, PONY_LEGS), { a: '#8a5a3c', e: '#6b4a2f', D: '#2a2224' }, true)] },
    cart: sprite(CART),
    shard: sprite(SHARD),
    eyes: sprite(EYES),
    sign: sprite(SIGN)
  };

  // ---------- Tiles ----------
  function T() { var c = canvas(16, 16); return { c: c, x: c.getContext('2d') }; }
  function fill(x, col) { x.fillStyle = col; x.fillRect(0, 0, 16, 16); }
  function px(x, i, j, col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); }
  function rect(x, i, j, w, h, col) { x.fillStyle = col; x.fillRect(i, j, w, h); }
  function specks(x, r, col, n) { for (var i = 0; i < n; i++) px(x, (r() * 16) | 0, (r() * 16) | 0, col); }
  function pattern(x, rows, map) {
    for (var j = 0; j < rows.length; j++) {
      for (var i = 0; i < rows[j].length; i++) {
        var col = map[rows[j].charAt(i)];
        if (col) px(x, i, j, col);
      }
    }
  }

  function grass(x, r) {
    fill(x, '#4f8a45');
    specks(x, r, '#5d9a50', 18);
    specks(x, r, '#427a3b', 12);
    for (var i = 0; i < 4; i++) { var a = (r() * 15) | 0, b = (r() * 14) | 0; rect(x, a, b, 1, 2, '#6aa85a'); }
  }
  function flowers(x, r) {
    grass(x, r);
    var cols = ['#f2efe6', '#e889b0', '#ffd27a'];
    for (var i = 0; i < 3; i++) {
      var a = 2 + ((r() * 12) | 0), b = 2 + ((r() * 12) | 0), c = cols[(r() * 3) | 0];
      px(x, a - 1, b, c); px(x, a + 1, b, c); px(x, a, b - 1, c); px(x, a, b + 1, c); px(x, a, b, '#e8a33a');
    }
  }
  function path(x, r) {
    fill(x, '#b89c6b');
    specks(x, r, '#a6895a', 22);
    specks(x, r, '#c9b080', 14);
    specks(x, r, '#8d7650', 4);
  }
  var TREE = [
    '.....xxxxxx.....',
    '...xxmmmmmmxx...',
    '..xmmmlllmmmmx..',
    '.xmmllllmmmmmmx.',
    '.xmmlllmmmmmmmx.',
    'xmmmmmmmmmmmmmmx',
    'xmmmmmmmmmmmmdmx',
    'xmmmmmmmmmmmddmx',
    '.xmmmmmmmmmddmx.',
    '.xddmmmmmmdddx..',
    '..xxddddddxxx...',
    '....xxbbbxx.....',
    '......bBb.......',
    '......bBb.......',
    '....zbbBbbz.....',
    '...zzzzzzzzz....'
  ];
  var TREE_MAP = { x: '#1f3d24', m: '#3d7a42', l: '#5aa35c', d: '#2f5f35', b: '#6b4a2f', B: '#4a3220', z: '#3c6e37' };
  var BUSH = [
    '................',
    '................',
    '................',
    '................',
    '.....xxxxxx.....',
    '...xxmmlllmxx...',
    '..xmmllmmmmmmx..',
    '..xmmmmmmmmmdx..',
    '.xmmmmmmmmmmddx.',
    '.xmmmmmmmmmdddx.',
    '.xddmmmmmmdddx..',
    '..xxddddddxxx...',
    '...zzzzzzzzzz...',
    '................',
    '................',
    '................'
  ];
  function water(x, r, frame) {
    fill(x, '#3a6fa8');
    specks(x, r, '#30609a', 10);
    for (var i = 0; i < 4; i++) {
      var a = (((r() * 12) | 0) + frame * 3) % 13, b = (r() * 15) | 0;
      rect(x, a, b, 3, 1, '#5b8fc6');
    }
  }
  function deep(x, r, frame) {
    fill(x, '#22507e');
    specks(x, r, '#1b4470', 12);
    for (var i = 0; i < 3; i++) {
      var a = (((r() * 12) | 0) + frame * 2) % 13, b = (r() * 15) | 0;
      rect(x, a, b, 3, 1, '#2f6396');
    }
  }
  function shallow(x, r, frame) {
    fill(x, '#69a3c7');
    specks(x, r, '#8fb9d2', 10);
    for (var i = 0; i < 3; i++) rect(x, (r() * 13) | 0, (r() * 13) | 0, 2, 2, '#4f86ad');
    for (var j = 0; j < 2; j++) rect(x, (((r() * 12) | 0) + frame * 3) % 13, (r() * 15) | 0, 3, 1, '#a9d0e6');
  }
  function bridge(x, r, horizTravel) {
    fill(x, '#9a7445');
    for (var i = 0; i < 16; i += 4) {
      if (horizTravel) rect(x, i, 0, 1, 16, '#6b4a2f'); else rect(x, 0, i, 16, 1, '#6b4a2f');
    }
    specks(x, r, '#b08a58', 10);
    if (horizTravel) { rect(x, 0, 0, 16, 2, '#4a3220'); rect(x, 0, 14, 16, 2, '#4a3220'); }
    else { rect(x, 0, 0, 2, 16, '#4a3220'); rect(x, 14, 0, 2, 16, '#4a3220'); }
  }
  function log(x, r) {
    grass(x, r);
    rect(x, 0, 5, 16, 7, '#6b4a2f');
    rect(x, 0, 5, 16, 2, '#8a6440');
    rect(x, 0, 11, 16, 1, '#4a3220');
    for (var i = 0; i < 4; i++) rect(x, (r() * 14) | 0, 7 + ((r() * 3) | 0), 3, 1, '#4a3220');
  }
  function thicket(x, r) {
    fill(x, '#2f4a2a');
    for (var i = 0; i < 6; i++) {
      var a = (r() * 14) | 0, b = (r() * 14) | 0;
      rect(x, a, b, 3, 1, '#5a3a4a'); rect(x, a + 1, b + 1, 1, 2, '#5a3a4a');
    }
    specks(x, r, '#c9c6cf', 8);
    specks(x, r, '#7a2f5a', 5);
    specks(x, r, '#3e6236', 10);
  }
  function fence(x, r, vertical) {
    grass(x, r);
    if (vertical) {
      rect(x, 6, 0, 2, 16, '#8a6440'); rect(x, 10, 0, 2, 16, '#8a6440');
      rect(x, 4, 2, 8, 3, '#6b4a2f'); rect(x, 4, 11, 8, 3, '#6b4a2f');
    } else {
      rect(x, 0, 6, 16, 2, '#8a6440'); rect(x, 0, 10, 16, 2, '#8a6440');
      rect(x, 0, 12, 16, 1, '#3c6e37');
      rect(x, 2, 3, 3, 11, '#6b4a2f'); rect(x, 11, 3, 3, 11, '#6b4a2f');
    }
  }
  function gap(x, r) {
    grass(x, r);
    rect(x, 0, 6, 2, 8, '#6b4a2f'); rect(x, 14, 6, 2, 8, '#6b4a2f');
  }
  function soil(x, r) {
    fill(x, '#6b4a2f');
    for (var j = 2; j < 16; j += 4) rect(x, 0, j, 16, 1, '#5a3c25');
    specks(x, r, '#7d5a3a', 14);
  }
  function crops(x, r) {
    soil(x, r);
    [[4, 5], [11, 11]].forEach(function (p) {
      var a = p[0], b = p[1];
      rect(x, a - 3, b - 2, 7, 5, '#3d7a42');
      rect(x, a - 2, b - 3, 5, 7, '#3d7a42');
      rect(x, a - 1, b - 1, 3, 3, '#8ccf7e');
      px(x, a, b, '#5aa35c');
    });
  }
  function roof(x, r, dark) {
    fill(x, dark ? '#3d3a4c' : '#4b4f63');
    for (var j = 3; j < 16; j += 4) rect(x, 0, j, 16, 1, dark ? '#2e2b3a' : '#3a3d4e');
    for (var row = 0; row < 4; row++) {
      for (var i = (row % 2) * 4; i < 16; i += 8) rect(x, i, row * 4, 1, 3, dark ? '#2e2b3a' : '#3a3d4e');
    }
    specks(x, r, dark ? '#4a4660' : '#5d6278', 8);
  }
  function wall(x, r) {
    fill(x, '#e9e4d6');
    specks(x, r, '#d6d0c0', 14);
    rect(x, 0, 14, 16, 2, '#b8b09c');
  }
  function windowTile(x, r) {
    wall(x, r);
    rect(x, 3, 3, 10, 9, '#4a3220');
    rect(x, 4, 4, 8, 7, '#2f4f6e');
    rect(x, 7, 4, 1, 7, '#4a3220'); rect(x, 4, 7, 8, 1, '#4a3220');
    px(x, 5, 5, '#7fa6c9'); px(x, 9, 5, '#7fa6c9');
  }
  function door(x, r) {
    wall(x, r);
    rect(x, 3, 1, 10, 15, '#4a3220');
    rect(x, 4, 2, 8, 14, '#9b3a2a');
    rect(x, 7, 2, 1, 14, '#7a2c20');
    px(x, 10, 9, '#ffd27a');
  }
  function stoneWall(x, r) {
    fill(x, '#8c8a93');
    for (var j = 0; j < 16; j += 5) rect(x, 0, j, 16, 1, '#6e6c76');
    for (var row = 0; row < 4; row++) for (var i = (row % 2) * 4; i < 16; i += 8) rect(x, i, row * 5, 1, 5, '#6e6c76');
    specks(x, r, '#a5a3ad', 10);
  }
  function chapelDoor(x, r) {
    stoneWall(x, r);
    rect(x, 4, 4, 8, 12, '#4a3220');
    rect(x, 5, 3, 6, 1, '#4a3220');
    rect(x, 5, 5, 6, 11, '#6b4a2f');
    rect(x, 7, 5, 1, 11, '#4a3220');
  }
  function well(x, r) {
    grass(x, r);
    rect(x, 2, 3, 12, 11, '#55525c');
    rect(x, 3, 4, 10, 9, '#8c8a93');
    rect(x, 5, 6, 6, 5, '#3a6fa8');
    px(x, 6, 7, '#9fe3f0'); px(x, 7, 7, '#9fe3f0');
    specks(x, r, '#a5a3ad', 4);
  }
  function gate(x, r) {
    path(x, r);
    rect(x, 2, 0, 3, 16, '#6b4a2f'); rect(x, 11, 0, 3, 16, '#6b4a2f');
    rect(x, 0, 3, 16, 2, '#8a6440'); rect(x, 0, 11, 16, 2, '#8a6440');
    for (var j = 0; j < 16; j++) px(x, (j * 0.9) | 0, j, '#8a6440');
  }
  function grave(x, r) {
    grass(x, r);
    rect(x, 4, 4, 8, 10, '#55525c');
    rect(x, 5, 3, 6, 1, '#55525c');
    rect(x, 5, 4, 6, 9, '#8c8a93');
    rect(x, 6, 6, 4, 1, '#6e6c76'); rect(x, 6, 8, 4, 1, '#6e6c76');
    px(x, 5, 12, '#5f9c50'); px(x, 10, 11, '#5f9c50');
    rect(x, 3, 14, 10, 1, '#3c6e37');
  }
  function rock(x, r) {
    grass(x, r);
    rect(x, 3, 6, 10, 8, '#55525c');
    rect(x, 4, 5, 8, 8, '#8c8a93');
    rect(x, 5, 6, 3, 2, '#a5a3ad');
  }
  function floor(x, r) {
    fill(x, '#a07a4c');
    for (var j = 3; j < 16; j += 4) rect(x, 0, j, 16, 1, '#7d5a3a');
    specks(x, r, '#b08a58', 10);
    for (var row = 0; row < 4; row++) rect(x, ((r() * 14) | 0), row * 4, 1, 3, '#7d5a3a');
  }
  function iwall(x, r) {
    fill(x, '#7a5a3c');
    for (var i = 0; i < 16; i += 4) rect(x, i, 0, 1, 16, '#5e4430');
    rect(x, 0, 0, 16, 3, '#4a3220');
    rect(x, 0, 13, 16, 3, '#5e4430');
    specks(x, r, '#8a6a4a', 6);
  }
  function bedTop(x, r) {
    floor(x, r);
    rect(x, 1, 0, 14, 16, '#4a3220');
    rect(x, 2, 2, 12, 14, '#b23a3a');
    rect(x, 3, 3, 10, 5, '#f2efe6');
    rect(x, 2, 10, 12, 1, '#7a1f2a');
  }
  function bedBottom(x, r) {
    floor(x, r);
    rect(x, 1, 0, 14, 14, '#4a3220');
    rect(x, 2, 0, 12, 12, '#b23a3a');
    for (var i = 3; i < 13; i += 3) rect(x, i, 2, 1, 9, '#7a1f2a');
    rect(x, 1, 12, 14, 3, '#6b4a2f');
  }
  function table(x, r) {
    floor(x, r);
    rect(x, 2, 3, 12, 8, '#4a3220');
    rect(x, 3, 4, 10, 6, '#8a6440');
    rect(x, 3, 11, 2, 4, '#4a3220'); rect(x, 11, 11, 2, 4, '#4a3220');
    rect(x, 6, 5, 3, 2, '#f2efe6');
  }
  function hearth(x, r, frame) {
    iwall(x, r);
    rect(x, 2, 4, 12, 12, '#55525c');
    rect(x, 4, 7, 8, 9, '#1d1a24');
    rect(x, 5, 11 - frame, 6, 5 + frame, '#e8a33a');
    rect(x, 6, 12 - frame, 4, 3, '#ffd27a');
  }
  function mat(x, r) {
    floor(x, r);
    rect(x, 2, 3, 12, 10, '#7a1f2a');
    rect(x, 3, 4, 10, 8, '#b23a3a');
    rect(x, 5, 6, 6, 4, '#e8a33a');
  }
  function sand(x, r) {
    fill(x, '#7a6a52');
    specks(x, r, '#8d7c60', 14);
    specks(x, r, '#665844', 10);
  }

  // Tile char -> painter. Painters taking a frame are animated (2 frames).
  var PAINT = {
    '.': grass, ',': flowers, '=': path, 'T': null, 'b': null,
    'w': water, 'W': deep, 's': shallow, 'L': log, 'X': thicket,
    'g': gap, 'a': soil, 'c': crops, 'R': function (x, r) { roof(x, r, false); },
    'K': function (x, r) { roof(x, r, true); }, 'M': wall, 'N': windowTile, 'D': door,
    'C': stoneWall, 'Q': chapelDoor, 'O': well, 'G': gate, 'y': grave, 'r': rock,
    'I': iwall, 'i': floor, 'B': bedTop, 'E': bedBottom, 't': table, 'h': hearth, 'd': mat, 'n': sand
  };
  var ANIMATED = { w: 1, W: 1, s: 1, h: 1 };

  TT.buildTiles = function () {
    var tiles = {};
    Object.keys(PAINT).forEach(function (ch) {
      var variants = [];
      for (var v = 0; v < 3; v++) {
        var frames = [];
        var nFrames = ANIMATED[ch] ? 2 : 1;
        for (var f = 0; f < nFrames; f++) {
          var t = T(), r = TT.rng(ch.charCodeAt(0) * 1000 + v * 17 + 1);
          if (ch === 'T') { grass(t.x, r); pattern(t.x, TREE, TREE_MAP); }
          else if (ch === 'b') { grass(t.x, r); pattern(t.x, BUSH, TREE_MAP); }
          else PAINT[ch](t.x, r, f);
          frames.push(t.c);
        }
        variants.push(frames);
      }
      tiles[ch] = variants;
    });
    // Orientation variants
    var fv = T(); fence(fv.x, TT.rng(5), true); tiles.fv = [[fv.c]];
    var fh = T(); fence(fh.x, TT.rng(6), false); tiles.f = [[fh.c]];
    var bv = T(); bridge(bv.x, TT.rng(7), false); tiles.H = [[bv.c]];
    var bh = T(); bridge(bh.x, TT.rng(8), true); tiles.Hh = [[bh.c]];
    return tiles;
  };
})();
