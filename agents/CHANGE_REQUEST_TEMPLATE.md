# Change request template (for LLM tasks)

Use this template to issue well-scoped requests to coding assistants.

## Request metadata

- Request title:
- Requested by:
- Date:

## Objective

Describe the end result in 1-3 sentences.

## Scope

- Files/directories in scope:
- Files/directories explicitly out of scope:
- Allowed file types:
- Disallowed file types:

## Constraints

- Non-negotiable constraints:
- Compatibility requirements:
- Style or formatting requirements:

## Acceptance criteria

1. Criterion 1
2. Criterion 2
3. Criterion 3

## Verification steps

- Command/check 1:
- Command/check 2:
- Manual review checks:

## Git preferences

- Edit on `master`? (yes/no)
- If no, branch name:
- Commit locally? (yes/no)
- Push to remote? (yes/no)

## Deliverable format

- Summary format:
- File references required:
- Include risks/open questions? (yes/no)

## Example (docs-only request)

```text
Objective:
Create a repository bot policy document and a docs index.

Scope:
In scope: README.md, AGENTS.md, agents/INDEX.md
Out of scope: .github/workflows/, _pages/, _includes/, assets/

Constraints:
Do not change deployment behavior.
Do not edit binary files.

Acceptance criteria:
1) README is repo-specific and references AGENTS and agents index.
2) AGENTS defines master-branch confirmation and commit/push prompts.
3) INDEX lists all templates in agents/.

Verification:
Run ls and git status; confirm only docs changed.

Git preferences:
Edit on master? yes
Commit locally? ask first
Push to remote? ask first
```

