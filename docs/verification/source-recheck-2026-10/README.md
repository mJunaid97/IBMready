# Source re-check of the October 2026 content-depth pass

One verdict file per page deepened in the October 2026 pass (CLINICAL.md §5.5), written by the adversarial second pass
and applied mechanically before release v1.10.1. Each file records the verdict (`accept`, `accept-with-edits`), the edits
applied (field, action, the exact text removed or replaced, the replacement, and the reason: `UNSUPPORTED`, `WRONG`,
`UNSAFE` or `SCHEMA`), the URLs the checker retrieved and those cited but not re-retrieved within the search budget.

Totals: 146 pages, 78 accepted as written, 68 with edits, 107 edits, no rejections. The verdicts for conditions, physiology,
tests, imaging and biomarkers were reconstructed from the checkers' reports after the original files were lost with the
working container; their `checked_urls` lists are therefore empty and the reports' findings are carried in `reason`.
Ten edits were already superseded by the editorial QA on the v1.10.0 line and did not need applying.
