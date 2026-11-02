-- Bloque "Hoy" de Inicio: horario de luz por carpa y tareas manuales.
-- Migración aditiva e idempotente: suma dos columnas opcionales a `sections`, un enum y una
-- tabla nueva. No pisa ni borra nada de lo existente.

-- AlterTable: horario del timer de luz ("HH:MM", hora local). Sin valor, el bloque usa las últimas 12 h.
ALTER TABLE "sections" ADD COLUMN IF NOT EXISTS "lights_on" TEXT;
ALTER TABLE "sections" ADD COLUMN IF NOT EXISTS "lights_off" TEXT;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'DONE', 'SKIPPED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "tasks" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "due_date" DATE,
    "plant_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "event_type" "EventType",
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "done_at" TIMESTAMP(3),
    "event_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tasks_section_id_status_idx" ON "tasks"("section_id", "status");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "tasks" ADD CONSTRAINT "tasks_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
