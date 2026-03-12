---
description: Creative brainstorming and ideation workflow for exploring solutions before implementation
---

# Brainstorm Workflow

// turbo-all

## Overview

| Phase | Name | Goal | Time |
|-------|------|------|------|
| 0 | **Warm-up** | Activate creative thinking | 3-5 min |
| 1 | **Research** | Gather context from internet/docs | 10-20 min |
| 2 | **Confirm** | Align understanding before diving in | 5-10 min |
| 3 | **Clarify** | Define problem deeply (root cause) | 10-15 min |
| 4 | **Ideate** | Generate many ideas (diverge) | 20-30 min |
| 5 | **Evaluate** | Analyze and prioritize (converge) | 15-20 min |
| 6 | **Visualize** | Diagram solution | 10-15 min |
| 7 | **Decide** | Document decision & next steps | 10-15 min |

**Flow:** `0.Warm-up → 1.Research → 2.Confirm → 3.Clarify → 4.Ideate → 5.Evaluate → 6.Visualize → 7.Decide`

---

## Phase 0: Warm-up

Prime your brain before diving in. Choose 1-2 exercises (60 sec each):

- **Random Word**: Pick random word → force 3 connections to your problem
- **Opposite Day**: What if we did the COMPLETE OPPOSITE?
- **Constraints**: What if we only had 1 hour / zero budget / existing tools only?
- **Yes, And...**: Start with "We could..." → build 3 times with "Yes, and..."

---

## Phase 1: Research

**Goal:** Gather relevant information before confirming understanding. Research prevents assumptions and surfaces unknown unknowns.

### 1.1 What to Research

| Category | Research Questions |
|----------|-------------------|
| **Domain** | What's the industry context? Key terminology? |
| **Existing Solutions** | How do others solve this? What tools exist? |
| **Best Practices** | What patterns/frameworks are recommended? |
| **Constraints** | Technical limitations? Compliance requirements? |
| **Stakeholders** | Who are the users? What are their pain points? |
| **History** | What was tried before? Why did it fail/succeed? |

### 1.2 Research Sources

| Source Type | Examples | When to Use |
|-------------|----------|-------------|
| **Internet** | Google, Stack Overflow, docs | General knowledge, best practices |
| **Internal Docs** | Wiki, Confluence, past ADRs | Company-specific context |
| **Codebase** | Existing code, patterns | Technical constraints |
| **People** | SMEs, stakeholders, users | Domain expertise, politics |
| **Data** | Analytics, logs, metrics | Evidence-based insights |

### 1.3 Research Checklist

Before moving to Confirm phase, ensure you have:

- [ ] Understood the domain/industry context
- [ ] Found 2-3 existing solutions or approaches
- [ ] Identified potential technical constraints
- [ ] Noted any compliance/security requirements
- [ ] Listed key stakeholders and their concerns
- [ ] Gathered relevant data/metrics if available

### 1.4 Research Summary Template

```
## Research Summary

**Topic:** [What was researched]
**Time Spent:** [Duration]

### Key Findings
1. [Finding 1]
2. [Finding 2]
3. [Finding 3]

### Existing Solutions
- [Solution A]: Pros / Cons
- [Solution B]: Pros / Cons

### Constraints Discovered
- [Technical constraint]
- [Business constraint]

### Open Questions
- [Question to clarify in Confirm phase]

### Sources
- [Link 1]
- [Link 2]
```

**Rule:** Don't skip research. 10 minutes of research can save hours of rework.

---

## Phase 2: Confirm Understanding

**Goal:** Ensure alignment before investing time in brainstorming. This step prevents wasted effort from misunderstood requirements.

### Step 2.1: Review Research Findings

Summarize key findings from Phase 1:
- Domain/industry context discovered
- Existing solutions found
- Technical constraints identified
- Stakeholder concerns

### Step 2.2: Identify Clarifying Questions

Ask these questions to surface hidden assumptions:

