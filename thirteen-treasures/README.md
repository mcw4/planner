# The Thirteen Treasures

A top-down adventure set in Blackmill, retelling the legends of the Thirteen Treasures of
the Island of Britain. This folder holds the design docs and the game itself.

- `DESIGN.md`: the overall design.
- `VALLEY.md`: the six Blackmill and Ogmore valley chapters in detail.
- `index.html` + `src/`: the game. **Chapter 1: The Runaway Pony** is playable.

## Playing it

It's plain HTML and JavaScript with no build step and nothing to install.

- Once this branch is merged, GitHub Pages serves it at
  `https://mcw4.github.io/planner/thirteen-treasures/`.
- Locally, run a static server from the repository root and open
  `http://localhost:8000/thirteen-treasures/`:

  ```bash
  python3 -m http.server 8000
  ```

  Opening `index.html` straight from disk also works in most browsers.

**Controls:** arrows or WASD to move, Space to talk and act, hold Shift to sneak, K to
ride, Tab for the journal. On a phone or tablet, on-screen buttons appear instead.

Progress saves at the holy well and at key story moments, in the browser's local storage.

## Code layout

| File | What it does |
| --- | --- |
| `src/engine.js` | Keyboard and touch input, sound effects, saving |
| `src/art.js` | Pixel-art sprites (text grids) and tiles, all drawn in code |
| `src/world.js` | Maps, doors, people, dialogue and the Legends Book |
| `src/game.js` | Movement, collision, screens, the pony and cart, story events, drawing |
| `src/ui.js` | HUD, dialogue box, title, new game, journal and chapter card |
| `src/main.js` | Start-up and the 60 fps loop |

Maps are 16×11 tile grids written as text in `world.js`. The key is at the top of that
file.
