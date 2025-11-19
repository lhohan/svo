# Task 003: Enable and Fix wasm-opt

## Context
The `Cargo.toml` file currently disables `wasm-opt`:
```toml
[package.metadata.wasm-pack.profile.release]
wasm-opt = false
```

### Problem
`wasm-opt` is a tool from the `binaryen` suite that optimizes WebAssembly binaries for size and performance. Disabling it results in larger `.wasm` files, which increases load time for the user. The project documentation mentions it was disabled because the download failed.

## Analysis
The build environment needs to be checked to see if `wasm-opt` is available or if it can be successfully downloaded by `wasm-pack`.

## Implementation Plan
1.  Check if `wasm-opt` is available in the system (`which wasm-opt`).
2.  If using Nix (as indicated by `flake.nix`), ensure `binaryen` is included in the dev shell.
3.  Remove `wasm-opt = false` from `Cargo.toml` (or set to `true`).
4.  Run `just build` (or `wasm-pack build`) to verify the build succeeds with optimizations.
5.  Compare the size of the generated `.wasm` file before and after to measure impact.

## Acceptance Criteria
- [ ] `wasm-opt` is enabled in `Cargo.toml`.
- [ ] The project builds successfully.
- [ ] The resulting `.wasm` binary size is optimized (smaller than before).
