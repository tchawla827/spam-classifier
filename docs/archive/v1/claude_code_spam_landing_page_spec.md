# Claude Code Build Spec — 3D Interactive Spam Classifier Landing Page

## 1) Mission
Build a **premium, modern, interactive landing page** for a spam-classifier project.

The landing page should use a strong visual metaphor:
- spam = crumpled paper balls / junk messages
- classification = detecting which objects are spam
- disposal = tossing spam into a trash can
- clarity = a cleaner interface after spam is removed

The core hero experience should feel like a **delightful mini interaction**, not a full game.
The page must still behave like a serious product landing page with clear messaging, strong CTA hierarchy, and polished UX.

---

## 2) Primary Product Story
The user should understand this within 5 seconds:

> This product detects spam and helps clean up cluttered inboxes/messages.

The hero interaction should reinforce that story:
- the trash can starts empty
- several crumpled “spam” papers float around the hero
- when a user clicks or drags a paper, it follows a **parabolic arc** into the trash can
- each successful toss gives satisfying visual feedback
- the can gradually fills up
- the page message evolves from clutter -> clarity

This interaction should support conversion, not distract from it.

---

## 3) High-Level UX Goals

### Must feel:
- premium
- smooth
- satisfying
- intuitive
- slightly playful but still product-focused
- modern SaaS / AI product quality

### Must not feel:
- childish
- chaotic
- like an arcade game
- overloaded with effects
- confusing about what the product actually does

---

## 4) Target Build Stack
Use a modern frontend stack suitable for a polished landing page.

### Preferred stack
- **Next.js** (latest stable App Router)
- **React**
- **TypeScript**
- **Tailwind CSS**
- **Framer Motion** for UI motion
- **React Three Fiber** + **@react-three/drei** for 3D scene elements
- Optional: **GSAP** only if truly needed for trajectory timing, but prefer a simpler internal animation system if possible

### Notes
- Use React Three Fiber only for the hero scene and any light 3D details
- Keep the rest of the page as fast, accessible DOM-based UI
- Avoid unnecessary complexity

---

## 5) Core IA / Page Structure
Build a single polished landing page with these sections:

1. **Header / Nav**
2. **Hero with 3D interactive trash-can experience**
3. **How it works**
4. **Why it matters / benefits**
5. **Mini product preview / sample classifier panel**
6. **Trust / metrics strip**
7. **Final CTA section**
8. **Footer**

The **hero** is the star, but the rest of the page must make the landing page complete and believable.

---

## 6) Visual Direction

### Theme
Dark, premium, slightly futuristic.

### Palette direction
Use a refined palette inspired by the provided reference art:
- deep charcoal / near-black background
- lavender / soft purple as main accent
- off-white for text and object contrast
- subtle secondary neutral grays
- one stronger accent glow for CTA emphasis

Do **not** make the page feel neon cyberpunk.
Keep it elegant and restrained.

### Texture / style cues
- subtle grain/noise background is allowed
- gentle star-speckle / dust texture is okay in moderation
- sparse abstract decorative strokes or particles are okay
- keep whitespace and clarity

### 3D styling direction
- trash can can be a stylized wireframe / modern mesh bin
- crumpled papers should be chunky, readable, tactile
- scene should feel stylized, not photorealistic
- use shadows and depth carefully

---

## 7) Hero Content Strategy
The hero must clearly communicate the product, even without interaction.

### Recommended content
**Headline:**
Turn spam into trash.

**Subheadline:**
AI-powered spam detection for cleaner inboxes, safer clicks, and faster triage.

### CTA hierarchy
Primary CTA:
- Try Demo

Secondary CTA:
- See How It Works

### Supporting microcopy
A subtle helper line near the interactive scene can say:
- Toss the spam into the bin
or
- Click a spam message to throw it away

Keep the copy concise.

---

## 8) Hero Layout Requirements

### Desktop
Use a balanced split composition:
- left or upper-left: headline, subheadline, CTA cluster
- center/right: 3D hero scene
- keep the trash can visually central enough to feel important

