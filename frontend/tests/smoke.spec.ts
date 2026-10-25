import { Page, test, expect } from '@playwright/test';

const roomId = 'room-1';
const sectionId = 'section-1';

const sectionPlants = [
  {
    id: 'plant-1',
    tagCode: '049',
    strainId: 'strain-1',
    strain: { id: 'strain-1', name: 'Tropicana WFC', type: 'HYBRID' },
    cycleId: 'cycle-1',
    sectionId,
    stage: 'VEGETATIVO',
    sex: 'FEM',
    healthStatus: 'HEALTHY',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'plant-2',
    tagCode: '068',
    strainId: 'strain-2',
    strain: { id: 'strain-2', name: 'Celosa 10', type: 'HYBRID' },
    cycleId: 'cycle-1',
    sectionId,
    stage: 'VEGETATIVO',
    sex: 'FEM',
    healthStatus: 'HEALTHY',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const sectionDevices = [
  {
    id: 'device-light',
    name: 'Panel LED',
    connector: 'TUYA',
    externalId: 'light-1',
    type: 'LUZ',
    sectionId,
    readingsEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'device-sensor',
    name: 'Sensor ambiente',
    connector: 'ESP32',
    externalId: 'sensor-1',
    type: 'SENSOR',
    sectionId,
    readingsEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function mockWeather(page: Page) {
  await page.route('https://geocoding-api.open-meteo.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: [
          {
            latitude: -34.6132,
            longitude: -58.3772,
            name: 'Buenos Aires',
            country: 'Argentina',
          },
        ],
      }),
    });
  });

  await page.route('https://api.open-meteo.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        current: {
          temperature_2m: 24.8,
          relative_humidity_2m: 61,
          weather_code: 1,
        },
      }),
    });
  });
}

async function mockBackend(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.endsWith('/rooms') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: roomId,
            name: 'Sala Principal',
            description: 'Mock room',
            sections: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]),
      });
      return;
    }

    if (url.endsWith(`/rooms/${roomId}`) && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: roomId,
          name: 'Sala Principal',
          description: 'Mock room',
          sections: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
      return;
    }

    if (url.endsWith(`/rooms/${roomId}/sections`) && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: sectionId,
            name: 'Carpa Flora',
            dimensions: '120x120x200',
            roomId,
            devices: [],
            plants: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]),
      });
      return;
    }

    if (url.endsWith(`/sections/${sectionId}/dashboard`) && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: sectionId,
          name: 'Carpa Flora',
          dimensions: '120x120x200',
          roomId,
          devices: sectionDevices,
          plants: sectionPlants,
          effectiveStage: 'VEGETATIVO',
          summary: { totalPlants: 2, totalDevices: 2, plantsByStage: { VEGETATIVO: 2 } },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
      return;
    }

    if (url.endsWith(`/devices/${'device-sensor'}/status`) && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: { online: true, temperature: 24.2, humidity: 63, co2: 780 } }),
      });
      return;
    }

    if (url.endsWith(`/devices/${'device-light'}/status`) && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: { online: true, state: 'on' } }),
      });
      return;
    }

    if (url.endsWith('/readings-settings') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sensorsEnabled: true, updatedAt: new Date().toISOString() }),
      });
      return;
    }

    if (url.endsWith('/stage-ranges') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (url.includes('/feeding-plans') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(url.includes(`/sections/${sectionId}`) ? { sectionId, sectionName: 'Carpa Flora', plants: [] } : []),
      });
      return;
    }

    if (url.includes('/prevention-plans') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(url.includes(`/sections/${sectionId}`) ? { sectionId, sectionName: 'Carpa Flora', plants: [] } : []),
      });
      return;
    }

    if (url.includes('/cycles') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (url.includes('/strains') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (url.includes('/plants') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (url.includes('/events') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (url.includes('/automations') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (url.includes('/devices') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockWeather(page);
  await mockBackend(page);
});

test('smoke: dashboard sala renders', async ({ page }) => {
  await page.goto('/sala');
  await expect(page.getByRole('heading', { name: 'Sala Principal' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Carpa Flora/ })).toBeVisible();
});

test('smoke: seguimientos page renders', async ({ page }) => {
  await page.goto('/seguimientos');
  await expect(page.getByRole('heading', { name: 'Ciclos' }).first()).toBeVisible();
});

test('smoke: automatizaciones page renders', async ({ page }) => {
  await page.goto('/automatizaciones');
  await expect(page).toHaveURL(/.*\/automatizaciones/);
  await expect(page.getByRole('link', { name: 'Automatizaciones' })).toBeVisible();
});

test('carpa viva: integra selección, actividad, controles y gestión', async ({ page }) => {
  await page.goto(`/sala/carpa/${sectionId}`);

  await expect(page.getByRole('heading', { name: 'Carpa viva' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Carpa 3D' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'Cultivo', exact: true })).toHaveAttribute('aria-selected', 'true');

  await page.getByRole('button', { name: 'Tropicana WFC', exact: true }).click();
  await expect(page.getByText('Planta seleccionada', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Actividad reciente' })).toBeVisible();
  await expect(page.getByText('049', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Registrar', exact: true })).toBeVisible();

  await page.getByRole('tab', { name: 'Equipos', exact: true }).click();
  await page.getByRole('button', { name: 'Enfocar Panel LED', exact: true }).click();
  await expect(page.getByText('Equipo seleccionado', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Panel LED', exact: true })).toBeVisible();

  await page.getByRole('tab', { name: 'Gestión' }).click();
  await expect(page.getByRole('heading', { name: 'Control de Dispositivos' })).toBeVisible();
  await page.getByRole('tab', { name: 'Carpa 3D' }).click();
  await expect(page.getByRole('heading', { name: 'Carpa viva' })).toBeVisible();
});

test('carpa viva: compara fotografía, configura capas y abre historial', async ({ page }) => {
  await page.goto(`/sala/carpa/${sectionId}`);
  await page.getByRole('button', { name: 'Foto real' }).click();
  await expect(page.getByTestId('reference-photo')).toBeVisible();
  await expect(page.getByText('Foto real de referencia · Imagen estática del 24/10')).toBeVisible();
  await page.getByRole('button', { name: 'Volver al 3D' }).click();

  await page.getByRole('button', { name: 'Capas de la escena' }).click();
  const nets = page.getByRole('switch', { name: 'Redes SCROG' });
  await expect(nets).toHaveAttribute('aria-checked', 'true');
  await nets.click();
  await expect(nets).toHaveAttribute('aria-checked', 'false');

  await page.getByRole('button', { name: 'Evolución ambiental' }).click();
  await expect(page.getByRole('button', { name: 'Evolución ambiental' })).toHaveAttribute('aria-expanded', 'true');
});

test('carpa viva: mantiene controles y referencia visual sin WebGL', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type.includes('webgl')) return null;
      return getContext.call(this, type, ...args);
    } as typeof getContext;
  });
  await page.goto(`/sala/carpa/${sectionId}`);

  await expect(page.getByTestId('scene-fallback')).toBeVisible();
  await page.getByRole('button', { name: 'Celosa 10', exact: true }).click();
  await expect(page.getByText('Planta seleccionada', { exact: true })).toBeVisible();
});
