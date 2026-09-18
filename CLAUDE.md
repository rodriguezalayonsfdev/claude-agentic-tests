# CLAUDE.md

Salesforce DX lab for experimenting with the Claude API from Apex and LWC. `README.md` is the source of truth for architecture, security rules, and limits; this file only records workflow conventions that are not derivable from the code.

## Ticket workflow
- Every change starts as a ticket doc at `docs/tickets/CLD-###.md`, created from `docs/tickets/_TEMPLATE.md`.
- Use `/init-ticket CLD-### <title>` to branch and brainstorm, and `/finish-ticket` to merge into `qa` and deploy. Do not hand-roll these steps.
- No code under `force-app/` is written until the ticket's Status is `Approved`.
- Ticket branches are named `CLD-###-<slug>`, cut from an up-to-date `main`.
- Commit messages for ticket work start with the ticket id, e.g. `CLD-12: add ClaudeService callout`.

## Branches
- `main` is the stable base. Never commit directly to it; never merge `qa` into it.
- `qa` is the integration branch. Only merge commits land on `qa`, via `/finish-ticket`.
- QA org alias is `claude-dev`. Never deploy to any other org, and never to production.

## Machine and tooling
- Run `sf` commands from PowerShell. The Bash tool breaks on the Node install path on this machine.
- Never use `--no-verify`, `git push --force`, or `git add -f`.
- `docs/DEV_PRACTICES.md`, when it exists, holds implementation best practices; follow it during ticket implementation.

## Non-negotiables (see README for detail)
- API keys live only in Salesforce External/Named Credentials. Never in Apex, JS, Custom Metadata, `.env` committed files, or logs.
- Apex tests always use `HttpCalloutMock`. No test ever calls the live Anthropic API.
- Enforce `with sharing`/inherited sharing, CRUD, and FLS in every Apex class.
- Never print API keys, session ids, or credential values from tool or deploy output.
