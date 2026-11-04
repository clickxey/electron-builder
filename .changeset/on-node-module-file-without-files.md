---
"app-builder-lib": patch
---

fix: an `onNodeModuleFile` hook returning `true` now force-includes a default-excluded `node_modules` file (e.g. a `*.d.ts` or a top-level `README.md`) as documented when the configuration has no `files` exclusion patterns. Previously the hook was only honored when a `files` negation pattern existed, so in the common configuration it had no effect.
