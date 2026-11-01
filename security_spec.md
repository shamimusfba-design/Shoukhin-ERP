# Security Specification — Shoukhin Home Decor ERP

## 1. Data Invariants
1. **Default-Deny Catch-All**: Every path not explicitly matched is denied (`allow read, write: if false;`).
2. **Verified Authentication**: All standard writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **Bootstrapped Owner & Trusted Admin Lookup**: The owner (`shamim.usfba@gmail.com` with `email_verified == true`) or a user with a valid document in `/admins/$(request.auth.uid)` has administrative authority. Regular users cannot self-assign `owner` or `admin` roles.
4. **Strict Schema & Size Validation**: Every collection (`admins`, `users`, `erp_records`) enforces strict `hasAll` and `hasOnly` key checks, string `.size()` bounds, `isValidId()` regex validation on document IDs, and server timestamp integrity (`request.time`).
5. **Query Enforcer on List Operations**: Every `allow list` rule evaluates `resource.data` (e.g. `resource.data.orgId == 'shoukhin-hd'` or `resource.data.uid == request.auth.uid`) without `get()`/`exists()` inside `list`.
6. **Immutability**: `uid`, `id`, `table`, `orgId`, and `createdAt` are immutable across updates.

## 2. The "Dirty Dozen" Payloads
1. **Unverified Email Spoof**: `{ "email": "shamim.usfba@gmail.com", "email_verified": false }` attempting admin write -> `PERMISSION_DENIED`.
2. **Self-Assigned Admin Escalation**: Non-admin user creating `/users/{uid}` with `role: "admin"` -> `PERMISSION_DENIED`.
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
