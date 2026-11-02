import { Page, expect, test } from '@playwright/test';

/**
 * Bloque "Hoy" de Inicio con el backend mockeado: tildar una tarea que escribe en la bitácora,
 * registrar un riego con lo precargado del plan, crear una tarea y registrar el preventivo.
 */

const sectionId = 'section-1';
const plants = [
  { id: 'plant-043', tagCode: '043', stage: 'VEGETATIVO' },
  { id: 'plant-061', tagCode: '061', stage: 'VEGETATIVO' },
];
const refs = plants.map(({ id, tagCode }) => ({ id, tagCode }));

const metric = (min: number, max: number, avg: number, status: 'ok' | 'warn' | 'danger', danger = 0, warn = 0) => ({
  min,
  max,
  avg,
  last: max,
  hours: { ok: 1, warn, danger },
  status,
});

const agenda = {
  date: '2026-11-02',
  timeZone: 'America/Argentina/Buenos_Aires',
  generatedAt: '2026-11-02T10:45:00.000Z',
  sections: [
    {
      section: { id: sectionId, name: 'Floración', lightsOn: '18:00', lightsOff: '10:00', effectiveStage: 'VEGETATIVO' },
      cycle: { id: 'cycle-1', name: 'Octubre 2026', startDate: '2026-10-24T00:00:00.000Z', day: 10 },
      plants,
      sensor: { id: 'sensor-1', name: 'Termohigometro Indoor', readingsEnabled: true },
      periods: [
        {
          kind: 'LUZ',
          start: '2026-11-01T21:00:00.000Z',
          end: '2026-11-02T10:45:00.000Z',
          plannedEnd: '2026-11-02T13:00:00.000Z',
          ongoing: true,
          readings: 220,
          lastReadingAt: '2026-11-02T10:44:00.000Z',
          metrics: {
            temperature: metric(26.3, 27.7, 26.5, 'ok'),
            humidity: metric(73.1, 87.4, 79.3, 'danger', 6.3, 8.1),
            vpd: metric(0.36, 1, 0.72, 'warn', 0, 12.4),
          },
          automations: [
            {
              automationId: 'auto-1',
              name: 'Extractor por humedad: prender',
              triggerType: 'CONDITION',
              runs: 849,
              skipped: 0,
              failed: 0,
              first: '2026-11-01T21:00:20.000Z',
              last: '2026-11-02T10:44:00.000Z',
              conditionMinutes: 849,
            },
          ],
        },
        {
          kind: 'OSCURIDAD',
          start: '2026-11-01T13:00:00.000Z',
          end: '2026-11-01T21:00:00.000Z',
          plannedEnd: '2026-11-01T21:00:00.000Z',
          ongoing: false,
          readings: 127,
          lastReadingAt: '2026-11-01T20:55:00.000Z',
          metrics: {
            temperature: metric(23.2, 26.9, 23.7, 'ok'),
            humidity: metric(72.7, 88.2, 85.1, 'danger', 6.8, 1.2),
            vpd: metric(0.34, 0.97, 0.44, 'danger', 6.8, 0.9),
          },
          automations: [],
        },
      ],
      photo: null,
      lastWatering: {
        at: '2026-11-01T11:20:00.000Z',
        plants: refs,
        ph: 6.1,
        ec: null,
        liters: null,
        nutrients: [],
        notes: 'Agua sola',
      },
      feeding: [
        {
          key: 'feeding:plan-1:2',
          planId: 'plan-1',
          planName: 'Vegetativo indoor',
          week: 2,
          products: [{ name: 'Powder Feeding Grow', dose: '0.5', unit: 'g/L' }],
          ph: 6.3,
          ec: 0.8,
          notes: 'Primer alimento.',
          plantIds: plants.map((plant) => plant.id),
          plants: refs,
          wateredToday: { plants: [], lastAt: null },
        },
      ],
      tasks: [
        {
          key: 'prevention:pp-1:13:2026-11-02',
          source: 'PREVENCION',
          taskId: null,
          title: 'Foliar: Mamboretá Oil 85E 2 ml/L (plagas)',
          detail: 'Solo, sin mezclar.',
          dueDate: '2026-11-02',
          status: 'PENDING',
          doneAt: null,
          eventType: 'NOTA',
          plants: refs,
          donePlants: [],
          products: [{ name: 'Mamboretá Oil 85E', dose: '2', unit: 'ml/L' }],
          planName: 'Preventivo',
          day: 13,
        },
        {
          key: 'task:task-1',
          source: 'MANUAL',
          taskId: 'task-1',
          title: 'Topping 043 y 061',
          detail: null,
          dueDate: '2026-11-02',
          status: 'PENDING',
          doneAt: null,
          eventType: 'PODA',
          plants: refs,
          donePlants: [],
          products: [],
          planName: null,
          day: null,
        },
        {
          key: 'task:task-2',
          source: 'MANUAL',
          taskId: 'task-2',
          title: 'Comprar alargue para la sonda',
          detail: null,
          dueDate: '2026-11-01',
          status: 'PENDING',
          doneAt: null,
          eventType: null,
          plants: [],
          donePlants: [],
          products: [],
          planName: null,
          day: null,
        },
      ],
      upcoming: [
        { date: '2026-11-07', source: 'ALIMENTACION', title: 'Semana 3: Powder Feeding Grow 0,6 g/L', detail: 'pH 6,3 · EC 1', taskId: null },
      ],
    },
  ],
};

