# CLD-1 — Ticket management system

**Status:** Draft
**Branch:** `CLD-1-ticket-management-system`
**Created:** 2026-09-18

## Summary
Build a ticket management system in this Salesforce project so that work items (tickets) can be created, tracked through a lifecycle, assigned, and reviewed from within the org.

## Context
Today the repo only tracks tickets as markdown decision docs under `docs/tickets/`. There is no Salesforce metadata yet: `force-app/main/default/` contains only `.gitkeep` placeholders for objects, classes, LWC, permission sets, tabs, and flexipages.

Constraints to respect:
- Security checklist in `README.md`: `with sharing` / inherited sharing, CRUD and FLS enforcement, permission-set gated access.
- Salesforce governor limits: bulk-safe triggers, no callouts after uncommitted DML.
- If any Claude integration is added later (e.g. ticket summarisation or triage), it must go through the Named Credential pattern described in the README and be mocked in tests.

Open questions to settle in the brainstorm:
- Custom object vs. reusing the standard Case object.
- Which lifecycle statuses are needed (e.g. New, In progress, Blocked, Done).
- Who the users are and what permission set(s) they need.
- Whether a Lightning App Page / LWC board is in scope for the first version, or only the object and list views.
- Whether Claude-assisted features (triage, summarisation, draft replies) are in scope now or a follow-up ticket.

## Options

### Option A — Custom `Ticket__c` object
Dedicated custom object with status picklist, priority, assignee lookup, and description; standard record pages and list views first, optional LWC board later.
- Pros: full control of the data model; no interference with standard Case behaviour; simple to test.
- Cons: re-implements things Case already provides (assignment, escalation, email-to-case).

### Option B — Reuse standard `Case`
Configure Case with a record type, custom fields, and page layouts for internal tickets.
- Pros: built-in assignment rules, escalation, feeds, and reporting; less metadata to maintain.
- Cons: Case semantics are customer-support oriented; harder to keep experiments isolated from any future support use.

## Decision
Pending brainstorm and approval.

## Implementation plan
To be filled in once the decision is approved.

## Test plan
To be filled in once the decision is approved. All Apex tests mocked, no live callouts; Jest tests for any LWC; manual checks in the dev org.

## Notes / follow-ups
- Claude-assisted triage or summarisation is a likely follow-up ticket.
