---
"app-builder-lib": minor
---

feat: source maps of JavaScript and CSS files inside `node_modules` (`*.js.map`, `*.mjs.map`, `*.cjs.map`, `*.css.map`) and declaration maps (`*.d.ts.map`) are no longer copied into the app; nothing loads them at runtime, and some packages ship more map than code (firebase 13: 32 MB of 40 MB). Other `*.map` files and the app's own maps are kept. The first build that leaves maps out warns once with a link to the migration notes; an `onNodeModuleFile` hook returning `true` keeps a map.
