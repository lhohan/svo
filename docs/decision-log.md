# Architectural Decision Log

This file tracks major architectural decisions using Y-statements. A Y-statement captures the decision context, addressed concerns, chosen option, alternatives considered, intended outcomes, accepted trade-offs, and reasoning.

**Format:** In the context of <use case>, facing <concern>, we decided for <option> and neglected <alternatives>, to achieve <benefits>, accepting <trade-offs>, because <rationale>.

---

## Decision Log

| ID  | Y-Statement | Date | Status | Reference |
|-----|-------------|------|--------|-----------|
| 001 | In the context of **WASM image processing architecture**, facing **multiple encode/decode cycles in operation chaining**, we decided for **stateless API architecture** and neglected **stateful ImageProcessor class refactor**, to achieve **simple API maintenance, dual-image operation support, memory safety, and architectural simplicity**, accepting **redundant PNG encoding for sequential operations**, because: (1) **Premature optimization** - no profiling data showing encode/decode is actually slow; (2) **Poor architectural fit** - 35% of functions are dual-image operations (combine_*) which don't map to stateful single-image processor; (3) **High complexity cost** - requires rewriting all 23 functions as methods, complete overhaul of www/app.js (lines 225-372), manual memory management (.free() calls) with leak risk, and destructive operations breaking the "try different filters" workflow; (4) **Solution seeking a problem** - UI design doesn't encourage heavy operation chaining. | 2025-11-19 | Active | tasks/TASK-001-stateful-wasm.md |
