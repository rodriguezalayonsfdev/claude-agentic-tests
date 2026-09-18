import { LightningElement, api } from "lwc";

/**
 * Jest mock for the LightningModal base class (lightning/modal), which
 * sfdx-lwc-jest does not stub. `close(result)` dispatches a `close` event
 * carrying the result so tests can assert on it.
 */
export default class LightningModal extends LightningElement {
  @api label;
  @api size;
  @api description;
  @api disableClose;

  static open = jest.fn(() => Promise.resolve());

  close(result) {
    this.dispatchEvent(new CustomEvent("close", { detail: result }));
  }
}
