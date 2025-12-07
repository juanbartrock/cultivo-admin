/**
 * @deprecated Este archivo contiene datos mock que ya no se usan.
 * El frontend ahora consume datos reales desde el backend NestJS.
 * Se mantiene como referencia durante la migración.
 * 
 * Para datos reales, ver los servicios en /services:
 * - locationService.ts (salas y secciones)
 * - deviceService.ts (dispositivos)
 * - growService.ts (genéticas, ciclos, plantas)
 * - eventService.ts (bitácora de eventos)
 */

import { SalaCultivo, Artefacto, Carpa, Planta } from '@/types';

// Artefactos de la sala general
const artefactosSala: Artefacto[] = [
  {
    id: 'art-1',
    nombre: 'Sensor Principal',
    tipo: 'sensor',
    estado: 'encendido',
    ubicacionTipo: 'sala',
    ubicacionId: 'sala-1',
    valor: 24.5,
    unidad: '°C',
    ultimaActualizacion: new Date().toISOString(),
  },
  {
    id: 'art-2',
    nombre: 'Humidificador Central',
    tipo: 'humidificador',
    estado: 'encendido',
    ubicacionTipo: 'sala',
    ubicacionId: 'sala-1',
    ultimaActualizacion: new Date().toISOString(),
  },
  {
    id: 'art-3',
    nombre: 'Aire Acondicionado',
    tipo: 'aire_acondicionado',
    estado: 'standby',
    ubicacionTipo: 'sala',
    ubicacionId: 'sala-1',
    valor: 22,
    unidad: '°C',
    ultimaActualizacion: new Date().toISOString(),
  },
  {
    id: 'art-4',
    nombre: 'Extractor Principal',
    tipo: 'extractor',
    estado: 'encendido',
    ubicacionTipo: 'sala',
    ubicacionId: 'sala-1',
    ultimaActualizacion: new Date().toISOString(),
  },
];

// Plantas de ejemplo
const plantasFlora: Planta[] = [
  {
    id: 'planta-1',
    nombre: 'Planta #1',
    genetica: 'Northern Lights Auto',
    etapa: 'floracion',
    diasEnEtapa: 35,
    fechaInicio: '2024-10-01',
    planAlimentacion: [
      { semana: 1, productos: [{ nombre: 'BioBizz Grow', dosis: '2ml/L' }] },
      { semana: 2, productos: [{ nombre: 'BioBizz Grow', dosis: '3ml/L' }, { nombre: 'BioBizz Bloom', dosis: '1ml/L' }] },
      { semana: 3, productos: [{ nombre: 'BioBizz Bloom', dosis: '2ml/L' }, { nombre: 'Top Max', dosis: '1ml/L' }] },
    ],
    registros: [
      { id: 'reg-1', fecha: '2024-11-01', estado: 'Saludable', comentario: 'Primeros pistilos visibles' },
      { id: 'reg-2', fecha: '2024-11-15', estado: 'Saludable', comentario: 'Cogollos formándose bien' },
    ],
  },
  {
    id: 'planta-2',
    nombre: 'Planta #2',
    genetica: 'Blue Dream',
    etapa: 'floracion',
    diasEnEtapa: 28,
    fechaInicio: '2024-10-08',
    planAlimentacion: [
      { semana: 1, productos: [{ nombre: 'Advanced Nutrients', dosis: '2ml/L' }] },
    ],
    registros: [
      { id: 'reg-3', fecha: '2024-11-05', estado: 'Saludable', comentario: 'Estiramiento completado' },
    ],
  },
];

const plantasVege: Planta[] = [
  {
    id: 'planta-3',
    nombre: 'Planta #3',
    genetica: 'White Widow',
    etapa: 'vegetativo',
    diasEnEtapa: 21,
    fechaInicio: '2024-11-15',
    planAlimentacion: [
      { semana: 1, productos: [{ nombre: 'BioBizz Grow', dosis: '1ml/L' }] },
      { semana: 2, productos: [{ nombre: 'BioBizz Grow', dosis: '2ml/L' }] },
    ],
    registros: [
      { id: 'reg-4', fecha: '2024-11-20', estado: 'Saludable', comentario: 'Transplante realizado' },
    ],
  },
];

const plantasSecado: Planta[] = [
  {
    id: 'planta-4',
    nombre: 'Cosecha Noviembre',
    genetica: 'Gorilla Glue #4',
    etapa: 'secado',
    diasEnEtapa: 7,
    fechaInicio: '2024-09-01',
    planAlimentacion: [],
    registros: [
      { id: 'reg-5', fecha: '2024-11-29', estado: 'Secando', comentario: 'Ramas colgadas, humedad 60%' },
    ],
  },
];