type Posted = { url: string; method: string; body: unknown };

async function mockBackend(page: Page, posted: Posted[]) {
  await page.route('https://geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [] }) })
  );
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
  );

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.includes('/agenda/')) {
      if (url.endsWith('/agenda/today') && method === 'GET') return json(agenda);
      posted.push({ url: new URL(url).pathname, method, body: request.postDataJSON() });
      return json({ ok: true });
    }
    if (url.endsWith('/readings-settings')) return json({ sensorsEnabled: true });
    if (/\/(sections|cycles|events|stage-ranges|devices)/.test(url) && method === 'GET') return json([]);
    return json({});
  });
}

test('inicio: el bloque Hoy resume la noche y registra tareas, riegos y preventivo', async ({ page }) => {
  const posted: Posted[] = [];
  await mockBackend(page, posted);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Floración' })).toBeVisible();
  await expect(page.getByText('Vegetativo · semana 2 · Octubre 2026, día 10')).toBeVisible();
  await expect(page.getByText('Con luz', { exact: true })).toBeVisible();
  await expect(page.getByText('Fuera de rango: humedad 6,3 h').first()).toBeVisible();
  await expect(page.getByText('condición cumplida 14 h 9 min')).toBeVisible();
  await expect(page.getByText('desde dom 01/11')).toBeVisible();

  // Tarea con evento: pide confirmación y dice dónde se registra.
  await page.getByRole('checkbox', { name: 'Marcar hecha: Topping 043 y 061' }).click();
  const dialog = page.getByRole('dialog', { name: 'Marcar hecha' });
  await expect(dialog.getByText('Se registra')).toBeVisible();
  await expect(dialog.getByText('043 · 061')).toBeVisible();
  await dialog.getByLabel('Nota (opcional)').fill('Arriba del 5.º nudo');
  await dialog.getByRole('button', { name: 'Hecho' }).click();
  await expect.poll(() => posted.find((call) => call.url.endsWith('/agenda/tasks/task-1/complete'))?.body).toEqual({
    note: 'Arriba del 5.º nudo',
  });

  // Tarea sin evento: se tilda directo.
  await page.getByRole('checkbox', { name: 'Marcar hecha: Comprar alargue para la sonda' }).click();
  await expect.poll(() => posted.some((call) => call.url.endsWith('/agenda/tasks/task-2/complete'))).toBe(true);

  // Preventivo del día.
  await page.getByRole('checkbox', { name: /Marcar hecha: Foliar: Mamboretá/ }).click();
  await page.getByRole('dialog', { name: 'Marcar hecha' }).getByRole('button', { name: 'Hecho' }).click();
  await expect.poll(() => posted.find((call) => call.url.endsWith('/agenda/prevention/complete'))?.body).toEqual({
    sectionId,
    key: 'prevention:pp-1:13:2026-11-02',
  });

  // Riego con lo precargado de la semana.
  await page.getByRole('button', { name: 'Regué' }).click();
  const riego = page.getByRole('dialog', { name: 'Registrar riego · semana 2' });
  await expect(riego.getByLabel('pH', { exact: true })).toHaveValue('6,3');
  await riego.getByLabel('Litros por planta').fill('1,5');
  await riego.getByLabel('pH drenaje').fill('6,4');
  await riego.getByRole('button', { name: 'Registrar en 2' }).click();
  await expect.poll(() => posted.find((call) => call.url.endsWith('/agenda/watering'))?.body).toEqual({
    sectionId,
    plantIds: ['plant-043', 'plant-061'],
    liters: 1.5,
    ph: 6.3,
    ec: 0.8,
    nutrients: [{ name: 'Powder Feeding Grow', dose: '0,5 g/L' }],
    drainPh: 6.4,
    taskKey: 'feeding:plan-1:2',
  });

  // Tarea nueva con el día de hoy por defecto.
  await page.getByRole('button', { name: 'Tarea', exact: true }).click();
  const nueva = page.getByRole('dialog', { name: 'Nueva tarea' });
  await nueva.getByLabel('Qué').fill('Comprar sustrato');
  await nueva.getByRole('button', { name: 'Guardar' }).click();
  await expect.poll(() => posted.find((call) => call.url.endsWith('/agenda/tasks') && call.method === 'POST')?.body).toEqual({
    sectionId,
    title: 'Comprar sustrato',
    detail: null,
    dueDate: '2026-11-02',
    plantIds: [],
    eventType: null,
  });
});
