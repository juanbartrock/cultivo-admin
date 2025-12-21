-- ============================================
-- SCRIPT DE PARTICIONADO PARA sensor_readings
-- ============================================
-- 
-- Este script convierte la tabla sensor_readings a una tabla particionada por mes.
-- IMPORTANTE: Ejecutar en una ventana de mantenimiento, con backup previo.
--
-- Beneficios:
-- - Cleanup instantáneo con DROP PARTITION vs DELETE lento
-- - Mejor rendimiento en queries con filtros por fecha
-- - Menor bloat/vacuum overhead
--
-- Ejecutar con:
--   psql -d tu_base_de_datos -f partition_sensor_readings.sql
--
-- O desde el cliente PostgreSQL de tu preferencia.
-- ============================================

-- 1. Verificar que la tabla existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sensor_readings') THEN
        RAISE EXCEPTION 'La tabla sensor_readings no existe. ¿Ya ejecutaste las migraciones de Prisma?';
    END IF;
END $$;

-- 2. Verificar que no está ya particionada
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_partitioned_table pt
        JOIN pg_class c ON c.oid = pt.partrelid
        WHERE c.relname = 'sensor_readings'
    ) THEN
        RAISE NOTICE 'La tabla sensor_readings ya está particionada. Saliendo.';
        RETURN;
    END IF;
END $$;

-- 3. Renombrar tabla existente (backup)
ALTER TABLE sensor_readings RENAME TO sensor_readings_old;

-- 4. Crear tabla particionada
CREATE TABLE sensor_readings (
    id UUID DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    section_id TEXT,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    co2 DOUBLE PRECISION,
    vpd DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- 5. Crear particiones para los próximos 12 meses
-- Enero 2025
CREATE TABLE IF NOT EXISTS sensor_readings_2025_01 PARTITION OF sensor_readings
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Febrero 2025
CREATE TABLE IF NOT EXISTS sensor_readings_2025_02 PARTITION OF sensor_readings
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Marzo 2025
CREATE TABLE IF NOT EXISTS sensor_readings_2025_03 PARTITION OF sensor_readings
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- Abril 2025
CREATE TABLE IF NOT EXISTS sensor_readings_2025_04 PARTITION OF sensor_readings
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

-- Mayo 2025
CREATE TABLE IF NOT EXISTS sensor_readings_2025_05 PARTITION OF sensor_readings
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

-- Junio 2025
CREATE TABLE IF NOT EXISTS sensor_readings_2025_06 PARTITION OF sensor_readings
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

-- Julio 2025
CREATE TABLE IF NOT EXISTS sensor_readings_2025_07 PARTITION OF sensor_readings
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');

-- Agosto 2025
CREATE TABLE IF NOT EXISTS sensor_readings_2025_08 PARTITION OF sensor_readings
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

-- Septiembre 2025
CREATE TABLE IF NOT EXISTS sensor_readings_2025_09 PARTITION OF sensor_readings
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

-- Octubre 2025
CREATE TABLE IF NOT EXISTS sensor_readings_2025_10 PARTITION OF sensor_readings
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- Noviembre 2025
CREATE TABLE IF NOT EXISTS sensor_readings_2025_11 PARTITION OF sensor_readings
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- Diciembre 2025
CREATE TABLE IF NOT EXISTS sensor_readings_2025_12 PARTITION OF sensor_readings
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- 6. Crear particiones para 2026 (primeros meses)
CREATE TABLE IF NOT EXISTS sensor_readings_2026_01 PARTITION OF sensor_readings
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE IF NOT EXISTS sensor_readings_2026_02 PARTITION OF sensor_readings
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE IF NOT EXISTS sensor_readings_2026_03 PARTITION OF sensor_readings
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- 7. Crear partición DEFAULT para datos que no encajen en ninguna partición
-- Esto previene errores al insertar datos fuera del rango definido
CREATE TABLE IF NOT EXISTS sensor_readings_default PARTITION OF sensor_readings DEFAULT;

-- 8. Crear índices en la tabla particionada (se crean automáticamente en cada partición)
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_recorded 
    ON sensor_readings (device_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_section_recorded 
    ON sensor_readings (section_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_recorded 
    ON sensor_readings (recorded_at);

-- 9. Migrar datos existentes (esto puede tardar dependiendo del volumen)
INSERT INTO sensor_readings (id, device_id, section_id, temperature, humidity, co2, vpd, recorded_at)
SELECT id, device_id, section_id, temperature, humidity, co2, vpd, recorded_at
FROM sensor_readings_old
WHERE recorded_at IS NOT NULL;

-- 10. Verificar migración
DO $$
DECLARE
    old_count INTEGER;
    new_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_count FROM sensor_readings_old;
    SELECT COUNT(*) INTO new_count FROM sensor_readings;
    
    IF old_count = new_count THEN
        RAISE NOTICE 'Migración exitosa: % registros transferidos', new_count;
    ELSE
        RAISE WARNING 'Discrepancia: % registros en tabla vieja, % en nueva', old_count, new_count;
    END IF;
END $$;

-- 11. (Opcional) Borrar tabla vieja después de verificar
-- DESCOMENTAR SOLO DESPUÉS DE VERIFICAR QUE TODO FUNCIONA CORRECTAMENTE
-- DROP TABLE sensor_readings_old;

-- ============================================
-- FUNCIÓN PARA CREAR PARTICIONES AUTOMÁTICAMENTE
-- ============================================
-- Esta función se puede ejecutar mensualmente (cron) para crear particiones futuras

CREATE OR REPLACE FUNCTION create_future_sensor_partition(months_ahead INTEGER DEFAULT 3)
RETURNS TABLE(partition_name TEXT, created BOOLEAN) AS $$
DECLARE
    partition_date DATE;
    partition_start DATE;
    partition_end DATE;
    part_name TEXT;
BEGIN
    FOR i IN 0..months_ahead LOOP
        partition_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::INTERVAL);
        partition_start := partition_date;
        partition_end := partition_date + INTERVAL '1 month';
        part_name := 'sensor_readings_' || TO_CHAR(partition_date, 'YYYY_MM');
        
        -- Verificar si ya existe
        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = part_name) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF sensor_readings FOR VALUES FROM (%L) TO (%L)',
                part_name, partition_start, partition_end
            );
            partition_name := part_name;
            created := TRUE;
            RETURN NEXT;
        ELSE
            partition_name := part_name;
            created := FALSE;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN PARA ELIMINAR PARTICIONES ANTIGUAS
