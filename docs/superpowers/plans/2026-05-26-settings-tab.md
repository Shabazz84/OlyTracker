# Settings Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move DATA BACKUP, GITHUB SYNC, and CLAUDE API settings blocks from the PRs tab into a new dedicated SETTINGS tab at the end of the nav bar.

**Architecture:** Single-file change in `docs/index.html`. Three JSX blocks are cut from `{tab==="prs"}` and pasted verbatim into a new `{tab==="settings"}` section. The nav array gets one new entry. No state or prop changes needed — all relevant state (`gistCfg`, `syncStatus`, `gistToken`, `lmCfgStorage`) already lives in root `App`.

**Tech Stack:** React (inline JSX via Babel CDN), single HTML file

---

### Task 1: Add SETTINGS to the nav bar

**Files:**
- Modify: `docs/index.html:3910`

- [ ] **Step 1: Find the tabs array**

Open `docs/index.html` and locate the line (~3910) that reads:

```js
{[["program","PROGRAM"],["mobility","MOBILITY"],["supps","SUPPS"],["log","LOG"],["prs","PRs"],["reports","REPORTS"],["analytics","ANALYTICS"],["system","SYSTEM"]].map(([id,lbl])=>(
```

- [ ] **Step 2: Add SETTINGS entry**

Replace that line with:

```js
{[["program","PROGRAM"],["mobility","MOBILITY"],["supps","SUPPS"],["log","LOG"],["prs","PRs"],["reports","REPORTS"],["analytics","ANALYTICS"],["system","SYSTEM"],["settings","SETTINGS"]].map(([id,lbl])=>(
```

- [ ] **Step 3: Verify in browser**

Open `docs/index.html` in a browser. Confirm a SETTINGS tab appears at the far right of the nav. Clicking it should render nothing yet (empty).

- [ ] **Step 4: Commit**

```bash
git add docs/index.html
git commit -m "feat: add SETTINGS tab to nav bar"
```

---

### Task 2: Cut settings blocks from PRs tab

**Files:**
- Modify: `docs/index.html:4351–4487`

The three blocks to remove live between line 4351 (blank line after `)}` that closes the "add" PR sub-tab) and line 4487 (closing `</div>` of the CLAUDE API card). The PRs tab's own closing `</div></div>)}` at lines 4489–4491 is **not** removed.

- [ ] **Step 1: Locate the cut region**

Find these two landmarks in `docs/index.html`:

Start (keep everything above this):
```jsx
            {/* Data backup */}
            <div style={{marginTop:20,background:"#080f08",border:"1px solid #1a3a1a",borderRadius:8,padding:"14px"}}>
```

End (keep this line and everything below):
```jsx
            </div>
          </div>
        )}

        {/* ═══ REPORTS ═══ */}
```

- [ ] **Step 2: Delete the blocks**

Remove lines 4351–4488 (the blank line before `{/* Data backup */}` through the closing `</div>` of the CLAUDE API card plus the trailing blank line). After deletion the PRs tab should close cleanly:

```jsx
            )}

          </div>
        )}

        {/* ═══ REPORTS ═══ */}
```

- [ ] **Step 3: Verify PRs tab**

Open `docs/index.html` in browser. Go to PRs tab. Confirm all five sub-tabs (KEY LIFTS, STRENGTH, OVERHEAD, ALL, + ADD PR) work. Confirm no settings blocks appear anywhere in PRs.

- [ ] **Step 4: Commit**

```bash
git add docs/index.html
git commit -m "refactor: remove settings blocks from PRs tab"
```

---

### Task 3: Paste settings blocks into SETTINGS tab

**Files:**
- Modify: `docs/index.html` — after the `{tab==="system"}` line (~4497)

- [ ] **Step 1: Locate the insertion point**

Find this line near the end of the main content div:

```jsx
        {/* ═══ SYSTEM ═══ */}
        {tab==="system" && <SystemTab week={week}/>}
```

- [ ] **Step 2: Insert the SETTINGS section**

Add the following block immediately after the SYSTEM line:

