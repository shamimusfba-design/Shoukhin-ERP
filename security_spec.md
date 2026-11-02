# Security Specification — Shoukhin Home Decor ERP

## 1. Data Invariants
1. **Default-Deny Catch-All**: Every path not explicitly matched is denied (`allow read, write: if false;`).
2. **Account Structure & RBAC**: Single-tier role architecture (`admin`). Full permissions to `erp_records` are granted exclusively to approved Admins.
3. **Bootstrapped Admin & Approval Chain**: `shoukhinhd@gmail.com` (with `email_verified == true`) is the bootstrapped initial Admin. Other accounts are approved Admins only if they exist in `/users/$(request.auth.uid)` with `status == 'approved'`, `active == true`, and `role == 'admin'` (or exist in `/admins/$(request.auth.uid)`).
4. **Registration Lifecycle**: Any signed-in user can self-register their initial profile in `/users/{userId}`. For `shoukhinhd@gmail.com`, `status == 'approved'` and `active == true`. For all other users, `status == 'pending'` and `active == false`. Self-escalation to approved/active status is rejected by rules.
5. **Admin Authority**: Only approved Admins can update `/users/` profiles (to approve, reject, or suspend users), manage `/admins/`, or read user lists.
6. **Immutable Audit Trail**: Append-only `/audit_logs/{logId}` collection. Any signed-in user can submit an `ADMIN_REQUESTED` log for their own UID/email. Only approved Admins can read audit logs or write other administrative audit entries. Updates and deletions are denied.
7. **ERP Isolation**: Protected `/erp_records/{recordId}` documents require approved Admin authority for read, create, update, and delete, with tenant validation (`orgId == 'shoukhin-hd'`) and immutable server timestamps (`request.time`).
8. **Strict Schema & Size Validation**: All collections enforce `hasAll` and `hasOnly` key constraints, string size limits, and `isValidId()` regex validation (`^[a-zA-Z0-9_\-]+$`).

## 2. The Adversarial "Dirty Dozen" Defense Matrix
1. **Unverified Email Spoof**: `{ "email": "shoukhinhd@gmail.com", "email_verified": false }` attempting admin write -> `PERMISSION_DENIED`.
2. **Self-Assigned Admin Escalation**: Non-bootstrapped user creating `/users/{uid}` with `active: true` or `status: "approved"` -> `PERMISSION_DENIED`.
3. **Shadow Field Injection on Create**: Creating `/erp_records/rec1` with extra key `isSuperUser: true` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Update**: Updating `/erp_records/rec1` with extra key `hacked: 1` -> `PERMISSION_DENIED`.
5. **ID Poisoning Attack**: Document ID containing spaces or special characters (`rec/../../1` or >128 chars) -> `PERMISSION_DENIED`.
6. **Forged Client Timestamp on Create**: Setting `createdAt` to a past/future timestamp (`!= request.time`) -> `PERMISSION_DENIED`.
7. **Forged Client Timestamp on Update**: Setting `updatedAt` to a manual timestamp (`!= request.time`) -> `PERMISSION_DENIED`.
8. **Mutating Immutable `createdAt`**: Changing `createdAt` during an update -> `PERMISSION_DENIED`.
9. **Mutating Immutable `orgId` or `table`**: Changing `orgId` from `'shoukhin-hd'` to `'other'` during update -> `PERMISSION_DENIED`.
10. **Identity Spoofing on `updatedBy`**: Setting `updatedBy` to another user's UID (`!= request.auth.uid`) -> `PERMISSION_DENIED`.
11. **Value Poisoning on String Bounds**: Sending a 500-character string into `displayName` (`maxLength: 100`) -> `PERMISSION_DENIED`.
12. **Cross-Tenant Query Scraping**: Listing `erp_records` where `orgId != 'shoukhin-hd'` -> `PERMISSION_DENIED`.
13. **Unapproved Access to ERP Records**: Pending or rejected users attempting to read or write `/erp_records` -> `PERMISSION_DENIED`.
14. **Audit Log Tampering**: Attempting to update or delete any document in `/audit_logs` -> `PERMISSION_DENIED`.
