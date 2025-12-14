-- AlterTable: Eliminar columna zone de plants (si existe)
ALTER TABLE "plants" DROP COLUMN IF EXISTS "zone";

-- CreateTable: Crear tabla plant_zones para relación muchos-a-muchos
CREATE TABLE IF NOT EXISTS "plant_zones" (
    "id" TEXT NOT NULL,
    "plant_id" TEXT NOT NULL,
    "zone" INTEGER NOT NULL,
    "coverage" DOUBLE PRECISION DEFAULT 100.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plant_zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Índice único para evitar duplicados de planta-zona
CREATE UNIQUE INDEX IF NOT EXISTS "plant_zones_plant_id_zone_key" ON "plant_zones"("plant_id", "zone");

-- AddForeignKey: Relación con tabla plants
ALTER TABLE "plant_zones" ADD CONSTRAINT "plant_zones_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
