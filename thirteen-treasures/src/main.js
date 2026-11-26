// Boot: wire up the UI, then run a fixed 60 updates-per-second loop.
(function () {
  'use strict';
  var TT = window.TT;
  var UI = TT.UI;

  UI.init();
  TT.bindTouch(document.getElementById('controls'));

  var game = new TT.Game(document.getElementById('game'));
  TT.game = game;

  function showTitle() {
    game.mode = 'title';
    var save = TT.store.load();
    UI.showTitle(!!save, function () {
      UI.showNewGame(function (name, look) {
        game.newGame(name, look);
      }, showTitle);
    }, function () {
      UI.hideTitle();
      var s = TT.store.load();
      if (s) {
        game.start(s);
        game.fadeA = 1;
        game.fadeTo(0, 30);
        UI.toast('Welcome back, ' + game.name + '.');
      } else {
        showTitle();
      }
    });
  }

  document.getElementById('btn-menu').addEventListener('click', function () {
    if (game.mode === 'play' && !UI.talking) {
      game.mode = 'menu';
      UI.openMenu(game, function () { game.mode = 'play'; });
    }
  });

  // While a menu-type overlay is open, Escape/Tab closes it.
  window.addEventListener('keydown', function (e) {
    if ((e.code === 'Escape' || e.code === 'Tab') && game.mode === 'menu') {
      e.preventDefault();
      UI.closeMenu();
      game.mode = 'play';
      TT.input.clear();
    }
  });

  var STEP = 1000 / 60, acc = 0, last = performance.now();
  function frame(now) {
    acc += Math.min(250, now - last);
    last = now;
    var steps = 0;
    while (acc >= STEP && steps < 5) {
      game.update();
      UI.update();
      TT.input.endFrame();
      acc -= STEP;
      steps++;
    }
    game.render();
    requestAnimationFrame(frame);
  }

  showTitle();
  requestAnimationFrame(frame);
})();
