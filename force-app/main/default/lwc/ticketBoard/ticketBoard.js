import { LightningElement, wire } from "lwc";
import { refreshApex } from "@salesforce/apex";
import { updateRecord } from "lightning/uiRecordApi";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getTickets from "@salesforce/apex/TicketBoardController.getTickets";
import ID_FIELD from "@salesforce/schema/Ticket__c.Id";
import STATUS_FIELD from "@salesforce/schema/Ticket__c.Status__c";
import TicketModal from "c/ticketModal";

export const STATUSES = ["New", "In progress", "Blocked", "Done"];

const PRIORITY_BADGE = {
  High: "slds-badge slds-theme_error",
  Medium: "slds-badge slds-theme_warning",
  Low: "slds-badge"
};

const REFRESH_RESULTS = new Set(["saved", "deleted"]);

export default class TicketBoard extends LightningElement {
  tickets = [];
  dragOverStatus = null;
  draggedId = null;
  isDragging = false;
  isSaving = false;
  wiredResult;

  @wire(getTickets)
  wiredTickets(result) {
    this.wiredResult = result;
    const { data, error } = result;
    if (data) {
      this.tickets = data;
    } else if (error) {
      this.tickets = [];
      this.showError("Could not load tickets", error);
    }
  }

  get columns() {
    return STATUSES.map((status) => {
      const cards = this.tickets
        .filter((t) => t.Status__c === status)
        .map((t) => ({
          id: t.Id,
          name: t.Name,
          priority: t.Priority__c,
          priorityClass: PRIORITY_BADGE[t.Priority__c] || "slds-badge",
          assignee: t.Assignee__r ? t.Assignee__r.Name : "Unassigned",
          status: t.Status__c
        }));
      const isOver = this.dragOverStatus === status;
      return {
        status,
        key: status.replace(/\s+/g, "-").toLowerCase(),
        cards,
        count: cards.length,
        columnClass:
          "board-column slds-box slds-box_x-small" +
          (isOver ? " board-column_over" : "")
      };
    });
  }

  handleDragStart(event) {
    this.isDragging = true;
    this.draggedId = event.currentTarget.dataset.id;
    if (event.dataTransfer) {
      event.dataTransfer.setData("text/plain", this.draggedId);
      event.dataTransfer.effectAllowed = "move";
    }
  }

  handleDragEnd() {
    this.isDragging = false;
  }

  handleDragOver(event) {
    event.preventDefault();
    this.dragOverStatus = event.currentTarget.dataset.status;
  }

  handleDragLeave() {
    this.dragOverStatus = null;
  }

  handleDrop(event) {
    event.preventDefault();
    const targetStatus = event.currentTarget.dataset.status;
    this.dragOverStatus = null;

    const ticketId =
      this.draggedId ||
      (event.dataTransfer && event.dataTransfer.getData("text/plain"));
    this.draggedId = null;
    if (!ticketId) {
      return undefined;
    }

    const ticket = this.tickets.find((t) => t.Id === ticketId);
    if (!ticket || ticket.Status__c === targetStatus) {
      return undefined;
    }

    const fields = {};
    fields[ID_FIELD.fieldApiName] = ticketId;
    fields[STATUS_FIELD.fieldApiName] = targetStatus;

    this.isSaving = true;
    return updateRecord({ fields })
      .then(() => refreshApex(this.wiredResult))
      .catch((error) => {
        this.showError("Could not move ticket", error);
      })
      .finally(() => {
        this.isSaving = false;
      });
  }

  async handleCardClick(event) {
    if (this.isDragging) {
      return;
    }
    const recordId = event.currentTarget.dataset.id;
    const result = await TicketModal.open({
      recordId,
      size: "medium",
      label: "Ticket"
    });
    if (REFRESH_RESULTS.has(result)) {
      await refreshApex(this.wiredResult);
    }
  }

  showError(title, error) {
    const message =
      (error && error.body && error.body.message) ||
      (error && error.message) ||
      "Unknown error";
    this.dispatchEvent(
      new ShowToastEvent({ title, message, variant: "error" })
    );
  }
}
