-- Sensor principal de la carpa: el que da temperatura y humedad cuando hay más de un SENSOR.
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "primary_sensor" BOOLEAN NOT NULL DEFAULT false;
