import { createElement } from "lwc";
import TicketBoard from "c/ticketBoard";
import getTickets from "@salesforce/apex/TicketBoardController.getTickets";
import { updateRecord } from "lightning/uiRecordApi";
import { refreshApex } from "@salesforce/apex";
const SHOW_TOAST_EVENT = "lightning__showtoast";

jest.mock(
  "@salesforce/apex/TicketBoardController.getTickets",
  () => {
    const { createApexTestWireAdapter } = require("@salesforce/sfdx-lwc-jest");
    return { default: createApexTestWireAdapter(jest.fn()) };
  },
  { virtual: true }
);

jest.mock(
  "@salesforce/apex",
  () => ({ refreshApex: jest.fn(() => Promise.resolve()) }),
  { virtual: true }
);

const TICKETS = [
  {
    Id: "a01000000000001",
    Name: "TKT-0001",
    Status__c: "New",
    Priority__c: "High",
    Assignee__r: { Name: "Ada" }
  },
  {
    Id: "a01000000000002",
    Name: "TKT-0002",
    Status__c: "New",
    Priority__c: "Low"
  },
  {
    Id: "a01000000000003",
    Name: "TKT-0003",
    Status__c: "In progress",
    Priority__c: "Medium",
    Assignee__r: { Name: "Grace" }
  },
  {
    Id: "a01000000000004",
    Name: "TKT-0004",
    Status__c: "Done",
    Priority__c: "High"
  }
];

// eslint-disable-next-line @lwc/lwc/no-async-operation
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

function mount() {
  const element = createElement("c-ticket-board", { is: TicketBoard });
  document.body.appendChild(element);
  return element;
}

function columns(element) {
  return Array.from(
    element.shadowRoot.querySelectorAll('[data-testid="column"]')
  );
}

function cards(columnEl) {
  return Array.from(columnEl.querySelectorAll('[data-testid="card"]'));
}

function dragCardToColumn(cardEl, columnEl) {
  const dataTransfer = {
    setData: jest.fn(),
    getData: jest.fn(),
    effectAllowed: ""
  };
  const dragStart = new CustomEvent("dragstart", { bubbles: true });
  Object.defineProperty(dragStart, "dataTransfer", { value: dataTransfer });
  cardEl.dispatchEvent(dragStart);

  const drop = new CustomEvent("drop", { bubbles: true });
  Object.defineProperty(drop, "dataTransfer", { value: dataTransfer });
  columnEl.dispatchEvent(drop);
}

describe("c-ticket-board", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it("renders four columns in status order with correct card counts", async () => {
    const element = mount();
    getTickets.emit(TICKETS);
    await flushPromises();

    const cols = columns(element);
    expect(cols.map((c) => c.dataset.status)).toEqual([
      "New",
      "In progress",
      "Blocked",
      "Done"
    ]);
    expect(cols.map((c) => cards(c).length)).toEqual([2, 1, 0, 1]);
    expect(
      cols.map((c) => c.querySelector('[data-testid="count"]').textContent)
    ).toEqual(["2", "1", "0", "1"]);
    expect(cards(cols[0])[0].textContent).toContain("Ada");
    expect(cards(cols[0])[1].textContent).toContain("Unassigned");
  });

  it("renders four empty columns when there is no data", async () => {
    const element = mount();
    getTickets.emit([]);
    await flushPromises();

    const cols = columns(element);
    expect(cols).toHaveLength(4);
    expect(cols.every((c) => cards(c).length === 0)).toBe(true);
  });

  it("drop on a different column updates the record and refreshes", async () => {
    const element = mount();
    getTickets.emit(TICKETS);
    await flushPromises();

    const cols = columns(element);
    dragCardToColumn(cards(cols[0])[0], cols[1]);
    await flushPromises();

    expect(updateRecord).toHaveBeenCalledTimes(1);
    expect(updateRecord.mock.calls[0][0]).toEqual({
      fields: { Id: "a01000000000001", Status__c: "In progress" }
    });
    expect(refreshApex).toHaveBeenCalledTimes(1);
  });

  it("drop on the same column does not update the record", async () => {
    const element = mount();
    getTickets.emit(TICKETS);
    await flushPromises();

    const cols = columns(element);
    dragCardToColumn(cards(cols[0])[0], cols[0]);
    await flushPromises();

    expect(updateRecord).not.toHaveBeenCalled();
    expect(refreshApex).not.toHaveBeenCalled();
  });

  it("shows an error toast and leaves the board unchanged when the update fails", async () => {
    updateRecord.mockRejectedValueOnce({
      body: { message: "Insufficient access" }
    });
    const element = mount();
    const toastHandler = jest.fn();
    element.addEventListener(SHOW_TOAST_EVENT, toastHandler);
    getTickets.emit(TICKETS);
    await flushPromises();

    const cols = columns(element);
    dragCardToColumn(cards(cols[0])[0], cols[3]);
    await flushPromises();

    expect(toastHandler).toHaveBeenCalledTimes(1);
    expect(toastHandler.mock.calls[0][0].detail.variant).toBe("error");
    expect(toastHandler.mock.calls[0][0].detail.message).toBe(
      "Insufficient access"
    );
    expect(refreshApex).not.toHaveBeenCalled();
    expect(cards(columns(element)[0])).toHaveLength(2);
  });

  it("shows an error toast when the wire fails", async () => {
    const element = mount();
    const toastHandler = jest.fn();
    element.addEventListener(SHOW_TOAST_EVENT, toastHandler);
    getTickets.error({ message: "boom" });
    await flushPromises();

    expect(toastHandler).toHaveBeenCalledTimes(1);
    expect(columns(element).every((c) => cards(c).length === 0)).toBe(true);
  });
});