```jsx
        {/* ═══ SETTINGS ═══ */}
        {tab==="settings" && (
          <div className="fade">

            {/* Data backup */}
            <div style={{marginTop:20,background:"#080f08",border:"1px solid #1a3a1a",borderRadius:8,padding:"14px"}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"var(--green)",letterSpacing:1.5,marginBottom:10}}>
                💾 DATA BACKUP
              </div>
              <p style={{fontSize:11,color:"#556",lineHeight:1.7,marginBottom:12}}>
                Export your data before any app update. Import it back after to restore everything — PRs, logs, session weights, supplement notes.
              </p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <Btn small onClick={()=>{
                  const data = {
                    version:1,
                    exported: new Date().toISOString(),
                    oly_prs: prs,
                    oly_logs: logs,
                    oly_week: week,
                    oly_summer: isSummer,
                    oly_supp_history: suppChecked,
                    oly_supp_notes: suppNotes,
                  };
                  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `olytracker_backup_${new Date().toISOString().slice(0,10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  showToast("Data exported ✓");
                }} style={{background:"var(--green)",color:"#000"}}>⬇ EXPORT DATA</Btn>

                <label style={{
                  background:"transparent",color:"var(--text2)",border:"1px solid var(--border2)",
                  borderRadius:5,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,
                  letterSpacing:0.5,padding:"6px 14px",fontSize:11,display:"inline-block",
                }}>
                  ⬆ IMPORT DATA
                  <input type="file" accept=".json" style={{display:"none"}} onChange={async e=>{
                    const file = e.target.files[0];
                    if(!file) return;
                    try {
                      const text = await file.text();
                      const data = JSON.parse(text);
                      if(data.version !== 1) { showToast("❌ Invalid backup file"); return; }
                      if(data.oly_prs) { setPrs(data.oly_prs); await storage.set("oly_prs",JSON.stringify(data.oly_prs)); }
                      if(data.oly_logs) { setLogs(data.oly_logs); await storage.set("oly_logs",JSON.stringify(data.oly_logs)); }
                      if(data.oly_week) { setWeek(data.oly_week); await storage.set("oly_week",JSON.stringify(data.oly_week)); }
                      if(data.oly_summer !== undefined) { setIsSummer(data.oly_summer); await storage.set("oly_summer",JSON.stringify(data.oly_summer)); }
                      if(data.oly_supp_history) { setSuppHistory(data.oly_supp_history); await storage.set("oly_supp_history",JSON.stringify(data.oly_supp_history)); }
                      if(data.oly_supp_notes !== undefined) { setSuppNotes(data.oly_supp_notes); await storage.set("oly_supp_notes",data.oly_supp_notes); }
                      showToast("✓ Data restored successfully");
                      e.target.value = "";
                    } catch(err) {
                      showToast("❌ Failed to import — invalid file");
                    }
                  }}/>
                </label>
              </div>

              {/* GitHub Sync */}
              <div style={{marginTop:12,background:"#0a0a1a",border:`1px solid ${gistCfg.id?"#2a4a6a":"#2a2a4a"}`,borderRadius:8,padding:"14px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"var(--blue)",letterSpacing:1.5}}>
                    🔄 GITHUB SYNC
                  </div>
                  {gistCfg.id&&(
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:syncStatus==="ok"?"var(--green)":syncStatus==="syncing"?"var(--gold)":syncStatus==="error"?"var(--red)":"var(--border2)"}}/>
                      <span style={{fontSize:9,color:"var(--text3)",fontFamily:"'DM Mono',monospace"}}>
                        {syncStatus==="syncing"?"SYNCING…":syncStatus==="ok"?`SYNCED ${gistCfg.lastSync?new Date(gistCfg.lastSync).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""}`:syncStatus==="error"?"SYNC ERROR":"IDLE"}
                      </span>
                    </div>
                  )}
                </div>
                {!gistCfg.id?(
                  <>
                    <p style={{fontSize:11,color:"var(--text2)",lineHeight:1.7,marginBottom:8}}>
                      Sync PRs and logs between PC and phone via a private GitHub Gist. Enter a token with <b style={{color:"var(--text)"}}>gist</b> scope.
                    </p>
                    <p style={{fontSize:10,color:"var(--text3)",lineHeight:1.6,marginBottom:10}}>
                      github.com → Settings → Developer settings → Personal access tokens → Tokens (classic) → New → check "gist" → Generate
                    </p>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <input value={gistToken} onChange={e=>setGistToken(e.target.value)}
                        placeholder="ghp_your_token_here"
                        style={{flex:1,background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:5,
                          color:"var(--text)",padding:"7px 10px",fontSize:11,fontFamily:"'DM Mono',monospace"}}/>
                      <Btn small onClick={connectGist} style={{background:"var(--blue)",color:"#fff",flexShrink:0}}>
                        {syncStatus==="syncing"?"…":"CONNECT"}
                      </Btn>
                    </div>
                  </>
                ):(
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <Btn small onClick={async()=>{
                      setSyncStatus("syncing");
                      try{
                        const cfg=JSON.parse(localStorage.getItem("oly_gist"));
                        const setsData={};Object.keys(localStorage).filter(k=>k.startsWith("sets_")).forEach(k=>{setsData[k]=localStorage.getItem(k);});
                        const data={version:1,oly_prs:prs,oly_logs:logs,oly_week:week,oly_summer:isSummer,oly_supp_history:suppHistory,oly_supp_notes:suppNotes,sets:setsData};
                        await gist.write(cfg.token,cfg.id,data);
                        const updated={...cfg,lastSync:new Date().toISOString()};
                        setGistCfg(updated);localStorage.setItem("oly_gist",JSON.stringify(updated));
                        setSyncStatus("ok");showToast("✓ Pushed to GitHub");
                      }catch{setSyncStatus("error");showToast("❌ Push failed");}
                    }} style={{background:"var(--blue)",color:"#fff"}}>↑ PUSH NOW</Btn>
                    <Btn small onClick={async()=>{
                      setSyncStatus("syncing");
                      try{
                        const cfg=JSON.parse(localStorage.getItem("oly_gist"));
                        const remote=await gist.read(cfg.token,cfg.id);
                        if(remote.version===1) await applyRemoteData(remote);
                        const updated={...cfg,lastSync:new Date().toISOString()};
                        setGistCfg(updated);localStorage.setItem("oly_gist",JSON.stringify(updated));
                        setSyncStatus("ok");showToast("✓ Pulled from GitHub");
                      }catch{setSyncStatus("error");showToast("❌ Pull failed");}
                    }}>↓ PULL NOW</Btn>
                    <Btn small ghost onClick={()=>{
                      setGistCfg({token:"",id:"",lastSync:null});
                      localStorage.removeItem("oly_gist");
                      setSyncStatus("idle");
                      showToast("Sync disconnected");
                    }}>DISCONNECT</Btn>
                  </div>
                )}
              </div>
            </div>

            {/* LM Studio settings */}
            <div style={{marginTop:12,background:"#0a0a1a",border:"1px solid #2a2a4a",borderRadius:8,padding:"14px"}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"var(--gold)",letterSpacing:1.5,marginBottom:8}}>
                ⚡ CLAUDE API (AI REVIEW)
              </div>
              <p style={{fontSize:10,color:"var(--text3)",lineHeight:1.6,marginBottom:10}}>
                Weekly review is analyzed by Claude Sonnet. Paste your Anthropic API key below — it's stored locally in your browser only.
              </p>
              <LmSettingsPanel />
            </div>

          </div>
        )}
