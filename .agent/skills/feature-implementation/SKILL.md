---
description: Guide for implementing full-stack features across NestJS (backend) and Next.js (frontend)
---

# Feature Implementation Pattern

Use this skill when adding a new feature that involves both backend and frontend changes.

## 1. Backend (NestJS)

1.  **Module**: Ensure a module exists for the domain (e.g., `plants`, `devices`). If not, create one.
2.  **DTOs**: Create Data Transfer Objects (DTOs) for all inputs. Use `class-validator` decorators.
    *   File: `backend/src/[domain]/dto/create-[entity].dto.ts`
3.  **Service**: Implement the business logic in the service.
    *   File: `backend/src/[domain]/[domain].service.ts`
4.  **Controller**: Create endpoints in the controller. Use standard HTTP methods and `@Body`, `@Param`, `@Query` decorators.
    *   File: `backend/src/[domain]/[domain].controller.ts`
5.  **Prisma**: If the database schema changes:
    *   Modify `backend/prisma/schema.prisma`
    *   Run `npx prisma migrate dev --name [migration_name]`
    *   Run `npx prisma generate`

## 2. Frontend (Next.js)

1.  **Types**: Update or create TypeScript interfaces to match the backend DTOs/Entities.
    *   File: `frontend/src/types/[domain].ts`
2.  **API Service**: Add methods to `frontend/src/lib/apiService.ts` or a domain-specific service (e.g., `deviceService.ts`).
    *   Ensure proper error handling.
3.  **Components**: Create reusable UI components in `frontend/src/components/[domain]/`.
    *   Use `tailwind-merge` (`cn`) for styling.
4.  **Page**: Implement the page in `frontend/src/app/[route]/page.tsx`.
    *   Use Server Components for data fetching where possible.
    *   Use Client Components for interactivity.

## Checklist
- [ ] Backend DTOs have validation.
- [ ] Swagger documentation added (`@ApiTags`, `@ApiOperation`).
- [ ] Frontend types match backend response.
- [ ] UI is responsive (Mobile First).
