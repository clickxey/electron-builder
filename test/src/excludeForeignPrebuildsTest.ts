import { Configuration, Platform } from "app-builder-lib"
import { FileMatcher } from "app-builder-lib/internal"
import { PM } from "app-builder-lib/src/node-module-collector/packageManager"
import type { PlatformPackager } from "app-builder-lib/src/platformPackager"
import { computeNodeModuleFileSets } from "app-builder-lib/src/util/appFileCopier"
import { Arch } from "builder-util"
import fsExtra from "fs-extra"
import * as path from "path"

// End-to-end coverage of `nativeModules.excludeForeignPrebuilds` through the node_modules file-set computation:
// which `prebuilds/<platform>-<arch>/` directories of a prebuildify-style dependency reach the packaged app.

const PREBUILDS = ["darwin-arm64", "darwin-x64", "linux-arm64", "linux-x64", "win32-x64"]

async function createProject(tmpDir: { getTempDir(): Promise<string> }) {
  const projectDir = await tmpDir.getTempDir()
  await fsExtra.outputJson(path.join(projectDir, "package.json"), { name: "app", version: "1.0.0", dependencies: { addon: "^1.0.0" } })
  const addonDir = path.join(projectDir, "node_modules", "addon")
  await fsExtra.outputJson(path.join(addonDir, "package.json"), { name: "addon", version: "1.0.0" })
  await fsExtra.outputFile(path.join(addonDir, "index.js"), "module.exports = require('node-gyp-build')(__dirname)")
  for (const target of PREBUILDS) {
    await fsExtra.outputFile(path.join(addonDir, "prebuilds", target, "addon.node"), target)
  }
  return projectDir
}

async function packagedPrebuilds(projectDir: string, platform: Platform, arch: Arch, config: Configuration, applyArchFilter = true) {
  const packager = {
    appDir: projectDir,
    projectDir,
    platform,
    config,
    appInfo: { type: undefined },
    tempDirManager: { getTempFile: () => Promise.reject(new Error("unused")), getTempDir: () => Promise.reject(new Error("unused")) },
    metadata: { dependencies: { addon: "^1.0.0" } },
    originalMetadata: { dependencies: { addon: "^1.0.0" } },
    nodePackageName: "app",
    getWorkspaceRoot: () => Promise.resolve(projectDir),
    getPackageManager: () => Promise.resolve(PM.TRAVERSAL),
  } as unknown as PlatformPackager<any>
  const matcher = new FileMatcher(projectDir, path.join(projectDir, "out", "app"), s => s, ["**/*"])
  const fileSets = await computeNodeModuleFileSets(packager, {}, matcher, arch, applyArchFilter)
  return fileSets
    .flatMap(set => set.files)
    .filter(file => file.endsWith("addon.node"))
    .map(file => path.basename(path.dirname(file)))
    .sort()
}

describe("nativeModules.excludeForeignPrebuilds", () => {
  test("packs only the target's prebuild by default", async ({ expect, tmpDir }) => {
    const projectDir = await createProject(tmpDir)
    expect(await packagedPrebuilds(projectDir, Platform.LINUX, Arch.x64, {})).toEqual(["linux-x64"])
    expect(await packagedPrebuilds(projectDir, Platform.WINDOWS, Arch.x64, {})).toEqual(["win32-x64"])
  })

  test("keeps every macOS architecture for universal slices", async ({ expect, tmpDir }) => {
    const projectDir = await createProject(tmpDir)
    expect(await packagedPrebuilds(projectDir, Platform.MAC, Arch.arm64, {}, false)).toEqual(["darwin-arm64", "darwin-x64"])
  })

  test("packs every prebuild when disabled", async ({ expect, tmpDir }) => {
    const projectDir = await createProject(tmpDir)
    expect(await packagedPrebuilds(projectDir, Platform.LINUX, Arch.x64, { nativeModules: { excludeForeignPrebuilds: false } })).toEqual(PREBUILDS)
  })
})