-- ============================================
-- Usar esta función en vez de DELETE para mejor rendimiento

CREATE OR REPLACE FUNCTION drop_old_sensor_partitions(months_old INTEGER DEFAULT 3)
RETURNS TABLE(partition_name TEXT, dropped BOOLEAN) AS $$
DECLARE
    cutoff_date DATE;
    part_name TEXT;
    part_record RECORD;
BEGIN
    cutoff_date := DATE_TRUNC('month', CURRENT_DATE - (months_old || ' months')::INTERVAL);
    
    FOR part_record IN 
        SELECT c.relname 
        FROM pg_class c
        JOIN pg_inherits i ON c.oid = i.inhrelid
        JOIN pg_class p ON p.oid = i.inhparent
        WHERE p.relname = 'sensor_readings'
        AND c.relname ~ '^sensor_readings_\d{4}_\d{2}$'
    LOOP
        -- Extraer fecha de la partición
        part_name := part_record.relname;
        
        -- Verificar si es anterior a la fecha de corte
        IF SUBSTRING(part_name FROM 'sensor_readings_(\d{4})_(\d{2})') IS NOT NULL THEN
            DECLARE
                part_year INTEGER;
                part_month INTEGER;
                part_date DATE;
            BEGIN
                part_year := CAST(SUBSTRING(part_name FROM 'sensor_readings_(\d{4})_\d{2}') AS INTEGER);
                part_month := CAST(SUBSTRING(part_name FROM 'sensor_readings_\d{4}_(\d{2})') AS INTEGER);
                part_date := MAKE_DATE(part_year, part_month, 1);
                
                IF part_date < cutoff_date THEN
                    EXECUTE format('DROP TABLE %I', part_name);
                    partition_name := part_name;
                    dropped := TRUE;
                    RETURN NEXT;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- Ignorar errores de parsing
                CONTINUE;
            END;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- EJEMPLOS DE USO
-- ============================================
-- 
-- Crear particiones para los próximos 6 meses:
--   SELECT * FROM create_future_sensor_partition(6);
--
-- Eliminar particiones con más de 3 meses de antigüedad:
--   SELECT * FROM drop_old_sensor_partitions(3);
--
-- Listar todas las particiones:
--   SELECT c.relname, pg_size_pretty(pg_relation_size(c.oid)) as size
--   FROM pg_class c
--   JOIN pg_inherits i ON c.oid = i.inhrelid
--   JOIN pg_class p ON p.oid = i.inhparent
--   WHERE p.relname = 'sensor_readings'
--   ORDER BY c.relname;
-- ============================================

RAISE NOTICE 'Script de particionado completado. Verificar con:';
RAISE NOTICE '  SELECT * FROM sensor_readings LIMIT 10;';
RAISE NOTICE '  SELECT COUNT(*) FROM sensor_readings;';




