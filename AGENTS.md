# AGENTS.md

Repository-wide policy for AI coding agents (Codex, Claude, Copilot, and similar tools).

## Purpose

This file defines how bots should operate in this repository so changes are predictable and aligned with the maintainer workflow.

## Default Branch and Edit Policy

1. Default target branch is `main`.
2. Before the first write action in a task, the bot must ask for confirmation to edit on `main`.
3. If the user explicitly asks for a new branch, create/use that branch for the task.
4. Do not assume a PR workflow unless explicitly requested.

## File Scope Policy

1. Bots may edit website/source files when requested.
2. Bots must not edit binary files unless explicitly requested.
3. Examples of binary/asset files that are off-limits by default:
   - `*.RDS`
   - `*.pdf`
   - `*.png`, `*.jpg`, `*.jpeg`, `*.webp`, `*.tiff`, `*.ico`, `*.svg`
   - `*.ttf`, `*.woff`, `*.woff2`, `*.eot`
4. Data/source scripts (`.R`, `.py`, `.ipynb`, etc.) are editable only when explicitly requested for the task.

## GitHub Actions Policy

1. Files in `.github/workflows/` may be edited only when the user explicitly requests workflow changes.
2. Do not modify deployment or CI behavior implicitly.

## Git Safety Policy

1. Do not use destructive git commands unless explicitly requested.
2. If unexpected unrelated workspace mutations appear, stop and ask the user how to proceed.
3. Preserve user changes; do not revert unrelated edits.

## Completion Prompts (Required)

After making edits, bots must ask both of the following:

1. `Commit locally? (yes/no)`
2. `Push to remote? (yes/no)`

Default behavior is no commit and no push until explicit user approval.
