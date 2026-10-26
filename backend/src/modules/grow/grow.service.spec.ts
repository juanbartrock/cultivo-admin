import { CycleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatePlantDto } from './dto/plant.dto';
import { GrowService } from './grow.service';

describe('GrowService', () => {
  let service: GrowService;

  // `updatePlant` consulta el ciclo antes de la transacción para no tocar plantas de un ciclo curado
  const prismaMock = {
    $transaction: jest.fn(),
    cycle: {
      findUnique: jest.fn(),
    },
  };

  const txMock = {
    plant: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    plantZone: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock.cycle.findUnique.mockResolvedValue({ id: 'cycle-1', status: CycleStatus.ACTIVE });
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock),
    );

    txMock.plant.update.mockResolvedValue({ id: 'plant-1', sectionId: 'section-1' });
    txMock.plant.findUnique.mockResolvedValue({ id: 'plant-1', sectionId: 'section-1', zones: [] });
    txMock.plantZone.deleteMany.mockResolvedValue({ count: 2 });
    txMock.plantZone.createMany.mockResolvedValue({ count: 2 });

    service = new GrowService(prismaMock as unknown as PrismaService);

    jest.spyOn(service, 'findPlantById').mockResolvedValue({
      id: 'plant-1',
      sectionId: 'section-1',
      cycleId: 'cycle-1',
      stage: 'VEGETATIVO',
      zones: [],
    } as never);
  });

  it('updates plant zones in a single transaction', async () => {
    const payload = {
      zones: [
        { zone: 1, coverage: 60 },
        { zone: 2, coverage: 40 },
      ],
    } as unknown as UpdatePlantDto;

    await expect(service.updatePlant('plant-1', payload)).resolves.toMatchObject({
      id: 'plant-1',
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txMock.plantZone.deleteMany).toHaveBeenCalledWith({
      where: { plantId: 'plant-1' },
    });
    expect(txMock.plantZone.createMany).toHaveBeenCalledTimes(1);
  });

  it('fails atomically when zone creation fails', async () => {
    txMock.plantZone.createMany.mockRejectedValueOnce(new Error('zone create failed'));

    const payload = {
      zones: [{ zone: 1, coverage: 100 }],
    } as unknown as UpdatePlantDto;

    await expect(service.updatePlant('plant-1', payload)).rejects.toThrow('zone create failed');
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects updates on a cured cycle before opening the transaction', async () => {
    prismaMock.cycle.findUnique.mockResolvedValueOnce({ id: 'cycle-1', status: CycleStatus.CURED });

    const payload = { zones: [{ zone: 1, coverage: 100 }] } as unknown as UpdatePlantDto;

    await expect(service.updatePlant('plant-1', payload)).rejects.toThrow('curado');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
