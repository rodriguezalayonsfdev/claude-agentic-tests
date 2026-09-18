import { api, wire } from "lwc";
import LightningModal from "lightning/modal";
import LightningConfirm from "lightning/confirm";
import { deleteRecord, getRecord } from "lightning/uiRecordApi";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import NAME_FIELD from "@salesforce/schema/Ticket__c.Name";

const MODE_READONLY = "readonly";
const MODE_EDIT = "edit";

export const RESULT_SAVED = "saved";
export const RESULT_DELETED = "deleted";

/**
 * Modal that shows a Ticket__c record using its assigned page layout.
 * Opens in view mode; Edit switches to edit mode; Delete asks for confirmation.
 * Closes with "saved" or "deleted" so the caller knows whether to refresh.
 */
export default class TicketModal extends LightningModal {
  @api recordId;

  mode = MODE_READONLY;
  saved = false;
  isDeleting = false;

  @wire(getRecord, { recordId: "$recordId", fields: [NAME_FIELD] })
  ticket;

  get title() {
    const name = this.ticket?.data?.fields?.Name?.value;
    return name ? `Ticket ${name}` : "Ticket";
  }

  get isReadonly() {
    return this.mode === MODE_READONLY;
  }

  handleEdit() {
    this.mode = MODE_EDIT;
  }

  handleCancelEdit() {
    this.mode = MODE_READONLY;
  }

  handleSuccess() {
    this.mode = MODE_READONLY;
    this.saved = true;
  }

  handleError(event) {
    this.showError("Could not save ticket", event.detail);
  }

  async handleDelete() {
    const confirmed = await LightningConfirm.open({
      label: "Delete ticket",
      message: "This ticket will be permanently deleted. Continue?",
      theme: "warning",
      variant: "header"
    });
    if (!confirmed) {
      return;
    }

    this.isDeleting = true;
    try {
      await deleteRecord(this.recordId);
      this.close(RESULT_DELETED);
    } catch (error) {
      this.showError("Could not delete ticket", error);
    } finally {
      this.isDeleting = false;
    }
  }

  handleClose() {
    this.close(this.saved ? RESULT_SAVED : undefined);
  }

  showError(title, error) {
    const message =
      error?.body?.message ||
      error?.detail ||
      error?.message ||
      "Unknown error";
    this.dispatchEvent(
      new ShowToastEvent({ title, message, variant: "error" })
    );
  }
}
