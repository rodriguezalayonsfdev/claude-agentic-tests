# CLD-2 — Ticket layout and board record modal

**Status:** Implemented
**Branch:** `CLD-2-ticket-layout-board-modal` (based on `CLD-1-ticket-management-system`)
**Created:** 2026-09-18

## Summary
Give `Ticket__c` a proper page layout with all important fields, and let users open a ticket from a kanban card into a modal where they can view, edit, and delete it without leaving the board.

## Context
CLD-1 delivered the `Ticket__c` object, the `TicketBoardController` Apex class, the `ticketBoard` LWC (four status columns with drag-and-drop), the `Tickets` app, and the `Ticket_Manager` permission set. The object uses the auto-generated default layout `Ticket__c-Ticket Layout`, and cards on the board are drag-only with no way to open the record.

This ticket depends on CLD-1, which has not yet been merged to `main` (pushes are blocked by a local SSL certificate problem). The branch is therefore cut from `CLD-1-ticket-management-system` rather than `main`; `/finish-ticket` will merge both into `qa` together.

Constraints: security checklist in `README.md` (CRUD, FLS, and sharing enforced), no Apex needed for this ticket, Jest for all LWC behaviour, no live callouts.

Settled up front (2026-09-18):
- Page layout only, no record page flexipage.
- Layout sections: Information (Ticket Number, Status, Priority, Assignee, Owner), Description, System Information (Created By, Last Modified By). No new fields.
- Delete always asks for confirmation first.
- Modal opens in view mode with an Edit button.
- Anyone holding `Ticket_Manager` may delete (the set already grants delete).

## Options

Layout is identical in all options: one `Ticket__c-Ticket Layout` file overwriting the auto-generated default, so no profile changes are required.

### Option A — LightningModal wrapping `lightning-record-form`
New `ticketModal` LWC extending `LightningModal`, containing `lightning-record-form` with `layout-type="Full"`, readonly by default. Edit button switches to edit mode; Delete button calls `LightningConfirm`, then `deleteRecord` from LDS. Modal closes with a `saved` or `deleted` result and the board calls `refreshApex`.
- Pros: modal renders whatever the layout says, so no field lists in code; CRUD/FLS platform-enforced on view, edit, and delete; no Apex; `lightning/modal` and `lightning/confirm` have Jest stubs.
- Cons: `layout-type="Full"` shows all layout sections including System Information, slightly busy in a modal.

### Option B — Standard navigation actions
`NavigationMixin` to the standard edit overlay and standard record page.
- Pros: nothing to build for the form.
- Cons: view navigates away from the board; no standard delete modal from an app page. Fails the ask.

### Option C — Custom modal with hand-built forms
Same modal shell as A, but `lightning-record-view-form` / `lightning-record-edit-form` with explicit field lists.
- Pros: full control of the modal contents.
- Cons: field list duplicated in code, so every layout change needs a code change and redeploy; more template and Jest surface for no v1 gain.

## Decision
**Option A — LightningModal wrapping `lightning-record-form`.** Approved 2026-09-18 by Tony (aralayon).

It satisfies all settled answers, keeps the page layout as the single source of truth for both the record page and the modal, and adds no Apex. Cards remain draggable; a click opens the modal and is suppressed when a drag just happened.

