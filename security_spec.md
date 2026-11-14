# Security Specification — Kọ́kọ́Learn (28-Collection Zero-Trust Architecture)

## 1. Core Data & Authorization Invariants
1. **Default Deny Safety Net**: `match /{document=**} { allow read, write: if false; }` is the first block in `firestore.rules`.
2. **Privilege Escalation Prevention**:
   - Users creating `/users/{userId}` cannot self-assign `teacher`, `school_admin`, or `platform_admin` roles; non-admin self-registration is strictly restricted to `student` or `independent_learner`.
   - Users updating `/users/{userId}` cannot modify `role`, `schoolId`, `uid`, `email`, or `createdAt`.
   - School privileges (`teacher`, `school_admin`) are verified through deterministic `/school_memberships/{schoolId}_{userId}` records authorized by the school owner/administrator (`isSchoolAdminFor(schoolId)`) or platform administrator (`isAdmin()`).
3. **Cross-School Multi-Tenant Isolation**:
   - School administrators and teachers of School A cannot read or write private records (`/schools`, `/classes`, `/teachers`, `/students`, `/academic_sessions`, `/terms`, `/approval_records`, unpublished `/teacher_materials`, `/submissions`, `/results`) belonging to School B.
4. **Platform-Wide Curriculum Immutability**:
   - Records with `isPlatformWide == true` in `/curricula`, `/curriculum_versions`, `/subjects`, `/topics`, `/learning_objectives`, `/lessons`, `/learning_resources`, and `/questions` can only be created, modified, or deleted by a platform administrator (`isAdmin()`).
   - School custom curriculum overlays must have `isPlatformWide == false` and belong to an authorized `schoolId`.
5. **Student Content Gatekeeping**:
   - Students can only read teacher materials (`/teacher_materials`) and lessons (`/lessons`) that have reached `approvalStatus == 'approved_published'` within their authorized school or platform-wide curriculum. Unpublished teacher drafts (`draft`, `pending_approval`) are strictly inaccessible to students.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Self-Privilege Escalation on Registration**: Authenticated user attempts `create` on `/users/{uid}` with `role: "school_admin"` or `role: "platform_admin"`.
2. **Self-Role Mutation on Profile Update**: Authenticated student attempts `update` on `/users/{uid}` changing `role` from `"student"` to `"teacher"`.
3. **Self-Granted School Admin Membership**: User attempts `create` on `/school_memberships/sch_A_uid` with `role: "school_admin"` for a school they do not own or administer.
4. **Cross-School Admin Read/Update**: School Admin of `sch_B` attempts `get` or `update` on `/schools/sch_A` or `/classes/cls_sch_A_1`.
5. **Platform Curriculum Overwrite by School Admin**: School Admin attempts `update` on `/topics/top_platform_math` where `existing().isPlatformWide == true`.
6. **Student Reading Teacher Draft**: Student attempts `get` on `/teacher_materials/mat_draft_1` where `approvalStatus == "draft"`.
7. **Student Accessing Approval Records**: Student attempts `get` or `create` on `/approval_records/app_1`.
8. **Cross-User PII Read**: User A attempts `get` on `/users/user_B` or `/ai_sessions/sess_user_B`.
9. **Unverified Email Write**: Authenticated user with `email_verified == false` attempts `create` on `/users/{uid}` or `/submissions/{subId}`.
10. **Shadow / Ghost Field Injection**: User attempts `create` or `update` with an undeclared field `isSuperAdmin: true`.
11. **Timestamp Forgery**: Client sends past/future `createdAt` or `updatedAt` instead of `request.time`.
12. **Terminal State / Immutable Owner Mutation**: User attempts `update` on `/submissions/{subId}` or mutates `ownerId` / `studentId` on an existing record.
