---
description: Guide for refactoring code and cleaning up technical debt
---

# Refactor and Cleanup Guide

Use this skill when tasked with improving code quality, reducing complexity, or removing unused code.

## Strategy

1.  **Identify Targets**: Look for:
    -   Unused imports (VS Code usually greys these out).
    -   Commented-out code blocks (delete them).
    -   Long functions (> 50 lines).
    -   Duplicated logic (DRY principle).

2.  **Safety First**:
    -   Ensure tests pass before and after refactoring.
    -   Do not change public API behavior unless explicitly requested.

3.  **Specific Actions**:
    -   **Consolidate Types**: Move interfaces to `types/` or `dto/` if used in multiple places.
    -   **Extract Components**: If a React component is too large, extract smaller components into separate files.
    -   **Simplify Conditionals**: Use early returns to reduce nesting levels.
    -   **Improve Naming**: Rename variables/functions to be more descriptive.

4.  **Tools**:
    -   Use `eslint --fix` to automatically fix formatting and linting issues.
    -   Use `prettier` to format code.

## Checklist
- [ ] No unused variables/imports.
- [ ] No `console.log` statements (use logger).
- [ ] Types are explicit (avoid `any`).
- [ ] Code builds and runs without errors.
