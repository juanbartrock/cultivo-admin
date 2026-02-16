import { Page, test, expect } from '@playwright/test';

const roomId = 'room-1';
const sectionId = 'section-1';

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
  await expect(page.getByRole('heading', { name: 'Espacios de cultivo' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sala Principal' })).toBeVisible();
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
