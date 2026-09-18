# CLD-1 — Ticket management system

**Status:** Approved
**Branch:** `CLD-1-ticket-management-system`
**Created:** 2026-09-18

## Summary
Build a ticket management system in this Salesforce project so that work items (tickets) can be created, tracked through a lifecycle, assigned, and reviewed from within the org.

## Context
Today the repo only tracks tickets as markdown decision docs under `docs/tickets/`. There is no Salesforce metadata yet: `force-app/main/default/` contains only `.gitkeep` placeholders for objects, classes, LWC, permission sets, tabs, and flexipages. This ticket therefore also establishes the first real objects, permission sets, Apex, and LWC in the codebase, and sets the pattern later Claude-assisted features will follow.

Constraints to respect:
- Security checklist in `README.md`: `with sharing` / inherited sharing, CRUD and FLS enforcement, permission-set gated access.
- Salesforce governor limits: bulk-safe code, no callouts after uncommitted DML.
- If any Claude integration is added later (e.g. ticket summarisation or triage), it must go through the Named Credential pattern described in the README and be mocked in tests.

Settled up front (2026-09-18):
- New custom object, not the standard Case object.
- Default statuses: New, In progress, Blocked, Done.
- One permission set for all users.
- Kanban-style board with drag-and-drop.
- No automation (triggers, flows, validation rules) in v1.
- Claude-assisted features are out of scope for this ticket.

## Options

Shared metadata for every option: `Ticket__c` custom object (auto-number `TKT-{0000}`, `Status__c` picklist New / In progress / Blocked / Done, `Priority__c` picklist Low / Medium / High, `Description__c` long text, `Assignee__c` lookup to User), a `Ticket_Manager` permission set, a `Tickets` Lightning app with tab and app page, and a `ticketBoard` LWC with one column per status and HTML5 drag-and-drop. The options differ only in how the LWC reads and writes records.

### Option A — Lightning Data Service only, no Apex
Read via the `graphql` wire adapter, write via `updateRecord`.
- Pros: zero Apex and no coverage to maintain; CRUD, FLS, and sharing enforced by the platform; LDS handles cache invalidation.
- Cons: the GraphQL wire adapter is verbose and hard to mock in Jest; grouping and limit logic lives in the client; pages at 2000 records; establishes no Apex pattern for later Claude callouts.

### Option B — Apex read, LDS write
`TicketBoardController` exposes one `@AuraEnabled(cacheable=true)` method that runs a single SOQL `WITH USER_MODE`. Drag-and-drop calls `updateRecord` from the LWC, then `refreshApex`.
- Pros: one query ordered and limited server-side; trivial to mock in Jest with `createApexTestWireAdapter`; the write path keeps platform CRUD/FLS enforcement with no DML in Apex; introduces the `with sharing` controller pattern later tickets reuse.
- Cons: one Apex class and test to maintain; two data paths (Apex in, LDS out).

### Option C — Apex read and write
Option B plus an `updateStatus(Id, String)` Apex method doing DML.
- Pros: single data path; room for future transition rules.
- Cons: must hand-enforce CRUD/FLS on the write and add negative tests; more code with no v1 benefit since no automation is in scope.

Zero-code fallback considered: the standard Kanban display on a `Ticket__c` list view. Rejected as the deliverable because it is not customizable and establishes no LWC pattern. Useful only as a manual comparison during testing.

## Decision
**Option B — Apex read, LDS write.** Approved 2026-09-18 by Tony (aralayon).

Why B over A: this project will need Apex for every Claude callout, so a small read-only controller establishes the `with sharing` / `WITH USER_MODE` / cacheable-method pattern and Apex test conventions cheaply. Jest mocking of an Apex wire adapter is far simpler than mocking GraphQL. Security is equivalent: the write stays on LDS so CRUD and FLS are platform-enforced in both options.

## Implementation plan
1. **Custom object** — `force-app/main/default/objects/Ticket__c/`: `Ticket__c.object-meta.xml` (auto-number name `TKT-{0000}`, reports enabled, sharing model ReadWrite) and fields `Status__c` (restricted picklist, default New), `Priority__c` (restricted picklist, default Medium), `Description__c` (LongTextArea 32768), `Assignee__c` (Lookup to User). Add list view `All_Tickets`.
2. **Apex controller** — `classes/TicketBoardController.cls` (`public with sharing`) with `@AuraEnabled(cacheable=true) getTickets()` returning `List<Ticket__c>` (Id, Name, Status__c, Priority__c, Assignee__r.Name) ordered by Priority then CreatedDate, `WITH USER_MODE`, `LIMIT 500`. Plus `.cls-meta.xml`.
3. **Apex test** — `classes/TicketBoardControllerTest.cls`: seed tickets in each status, assert count and ordering; run as a user with the permission set to prove user-mode access; assert an exception for a user without object access.
4. **LWC** — `lwc/ticketBoard/`: `ticketBoard.js` wires `getTickets`, groups by status into four columns, handles `dragstart` / `dragover` / `drop`, calls `updateRecord` with the new `Status__c`, then `refreshApex`; shows a toast on error. `ticketBoard.html` renders columns and cards (Name, Priority badge, Assignee). `ticketBoard.css` for column layout and drag hover state. `ticketBoard.js-meta.xml` exposes the component to `lightning__AppPage`.
5. **App surface** — `tabs/Ticket__c.tab-meta.xml`; `flexipages/Ticket_Board.flexipage-meta.xml` (app page hosting `ticketBoard`); `tabs/Ticket_Board.tab-meta.xml`; `applications/Tickets.app-meta.xml` (Lightning app with both tabs).
6. **Permission set** — `permissionsets/Ticket_Manager.permissionset-meta.xml`: `Ticket__c` CRUD, read/edit on all custom fields, `TicketBoardController` class access, both tabs visible, `Tickets` app visible.
7. **Manifest** — add the new metadata types and members to `manifest/package.xml`.
8. **Docs** — set this ticket's Status to `Implemented` when done.

## Test plan
**Apex** (no callouts exist in this ticket; any future callout must be mocked)
- `getTickets` returns all seeded tickets with expected field values and ordering.
- Running as a `Ticket_Manager` user succeeds; running as a user with no `Ticket__c` access throws, proving user-mode enforcement.
- Coverage target: 100% of `TicketBoardController`.

**Jest** (`lwc/ticketBoard/__tests__/ticketBoard.test.js`)
- Renders four columns in status order with correct card counts from mocked `getTickets` data.
- Empty data renders four empty columns without error.
- Drop on a different column calls `updateRecord` with the card Id and target status, then `refreshApex`.
- Drop on the same column does not call `updateRecord`.
- `updateRecord` rejection dispatches an error toast and leaves the board unchanged.

**Manual checks in `claude-dev`**
- Assign `Ticket_Manager`, open the `Tickets` app, create tickets via the tab, confirm they appear on the board.
- Drag a card across each transition and confirm the record's Status updates on the record page.
- Log in as a user without the permission set and confirm the app, tab, and board are not accessible.
- Compare with the standard Kanban list view display for parity.

## Notes / follow-ups
- Claude-assisted triage, summarisation, and draft replies deferred to a later ticket.
- Status transition rules and automation (Closed date stamp, validation) deferred; none in v1.
- A custom `Ticket__c` record page flexipage can follow if the default layout is insufficient.
- `git pull` from origin failed with an SSL certificate error on 2026-09-18; branch cut from local main, which was ahead of origin.
