# Settings Tab — Design Spec

**Date:** 2026-05-26  
**Status:** Approved

## Problem

Three settings blocks (DATA BACKUP, GITHUB SYNC, CLAUDE API) are buried at the bottom of the PRs tab, after the PR sub-tabs. They have no logical relationship to PR data.

## Solution

Add a dedicated SETTINGS tab at the end of the nav bar. Move the three settings blocks from PRs into it verbatim.

## Changes

### 1. Nav bar (`docs/index.html` ~line 3910)

Add `["settings","SETTINGS"]` to the end of the tabs array:

```js
[["program","PROGRAM"],["mobility","MOBILITY"],["supps","SUPPS"],["log","LOG"],
 ["prs","PRs"],["reports","REPORTS"],["analytics","ANALYTICS"],["system","SYSTEM"],
 ["settings","SETTINGS"]]
```

### 2. PRs tab — remove settings blocks (~lines 4350–4485)

Delete these three blocks from the PRs `{tab==="prs"}` section:
- DATA BACKUP card (export/import JSON)
- GITHUB SYNC card (nested inside DATA BACKUP)
- CLAUDE API card (LmSettingsPanel)

### 3. New SETTINGS tab — paste those blocks

Add `{tab==="settings"}` section after `{tab==="system"}`, containing the three removed blocks, no modifications.

## Constraints

- No state changes — `gistCfg`, `syncStatus`, `gistToken`, `lmCfgStorage` all live in root `App`, accessible from both tabs already.
- No prop plumbing changes required.
- No styling changes — blocks move verbatim.