### Mobile
- keep copy at top
- 3D hero below
- interaction should still work via tap
- avoid requiring precise drag gestures on small screens

The hero must remain legible and attractive even before any interaction.

---

## 9) Core Interactive Mechanic
This is the most important part.

### Initial state
- trash can is empty
- 3 to 5 crumpled papers float around the scene
- each paper represents a type of spam
- papers have subtle idle motion
- the scene invites interaction without needing a tutorial wall

### On hover (desktop)
When the pointer hovers over a paper:
- paper scales slightly up
- shadow/emphasis increases
- cursor indicates clickability
- optional tooltip/tag appears
- tag examples:
  - Phishing
  - Promo Spam
  - Fake Prize
  - Urgent Invoice
  - Suspicious Link

### On click / tap
When a paper is clicked:
- it becomes “selected”
- it launches into a **parabolic trajectory** toward the trash can
- a motion trail can appear briefly
- the trash can reacts subtly when the paper lands
- a tiny impact particle burst or glow is allowed
- the paper disappears into the bin naturally

### On successful toss
Update all relevant UI:
- increment a small counter like “3 spam removed”
- slightly increase visible fill in the trash can
- optionally update a clean-state progress bar or status message
- strengthen CTA visibility subtly as progress increases

### Completion state
After all initial papers are tossed:
- the hero should feel cleaner and calmer
- show a completion line such as:
  - Inbox cleared. Ready to test yours?
- present a more prominent CTA treatment
- optionally respawn papers only if user intentionally replays the interaction

---

## 10) Interaction Design Rules

### Input methods
Support:
- click-to-throw (primary)
- drag-and-release (optional enhancement on desktop only)
- tap-to-throw on mobile

### Important UX decision
**Click-to-throw is the default primary behavior.**
Drag should not be required.

Reason:
- better discoverability
- better accessibility
- faster interaction
- more reliable on different devices

### Timing
The throw animation should be:
- quick enough to feel responsive
- slow enough to feel satisfying

Recommended total time:
- ~700ms to 1100ms depending on distance

### Motion feel
Use:
- soft ease-out / custom timing
- small squash/stretch on launch or impact if tasteful
- subtle can bounce on impact

Avoid:
- cartoonish over-bounce
- long delays
- too much spinning
- visual clutter

---

## 11) Parabolic Throw Specification
Implement the paper toss with a convincing arc.

### Functional requirement
The paper should not move linearly.
It should follow a visible, smooth **parabolic arc** from its starting point into the trash can opening.

### Motion expectations
- launch starts with slight lift
- midpoint reaches visible apex
- descent ends at trash opening / inside can
- paper may rotate slightly during flight
- trail can briefly indicate path

### Technical suggestion
Implement trajectory either by:
1. calculating a quadratic bezier / parametric parabola in 2D/3D space, or
2. using a sampled curve and animating position along it

Preferred:
- deterministic curve logic
- easy tuning of height, speed, and easing

Expose configurable values for:
- arc height
- duration
- rotation intensity
- landing offset randomness

---

## 12) Trash Can Behavior Specification
The bin is central to the metaphor and must feel alive.

### Initial state
- empty
- visually readable opening
- slightly stylized wireframe or mesh structure

### During landing
When a paper lands:
- slight bounce / jiggle
- subtle highlight/glow pulse near rim
- optional tiny mesh vibration

### Fill logic
As papers are tossed:
- visible paper fill amount increases
- fill should be readable but not messy
- use staged fill states if simpler: 0%, 25%, 50%, 75%, full-ish

### Final state
- not overflowing absurdly
- looks meaningfully fuller than initial empty state
- should reinforce progress

---

## 13) Spam Object Design
Each paper should feel like a compressed spam message.

### Representation options
Best option:
- stylized crumpled paper balls with tiny attached labels/tags

Alternative:
- partially unfolded “message cards” that crumple when selected

Preferred for v1:
- already-crumpled paper balls with hover labels

