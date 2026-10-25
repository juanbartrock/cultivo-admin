import { Connector, DeviceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IoTGatewayService } from './iot-gateway.service';
import { ReadingsSettingsService } from '../readings-settings/readings-settings.service';
import { DevicesService } from './devices.service';

/**
 * Kill switch de lecturas en `getDeviceStatus`: qué dispositivo sale a la red y cuál no.
 * El caso del VIRTUAL con controlador pausado no se puede probar contra producción sin
 * asignarle un controlador al humidificador, así que se cubre acá.
 */
describe('DevicesService · kill switch de lecturas', () => {
  const device = (over: Partial<Record<string, unknown>> = {}) => ({
    id: 'device-1',
    name: 'aparato',
    connector: Connector.TUYA,
    externalId: 'ext-1',
    type: DeviceType.LUZ,
    readingsEnabled: true,
    controlledBy: null,
    ...over,
  });

  const prismaMock = { device: { findUnique: jest.fn() } };
  const gatewayMock = { getDeviceStatus: jest.fn(), getCameraStreamInfo: jest.fn() };
  const settingsMock = { sensorsEnabled: jest.fn() };

  let service: DevicesService;

  beforeEach(() => {
    jest.clearAllMocks();
    gatewayMock.getDeviceStatus.mockResolvedValue({ online: true, state: 'on' });
    settingsMock.sensorsEnabled.mockResolvedValue(true);

    const settings = Object.assign(
      Object.create(ReadingsSettingsService.prototype) as ReadingsSettingsService,
      settingsMock,
    );

    service = new DevicesService(
      prismaMock as unknown as PrismaService,
      gatewayMock as unknown as IoTGatewayService,
      settings,
    );
  });

  it('no consulta al conector cuando el dispositivo tiene las lecturas apagadas', async () => {
    prismaMock.device.findUnique.mockResolvedValue(device({ readingsEnabled: false }));

    const { status } = await service.getDeviceStatus('device-1');

    expect(status).toEqual({ online: false, readingsPaused: true });
    expect(gatewayMock.getDeviceStatus).not.toHaveBeenCalled();
  });

  it('no consulta un SENSOR cuando el interruptor general está apagado', async () => {
    settingsMock.sensorsEnabled.mockResolvedValue(false);
    prismaMock.device.findUnique.mockResolvedValue(device({ type: DeviceType.SENSOR }));

    const { status } = await service.getDeviceStatus('device-1');

    expect(status).toEqual({ online: false, readingsPaused: true });
    expect(gatewayMock.getDeviceStatus).not.toHaveBeenCalled();
  });

  it('sigue consultando un actuador con el interruptor general apagado', async () => {
    settingsMock.sensorsEnabled.mockResolvedValue(false);
    prismaMock.device.findUnique.mockResolvedValue(device());

    const { status } = await service.getDeviceStatus('device-1');

    expect(status.readingsPaused).toBeUndefined();
    expect(gatewayMock.getDeviceStatus).toHaveBeenCalledWith(Connector.TUYA, 'ext-1');
  });

  it('no sale a la red por un VIRTUAL cuyo controlador tiene las lecturas apagadas', async () => {
    prismaMock.device.findUnique.mockResolvedValue(
      device({
        connector: Connector.VIRTUAL,
        type: DeviceType.HUMIDIFICADOR,
        controlledBy: {
          id: 'controller-1',
          name: 'tuya pausado',
          connector: Connector.TUYA,
          externalId: 'ext-ctrl',
          type: DeviceType.BOMBA_RIEGO,
          readingsEnabled: false,
        },
      }),
    );

    const { status } = await service.getDeviceStatus('device-1');

    expect(status).toEqual({ online: false, readingsPaused: true });
    expect(gatewayMock.getDeviceStatus).not.toHaveBeenCalled();
  });

  it('consulta al controlador de un VIRTUAL cuando ese controlador está activo', async () => {
    prismaMock.device.findUnique.mockResolvedValue(
      device({
        connector: Connector.VIRTUAL,
        type: DeviceType.HUMIDIFICADOR,
        controlledBy: {
          id: 'controller-1',
          name: 'tuya activo',
          connector: Connector.TUYA,
          externalId: 'ext-ctrl',
          type: DeviceType.BOMBA_RIEGO,
          readingsEnabled: true,
        },
      }),
    );

    const { status } = await service.getDeviceStatus('device-1');

    expect(gatewayMock.getDeviceStatus).toHaveBeenCalledWith(Connector.TUYA, 'ext-ctrl');
    expect(status.readingsPaused).toBeUndefined();
    expect(status.state).toBe('on');
  });
});