| Category | Questions to Ask |
|----------|------------------|
| **Scope** | What's in scope? What's explicitly OUT of scope? |
| **Stakeholders** | Who will use this? Who approves? Who might block? |
| **Constraints** | Which constraints are hard (non-negotiable) vs soft (flexible)? |
| **Success** | How will we measure success? What does "done" look like? |
| **Timeline** | Any deadlines? Dependencies on other work? |
| **Resources** | Budget? Team size? Tech stack limitations? |

### Step 2.3: State Your Understanding

Format your understanding clearly:

```
"Let me confirm my understanding:

You want to [GOAL/OUTCOME]
To solve [PROBLEM/PAIN POINT]
For [TARGET USERS/STAKEHOLDERS]
With constraints: [LIST KEY CONSTRAINTS]
Success looks like: [MEASURABLE CRITERIA]

Is this correct? Anything to add or change?"
```

### Step 2.4: 🚨 MANDATORY PAUSE - WAIT FOR USER CONFIRMATION 🚨

**⛔ STOP HERE - DO NOT PROCEED TO PHASE 3 IN THE SAME RESPONSE ⛔**

After stating your understanding in Step 2.3, you MUST:

1. **Use the `AskUserQuestion` tool** to get explicit confirmation
2. **Ask:** "Is my understanding of your request correct?"
3. **Provide options:**
   - ✅ "Yes, this is correct - proceed to Phase 3"
   - ⚠️ "Almost correct, but needs adjustments"
   - ❌ "No, let me clarify the requirements"
4. **WAIT for user to select an option**
5. **DO NOT continue to Phase 3 until user explicitly confirms**

**Why this pause is critical:**
- Prevents wasting time on wrong assumptions
- Ensures alignment before deep work
- Allows user to correct misunderstandings early
- Saves hours of rework

### Decision Gate (After User Response)

| User Response | Your Action |
|--------------|-------------|
| ✅ "Yes, correct" | Proceed to Phase 3: Clarify |
| ⚠️ "Almost, but..." | Update understanding based on feedback, then re-confirm (loop back to Step 2.3) |
| ❌ "No, actually..." | Reset and ask user to re-explain requirements, then start Phase 2 from Step 2.1 |

**Rule:** NEVER proceed to Phase 3 without explicit user confirmation. If you skip this pause, you risk building the wrong solution.

---

## Phase 3: Clarify (Deep Dive)

*Now that understanding is confirmed, dig deeper into the problem space.*

### 3.1 Problem Statement (Refined)
```
Problem: [Specific problem from Phase 2, now more detailed]
Context: [Background, history, why it matters NOW]
Root Cause Hypothesis: [What we think is causing this]
Constraints: [Hard vs Soft - from Phase 2, now prioritized]
Success Metrics: [Quantifiable criteria - numbers, not feelings]
```

### 3.2 Starbursting (6W)
- **WHO** is affected? →
- **WHAT** exactly needs solving? →
- **WHEN** does it occur? →
- **WHERE** does it manifest? →
- **WHY** is it happening? →
- **HOW** is it currently handled? →

### 3.3 The 5 Whys
Ask "Why?" 5 times to find root cause:
1. Why? → 2. Why? → 3. Why? → 4. Why? → 5. **ROOT CAUSE**

### 3.4 Gap Analysis

| Aspect | Current | Desired | Gap | Action |
|--------|---------|---------|-----|--------|
| | | | | |

### 3.5 SWOT (Optional)

| Strengths (Internal+) | Weaknesses (Internal-) |
|-----------------------|------------------------|
| | |
| **Opportunities (External+)** | **Threats (External-)** |
| | |

---

## Phase 4: Ideate (Divergent)

**Rules:** ✅ No criticism ✅ Wild ideas welcome ✅ Quantity > Quality ✅ Build on ideas ⏱️ Time-box 5-10 min each

