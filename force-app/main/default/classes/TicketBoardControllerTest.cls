@IsTest
private class TicketBoardControllerTest {
  private static final String PERMISSION_SET = 'Ticket_Manager';

  @IsTest
  static void getTicketsReturnsAllTicketsOrderedByPriority() {
    User manager = createUser('mgr');
    assignPermissionSet(manager);

    List<Ticket__c> tickets;
    System.runAs(manager) {
      seedTickets();
      Test.startTest();
      tickets = TicketBoardController.getTickets();
      Test.stopTest();
    }

    Assert.areEqual(4, tickets.size(), 'All seeded tickets should be returned');
    Assert.areEqual(
      'High',
      tickets[0].Priority__c,
      'High priority sorts first'
    );
    Assert.areEqual(
      'High',
      tickets[1].Priority__c,
      'Both High tickets precede Medium'
    );
    Assert.areEqual('Medium', tickets[2].Priority__c, 'Medium follows High');
    Assert.areEqual('Low', tickets[3].Priority__c, 'Low sorts last');

    Set<String> statuses = new Set<String>();
    for (Ticket__c t : tickets) {
      statuses.add(t.Status__c);
      Assert.isTrue(t.Name.startsWith('TKT-'), 'Auto-number name is populated');
    }
    Assert.areEqual(
      new Set<String>{ 'New', 'In progress', 'Blocked', 'Done' },
      statuses,
      'Every status is represented'
    );
  }

  @IsTest
  static void getTicketsThrowsForUserWithoutObjectAccess() {
    User manager = createUser('mgr');
    assignPermissionSet(manager);
    User outsider = createUser('out');

    System.runAs(manager) {
      seedTickets();
    }

    System.runAs(outsider) {
      Test.startTest();
      try {
        TicketBoardController.getTickets();
        Assert.fail(
          'Expected an exception for a user without Ticket__c access'
        );
      } catch (AuraHandledException e) {
        Assert.isNotNull(
          e,
          'User-mode query should be rejected as AuraHandledException'
        );
      }
      Test.stopTest();
    }
  }

  /** Must be called inside System.runAs of a user holding the permission set. */
  private static void seedTickets() {
    insert new List<Ticket__c>{
      new Ticket__c(
        Status__c = 'New',
        Priority__c = 'Low',
        Description__c = 'low new'
      ),
      new Ticket__c(
        Status__c = 'In progress',
        Priority__c = 'High',
        Description__c = 'high wip'
      ),
      new Ticket__c(
        Status__c = 'Blocked',
        Priority__c = 'Medium',
        Description__c = 'medium blocked'
      ),
      new Ticket__c(
        Status__c = 'Done',
        Priority__c = 'High',
        Description__c = 'high done'
      )
    };
  }

  private static User createUser(String alias) {
    Profile standardUser = [
      SELECT Id
      FROM Profile
      WHERE Name = 'Standard User'
      LIMIT 1
    ];
    String unique = alias + String.valueOf(Crypto.getRandomInteger()).right(6);
    User u = new User(
      Alias = alias.left(8),
      Email = unique + '@example.com',
      Username = unique + '@cld1.example.com',
      LastName = 'Test',
      ProfileId = standardUser.Id,
      TimeZoneSidKey = 'America/New_York',
      LocaleSidKey = 'en_US',
      EmailEncodingKey = 'UTF-8',
      LanguageLocaleKey = 'en_US'
    );
    System.runAs(new User(Id = UserInfo.getUserId())) {
      insert u;
    }
    return u;
  }

  private static void assignPermissionSet(User u) {
    PermissionSet ps = [
      SELECT Id
      FROM PermissionSet
      WHERE Name = :PERMISSION_SET
      LIMIT 1
    ];
    System.runAs(new User(Id = UserInfo.getUserId())) {
      insert new PermissionSetAssignment(
        AssigneeId = u.Id,
        PermissionSetId = ps.Id
      );
    }
  }
}
