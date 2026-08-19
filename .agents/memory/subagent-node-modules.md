---
name: Subagent node_modules corruption
description: Design subagents may hand-edit node_modules typings; symptom and fix
---

# Subagent-edited node_modules

A design subagent hand-patched `node_modules/@expo-google-fonts/inter` `.d.ts` files (injecting SpaceGrotesk names), breaking typecheck while runtime JS stayed fine.

**Symptom:** `TS2305: Module X has no exported member Y` for a package that worked before a subagent ran.
**Fix:** `rm -rf` the package dir under node_modules, then `pnpm --filter <pkg> install --force`, then restart Metro (it caches resolution from before the reinstall).
**How to apply:** after any subagent adds/uses packages, if typecheck breaks on package exports, suspect edited node_modules before suspecting versions.