### Label ideas
Use short readable categories:
- Phishing
- Promo
- Scam
- Fake OTP
- Malware Link
- Suspicious Invoice

### Quantity
Start with **3** papers in v1.
That is enough to teach the interaction without clutter.
Optionally support 5 for enhanced mode.

---

## 14) Hero Feedback System
The interaction should produce layered feedback.

### Visual feedback
- hover scale
- motion trail
- impact pulse
- bin fill update
- counter update
- scene calmness after clutter is removed

### Text feedback
Small live text near hero can update as actions occur:
- Spam detected
- Classified as phishing
- Removed successfully
- 2 spam messages cleared

### Haptics / sound
Do not depend on sound.
If sound is included:
- make it optional
- default muted or very subtle
- allow quick sound toggle

---

## 15) Above-the-Fold Conversion Behavior
Do not let the hero become a toy.
The hero interaction must still support product conversion.

### Rules
- CTA must remain visible before interaction
- user should not be forced to finish the mini interaction before continuing
- the hero should be meaningful both interacted-with and untouched
- the interaction should strengthen, not gate, conversion

### CTA behavior suggestions
- primary CTA remains stable throughout
- after each toss, CTA can gain slight glow/emphasis
- after full cleanup, swap supporting text to a stronger conversion message

Example post-completion line:
- Your inbox deserves this kind of cleanup.

---

## 16) Below-the-Fold Sections — Detailed Requirements

### Section A: How it Works
Use 3 concise steps with icons/cards:
1. Detect suspicious patterns
2. Classify messages intelligently
3. Filter and clean clutter fast

Each card should have:
- icon
- short title
- 1–2 lines of explanation

### Section B: Why It Matters
Explain benefits, not just features.
Possible cards:
- Save time
- Reduce phishing risk
- Prioritize real messages
- Keep your workflow clean

### Section C: Product Preview
Create a mini “classifier demo panel” UI mockup.

Suggested layout:
- left: sample incoming messages
- right: classification result panel

Example messages:
- “Claim your reward now” -> Spam
- “Meeting moved to 3 PM” -> Not Spam
- “Verify bank details urgently” -> Spam

Need nice badge styling for:
- Spam
- Safe / Ham
- Confidence score
- Reason tags

### Section D: Metrics / Trust Strip
Present the project as credible.
Examples:
- Large labeled dataset
- High precision / recall
- Fast inference
- Explainable signal categories

Use believable product-style stat cards, but structure them so the values can be easily swapped later.

### Section E: Final CTA
End strong with a clear action.
Possible copy:
- Try the spam classifier
- Test a sample message
- Explore the live demo

---

## 17) Navigation Requirements
Header should include:
- logo / brand mark
- nav links (How it Works, Demo, Metrics, About)
- CTA button on right

Behavior:
- sticky or semi-sticky header preferred
- transparent over hero initially, then slightly solid on scroll
- smooth anchor scrolling

---

## 18) Animation System Requirements
Use layered motion thoughtfully.

### Motion layers
1. **Ambient motion**
   - slow paper float
   - subtle scene drift
   - light background particle drift

2. **Interactive motion**
   - hover responses
   - paper throw arc
   - impact response

3. **Scroll reveal motion**
   - sections reveal smoothly on scroll
   - use restrained motion, not excessive choreography

### Motion quality target
Think:
- polished product showcase
- tactile and elegant

Not:
- flashy portfolio experiment

---

## 19) Accessibility Requirements
Must be implemented properly.

### Required
- semantic HTML structure for non-3D content
- sufficient color contrast
- keyboard support for core hero interaction
- visible focus states
- reduced motion support
- ARIA labeling where needed
- buttons/interactive objects must have screen-reader accessible names

### Hero accessibility fallback
Provide a non-3D accessible fallback interaction if needed:
- a DOM button list of spam items that can be “remove”-animated
- or a simplified button-triggered version of the toss logic

If full keyboard support inside the 3D scene is complex, provide a companion accessible control list near the hero.

Example:
- Remove “Phishing”
- Remove “Promo Spam”
- Remove “Fake Invoice”

