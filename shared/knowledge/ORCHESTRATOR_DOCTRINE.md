# Orchestrator Doctrine — DiggAI Code Sessions

> **Status:** Active as of 2026-04-28
> **Applies to:** All AI coding sessions on this project
> **Principle:** Maximize throughput via parallel subagent teams with zero interference.

---

## 1. Core Rule

**Maximale Subagenten · Maximale Parallelität · Null Interferenz**

- Spawn as many subagents as the task decomposition allows.
- Every subagent receives a **disjoint file/workspace scope**.
- The root agent acts as **Orchestrator** — never as solo worker.

---

## 2. Evidence Base

This doctrine is grounded in research synthesized from parallel studies:

### Trust (CHI, FAccT, arXiv)
- **Trust is calibrated, not assumed.** Agents must show reasoning, admit uncertainty, make changes reversible, and ask before dangerous actions.
- **Silent failures** are worse than crashes. Every subagent must verify its output.
- **Observability:** The Orchestrator maintains an audit trail of all subagent tasks.

### Simplicity (Hermans, Hickey, McCabe, SWE-bench)
- **Cognitive Load:** Each subagent task must be comprehensible in < 30 seconds.
- **Bounded Changes:** Subagents change only what is assigned. No drive-by refactorings.
- **Complexity Thresholds:** McCabe ≤ 10, methods ≤ 50 lines, parameters ≤ 4–5.
- **Preserve Behavior:** Tests must pass before and after. Revert on failure.

### Multi-Agent Parallelism (Google Research 2025, MetaGPT, OpenDev)
- **"More agents is NOT all you need."** Optimal team size: **2–5 parallel subagents**.
- **Isolation layers:** Filesystem (disjoint files), State (no shared variables), Network (no competing ports).
- **Coordination overhead** dominates beyond 5 agents. Use Map-Reduce, not mesh.
- **Schema-level safety** (removing capabilities) beats runtime checks.

---

## 3. Team Topology

```
┌─────────────────────────────────────────┐
│           ORCHESTRATOR (Root)           │
│  - Decomposes tasks                     │
│  - Assigns disjoint scopes              │
│  - Verifies outputs                     │
│  - Rolls back on failure                │
└─────────────────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
┌───▼───┐     ┌────▼────┐    ┌────▼────┐
│Team A │     │ Team B  │    │ Team C  │
│(Files  │     │ (Files  │    │ (Files  │
│ X,Y,Z) │     │  A,B,C) │    │  D,E,F) │
└────────┘     └─────────┘    └─────────┘
```

### Rules
1. **No two teams may touch the same file.**
2. **No shared working branches.** Each team operates on logically independent code.
3. **Read-only scouts first.** If a team needs to explore before editing, use a read-only explore agent.
4. **Report before commit.** Every team reports findings before the Orchestrator applies changes.

---

## 4. Task Decomposition Patterns

| Pattern | When to Use | Example |
|---------|-------------|---------|
| **Map** | Independent files/modules | Fix tests in disjoint test files |
| **Map-Reduce** | Collect → Synthesize → Act | Gather all TODOs, then prioritize |
| **Pipeline** | Sequential dependencies | Parse → Transform → Validate → Write |
| **Fan-out / Fan-in** | Parallel exploration, merged decision | 3 agents research, 1 synthesizes plan |

---

## 5. Session Lifecycle

1. **Scout Phase** (read-only, parallel)
   - Explore agents map the codebase/problem.
   - No files modified.

2. **Plan Phase** (Orchestrator only)
   - Synthesize scout findings.
   - Decompose into disjoint work packages.
   - Write plan file.

3. **Execution Phase** (parallel coder agents)
   - Each coder gets: task, file scope, success criteria.
   - Coders work in isolation.

4. **Verification Phase** (parallel test agents)
   - Run tests, type-check, lint.
   - Report pass/fail per team.

5. **Integration Phase** (Orchestrator)
   - Merge successful changes.
   - Roll back failed teams.
   - Update docs.

---

## 6. Failure Handling

- **3-strike rule:** If a subagent fails 3 times on the same task, escalate to Orchestrator.
- **Rollback on failure:** Any team that breaks tests is reverted. Other teams continue unaffected.
- **No infinite loops:** Subagents stop after 3 failed recovery attempts.

---

## 7. Prohibited Patterns

| Anti-Pattern | Why Forbidden |
|--------------|---------------|
| Two agents editing the same file | Merge conflicts, silent overwrites |
| Agent spawning without Orchestrator knowledge | Uncontrolled parallelism, resource exhaustion |
| Running tests that mutate shared DB state | Non-deterministic failures in parallel agents |
| Drive-by refactoring outside assigned scope | Violates bounded change principle |
| Committing without verification | Violates trust principle |

---

## 8. Quick Reference

```
Before every session:
  ☐ Decompose into disjoint scopes?
  ☐ Team size ≤ 5?
  ☐ Each agent has clear success criteria?
  ☐ Rollback plan defined?

During execution:
  ☐ No file overlaps between teams?
  ☐ Read-only scouts precede writers?
  ☐ Tests run after each team?
```

---

## References

- Amershi et al., *Guidelines for Human-AI Interaction* (CHI '19)
- Jacovi et al., *Formalizing Trust in Artificial Intelligence* (FAccT '21)
- Kim et al., *"Help Me Help the AI"* (CHI '23)
- Rabanser et al., *Towards a Science of AI Agent Reliability* (arXiv 2602.16666v2, 2026)
- Hermans, *The Programmer's Brain*; Hickey, *Simple Made Easy*
- McCabe, *Cyclomatic Complexity* (1976)
- OpenDev / Google Research, Multi-Agent Systems (2025–2026)
