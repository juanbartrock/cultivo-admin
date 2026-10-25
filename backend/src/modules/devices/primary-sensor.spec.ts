import { BadRequestException } from '@nestjs/common';
import { Connector, DeviceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IoTGatewayService } from './iot-gateway.service';
import { ReadingsSettingsService } from '../readings-settings/readings-settings.service';
import { DevicesService } from './devices.service';

/**
 * Sensor principal de la carpa: uno solo por carpa, solo SENSOR, y se pierde al cambiar de carpa.
 */
describe('DevicesService · sensor principal', () => {
  const device = (over: Partial<Record<string, unknown>> = {}) => ({
    id: 'thr',
    name: 'Termohigrómetro',
    connector: Connector.SONOFF,
    externalId: 'ext-thr',
    type: DeviceType.SENSOR,
    sectionId: 'flora',
    primarySensor: false,
    ...over,
  });

  const tx = { device: { updateMany: jest.fn(), update: jest.fn() } };
  const prismaMock = {
    device: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
  };

  let service: DevicesService;

  beforeEach(() => {
    jest.clearAllMocks();
    tx.device.update.mockResolvedValue(device({ primarySensor: true }));
    service = new DevicesService(
      prismaMock as unknown as PrismaService,
      {} as IoTGatewayService,
      Object.create(ReadingsSettingsService.prototype) as ReadingsSettingsService,
    );
  });

  it('marca el sensor y desmarca al principal anterior de la misma carpa', async () => {
    prismaMock.device.findUnique.mockResolvedValue(device());

    await service.update('thr', { primarySensor: true });

    expect(tx.device.updateMany).toHaveBeenCalledWith({
      where: { sectionId: 'flora', primarySensor: true, id: { not: 'thr' } },
      data: { primarySensor: false },
    });
    expect(tx.device.update.mock.calls[0][0].data).toMatchObject({ primarySensor: true });
  });

  it('rechaza marcar como principal algo que no es SENSOR', async () => {
    prismaMock.device.findUnique.mockResolvedValue(device({ type: DeviceType.EXTRACTOR }));

    await expect(service.update('thr', { primarySensor: true })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.device.update).not.toHaveBeenCalled();
  });

  it('rechaza marcar como principal un sensor sin carpa', async () => {
    prismaMock.device.findUnique.mockResolvedValue(device({ sectionId: null }));

    await expect(service.update('thr', { primarySensor: true })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('al cambiar de carpa pierde la marca de principal', async () => {
    prismaMock.device.findUnique.mockResolvedValue(device({ primarySensor: true }));

    await service.update('thr', { sectionId: 'secado' });

    expect(tx.device.updateMany).not.toHaveBeenCalled();
    expect(tx.device.update.mock.calls[0][0].data).toMatchObject({ primarySensor: false });
  });
});
