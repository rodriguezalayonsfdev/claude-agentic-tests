import { createElement } from "lwc";
import TicketModal from "c/ticketModal";
import LightningConfirm from "lightning/confirm";
import { deleteRecord, getRecord } from "lightning/uiRecordApi";

const SHOW_TOAST_EVENT = "lightning__showtoast";
const RECORD_ID = "a01000000000001";

// eslint-disable-next-line @lwc/lwc/no-async-operation
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

function mount() {
  const element = createElement("c-ticket-modal", { is: TicketModal });
  element.recordId = RECORD_ID;
  document.body.appendChild(element);
  return element;
}

function byTestId(element, id) {
  return element.shadowRoot.querySelector(`[data-testid="${id}"]`);
}

describe("c-ticket-modal", () => {
  beforeEach(() => {
    LightningConfirm.open = jest.fn().mockResolvedValue(true);
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it("renders the record form readonly with the full layout for the record", () => {
    const element = mount();
    const form = byTestId(element, "form");

    expect(form.recordId).toBe(RECORD_ID);
    expect(form.objectApiName).toBe("Ticket__c");
    expect(form.layoutType).toBe("Full");
    expect(form.mode).toBe("readonly");
    expect(byTestId(element, "edit")).not.toBeNull();
  });

  it("shows the ticket name in the header once the record loads", async () => {
    const element = mount();
    getRecord.emit({ fields: { Name: { value: "TKT-0007" } } });
    await flushPromises();

    expect(
      element.shadowRoot.querySelector("lightning-modal-header").label
    ).toBe("Ticket TKT-0007");
  });

  it("Edit switches the form to edit mode and success returns it to readonly", async () => {
    const element = mount();
    byTestId(element, "edit").click();
    await flushPromises();

    const form = byTestId(element, "form");
    expect(form.mode).toBe("edit");
    expect(byTestId(element, "edit")).toBeNull();

    form.dispatchEvent(new CustomEvent("success"));
    await flushPromises();

    expect(form.mode).toBe("readonly");
    expect(byTestId(element, "edit")).not.toBeNull();
  });

  it("cancel from the form returns to readonly without marking saved", async () => {
    const element = mount();
    const closeHandler = jest.fn();
    element.addEventListener("close", closeHandler);

    byTestId(element, "edit").click();
    await flushPromises();
    byTestId(element, "form").dispatchEvent(new CustomEvent("cancel"));
    await flushPromises();

    expect(byTestId(element, "form").mode).toBe("readonly");
    byTestId(element, "close").click();
    expect(closeHandler.mock.calls[0][0].detail).toBeFalsy();
  });

  it("Delete asks for confirmation, deletes, and closes with deleted", async () => {
    const element = mount();
    const closeHandler = jest.fn();
    element.addEventListener("close", closeHandler);

    byTestId(element, "delete").click();
    await flushPromises();

    expect(LightningConfirm.open).toHaveBeenCalledTimes(1);
    expect(LightningConfirm.open.mock.calls[0][0].label).toBe("Delete ticket");
    expect(deleteRecord).toHaveBeenCalledWith(RECORD_ID);
    expect(closeHandler).toHaveBeenCalledTimes(1);
    expect(closeHandler.mock.calls[0][0].detail).toBe("deleted");
  });

  it("does not delete when the confirmation is declined", async () => {
    LightningConfirm.open.mockResolvedValue(false);
    const element = mount();
    const closeHandler = jest.fn();
    element.addEventListener("close", closeHandler);

    byTestId(element, "delete").click();
    await flushPromises();

    expect(deleteRecord).not.toHaveBeenCalled();
    expect(closeHandler).not.toHaveBeenCalled();
  });

  it("shows an error toast and stays open when delete fails", async () => {
    deleteRecord.mockRejectedValueOnce({
      body: { message: "Insufficient access" }
    });
    const element = mount();
    const closeHandler = jest.fn();
    const toastHandler = jest.fn();
    element.addEventListener("close", closeHandler);
    element.addEventListener(SHOW_TOAST_EVENT, toastHandler);

    byTestId(element, "delete").click();
    await flushPromises();

    expect(toastHandler).toHaveBeenCalledTimes(1);
    expect(toastHandler.mock.calls[0][0].detail.message).toBe(
      "Insufficient access"
    );
    expect(closeHandler).not.toHaveBeenCalled();
  });

  it("Close after a save closes with saved; Close without a save closes with nothing", async () => {
    const element = mount();
    const closeHandler = jest.fn();
    element.addEventListener("close", closeHandler);

    byTestId(element, "close").click();
    expect(closeHandler.mock.calls[0][0].detail).toBeFalsy();

    byTestId(element, "edit").click();
    await flushPromises();
    byTestId(element, "form").dispatchEvent(new CustomEvent("success"));
    await flushPromises();
    byTestId(element, "close").click();

    expect(closeHandler.mock.calls[1][0].detail).toBe("saved");
  });
});
