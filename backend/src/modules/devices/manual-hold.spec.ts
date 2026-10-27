import { Connector, DeviceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IoTGatewayService } from './iot-gateway.service';
import { ReadingsSettingsService } from '../readings-settings/readings-settings.service';
import { DevicesService } from './devices.service';
import { holdMinutesFor, preserveHold, readHold } from './manual-hold';

/**
 * Retención manual: el control desde la app deja al dispositivo físico fuera de automatizaciones
 * y jobs durante N minutos. Ningún test sale a un conector real: el gateway es un mock.
 */
describe('DevicesService · retención manual', () => {
  const NOW = new Date('2026-10-27T15:00:00.000Z');

  // flora-extractor: el TUYA que "Renovación de aire" apagaba a los 5 min de prenderlo a mano
  const extractor = (over: Partial<Record<string, unknown>> = {}) => ({
    id: 'f43e2503-2ba1-4c63-ae85-c0e586f06cfc',
    name: 'flora-extractor',
    connector: Connector.TUYA,
    externalId: 'tuya-ext',
    type: DeviceType.EXTRACTOR,
    readingsEnabled: true,
    metadata: null,
    controlledBy: null,
    controlledDevices: [],
    ...over,
  });

  const prismaMock = { device: { findUnique: jest.fn(), update: jest.fn() } };
  const gatewayMock = { controlDevice: jest.fn(), getDeviceStatus: jest.fn() };
  const settingsMock = { sensorsEnabled: jest.fn() };

  let service: DevicesService;
  const savedEnv = process.env.MANUAL_HOLD_MINUTES;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    delete process.env.MANUAL_HOLD_MINUTES;
    gatewayMock.controlDevice.mockResolvedValue({ success: true });
    gatewayMock.getDeviceStatus.mockResolvedValue({ online: true, state: 'on' });
    settingsMock.sensorsEnabled.mockResolvedValue(true);
    prismaMock.device.update.mockResolvedValue({});

    service = new DevicesService(
      prismaMock as unknown as PrismaService,
      gatewayMock as unknown as IoTGatewayService,
      Object.assign(
        Object.create(ReadingsSettingsService.prototype) as ReadingsSettingsService,
        settingsMock,
      ),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    if (savedEnv === undefined) delete process.env.MANUAL_HOLD_MINUTES;
    else process.env.MANUAL_HOLD_MINUTES = savedEnv;
  });

  const savedMetadata = () => prismaMock.device.update.mock.calls[0][0].data.metadata;

  it('el control manual deja 60 min de retención por default', async () => {
    prismaMock.device.findUnique.mockResolvedValue(extractor());

    const response = await service.controlDevice(extractor().id, 'on', { source: 'manual' });

    expect(prismaMock.device.update).toHaveBeenCalledWith({
      where: { id: extractor().id },
      data: {
        metadata: {
          manualHold: {
            holdUntil: '2026-10-27T16:00:00.000Z',
            setAt: NOW.toISOString(),
            action: 'on',
            minutes: 60,
          },
        },
      },
    });
    expect((response as { manualHold: unknown }).manualHold).toMatchObject({
      active: true,
      holdUntil: '2026-10-27T16:00:00.000Z',
      remainingMinutes: 60,
      action: 'on',
      holdMinutes: 60,
    });
  });

  it('el control de automatizaciones y jobs no abre retención', async () => {
    prismaMock.device.findUnique.mockResolvedValue(extractor());

    const response = await service.controlDevice(extractor().id, 'off');

    expect(gatewayMock.controlDevice).toHaveBeenCalledWith(Connector.TUYA, 'tuya-ext', 'off');
    expect(prismaMock.device.update).not.toHaveBeenCalled();
    expect(response).not.toHaveProperty('manualHold');
  });

  it('un comando rechazado por el conector no retiene', async () => {
    prismaMock.device.findUnique.mockResolvedValue(extractor());
    gatewayMock.controlDevice.mockResolvedValue({ success: false, message: 'offline' });

    const response = await service.controlDevice(extractor().id, 'on', { source: 'manual' });

    expect(prismaMock.device.update).not.toHaveBeenCalled();
    expect((response as { manualHold: { active: boolean } }).manualHold.active).toBe(false);
  });

  it('respeta MANUAL_HOLD_MINUTES y, por encima, metadata.manualHoldMinutes del dispositivo', async () => {
    process.env.MANUAL_HOLD_MINUTES = '30';
    prismaMock.device.findUnique.mockResolvedValue(extractor());
    await service.controlDevice(extractor().id, 'on', { source: 'manual' });
    expect(savedMetadata().manualHold.minutes).toBe(30);

    prismaMock.device.update.mockClear();
    prismaMock.device.findUnique.mockResolvedValue(extractor({ metadata: { manualHoldMinutes: 15 } }));
    await service.controlDevice(extractor().id, 'on', { source: 'manual' });
    expect(savedMetadata()).toMatchObject({
      manualHoldMinutes: 15,
      manualHold: { minutes: 15, holdUntil: '2026-10-27T15:15:00.000Z' },
    });
  });

  it('manualHoldMinutes 0 desactiva la retención para ese dispositivo', async () => {
    prismaMock.device.findUnique.mockResolvedValue(extractor({ metadata: { manualHoldMinutes: 0 } }));

    await service.controlDevice(extractor().id, 'on', { source: 'manual' });

    expect(prismaMock.device.update).not.toHaveBeenCalled();
  });

  it('un VIRTUAL retiene a su controlador, que es el relé que se mueve', async () => {
    const controller = { id: 'relay', name: 'Sonoff relé', connector: Connector.SONOFF, externalId: 'sonoff-1', metadata: null };
    prismaMock.device.findUnique.mockResolvedValue(
      extractor({ id: 'virtual', connector: Connector.VIRTUAL, controlledBy: controller }),
    );

    await service.controlDevice('virtual', 'off', { source: 'manual' });

    expect(prismaMock.device.update.mock.calls[0][0].where).toEqual({ id: 'relay' });
    expect(savedMetadata().manualHold.action).toBe('off');
  });

  it('GET status informa holdUntil y minutos restantes, también con las lecturas pausadas', async () => {
    const metadata = {
      manualHold: { holdUntil: '2026-10-27T15:42:10.000Z', setAt: '2026-10-27T14:42:10.000Z', action: 'on', minutes: 60 },
    };
    prismaMock.device.findUnique.mockResolvedValue(extractor({ metadata, readingsEnabled: false }));

    const { status } = await service.getDeviceStatus(extractor().id);

    expect(status).toMatchObject({
      online: false,
      readingsPaused: true,
      manualHold: { active: true, holdUntil: '2026-10-27T15:42:10.000Z', remainingMinutes: 43 },
    });
    expect(gatewayMock.getDeviceStatus).not.toHaveBeenCalled();
  });

  it('una retención vencida se lee como inactiva', async () => {
    const metadata = { manualHold: { holdUntil: '2026-10-27T14:59:59.000Z', action: 'on', minutes: 60 } };
    prismaMock.device.findUnique.mockResolvedValue(extractor({ metadata }));

    await expect(service.getManualHold(extractor().id)).resolves.toMatchObject({
      active: false,
      holdUntil: null,
      remainingMinutes: 0,
    });
  });

  it('liberar borra solo la retención y conserva el resto de metadata', async () => {
    const metadata = {
      manualHoldMinutes: 20,
      manualHold: { holdUntil: '2026-10-27T15:30:00.000Z', action: 'on', minutes: 20 },
    };
    prismaMock.device.findUnique.mockResolvedValue(extractor({ metadata }));

    const state = await service.releaseManualHold(extractor().id);

    expect(savedMetadata()).toEqual({ manualHoldMinutes: 20 });
    expect(state).toMatchObject({ active: false, holdMinutes: 20 });
  });

  it('getControlScope junta el pedido, su controlador y los virtuales del mismo relé', async () => {
    prismaMock.device.findUnique.mockResolvedValue(extractor({ controlledDevices: [{ id: 'virtual-1' }] }));

    await expect(service.getControlScope(extractor().id)).resolves.toMatchObject({
      deviceIds: [extractor().id, 'virtual-1'],
      manualHold: { active: false },
    });
  });

  describe('helpers', () => {
    it('PUT con metadata no pisa una retención vigente', () => {
      const hold = { holdUntil: '2026-10-27T16:00:00.000Z', action: 'on', minutes: 60 };
      expect(preserveHold({ manualHold: hold }, { note: 'x' })).toEqual({ note: 'x', manualHold: hold });
      expect(preserveHold({ manualHold: hold }, { manualHold: null })).toEqual({ manualHold: null });
      expect(preserveHold(null, { note: 'x' })).toEqual({ note: 'x' });
    });

    it('ignora valores de configuración inválidos', () => {
      expect(holdMinutesFor([{ manualHoldMinutes: -5 }], 'abc')).toBe(60);
      expect(holdMinutesFor([{ manualHoldMinutes: '45' }], undefined)).toBe(45);
      expect(readHold({ manualHold: { holdUntil: 'no-es-fecha' } }, NOW)).toBeNull();
    });
  });
});
