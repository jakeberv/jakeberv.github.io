# Workflows spec template

Use this template to plan any `.github/workflows/*` changes before implementation.

## File extension convention

- GitHub Actions supports both `.yaml` and `.yml`.
- Preferred extension for new workflow files: `.yaml`.
- Existing workflow files may keep their current extension (for example `.yml`) to avoid unnecessary churn.

## Safety rule (required)

Workflow files may only be modified when explicitly requested by the user.

## 1) Workflow overview

- Workflow name:
- Objective:
- Why change is needed:
- In-scope workflow files:
- Out-of-scope workflow files:

## 2) Trigger and execution model

- Trigger type:
  - `push`
  - `pull_request`
  - `schedule`
  - `workflow_dispatch`
- Branch filters:
- Path filters:
- Concurrency policy:

## 3) Permissions and security

- Required `permissions` block:
- Secrets used:
- Token scopes required:
- Third-party actions pinned by version/SHA:

## 4) Dependencies and environment

- Runtime version(s) (Ruby/Python/Node):
- External dependencies to install:
- Caching strategy:
- Matrix strategy (if any):

## 5) Inputs and outputs

- Input files/data:
- Generated outputs/artifacts:
- Repo-tracked files expected to change (if any):
- Log/report output location:

## 6) Failure and rollback behavior

- Retry strategy:
- Failure conditions:
- Alerts/visibility:
- Rollback plan:

## 7) Compatibility constraints

- Must not break existing deploy behavior:
- Must remain compatible with current branch workflow:
- Backward compatibility requirements:

## 8) Acceptance criteria

- Trigger behaves as expected.
- Permissions are minimal and sufficient.
- Workflow succeeds on intended events.
- Existing deployment workflow remains unchanged unless explicitly intended.

## 9) Test plan

- Dry-run or manual dispatch scenario:
- Failure injection scenario:
- Success criteria checks:
