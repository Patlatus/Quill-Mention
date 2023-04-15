public with sharing class UsageExampleCont {
    @AuraEnabled
    public static List<User> users() {
        return [SELECT IsActive, FirstName, LastName, Name FROM User];
    }
}