Those controls should trigger the same visible throw animation.

---

## 20) Responsive Design Requirements

### Desktop
- rich hero layout
- floating papers around bin
- visible depth and composition

### Tablet
- simplify spacing
- reduce number of floating elements if necessary

### Mobile
- prioritize clarity and tap ease
- fewer on-screen hero objects
- maintain parabolic toss animation
- keep frame rate smooth
- avoid hard-to-hit tiny targets

### Performance-first rule
On weaker devices:
- reduce particle count
- simplify post-processing
- reduce idle motion complexity

---

## 21) Performance Requirements
This page must feel smooth.

### Requirements
- fast first load
- no janky hero animation
- lazy-load heavier 3D logic if appropriate
- avoid massive texture assets
- prefer procedural/simple geometry where possible
- optimize shadows and lighting
- maintain stable responsiveness

### Suggested practices
- code-split 3D hero if useful
- use minimal lights
- avoid overdraw-heavy effects
- avoid unnecessary post-processing unless very lightweight

---

## 22) Technical Build Guidance

### Folder direction
Create a clean project structure.

Suggested structure:

```txt
app/
  page.tsx
  layout.tsx
components/
  layout/
    Header.tsx
    Footer.tsx
  sections/
    Hero.tsx
    HowItWorks.tsx
    Benefits.tsx
    ProductPreview.tsx
    MetricsStrip.tsx
    FinalCTA.tsx
  hero/
    SpamHeroScene.tsx
    TrashCan.tsx
    SpamPaper.tsx
    MotionTrail.tsx
    HeroStatus.tsx
    AccessibleControls.tsx
lib/
  hero/
    trajectory.ts
    heroState.ts
    types.ts
  utils/
styles/
public/
```

### Keep logic separated
- trajectory math should be isolated
- hero interaction state should be isolated
- section content data should be easy to edit

---

## 23) Hero State Model
Implement the hero using explicit state instead of ad hoc mutations.

### Suggested state per paper
- idle
- hovered
- selected
- flying
- landed
- removed

### Global hero state
- total papers
- removed count
- current status label
- bin fill level
- completion reached boolean
- replay available boolean

### Completion logic
When removed count equals total papers:
- set completion state
- update headline support copy or completion banner
- emphasize CTA
- optionally show a replay button

---

## 24) Microinteractions to Include
Include small moments that improve perceived quality.

### Recommended
- button hover polish
- nav background transition on scroll
- CTA gentle shimmer or glow on completion
- cards reveal smoothly on scroll
- paper hover tilt
- tiny progress meter or “spam removed” badge

### Recommended hero status badge examples
- 0/3 Spam cleared
- 1/3 Spam cleared
- 2/3 Spam cleared
- Inbox cleared

---

## 25) Visual Messaging Progression
The page should visually move from clutter to clarity.

### Initial hero mood
- slightly more visual noise
- floating spam objects around the bin

### As user interacts
- fewer floating spam objects
- cleaner negative space
- cleaner status text
- can subtly brighten overall composition

### End state
- cleaner, calmer, more confident
- reinforces value proposition emotionally

This progression is important. It gives the interaction narrative meaning.

---

## 26) UI Copy Suggestions
Use copy that is concise and product-grade.

### Hero
Headline:
- Turn spam into trash.

Subheadline:
- AI-powered spam detection for cleaner inboxes, safer clicks, and faster message triage.

Helper text:
- Click a spam item to toss it away.

### Completion copy
- Inbox cleared. Ready to test yours?

### How it works
- Detect suspicious patterns
- Classify with confidence
- Clean clutter instantly

### Final CTA
- Put your messages to the test.

---

## 27) Component-Level Requirements

### Header
- clean logo
- scroll-aware background
- anchor links
- CTA button

### Hero section
- content + interactive scene
- status badge
- accessible controls
- responsive layout

### SpamHeroScene
- 3D camera framing
- trash can model
- 3 floating papers
- ambient motion
- toss trajectories
- success feedback