// Carpas
const carpas: Carpa[] = [
  {
    id: 'carpa-flora',
    nombre: 'Carpa Floración',
    dimensiones: '120x120x200cm',
    imagen: '/images/carpa-flora.png',
    descripcion: 'Carpa principal para etapa de floración con luz 12/12',
    artefactos: [
      {
        id: 'art-flora-1',
        nombre: 'LED Samsung LM301H',
        tipo: 'luz',
        estado: 'encendido',
        ubicacionTipo: 'carpa',
        ubicacionId: 'carpa-flora',
        valor: 480,
        unidad: 'W',
        ultimaActualizacion: new Date().toISOString(),
      },
      {
        id: 'art-flora-2',
        nombre: 'Extractor 6"',
        tipo: 'extractor',
        estado: 'encendido',
        ubicacionTipo: 'carpa',
        ubicacionId: 'carpa-flora',
        ultimaActualizacion: new Date().toISOString(),
      },
      {
        id: 'art-flora-3',
        nombre: 'Ventilador Clip',
        tipo: 'ventilador',
        estado: 'encendido',
        ubicacionTipo: 'carpa',
        ubicacionId: 'carpa-flora',
        ultimaActualizacion: new Date().toISOString(),
      },
      {
        id: 'art-flora-4',
        nombre: 'Sensor THR320D',
        tipo: 'sensor',
        estado: 'encendido',
        ubicacionTipo: 'carpa',
        ubicacionId: 'carpa-flora',
        valor: 26,
        unidad: '°C',
        ultimaActualizacion: new Date().toISOString(),
      },
    ],
    plantas: plantasFlora,
  },
  {
    id: 'carpa-vege',
    nombre: 'Carpa Vegetativo',
    dimensiones: '100x100x200cm',
    imagen: '/images/carpa-vege.png',
    descripcion: 'Carpa para etapa vegetativa con luz 18/6',
    artefactos: [
      {
        id: 'art-vege-1',
        nombre: 'LED Quantum Board',
        tipo: 'luz',
        estado: 'encendido',
        ubicacionTipo: 'carpa',
        ubicacionId: 'carpa-vege',
        valor: 240,
        unidad: 'W',
        ultimaActualizacion: new Date().toISOString(),
      },
      {
        id: 'art-vege-2',
        nombre: 'Ventilador USB',
        tipo: 'ventilador',
        estado: 'encendido',
        ubicacionTipo: 'carpa',
        ubicacionId: 'carpa-vege',
        ultimaActualizacion: new Date().toISOString(),
      },
    ],
    plantas: plantasVege,
  },
  {
    id: 'carpa-secado',
    nombre: 'Carpa Secado',
    dimensiones: '80x80x160cm',
    imagen: '/images/carpa-secado.png',
    descripcion: 'Carpa para secado y curado con control de humedad',
    artefactos: [
      {
        id: 'art-secado-1',
        nombre: 'Deshumidificador',
        tipo: 'deshumidificador',
        estado: 'encendido',
        ubicacionTipo: 'carpa',
        ubicacionId: 'carpa-secado',
        valor: 55,
        unidad: '%HR',
        ultimaActualizacion: new Date().toISOString(),
      },
      {
        id: 'art-secado-2',
        nombre: 'Ventilador Bajo',
        tipo: 'ventilador',
        estado: 'apagado',
        ubicacionTipo: 'carpa',
        ubicacionId: 'carpa-secado',
        ultimaActualizacion: new Date().toISOString(),
      },
    ],
    plantas: plantasSecado,
  },
  {
    id: 'invernadero',
    nombre: 'Invernadero Exterior',
    dimensiones: '200x300x200cm',
    imagen: '/images/invernadero.png',
    descripcion: 'Invernadero para cultivo exterior con malla antiplagas',
    artefactos: [
      {
        id: 'art-inv-1',
        nombre: 'Sistema de Riego',
        tipo: 'bomba_riego',
        estado: 'standby',
        ubicacionTipo: 'invernadero',
        ubicacionId: 'invernadero',
        ultimaActualizacion: new Date().toISOString(),
      },
      {
        id: 'art-inv-2',
        nombre: 'Sensor Exterior',
        tipo: 'sensor',
        estado: 'encendido',
        ubicacionTipo: 'invernadero',
        ubicacionId: 'invernadero',
        valor: 18,
        unidad: '°C',
        ultimaActualizacion: new Date().toISOString(),
      },
    ],
    plantas: [],
  },
];

// Sala de cultivo principal
export const salaCultivo: SalaCultivo = {
  id: 'sala-1',
  nombre: 'Sala de Cultivo Principal',
  temperatura: 24.5,
  humedad: 58,
  artefactos: artefactosSala,
  carpas: carpas,
};

// Lista de todos los artefactos (para la página de gestión)
export const todosLosArtefactos: Artefacto[] = [
  ...artefactosSala,
  ...carpas.flatMap(c => c.artefactos),
];

// Opciones para el formulario de artefactos
export const tiposArtefacto = [
  { value: 'sensor', label: 'Sensor' },
  { value: 'luz', label: 'Luz' },
  { value: 'extractor', label: 'Extractor' },
  { value: 'ventilador', label: 'Ventilador' },
  { value: 'humidificador', label: 'Humidificador' },
  { value: 'deshumidificador', label: 'Deshumidificador' },
  { value: 'aire_acondicionado', label: 'Aire Acondicionado' },
  { value: 'bomba_riego', label: 'Bomba de Riego' },
  { value: 'calefactor', label: 'Calefactor' },
  { value: 'camara', label: 'Cámara' },
];

export const ubicaciones = [
  { value: 'sala-1', label: 'Sala de Cultivo', tipo: 'sala' },
  { value: 'carpa-flora', label: 'Carpa Floración', tipo: 'carpa' },
  { value: 'carpa-vege', label: 'Carpa Vegetativo', tipo: 'carpa' },
  { value: 'carpa-secado', label: 'Carpa Secado', tipo: 'carpa' },
  { value: 'invernadero', label: 'Invernadero', tipo: 'invernadero' },
];

