# Security Specification for My Riding App

## Data Invariants
1. A user can only access their own profile and maintenance records.
2. Maintenance records must have a valid mileage (non-negative).
3. Odometer must be non-negative.
4. Emergency contact must have a phone number.

## The "Dirty Dozen" Payloads (Red Team Test Cases)
1. **Identity Spoofing**: Attempt to update another user's profile.
2. **Ghost Field Injection**: Add `isAdmin: true` to a profile.
3. **Negative Odometer**: Set odometer to -100.
4. **Invalid Date**: Set maintenance date to "tomorrow-land".
5. **PII Leak**: Read all profiles without authentication.
6. **Self-Promotion**: Try to write to `/admins` collection.
7. **Resource Poisoning**: Create a maintenance record with 1MB notes string.
8. **Orphaned Writes**: Write a maintenance record to a userId that doesn't exist.
9. **State Shortcutting**: Bypass verification check.
10. **ID Poisoning**: Use a 2KB string as a document ID.
11. **Shadow Update**: Update `lastUpdated` without being the owner.
12. **Blanket Read**: Query all maintenance records across all users.

## Test Runner
(Tests will be implemented in `firestore.rules.test.ts` if needed, but for now I'll focus on the rules draft.)
