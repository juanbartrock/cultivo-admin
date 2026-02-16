---
description: Guide for safely handling database schema changes and migrations with Prisma
---

# Database Migration Guide

Use this skill when the User Request requires changes to the database schema (`prisma/schema.prisma`).

## Pre-requisites
-   Ensure Docker is running and the database container is healthy.
-   Be cautious with destructive changes (e.g., removing columns).

## Workflow

1.  **Edit Schema**: Modify `backend/prisma/schema.prisma`.
    -   Add new models, fields, or enums.
    -   Ensure relations are correctly defined on both sides.

2.  **Migration**: Create a new migration file.
    ```powershell
    # Run from backend directory
    # Name the migration meaningfully (e.g., add_user_subscription)
    npx prisma migrate dev --name [migration_name]
    ```

3.  **Generate Client**: Update the Prisma Client.
    ```powershell
    npx prisma generate
    ```

4.  **Verification**:
    -   Check the generated migration SQL in `backend/prisma/migrations/`.
    -   (Optional) If data migration is needed, write a script.

5.  **Integration**:
    -   Update DTOs and TypeDefinitions to reflect schema changes.
    -   Update any code relying on the changed models.

## Safety Rules
-   **NEVER** modify an existing migration file after it has been applied. Create a new migration instead.
-   **NEVER** use `prisma db push` in production-like environments; use `migrate deploy`.
-   **ALWAYS** verify that `npx prisma generate` was run after migration to update the client types.