### 4.1 Classic Brainstorm
Rapid dump - list 10+ ideas without filtering:
1. / 2. / 3. / 4. / 5. / 6. / 7. / 8. / 9. / 10. ...

### 4.2 Mind Mapping
```
[PROBLEM] ─┬─ Branch 1 ─┬─ idea 1.1
           │            └─ idea 1.2
           ├─ Branch 2 ─── idea 2.1
           └─ Branch 3 ─┬─ idea 3.1
                        └─ idea 3.2
```

### 4.3 Crazy Eights
8 ideas in 8 minutes (1 min each). No erasing. Speed > perfection.

### 4.4 SCAMPER

| | Prompt | Your idea |
|-|--------|-----------|
| **S** | Substitute - what can replace? | |
| **C** | Combine - what can merge? | |
| **A** | Adapt - borrow from other domains? | |
| **M** | Modify - magnify/minimize? | |
| **P** | Put to other uses? | |
| **E** | Eliminate - what to remove? | |
| **R** | Reverse - do opposite? | |

### 4.5 Reverse Brainstorming
How to make problem WORSE? → Then reverse each for solutions.

### 4.6 Cross-Domain Thinking
- How does **nature** solve this?
- How would **[other industry]** handle it?
- What would **Google/Apple/Amazon** do?
- What's the **10x solution** (unlimited resources)?

### 4.7 Six Thinking Hats

| Hat | Focus | Thoughts |
|-----|-------|----------|
| ⚪ White | Facts & Data | |
| ❤️ Red | Emotions & Gut | |
| ⚫ Black | Risks & Caution | |
| 💛 Yellow | Benefits & Optimism | |
| 💚 Green | Creativity & Alternatives | |
| 🔵 Blue | Process & Summary | |

### 4.8 Rolestorming
What would suggest: Junior Dev? Senior Architect? End User? Security Expert? Competitor? A child?

### 4.9 Brainwriting (6-3-5)
Write 3 ideas → pass/pause → build on them → combine/mutate best ones.

### 4.10 Just-in-Time Research

When stuck or need inspiration, do quick research:

| Trigger | Research Action |
|---------|-----------------|
| **Stuck on ideas** | Search for similar solutions in other industries |
| **Need inspiration** | Look up competitor approaches, case studies |
| **Cross-domain thinking** | Research how nature/other fields solve this |
| **Technical uncertainty** | Quick search for feasibility of specific approach |

**Prompts:**
- "How do [other companies] solve [similar problem]?"
- "What are innovative approaches to [problem domain]?"
- "Show me examples of [technique] applied to [context]"

**Rule:** Time-box research to 5 min max. Don't let research kill creative momentum.

---

## Phase 5: Evaluate (Convergent)

### 5.1 Affinity Grouping
Cluster ideas into themes:
- **Theme 1**: idea A, idea B, idea C
- **Theme 2**: idea D, idea E
- **Orphans**: ideas that don't fit

### 5.2 Prioritization Matrix

|  | Easy | Hard |
|--|------|------|
| **High Value** | ⭐ DO FIRST | 📋 Plan carefully |
| **Low Value** | 📝 Fill-ins | ❌ Avoid |

### 5.3 Evaluation Scoring

| Idea | Feasibility /5 | Impact /5 | Effort /5 | Risk /5 | Total /20 |
|------|----------------|-----------|-----------|---------|-----------|
| | | | | | |

*Feasibility: can we do it? Impact: value delivered? Effort: 5=low. Risk: 5=low.*

### 5.4 MoSCoW
- **Must Have**: critical, non-negotiable
- **Should Have**: important but not vital
- **Could Have**: nice to have
- **Won't Have**: out of scope

### 5.5 Trade-off Analysis
For top 2-3 options:
```
Option: [Name]
✅ Pros:
❌ Cons:
⚠️ Risks → 🔧 Mitigations:
```

### 5.6 Validation Research

Before finalizing scores, validate assumptions with targeted research:

