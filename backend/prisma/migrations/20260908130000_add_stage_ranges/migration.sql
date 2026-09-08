-- Rangos de estado de lecturas ambientales por etapa. Migración aditiva: crea un enum y una
-- tabla nuevos y siembra las 7 filas. No toca ninguna tabla existente.

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RangeStage') THEN
    CREATE TYPE "RangeStage" AS ENUM ('DEFAULT', 'GERMINACION', 'VEGETATIVO', 'PRE_FLORA', 'FLORACION', 'SECADO', 'CURADO');
  END IF;
END
$$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "stage_ranges" (
    "id" TEXT NOT NULL,
    "stage" "RangeStage" NOT NULL,
    "temp_ideal_min" DOUBLE PRECISION NOT NULL,
    "temp_ideal_max" DOUBLE PRECISION NOT NULL,
    "temp_wide_min" DOUBLE PRECISION NOT NULL,
    "temp_wide_max" DOUBLE PRECISION NOT NULL,
    "humidity_ideal_min" DOUBLE PRECISION NOT NULL,
    "humidity_ideal_max" DOUBLE PRECISION NOT NULL,
    "humidity_wide_min" DOUBLE PRECISION NOT NULL,
    "humidity_wide_max" DOUBLE PRECISION NOT NULL,
    "vpd_ideal_min" DOUBLE PRECISION NOT NULL,
    "vpd_ideal_max" DOUBLE PRECISION NOT NULL,
    "vpd_wide_min" DOUBLE PRECISION NOT NULL,
    "vpd_wide_max" DOUBLE PRECISION NOT NULL,
    "co2_ideal_min" DOUBLE PRECISION NOT NULL,
    "co2_ideal_max" DOUBLE PRECISION NOT NULL,
    "co2_wide_min" DOUBLE PRECISION NOT NULL,
    "co2_wide_max" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stage_ranges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "stage_ranges_stage_key" ON "stage_ranges"("stage");

-- Seed idempotente: los valores que tenía hardcodeados el frontend, iguales para todas las
-- etapas. Se ajustan desde /admin/rangos; una fila ya existente no se toca.
INSERT INTO "stage_ranges" (
    "id", "stage",
    "temp_ideal_min", "temp_ideal_max", "temp_wide_min", "temp_wide_max",
    "humidity_ideal_min", "humidity_ideal_max", "humidity_wide_min", "humidity_wide_max",
    "vpd_ideal_min", "vpd_ideal_max", "vpd_wide_min", "vpd_wide_max",
    "co2_ideal_min", "co2_ideal_max", "co2_wide_min", "co2_wide_max",
    "created_at", "updated_at"
)
SELECT
    gen_random_uuid()::text, s.stage,
    18, 28, 15, 30,
    40, 65, 30, 75,
    0.8, 1.4, 0.4, 1.6,
    400, 1500, 300, 2000,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
    SELECT unnest(ARRAY['DEFAULT', 'GERMINACION', 'VEGETATIVO', 'PRE_FLORA', 'FLORACION', 'SECADO', 'CURADO']::"RangeStage"[]) AS stage
) s
ON CONFLICT ("stage") DO NOTHING;