```

- [ ] **Step 3: Verify SETTINGS tab**

Open `docs/index.html` in browser. Click SETTINGS tab. Confirm:
- DATA BACKUP section renders with EXPORT DATA / IMPORT DATA buttons
- GITHUB SYNC section renders (shows token input if not connected)
- CLAUDE API section renders with LmSettingsPanel
- Export button downloads a valid JSON file
- PRs tab no longer shows any of these blocks

- [ ] **Step 4: Bump version header**

Find the version string in the header (search for `PROGRAM v` near the top of the file) and update the date to today:

```
PROGRAM v2.8 · 2026-05-26
```

- [ ] **Step 5: Commit**

```bash
git add docs/index.html
git commit -m "feat: move backup/sync/API settings to dedicated SETTINGS tab"
```

---

### Task 4: Update error message string

**Files:**
- Modify: `docs/index.html:3144`

One hardcoded error message references the old location.

- [ ] **Step 1: Find and update the string**

Find (~line 3144):
```js
if (!apiKey) { setAiError("No API key configured. Go to Settings → CLAUDE API."); return; }
```

This already says "Settings → CLAUDE API" — which now correctly points to the SETTINGS tab. No change needed; verify it reads as above and move on.

- [ ] **Step 2: Commit**

No change needed. If you edited anything, commit now:

```bash
git add docs/index.html
git commit -m "chore: verify error message points to SETTINGS tab"
```

---

## Self-Review

**Spec coverage:**
- ✅ Nav bar gets SETTINGS after SYSTEM
- ✅ DATA BACKUP moved out of PRs
- ✅ GITHUB SYNC moved out of PRs
- ✅ CLAUDE API moved out of PRs
- ✅ Exact JSX provided for all moved blocks (no placeholders)
- ✅ State references (`prs`, `logs`, `gistCfg`, `syncStatus`, etc.) all available in root App scope

**Placeholder scan:** None found.

**Type consistency:** All component names (`LmSettingsPanel`, `Btn`, `showToast`, `connectGist`, `gist`, `storage`) used in Task 3 match their definitions elsewhere in `index.html`.
