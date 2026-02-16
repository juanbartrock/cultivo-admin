---
description: Guide for integrating new IoT devices (integrating existing or new microservices)
---

# IoT Device Integration

Use this skill when adding support for a new hardware device or modifying existing IoT integrations.

## 1. Device Definition (Prisma)
-   **Enum**: Update `DeviceType` enum in `backend/prisma/schema.prisma` if needed.
-   **Connector**: Update `ConnectorType` enum (e.g., SONOFF, TUYA, TAPO).

## 2. Microservice Strategy
-   **Existing Service**: If the device fits into an existing service (e.g., a new Sonoff switch), extend that service.
-   **New Service**: If it requires a new protocol or API, create a new NestJS microservice in `/[new-service-name]`.
    -   Must expose an HTTP API.
    -   Must define standard endpoints: `/health`, `/devices`.

## 3. Backend Integration (Orchestrator)
-   **Service**: Update `backend/src/devices/devices.service.ts`.
-   **Discovery**: Implement the logic to scan/discover the new device type in `scanDevices()`.
-   **Status**: Implement `getDeviceStatus()` for real-time updates.
-   **Control**: Implement `controlDevice()` for actions (on/off).

## 4. Frontend Integration
-   **Icon**: Add a Lucide icon for the new device type in `frontend/src/components/devices/DeviceIcon.tsx`.
-   **Card**: Update `DeviceCard.tsx` to display specific data (e.g., if it has sensors).
-   **Controls**: Add specific control UI (e.g., sliders for dimmers, color pickers for lights).

## Testing
-   Verify the device appears in `/devices/scan`.
-   Verify control actions work from the UI.
-   Verify status updates reflect on the UI.