### ProductPreview
Build a polished mock product panel.
This section should hint at the real classifier product.
Use card-based interface with badges and confidence chips.

### MetricsStrip
Use 3–4 cards with editable values.
Style should match premium SaaS dashboards.

### FinalCTA
Keep it bold and conversion-oriented.

---

## 28) Build Quality Expectations
Claude should not produce a rough proof-of-concept.
It should produce a polished v1 landing page.

### Code quality requirements
- clean TypeScript
- reusable components
- readable props and types
- comments only where helpful
- no giant monolithic file
- no placeholder lorem ipsum
- no broken responsive behavior
- no fake-interactive buttons that do nothing

---

## 29) Deliverables Required
Deliver a complete, runnable project with:

1. fully working landing page
2. polished hero interaction
3. parabolic paper toss mechanic
4. responsive layout
5. accessible controls/fallbacks
6. smooth section reveals
7. modern visual styling
8. easy-to-edit copy/data

Also include:
- concise README
- setup instructions
- scripts to run locally

---

## 30) Acceptance Criteria
The build is successful only if all of the following are true:

### UX / visual
- landing page looks premium and intentional
- hero clearly communicates spam-cleaning metaphor
- CTA hierarchy is obvious
- page feels like a real product landing page, not just an art demo

### Interaction
- papers are clickable/tappable
- paper motion is visibly parabolic
- trash can starts empty
- trash can fills progressively
- status/counter updates correctly
- completion state feels meaningful

### Technical
- no major jank
- responsive on desktop and mobile
- code is modular
- keyboard-accessible path exists
- reduced motion behavior exists

---

## 31) Nice-to-Have Enhancements (Only After Core Is Solid)
Only implement these after the core experience works well.

### Nice-to-haves
- replay interaction button
- slight particle burst on impact
- sound toggle for subtle toss/drop sounds
- animated line showing trajectory preview on hover
- alternate “ham vs spam” sample demo section
- theme tuning variables for easy restyling

Do not let these delay or compromise the core hero.

---

## 32) Guardrails / What Not to Do
Do **not**:
- turn this into a complex physics game
- overload the hero with too many papers
- make the CTA secondary to the animation
- use garish colors
- build everything in 3D when regular UI is better in DOM
- create a visually impressive but conceptually confusing page
- hide the product message behind abstract art

---

## 33) Suggested Implementation Order
Claude should build in this sequence:

### Phase 1 — Scaffold
- create Next.js + TypeScript + Tailwind app
- set up page sections
- build static layout and content structure

### Phase 2 — Hero base
- build hero layout
- add trash can scene
- add floating spam papers
- create state model

### Phase 3 — Toss mechanic
- implement click-to-throw
- build parabolic trajectory logic
- update bin fill state
- add status badge/counter

### Phase 4 — Polish
- hover states
- motion trail
- impact animation
- completion state
- scroll reveals

### Phase 5 — Accessibility + responsiveness
- keyboard path
- reduced motion
- mobile interaction tuning
- performance optimizations

### Phase 6 — Final cleanup
- code cleanup
- README
- ensure production-ready finish

---

## 34) Deliver the Following in the Final Output
When finished, provide:
- the complete codebase
- short explanation of architecture
- key files overview
- setup instructions
- notes on how to tweak colors, labels, and hero object count

---

## 35) Direct Build Instruction to Claude Code
Use the following as the action instruction:

> Build this landing page end-to-end as a polished production-style frontend. Use Next.js, TypeScript, Tailwind, Framer Motion, and React Three Fiber. Prioritize a premium UX, clean architecture, and a satisfying but restrained hero interaction. The trash can must start empty, the spam papers must be interactable, and each selected paper must follow a visible parabolic arc into the bin. The landing page must remain conversion-friendly, accessible, responsive, and easy to extend.

---

## 36) Final Creative North Star
The experience should feel like this:

> A premium AI product landing page where cleaning spam feels tactile, elegant, and satisfying.

Not a toy.
Not just an animation showcase.
A memorable landing page that makes the product story instantly understandable.
