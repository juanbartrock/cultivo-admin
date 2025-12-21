# Changelog - Desasociar Plantas de Secciones

**Fecha:** 19 de diciembre de 2025

## Descripción

Se implementó la funcionalidad para desasociar plantas de sus secciones, manteniendo el registro histórico en el ciclo. Esta funcionalidad es útil cuando una planta muere o se retira de la carpa, pero se quiere mantener el historial completo.

## Cambios Implementados

### Backend

#### 1. Base de Datos (Prisma Schema)
- **Modificación:** Se hizo el campo `sectionId` opcional en el modelo `Plant`
- **Archivo:** `backend/prisma/schema.prisma`
- **Cambios:**
  - `sectionId String? @map("section_id")` (ahora opcional con `?`)
  - `section Section? @relation(...)` (relación opcional)

#### 2. Migración de Base de Datos
- **Archivo:** `backend/prisma/migrations/20251219000000_make_plant_section_optional/migration.sql`
- **Cambio:** `ALTER TABLE "plants" ALTER COLUMN "section_id" DROP NOT NULL;`

#### 3. Servicio de Plantas
- **Archivo:** `backend/src/modules/grow/grow.service.ts`
- **Método agregado:** `dissociateFromSection(plantId: string)`
  - Valida que la planta tenga una sección asignada
  - Crea un evento de tipo `NOTA` registrando la desasociación
  - Actualiza la planta estableciendo `sectionId` a `null`
  - Elimina todas las zonas asignadas (ya que no tiene sección)
- **Métodos actualizados:**
  - `createPlant`: Validación de sección solo si se proporciona `sectionId`
  - `getPlantPPFD`: Verifica que la planta tenga sección antes de buscar PPFD

#### 4. Controlador de Plantas
- **Archivo:** `backend/src/modules/grow/plants.controller.ts`
- **Endpoint agregado:** `PATCH /plants/:id/dissociate`
  - Descripción: Desasocia planta de su sección
  - Mantiene el registro en el ciclo
  - Respuestas:
    - `200`: Planta desasociada exitosamente
    - `404`: Planta no encontrada
    - `400`: La planta no está asociada a ninguna sección

### Frontend

#### 1. Servicio de Plantas
- **Archivo:** `frontend/src/services/growService.ts`
- **Método agregado:** `dissociate(id: string)`
  - Llama al endpoint `PATCH /plants/:id/dissociate`
  - Retorna la planta actualizada

#### 2. Componente PlantCard
- **Archivo:** `frontend/src/components/PlantCard.tsx`
- **Cambios:**
  - Importado icono `Unlink` de lucide-react
  - Agregados estados:
    - `showDissociateModal`: Controla la visibilidad del modal de confirmación
    - `isDissociating`: Indica si está en proceso de desasociación
  - Agregado método `handleDissociate()`: Ejecuta la desasociación
  - **Menú de acciones:** Nueva opción "Desasociar de sección" (solo visible si la planta tiene sección)
  - **Modal de confirmación:** Explica que la planta se removerá de la sección pero se mantendrá en el ciclo
  - **Indicador visual:** Muestra "Sin sección asignada" en color naranja cuando la planta no tiene sección
  - **Mejora en el botón "Mudar":** 
    - Cambia el texto a "Asignar a sección" si la planta no tiene sección
    - Permite reasociar plantas sin sección

## Casos de Uso

1. **Planta muerta:** Desasociar la planta cuando muere, manteniendo el registro histórico del ciclo
2. **Planta retirada:** Cuando se retira una planta de la carpa pero se quiere mantener el historial
3. **Reasignación:** Permite reasignar una planta desasociada a una nueva sección

## Comportamiento del Sistema

### Al desasociar una planta:
1. Se crea un evento de tipo `NOTA` que registra:
   - La sección anterior
   - El motivo de la desasociación
2. El campo `sectionId` se establece en `null`
3. Todas las zonas asignadas se eliminan (ya que no tiene sentido tener zonas sin sección)
4. La planta se mantiene en el ciclo
5. Todo el historial de eventos se preserva

### Plantas sin sección:
- No se calculan lecturas de PPFD
- No tienen zonas asignadas
- Pueden ser reasignadas a una sección en cualquier momento
- Se muestran con indicador visual "Sin sección asignada"

## Validaciones

- No se puede desasociar una planta que ya no tiene sección
- Las plantas se pueden crear solo con una sección asignada
- Las plantas sin sección pueden ser movidas a una sección en cualquier momento

## Notas Técnicas

- La migración es segura: convierte `section_id` de `NOT NULL` a nullable
- Los eventos históricos mantienen la referencia a la sección original
- La relación en Prisma es opcional (`Section?`)
- Compatible con el sistema de ciclos existente


