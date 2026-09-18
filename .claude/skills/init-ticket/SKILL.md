---
name: init-ticket
description: Start work on a CLD-### ticket. Creates a branch from an up-to-date main, opens a decision doc, and runs a brainstorm that must be approved before any code is written. Use when the user says "init ticket", "start ticket CLD-123", or "new ticket".
---

# init-ticket

Argument: `CLD-###` and optionally a short title, e.g. `/init-ticket CLD-12 Claude service callout`.

## Rules
- Never write anything under `force-app/` during this skill. This skill ends with an approved decision, not code.
- Never deploy to any org during this skill.
- Ask before committing anything other than the decision doc.
- Run `sf` commands from PowerShell (the Bash tool breaks on the Node install path on this machine).

## Steps

1. **Validate input.** The ticket id must match `CLD-\d+`. Stop and ask if it does not, or if no id was given.

2. **Check the tree.** `git status --porcelain` must be empty. If not, stop and show the user what is uncommitted. Do not stash or discard on your own.

3. **Update main and branch.**
   ```
   git checkout main
   git pull --ff-only origin main
   git checkout -b CLD-###-<slug>
   ```
   The slug is 2-4 lowercase words from the title joined by hyphens. If `git pull` fails on network or SSL, tell the user and continue from local main only if they agree.
   If the branch already exists, check it out instead and skip to step 5.

4. **Create the decision doc.** Copy `docs/tickets/_TEMPLATE.md` to `docs/tickets/CLD-###.md`, fill in the id, title, branch name, and today's date, set Status to `Draft`. Commit it alone:
   ```
   git add docs/tickets/CLD-###.md
   git commit -m "CLD-###: open decision doc"
   ```

5. **Brainstorm.** Read `README.md` and the existing code under `force-app/` that the ticket touches. Then in chat:
   - Restate the ask in one paragraph and list open questions. Wait for answers.
   - Propose at least two options with concrete pros and cons for this codebase (governor limits, security checklist in README, Anthropic API constraints, test strategy).
   - Recommend one and say why.
   - Iterate until the user says the decision is approved.

6. **Record the decision.** Fill in Decision, Implementation plan, and Test plan in the doc. Set Status to `Approved`. Show the diff. Commit only after the user confirms:
   ```
   git commit -am "CLD-###: record approved decision"
   ```

7. **Hand off.** Tell the user the branch name and that implementation can begin. Implementation follows the dev best practices in `docs/DEV_PRACTICES.md` when that file exists.
