---
"app-builder-lib": minor
---

feat: prebuilt native addons that dependencies ship for other platforms/architectures (prebuildify's `prebuilds/<platform>-<arch>/` directories, which `node-gyp-build` never loads on the target) are no longer copied into the app, which often saves several MB per native dependency. macOS universal slices keep every macOS architecture so they still merge. New option `nativeModules.excludeForeignPrebuilds?: boolean | null` (default `true`); while it is unset the first build that drops something warns once with a link to the migration notes, and `false` restores the v26 behavior.
