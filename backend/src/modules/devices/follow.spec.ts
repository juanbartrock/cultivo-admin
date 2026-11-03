import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Connector, DeviceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IoTGatewayService } from './iot-gateway.service';
import { ReadingsSettingsService } from '../readings-settings/readings-settings.service';
import { DevicesService } from './devices.service';
import { FOLLOW_RESYNC_MS, preserveFollows, readFollows, shouldMirror } from './follow';

/**
 * Seguidores: el intractor de Floración copia cada on/off que el backend le manda al extractor.
 * Ningún test sale a un conector real: el gateway es un mock.
 */
describe('DevicesService · seguidores', () => {
  const NOW = new Date('2026-11-02T22:00:00.000Z');
  const EXTRACTOR_ID = 'f43e2503-2ba1-4c63-ae85-c0e586f06cfc';
  const INTRACTOR_ID = '8b43633a-a49f-4634-823d-f49ff1492b3f';

  const extractor = (over: Partial<Record<string, unknown>> = {}) => ({
    id: EXTRACTOR_ID,
    name: 'flora-extractor',
    connector: Connector.TUYA,
    externalId: 'tuya-ext',
    type: DeviceType.EXTRACTOR,
    metadata: null,
    controlledBy: null,
    controlledDevices: [],
    ...over,
  });

  const intractor = (over: Partial<Record<string, unknown>> = {}) => ({
    id: INTRACTOR_ID,
    name: 'flora-intractor',
    connector: Connector.TUYA,
    externalId: 'tuya-int',
    type: DeviceType.VENTILADOR,
    metadata: { followsDeviceId: EXTRACTOR_ID },
    controlledBy: null,
    controlledDevices: [],
    ...over,
  });

  const prismaMock = { device: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() } };
  const gatewayMock = { controlDevice: jest.fn() };

  let service: DevicesService;

  const sentTo = (externalId: string) =>
    gatewayMock.controlDevice.mock.calls.filter(([, id]) => id === externalId).map(([, , action]) => action);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    gatewayMock.controlDevice.mockResolvedValue({ success: true });
    prismaMock.device.findUnique.mockResolvedValue(extractor());
    prismaMock.device.findMany.mockResolvedValue([intractor()]);
    prismaMock.device.update.mockResolvedValue({});

    service = new DevicesService(
      prismaMock as unknown as PrismaService,
      gatewayMock as unknown as IoTGatewayService,
      Object.create(ReadingsSettingsService.prototype) as ReadingsSettingsService,
    );
  });

  afterEach(() => jest.useRealTimers());

  it('el on del extractor prende el intractor y la respuesta lo lista', async () => {
    const response = await service.controlDevice(EXTRACTOR_ID, 'on');

    expect(sentTo('tuya-ext')).toEqual(['on']);
    expect(sentTo('tuya-int')).toEqual(['on']);
    expect(prismaMock.device.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { notIn: [EXTRACTOR_ID] },
          OR: [{ metadata: { path: ['followsDeviceId'], equals: EXTRACTOR_ID } }],
        },
      }),
    );
    expect((response as { followers: unknown }).followers).toEqual([
      { id: INTRACTOR_ID, name: 'flora-intractor', action: 'on', outcome: 'sent' },
    ]);
  });

  it('el mismo comando repetido cada minuto se reenvía recién a los 10 min', async () => {
    await service.controlDevice(EXTRACTOR_ID, 'on');
    jest.setSystemTime(NOW.getTime() + 60_000);
    const repeated = await service.controlDevice(EXTRACTOR_ID, 'on');
    expect((repeated as { followers: { outcome: string }[] }).followers[0].outcome).toBe('recent');
    expect(sentTo('tuya-int')).toEqual(['on']);

    jest.setSystemTime(NOW.getTime() + FOLLOW_RESYNC_MS);
    await service.controlDevice(EXTRACTOR_ID, 'on');
    expect(sentTo('tuya-int')).toEqual(['on', 'on']);
  });

  it('el off después de un on se copia enseguida', async () => {
    await service.controlDevice(EXTRACTOR_ID, 'on');
    jest.setSystemTime(NOW.getTime() + 60_000);
    await service.controlDevice(EXTRACTOR_ID, 'off');

    expect(sentTo('tuya-int')).toEqual(['on', 'off']);
  });

  it('el control manual del extractor también arrastra al intractor', async () => {
    const response = await service.controlDevice(EXTRACTOR_ID, 'off', { source: 'manual' });

    expect(sentTo('tuya-int')).toEqual(['off']);
    expect(response).toHaveProperty('manualHold');
    expect(response).toHaveProperty('followers');
  });

  it('un intractor con retención manual propia queda quieto', async () => {
    prismaMock.device.findMany.mockResolvedValue([
      intractor({
        metadata: {
          followsDeviceId: EXTRACTOR_ID,
          manualHold: { holdUntil: '2026-11-02T22:30:00.000Z', setAt: NOW.toISOString(), action: 'off', minutes: 60 },
        },
      }),
    ]);

    const response = await service.controlDevice(EXTRACTOR_ID, 'on');

    expect(sentTo('tuya-int')).toEqual([]);
    expect((response as { followers: { outcome: string }[] }).followers[0].outcome).toBe('held');
  });

  it('si el extractor no acepta el comando, el intractor no se toca', async () => {
    gatewayMock.controlDevice.mockResolvedValue({ success: false, message: 'offline' });

    const response = await service.controlDevice(EXTRACTOR_ID, 'on');

    expect(prismaMock.device.findMany).not.toHaveBeenCalled();
    expect(response).not.toHaveProperty('followers');
  });

  it('un intractor que no respondió se reintenta en el próximo comando', async () => {
    gatewayMock.controlDevice.mockImplementation(async (_c: Connector, id: string) =>
      id === 'tuya-int' ? { success: false, message: 'timeout' } : { success: true },
    );
    const first = await service.controlDevice(EXTRACTOR_ID, 'on');
    expect((first as { followers: { outcome: string }[] }).followers[0].outcome).toBe('failed');

    gatewayMock.controlDevice.mockResolvedValue({ success: true });
    jest.setSystemTime(NOW.getTime() + 60_000);
    const second = await service.controlDevice(EXTRACTOR_ID, 'on');
    expect((second as { followers: { outcome: string }[] }).followers[0].outcome).toBe('sent');
  });

  it('sin seguidores la respuesta queda como antes', async () => {
    prismaMock.device.findMany.mockResolvedValue([]);

    const response = await service.controlDevice(EXTRACTOR_ID, 'on');

    expect(response).not.toHaveProperty('followers');
  });

  it('un VIRTUAL arrastra a los seguidores de su controlador', async () => {
    const relay = { id: 'relay', name: 'Sonoff relé', connector: Connector.SONOFF, externalId: 'sonoff-1', metadata: null };
    prismaMock.device.findUnique.mockResolvedValue(
      extractor({ id: 'virtual', connector: Connector.VIRTUAL, controlledBy: relay }),
    );

    await service.controlDevice('virtual', 'on');

    expect(prismaMock.device.findMany.mock.calls[0][0].where.id).toEqual({ notIn: ['virtual', 'relay'] });
    expect(sentTo('sonoff-1')).toEqual(['on']);
    expect(sentTo('tuya-int')).toEqual(['on']);
  });

  describe('PUT /devices/:id', () => {
    it('rechaza seguirse a sí mismo', async () => {
      prismaMock.device.findUnique.mockResolvedValue(intractor());

      await expect(
        service.update(INTRACTOR_ID, { metadata: { followsDeviceId: INTRACTOR_ID } }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza seguir a un dispositivo que no existe', async () => {
      prismaMock.device.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
        where.id === INTRACTOR_ID ? intractor() : null,
      );

      await expect(
        service.update(INTRACTOR_ID, { metadata: { followsDeviceId: 'no-existe' } }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

describe('follow · funciones puras', () => {
  it('readFollows solo acepta un id no vacío', () => {
    expect(readFollows({ followsDeviceId: 'abc' })).toBe('abc');
    expect(readFollows({ followsDeviceId: '' })).toBeNull();
    expect(readFollows({ followsDeviceId: null })).toBeNull();
    expect(readFollows(null)).toBeNull();
  });

  it('shouldMirror: estado nuevo, primera vez o intervalo vencido', () => {
    expect(shouldMirror(undefined, 'on', 0)).toBe(true);
    expect(shouldMirror({ action: 'on', at: 0 }, 'off', 1)).toBe(true);
    expect(shouldMirror({ action: 'on', at: 0 }, 'on', FOLLOW_RESYNC_MS - 1)).toBe(false);
    expect(shouldMirror({ action: 'on', at: 0 }, 'on', FOLLOW_RESYNC_MS)).toBe(true);
  });

  it('un PUT con metadata que no nombra la clave la conserva; con null la saca', () => {
    const existing = { followsDeviceId: 'ext' };
    expect(preserveFollows(existing, { manualHoldMinutes: 0 })).toEqual({ manualHoldMinutes: 0, followsDeviceId: 'ext' });
    expect(preserveFollows(existing, { followsDeviceId: null })).toEqual({ followsDeviceId: null });
    expect(preserveFollows(null, { a: 1 })).toEqual({ a: 1 });
  });
});
