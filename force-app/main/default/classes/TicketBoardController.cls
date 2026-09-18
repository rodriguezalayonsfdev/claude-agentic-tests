/**
 * Read-only controller for the ticketBoard LWC (CLD-1).
 *
 * Runs in user mode so CRUD, FLS, and sharing are enforced by the platform.
 * Writes are intentionally not exposed here; the LWC updates records through
 * Lightning Data Service so the platform enforces security on that path too.
 */
public with sharing class TicketBoardController {
  private static final Integer MAX_TICKETS = 500;

  /**
   * Returns tickets for the board, ordered by priority (picklist order:
   * High, Medium, Low) and then oldest first.
   */
  @AuraEnabled(cacheable=true)
  public static List<Ticket__c> getTickets() {
    try {
      return [
        SELECT Id, Name, Status__c, Priority__c, Assignee__c, Assignee__r.Name
        FROM Ticket__c
        WITH USER_MODE
        ORDER BY Priority__c, CreatedDate
        LIMIT :MAX_TICKETS
      ];
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }
}