## Implementation plan
1. **Page layout** — `force-app/main/default/layouts/Ticket__c-Ticket Layout.layout-meta.xml`: sections Information (Name, Status__c, Priority__c, Assignee__c, OwnerId), Description (Description__c, full width), System Information (CreatedById, LastModifiedById). Include standard Edit/Delete/Clone actions and an empty related list block.
2. **`ticketModal` LWC** — `lwc/ticketModal/`: extends `LightningModal` (`lightning/modal`). `@api recordId`. `ticketModal.html` uses `lightning-modal-header` (title from the record Name via `getRecord` wire), `lightning-modal-body` with `lightning-record-form object-api-name="Ticket__c" layout-type="Full" mode={mode}`, and `lightning-modal-footer` with Delete (destructive), Close, and Edit buttons. `ticketModal.js`: `mode` starts as `readonly`; `handleEdit` sets `edit`; `onsuccess` sets `readonly` and records `saved`; `handleDelete` calls `LightningConfirm.open` and, if confirmed, `deleteRecord(recordId)` then `this.close('deleted')`; errors show a toast. `handleClose` closes with `saved` if a save happened, else `undefined`. `ticketModal.js-meta.xml` with `isExposed` false.
3. **`ticketBoard` LWC changes** — `ticketBoard.html`: add `onclick={handleCardClick}` to each card. `ticketBoard.js`: import `TicketModal from 'c/ticketModal'`; `handleDragStart` sets `this.suppressClick = true`; `handleCardClick` returns early and clears the flag if set, otherwise awaits `TicketModal.open({ recordId, size: 'medium' })` and calls `refreshApex(this.wiredResult)` when the result is `saved` or `deleted`. Add `cursor: pointer` hint in CSS.
4. **Jest** — new `lwc/ticketModal/__tests__/ticketModal.test.js`; extend `lwc/ticketBoard/__tests__/ticketBoard.test.js` with `jest.mock('c/ticketModal')` exposing a mocked static `open`.
5. **Manifest** — add `Layout` type with member `Ticket__c-Ticket Layout` to `manifest/package.xml`.
6. **Docs** — set this ticket's Status to `Implemented` when done.

## Test plan
**Apex** — no Apex changes. `/finish-ticket` still runs `TicketBoardControllerTest` via RunLocalTests.

**Jest (`ticketModal`)**
- Renders `lightning-record-form` with `mode="readonly"`, `layout-type="Full"`, and the passed `recordId`.
- Edit button switches the form to `mode="edit"`; a `success` event from the form returns it to `readonly`.
- Delete button calls `LightningConfirm.open`; when it resolves `true`, `deleteRecord` is called with the id and the modal closes with `deleted`.
- When `LightningConfirm.open` resolves `false`, `deleteRecord` is not called and the modal stays open.
- `deleteRecord` rejection dispatches an error toast and the modal stays open.
- Close after a save closes with `saved`; Close without a save closes with no result.

**Jest (`ticketBoard`, additions)**
- Clicking a card calls `TicketModal.open` with that card's `recordId`.
- When `open` resolves `saved` or `deleted`, `refreshApex` is called; when it resolves undefined, it is not.
- A `dragstart` followed by a `click` on the same card does not open the modal; the next plain click does.
- Existing six tests still pass.

**Manual checks in `claude-dev`**
- Open a Ticket record page: layout shows the three sections with the agreed fields.
- On the board, click a card: modal opens in view mode with matching fields. Edit, change Priority, save: modal returns to view mode and the card badge updates after close.
- Delete: confirmation dialog appears; Cancel keeps the record; Confirm removes the card from the board.
- Drag a card between columns: status changes and no modal opens.
- Log in as a user without `Ticket_Manager`: board and modal are inaccessible.

## Notes / follow-ups
- A Lightning record page flexipage (Highlights panel, Related tab) is out of scope; revisit if the default record page is insufficient.
- Claude-assisted features (triage, summarisation) remain deferred to a later ticket.
- CLD-1 and CLD-2 must reach `main` once the SSL push problem is fixed; CLD-2 will then need no rebase because it is a linear descendant of CLD-1.

**Implementation notes (2026-09-18)**

- Deployed to `claude-dev` (deploy id `0Affj00000RjpBjCAJ`): 16 components, 2 Apex tests passed. 18 Jest tests pass (10 board, 8 modal), ESLint and Prettier clean.
- sfdx-lwc-jest 7 has no stub for the `lightning/modal` base class, only for its header/body/footer. Added `force-app/test/jest-mocks/lightning/modal.js` and a `moduleNameMapper` entry in `jest.config.js`; `**/jest-mocks/**` added to `.forceignore` so it never deploys.
- A `CustomEvent` turns an undefined `detail` into `null`, so tests assert `toBeFalsy()` for a close with no result.
- Mocking a `c/` component with a `jest.mock` factory needs `__esModule: true` on the returned object, otherwise Babel's default-import interop nests the mock one level too deep. `virtual: true` must not be used for `c/` modules or the mock is not matched.
- Cards track `isDragging` between `dragstart` and `dragend`; a click during that window is ignored so drags never open the modal.
