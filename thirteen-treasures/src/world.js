// The world of Chapter 1: Blackmill village. Maps, people, signs and story text.
// Map key (16 x 11 tiles per screen):
//  .  grass        ,  flowers      =  path        T  tree         b  bush
//  w  river        W  deep pool    s  shallows    H  bridge       L  fallen oak
//  X  thicket      f  fence        g  fence gap   a  soil         c  crops
//  R  roof         K  chapel roof  M  wall        N  window       D  door
//  C  chapel wall  Q  chapel door  O  holy well   G  gate         y  gravestone
//  r  rock         I  inside wall  i  floor       B/E bed         t  table
//  h  hearth       d  doormat (way out)
(function () {
  'use strict';
  var TT = window.TT;

  TT.SCREENS = {
    'home': {
      name: 'Home', interior: true,
      map: [
        'IIIIIIIhhIIIIIII',
        'IBiiiiiiiiiitiiI',
        'IEiiiiiiiiiiiiiI',
        'IiiiiiiiiiiiiiiI',
        'IiiiiiiiiiiiiiiI',
        'IiiiiiiiiiiiiiiI',
        'IiiiiiiiiiiiiiiI',
        'IiiiiiiiiiiiiiiI',
        'IiiiiiiiiiiiiiiI',
        'IiiiiiiiiiiiiiiI',
        'IIIIIIIdIIIIIIII'
      ]
    },
    '3,3': {
      name: 'The Junction',
      map: [
        'TTRRRRRRRRTTTTTT',
        'T.RRRRRRRRT..,.T',
        'T.MNMMDMNM.....T',
        'T.....=..,....bT',
        'wwwwwwHwwwwwwwww',
        'wwwwwwHwwwwwwwww',
        'T.....=.........',
        'G===============',
        'G===============',
        'T..,.....b...,.T',
        'TTTTTTTTTTTTTTTT'
      ]
    },
    '4,3': {
      name: 'Meeting of the Rivers',
      map: [
        'TTTLLTTwwTTTTTTT',
        'T..==..ww..,..TT',
        'T.,==..ww.....bT',
        'T..==..ww..O...T',
        'wwwHHwwww.......',
        'wwwHHwwww.......',
        '...==..wws......',
        '=======HH=======',
        '=======HH=======',
        '...==..ww...b..T',
        'TT.==TTwwTTTTTTT'
      ]
    },
    '5,3': {
      name: 'Chapel and Bridge',
      map: [
        'TTTTKKKKKKTTTTTT',
        'T...KKKKKK....TT',
        'T...CCCQCC..y.yT',
        'T......=....y..T',
        'T.,....=..y..y.T',
        'T......=.......T',
        '......==.......T',
        '===============G',
        '===============G',
        'T.b....,...==..T',
        'TTTTTTTTTTT==TTT'
      ]
    },
    '3,4': {
      name: 'The Allotments',
      map: [
        'TTTTTTTTTTTTTTTT',
        'T.ffffffffffff.T',
        'T.faaccaaccaaf.T',
        'T.faaccaaccaaf.T',
        'T.fa...a.....f.T',
        'T.faaccaaccaaf.T',
        'T.fa.........===',
        'T.fa.........===',
        'T.ffffffgfffff.T',
        'T..............T',
        'wwwwwwwwwwwwwwww'
      ]
    },
    '4,4': {
      name: 'Main Street',
      map: [
        'TT.==TTwwTTTTTTT',
        'T..==..ww..RRRRT',
        'T..==..ww..RRRRT',
        'T..==..ww..MDNMT',
        'T..==..ww...=..T',
        'T..==..ww...=..T',
        '=======HH=======',
        '=======HH=======',
        'T..==..WWWW....T',
        'T..==.WWWWWW...T',
        'TTTXXTTwwTTTTTTT'
      ]
    },
    '5,4': {
      name: 'The Fox and Hounds',
      map: [
        'TTTTTTTTTTT==TTT',
        'T..........==..T',
        'T.RRRRRR...==..T',
        'T.RRRRRR...==..T',
        'T.MNMDMM...==..T',
        'T....=.....==..T',
        '===============T',
        '===============T',
        'T..,......b....T',
        'T....b.....,...T',
        'TTTTTTTTTTTTTTTT'
      ]
    }
  };

  // Doors you can walk through. Others just say something when you bump them.
  TT.DOORS = [
    { from: '4,4', tx: 12, ty: 3, to: 'home', px: 7, py: 9 },
    { from: 'home', tx: 7, ty: 10, to: '4,4', px: 12, py: 4 }
  ];

  TT.LOCKED = {
    '3,3:6,2': 'The Junction is locked. A card in the window says "Open 6pm". Through the glass you can see the dartboard and a dog asleep under a table.',
    '5,3:7,2': 'The chapel door is locked. A notice says: "Choir practice Thursday. All voices welcome. Even Bryn."',
    '5,4:5,4': 'The Fox and Hounds is shut until six. Somewhere inside, someone is singing very badly.'
  };

  // Things to read or poke at on the map, by tile letter.
  TT.TILE_TEXT = {
    L: function (g) {
      return g.flags.haveHorse
        ? ['Your horse eyes the fallen oak and paws the ground. It could clear that easily.\nBeyond lies Allt-y-Rhiw, the old wood.', '(Chapter 2, "The Fair Folk\'s Feast", is coming soon.)']
        : ['A huge fallen oak blocks the path north into Allt-y-Rhiw. Far too big to climb.\nA good horse might jump it.'];
    },
    X: function () { return ['Brambles and tangled old fishing nets choke the river path south toward Ogmore.\nYou\'d need something sharp. Very sharp.']; },
    G: function (g) {
      return g.screenId === '3,3'
        ? ['The gate to Cwm Rhyd y Milwr, the valley of the soldier\'s ford, is tied shut with twine.\nSomeone has scratched on it: NOT AFTER DARK.']
        : ['The gate to Dimbath lane is wired shut. A hand-painted sign: "Beware of the dogs." Underneath, smaller: "They\'re not our dogs."'];
    },
    W: function (g) { return g.afancStir(); },
    w: function () { return ['The river runs quick and cold.']; },
    O: function (g) { return g.useWell(); },
    y: function () { return ['An old gravestone, worn smooth. You can just make out a name: "…ap Ifan."']; },
    B: function (g) { return g.useBed(); },
    E: function (g) { return g.useBed(); },
    h: function () { return ['The fire crackles. The kettle\'s always on in this house.']; },
    t: function () { return ['Bara brith on the table. You take a slice for later. Cadi watches every crumb.']; },
    c: function () { return ['Cabbages. Several have big pony-shaped bites out of them.']; },
    f: function () { return ['A wooden fence around Mr Pritchard\'s allotments.']; }
  };

  // ---------- People ----------
  var VILLAGERS = {
    dai: { name: 'Dai the Fisherman', hair: '#b8b3a8', shirt: '#3b5f9e', shirtShade: '#283f6b', legs: '#45405a' },
    bryn: { name: 'Bryn', hair: '#2a2224', shirt: '#a8443a', shirtShade: '#702b25' },
    glyn: { name: 'Glyn', hair: '#d9b45a', shirt: '#6e6a64', shirtShade: '#4a4740' },
    gwen: { name: 'Gwen the Caretaker', hair: '#5a3a24', shirt: '#6f4aa3', shirtShade: '#4a3070', skin: '#c48a5c', skinShade: '#8f5f3a' },
    huw: { name: 'Huw, Landlord of the Fox and Hounds', hair: '#8a3b1e', shirt: '#f2efe6', shirtShade: '#c9c6cf', collar: '#b23a3a' },
    pritchard: { name: 'Mr Pritchard', hair: '#9a97a6', shirt: '#4f6b45', shirtShade: '#34492f', skin: '#8a5a3c', skinShade: '#5e3b26' }
  };
  TT.VILLAGERS = VILLAGERS;

  TT.TALK = {
    dai: function (g) {
      if (g.flags.sawAfanc) return [['Dai', 'Seen it, have you? Eyes like car headlamps. That\'s the Afanc, that is. My grandad always said it was older than the river.']];
      return [['Dai', 'Morning, {name}. Don\'t go fishing the deep pool by the bridge on Main Street.'], ['Dai', 'Something down there took my best line, rod and all. Big as a cow. Eyes like lamps.']];
    },
    bryn: function (g) {
      var lines = [
        [['Bryn', 'That pony came galloping up off the river first thing. Lathered up, eyes rolling, like something had a go at it.']],
        [['Bryn', 'They say old King Arthur\'s buried up on Mynydd y Gaer. Fortress mountain.'], ['Glyn', 'They say a lot of things in the Junction, Bryn.']],
        [['Bryn', 'Huw at the Fox and Hounds swears there\'s hounds running on Dimbath at night. White ones.'], ['Bryn', 'Mind you, Huw also swears his cider\'s "award-winning".']]
      ];
      return lines[(g.talkCount('bryn')) % lines.length];
    },
    glyn: function (g) {
      if (g.flags.haveHalter) return [['Glyn', 'You caught that pony? With a bit of old rope? Bryn owes me a pint.']];
      return [['Glyn', 'If you\'re after that pony, it\'s in Pritchard\'s allotments. Has been all morning. He\'s fuming.'], ['Glyn', 'Allotments are south of here. Past the meeting of the rivers, along Main Street, then west.']];
    },
    gwen: function (g) {
      return [
        ['Gwen', 'Morning, {name}. You\'ve heard the old story? That King Arthur was laid to rest up on Mynydd y Gaer, above the village.'],
        ['Gwen', 'My gran swore she heard horses up on the mountain on still nights. Hooves, and the jingle of harness. And nobody there.'],
        ['Gwen', 'The old church up there might know more. But that\'s a long walk for another day.']
      ];
    },
    huw: function (g) {
      if (g.flags.haveHorse) return [['Huw', 'Now there\'s a fine horse! Where\'d you get a beast like that overnight?'], ['Huw', '…No, don\'t tell me. In Blackmill it\'s best not to ask.']];
      return [
        ['Huw', 'We\'re shut till six, bach.'],
        ['Huw', 'See the sign? The Fox and Hounds. Most think it\'s a hunting pub. It\'s not those hounds.'],
        ['Huw', 'On wild nights they come down off Dimbath. White as frost, ears red as blood. I\'ve heard them go past the window, baying.'],
        ['Huw', 'The Hounds of Annwn, my gran called them. The Otherworld\'s own dogs. You stay in after dark.']
      ];
    },
    pritchard: function (g) {
      if (g.flags.haveHalter) return [['Mr Pritchard', 'Calmed it down, did you? Good. Now who\'s paying for my cabbages?']];
      if (g.flags.cartInGap) return [['Mr Pritchard', 'You\'ve blocked the gap! Clever. Now go soft, mind. Hold Sneak and creep up on it.']];
      return [
        ['Mr Pritchard', 'That pony has had half my cabbages! Came up off the river in a right state.'],
        ['Mr Pritchard', 'Every time I go near, it bolts out through that gap in the bottom fence, down to the water. Then back it comes for more cabbage.'],
        ['Mr Pritchard', 'If something blocked that gap… my old cart, maybe? Push it, it rolls. And don\'t stomp about. Walk soft.']
      ];
    }
  };

  // What appears on each screen. Positions are in tiles.
  TT.spawnFor = function (id, flags) {
    var list = [];
    function add(o) { list.push(o); }
    switch (id) {
      case 'home':
        break;
      case '3,3':
        add({ type: 'npc', who: 'bryn', tx: 9, ty: 3 });
        add({ type: 'npc', who: 'glyn', tx: 11, ty: 3 });
        add({ type: 'sign', tx: 4, ty: 3, text: ['THE JUNCTION\n"Est. when the railway came. Still here after it went."'] });
        break;
      case '4,3':
        if (!flags.haveShard) add({ type: 'shard', tx: 9, ty: 6 });
        add({ type: 'npc', who: 'dai', tx: 11, ty: 9 });
        add({ type: 'sign', tx: 5, ty: 3, text: ['North: Allt-y-Rhiw (path blocked)\nWest: The Junction\nEast: Chapel, Dimbath lane\nSouth: Main Street, River Ogmore'] });
        break;
      case '5,3':
        add({ type: 'npc', who: 'gwen', tx: 9, ty: 4 });
        break;
      case '3,4':
        if (!flags.haveHalter) add({ type: 'pony', tx: 6, ty: 6 });
        var c = flags.cart || { tx: 11, ty: 4 };
        add({ type: 'cart', tx: c.tx, ty: c.ty });
        add({ type: 'npc', who: 'pritchard', tx: 14, ty: 4 });
        break;
      case '4,4':
        if (flags.slept && !flags.haveHorse) add({ type: 'horse', tx: 13, ty: 5 });
        break;
      case '5,4':
        add({ type: 'npc', who: 'huw', tx: 8, ty: 5 });
        add({ type: 'sign', tx: 7, ty: 5, text: ['THE FOX AND HOUNDS\nThe sign shows a pack of white hounds with red ears, running under a full moon.'] });
        break;
    }
    return list;
  };

  // ---------- Legends Book ----------
  TT.LEGENDS = {
    halter: {
      title: 'The Halter of Clydno Eiddyn',
      text: [
        'Clydno Eiddyn was a lord of the Old North, long ago. He kept a halter fixed to the foot of his bed.',
        'Whatever horse he wished for, he would find standing in that halter in the morning.',
        'It was one of the Thirteen Treasures of the Island of Britain. Merlin gathered all thirteen and carried them to his Glass House on Bardsey, and they were never seen again. Until now.'
      ]
    }
  };
})();
