# Review checklist

Use this checklist before handoff, commit, or merge.

## Scope and policy checks

- [ ] Changes are limited to the requested scope.
- [ ] No out-of-scope directories/files were modified.
- [ ] `AGENTS.md` policy was followed for branch/edit behavior.
- [ ] Workflow files were not edited unless explicitly requested.

## File-type safety checks

- [ ] No binary files were modified unless explicitly approved.
- [ ] If any binary changes exist, explicit approval is documented.

## Documentation quality checks

- [ ] Added/updated docs are internally consistent.
- [ ] Links and file references resolve.
- [ ] New guidance does not conflict with `AGENTS.md`.
- [ ] New specs/templates follow existing style in `agents/`.
- [ ] Relevant spec/template files were updated when behavior/schema/policy changed (or marked N/A for content-only edits).

## Git and handoff checks

- [ ] `git status` reviewed and summarized.
- [ ] Unexpected unrelated workspace changes were checked.
- [ ] User was asked: `Commit locally? (yes/no)`.
- [ ] User was asked: `Push to remote? (yes/no)`.

## Final delivery checks

- [ ] Summary includes what changed and why.
- [ ] All changed file paths are listed.
- [ ] Any remaining risks/open questions are listed.
