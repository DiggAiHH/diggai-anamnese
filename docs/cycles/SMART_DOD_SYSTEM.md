# SMART DoD Tracking System

## 1) Main Target
Target ID: T-WR-AVATAR-MVP
Target Name: Waiting-Room Avatar Guidance MVP Ready
Business Intent: Improve patient waiting guidance with measurable progress, stable delivery, and resumable execution.

## 2) SMART Definition

| SMART | Definition for this track |
|---|---|
| S (Specific) | Enable feature-gated waiting-room flow, add queue-driven avatar voice guidance, harden queue payload compatibility, and add speech endpoint rate limiting. |
| M (Measurable) | Track KPI table below in every round note with Before, Now, Delta, Percent. |
| A (Action) | Deliver in small rounds with explicit checkpoints and rollback-safe changes. |
| R (Reproducible) | Use fixed formulas, fixed evidence sources, and fixed report template each round. |
| T (Time) | 90-minute rounds, checkpoint every 25 minutes, end-of-round evidence snapshot. |

## 3) KPI Catalog (Measurable Values)

| KPI ID | KPI Name | Formula | Target | Source | Cadence |
|---|---|---|---|---|---|
| KPI-01 | Scope Completion % | completed_work_items / planned_work_items * 100 | >= 90% per round | round checklist | each round |
| KPI-02 | DoD Pass % | passed_dod_criteria / total_dod_criteria * 100 | 100% for release, >= 70% for dev checkpoint | DoD checklist | each round |
| KPI-03 | Technical Validation % | passed_checks / executed_checks * 100 | 100% | type-check + diagnostics + tests | each round |
| KPI-04 | Changed File Health % | changed_files_without_errors / total_changed_files * 100 | 100% | diagnostics tool | each round |
| KPI-05 | Contract Compatibility % | accepted_payload_fields / required_payload_fields * 100 | 100% | API/socket contract check | each round |
| KPI-06 | Security Hardening % | implemented_controls / planned_controls * 100 | 100% for security slice | route/middleware diff | each round |
| KPI-07 | Traceability Completeness % | populated_note_sections / required_note_sections * 100 | 100% | round note | each round |
| KPI-08 | Recovery Readiness % | checkpoint_resume_paths_defined / required_resume_paths * 100 | 100% | checkpoint section | each round |

## 4) Definition of Done (DoD)
Release DoD is done only when all criteria are true.

1. Waiting-room flow is enabled via feature flag, not hardcoded.
2. Avatar guidance logic exists and is integrated in waiting-room runtime.
3. Queue event payload is backward/forward compatible for wait time fields.
4. Avatar speech endpoint has active rate limiting.
5. Changed files have no diagnostics errors.
6. Type-check is green.
7. Test policy for this slice is executed (minimum agreed checks).
8. Round note is complete with table + tree + bar chart + evidence links.
9. Rollback path is documented.

## 5) Traceability and Checkpoint Rules

Round ID format: R-YYYY-MM-DD-XX
Checkpoint ID format: CP-<RoundID>-<N>

Required checkpoints per round:
- CP-1: Scope lock and KPI baseline.
- CP-2: Mid-round implementation status.
- CP-3: Validation status.
- CP-4: Final evidence snapshot.

If session stops (policy/interruption/power/network), resume from last checkpoint only.

## 6) Reporting Standard (Perfect Note)
Every round note must include:

1. Header (Target, Round ID, Timebox, Owner)
2. KPI Table (Before, Now, Delta, Percent, Status)
3. DoD Checklist (pass/fail)
4. Tree Diagram (goal -> metrics -> actions -> evidence)
5. Bar Chart (Before vs Now)
6. Checkpoints and recovery pointers
7. Next round plan (3-5 concrete items)

## 7) Standard Decision Gates

Gate A (Continue): KPI-01 >= 70 and KPI-03 = 100
Gate B (Release Candidate): KPI-02 = 100 and KPI-03 = 100 and KPI-04 = 100
Gate C (Stop and fix): KPI-03 < 100 or critical DoD failure
