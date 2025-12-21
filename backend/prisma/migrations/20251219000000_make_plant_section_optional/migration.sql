-- AlterTable
-- Hacer sectionId opcional para permitir desasociar plantas de secciones
ALTER TABLE "plants" ALTER COLUMN "section_id" DROP NOT NULL;


