# SceneArc — Product Vision (the ideal end state)

This describes what the *finished* SceneArc should do. It is the north star the
phased build works toward. Written in plain English for the product owner.

---

## In one sentence

SceneArc is the **production desk for AI filmmakers**: you bring a script,
creative direction, and references; SceneArc organizes the entire film into
characters, locations, scenes, and continuity, prepares the exact prompts and
reference assets for each shot, helps you generate on the platforms you choose,
and brings approved results back into the right place — while you stay in full
creative control.

## The core principle

SceneArc **organizes and prepares**; it does not replace the filmmaker and does
not resell generation. It never hides costs, never bypasses any platform's
rules, and never auto-clicks a "Generate" button. You are always the one who
decides to spend money and press go.

---

## Non-negotiable guardrails (every version, forever)

- Never automatically click a third-party "Generate" button.
- Never bypass captchas, paywalls, limits, or anti-automation systems.
- Never store passwords or cookies for third-party generation platforms.
- Never scrape private account data.
- Never use a platform in a way its terms prohibit.
- Never hide generation costs — always show them before and after.
- Keep all secrets, proprietary prompts, and prompt-building logic server-side.
- Each user's projects and files are private (enforced at the database level).

---

## The ideal end-to-end workflow

### 1. Start a project
- Create a film project with a title.
- Paste or upload a script.
- Describe the creative direction: visual style, tone, genre, period, aspect
  ratio, cinematography notes, and any extra instructions.
- Upload visual references (mood boards, actor looks, location photos).

### 2. Automatic script breakdown (AI)
SceneArc reads the script and produces a structured, editable breakdown:
- **Characters** — with descriptions (age, look, wardrobe cues, etc.).
- **Locations** — with descriptions.
- **Scenes** — number, slugline, summary.
- For each scene: **which characters appear**, **which location**, **time of
  day**, **wardrobe**, **important props**, **continuity notes**, **scene
  beats** (the ordered story moments), and **dialogue**.
- **Suggested generation stages** for each scene.
- (Relationships are tracked internally but kept off the main screen for a
  cleaner breakdown.)

### 3. Review, edit, approve
- You can edit anything — fix a description, add a prop, adjust a beat.
- When it's right, you **approve** the breakdown, which unlocks the shot work.

### 4. Design your canonical characters & locations
- SceneArc builds **character-design prompt packages** and **location-design
  prompt packages** from your creative direction.
- You generate options, import the ones you like, and **approve one as the
  canonical reference** for that character or location.
- These approved references become the single source of truth reused everywhere,
  so a character looks consistent across every scene.

### 5. Work a scene
- Open any scene. SceneArc **automatically assembles** the correct pieces: the
  right characters (with their approved references and wardrobe), the right
  location (with its approved reference), the props, and the continuity notes.
- It compiles a **scene-still prompt package**: a ready-to-use prompt, a shot
  summary, the exact reference assets to attach, suggested settings, and notes.

### 6. Generate — two compliant paths
- **One-click via official APIs (your own key):** for platforms with a real API
  (e.g. **Freepik** today, more later), SceneArc can generate for you using your
  own account/credits, always showing the cost first.
- **Guided via the Chrome extension:** for web-only tools you already use (e.g.
  **Artlist**, and others via adapters), the extension inserts the prepared
  prompt and hands you the reference files; **you** click Generate; then you
  import the result. No automation of their site, no stored passwords.

### 7. Bring results back and judge them
- Imported results attach to the exact **project → scene → task → prompt
  package** they came from.
- For each result you **approve**, **reject**, or **request a revision** (with
  notes). Revisions feed a clean re-prompt.

### 8. Motion: frameburst → low-res draft → final
- Prepare **frameburst** prompts and references (consistent frames for motion).
- Prepare **low-resolution video** prompts; review the draft and either approve
  it or describe changes.
- Once the low-res draft is approved, prepare the **final-resolution generation
  package**.
- Import and **download the approved final scene**.

### 9. Continuity throughout
- The through-line of the whole product: approved characters, locations,
  wardrobe, and continuity notes are **carried forward automatically** so every
  shot and every scene stays visually consistent. This consistency is SceneArc's
  core value.

---

## How the pieces fit

- **Web app (the production desk):** everything above — projects, breakdown,
  scene workspaces, prompt packages, approvals, downloads.
- **Chrome extension (the bridge):** a side panel that shows the active project,
  scene, task, prepared prompt, and required references; inserts prompts on
  generation sites; imports results; and lets you approve/reject/revise. Always
  manual Generate.
- **Server (the brain, hidden):** script analysis, the proprietary prompt
  compiler, all API keys and secrets. Nothing sensitive ever reaches the
  browser.

## Flexibility built in

- **Swappable AI brain:** the language model used for analysis can be changed;
  the model name is configurable; a free "mock mode" lets the app be used/tested
  without spending money.
- **Swappable generation platforms:** a modular adapter/provider system so new
  platforms (API-based or web-based) can be added without redesigning the app.
- **Cost transparency:** estimated/actual costs are recorded and shown; you
  confirm before any paid call.

## What "done" feels like

You paste a script, refine the breakdown, lock in how your characters and
locations look, then move scene by scene generating stills and video on the
platforms you choose — with SceneArc handing you the right prompt and the right
references every time, keeping everything consistent, tracking every approval,
and letting you download finished scenes. Tedious organization disappears;
creative decisions stay yours.

---

## Where the build is today (vs. this ideal)

- **Phase 1 — Foundation:** ✅ done. Projects, script analysis, editable
  breakdown (incl. dialogue), scene workspace, scene-still prompt packages.
- **Phase 2 — Extension + practice generator:** ✅ done. Pairing, side panel,
  insert prompt / import result / approve-reject-revise, adapter system.
- **Phase 3 — First real platform (Freepik API):** in progress — one-click
  generation with your own key.
- **Phase 4 — The expanded workflow:** the bulk of this vision still ahead —
  canonical character & location design, automatic scene assembly from approved
  references, frameburst, low-res draft, revision loop, final-resolution export,
  and downloadable scenes. Plus more platform adapters (e.g. Artlist).