| Uncertainty | Research Action |
|-------------|-----------------|
| **Feasibility unclear** | Search for technical constraints, limitations |
| **Impact uncertain** | Look for benchmarks, case studies, metrics |
| **Risk unknown** | Search for failure stories of similar approaches |
| **Effort estimate** | Research implementation complexity, dependencies |

**Validation Checklist:**
- [ ] Top 3 ideas have been fact-checked for feasibility
- [ ] Key assumptions are validated (not just gut feeling)
- [ ] Risks are based on evidence, not fear

**Prompts:**
- "What are common pitfalls when implementing [idea]?"
- "Has [similar approach] been tried before? What happened?"
- "What's the typical effort/timeline for [solution type]?"

**Rule:** Validate before committing. 5 min of validation can prevent weeks of wasted effort.

---

## Phase 6: Visualize

Create diagrams as needed:
- **Flowchart**: decision points, user flows
- **Sequence Diagram**: interactions between components
- **Architecture Diagram**: system components & connections
- **User Journey**: touchpoints & emotions

Use Mermaid, Excalidraw, or simple boxes/arrows.

---

## Phase 7: Decide & Document

### Decision Record (ADR)
```
## Decision: [Title]
**Status:** Proposed | Accepted | Deprecated
**Context:** [Situation requiring decision]
**Options:** 1. [A] 2. [B] 3. [C]
**Decision:** [Chosen option + why]
**Consequences:** [Pros, cons, trade-offs accepted]
**Next Steps:**
- [ ] Action 1
- [ ] Action 2
```

---

## Quick Reference

| Situation | Techniques |
|-----------|------------|
| Gather context first | **Phase 1**: Research internet, docs, codebase |
| Ensure alignment | **Phase 2**: Clarifying Questions, Confirm Statement |
| Need many ideas fast | Classic Brainstorm, Crazy Eights |
| Stuck in conventional thinking | Reverse Brainstorming, SCAMPER, Constraints |
| Understand problem deeply | 5 Whys, Starbursting, Gap Analysis |
| Diverse perspectives | Six Hats, Rolestorming, Cross-Domain |
| Stuck during ideation | **4.10**: Just-in-Time Research |
| Validate before deciding | **5.6**: Validation Research |
| Evaluate options | Prioritization Matrix, Scoring, MoSCoW |

---

## 🤖 AI-Assisted Brainstorming

**Research phase prompts:**
- "What are the best practices for [topic]? Search the internet for recent approaches."
- "Find 3 existing solutions for [problem] and compare their pros/cons."
- "What technical constraints should I consider for [technology/domain]?"
- "Search for case studies or examples of [similar problem]."

**Confirm phase prompts:**
- "Before we start, let me confirm my understanding: [state understanding]. Is this correct?"
- "What clarifying questions should I ask about [problem] before brainstorming?"
- "What assumptions am I making about [problem] that I should validate?"

**Ideation prompts:**
- "Generate 10 unconventional solutions for [problem]"
- "Apply SCAMPER to [solution]"
- "What would [persona] suggest?"
- "What could go wrong with [idea]?"
- "Give 5 variations of [idea] with different trade-offs"

**Just-in-time research prompts (Phase 4 & 5):**
- "How do competitors solve [similar problem]? Search for examples."
- "Is [specific idea] technically feasible? What are the constraints?"
- "Find case studies of [approach] - what worked and what failed?"
- "What's the typical effort to implement [solution type]?"

**Tips:** Research before confirming. Confirm before ideating. Validate before deciding. Use AI as partner, not decision maker. Iterate prompts. Challenge outputs. Combine with human judgment.

---

## Tips

**Do:** Research first → Confirm understanding → Quantity over quality → Defer judgment → Time-box → Document everything → Seek diverse perspectives

**Don't:** Skip research → Skip confirm step → Criticize during ideation → Stop at first good idea → Assume you understand → Let loudest voice dominate
