-- Kill switch de lecturas: interruptor general y por dispositivo.
-- Migración aditiva e idempotente: crea una tabla nueva con su única fila y suma una columna
-- con default a `devices`. No pisa ni borra nada de lo existente.

-- CreateTable
CREATE TABLE IF NOT EXISTS "readings_settings" (
    "id" TEXT NOT NULL,
    "sensors_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "readings_settings_pkey" PRIMARY KEY ("id")
);

-- Seed de la fila única. Con la fila ya presente no toca su valor.
INSERT INTO "readings_settings" ("id", "sensors_enabled", "created_at", "updated_at")
VALUES ('singleton', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- AlterTable: lecturas por dispositivo. Arranca en true para conservar el comportamiento actual.
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "readings_enabled" BOOLEAN NOT NULL DEFAULT true;
