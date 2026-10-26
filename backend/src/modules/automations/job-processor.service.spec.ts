import { JobStatus, JobType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DevicesService } from '../devices/devices.service';
import { JobProcessorService } from './job-processor.service';

describe('JobProcessorService', () => {
  // Job real del 2026-10-26: apagar el extractor 5 min después de "Renovación de aire"
  const job = {
    id: 'ac73b258-5cfe-4856-85a3-f0c3ab96c78d',
    type: JobType.DEVICE_OFF,
    deviceId: 'f43e2503-2ba1-4c63-ae85-c0e586f06cfc',
    automationId: 'ee38232c-029c-4e8f-af06-7a3c1482b5cf',
    status: JobStatus.RUNNING,
    attempts: 1,
    maxAttempts: 3,
    runAt: new Date('2026-10-26T12:04:07.727Z'),
  };

  const prismaMock = {
    $queryRaw: jest.fn(),
    scheduledJob: {
      updateMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const devicesMock = { controlDevice: jest.fn() };

  let service: JobProcessorService;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.scheduledJob.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.scheduledJob.update.mockResolvedValue({});
    devicesMock.controlDevice.mockResolvedValue({ success: true });
    service = new JobProcessorService(
      prismaMock as unknown as PrismaService,
      devicesMock as unknown as DevicesService,
    );
  });

  it('apaga el dispositivo del job reclamado y lo marca completado', async () => {
    // El UPDATE ... RETURNING crudo solo trae el id; la fila con camelCase la da Prisma
    prismaMock.$queryRaw.mockResolvedValue([{ id: job.id }]);
    prismaMock.scheduledJob.findMany.mockResolvedValue([job]);

    await service.processJobs();

    expect(prismaMock.scheduledJob.findMany).toHaveBeenCalledWith({
      where: { id: { in: [job.id] } },
      orderBy: { runAt: 'asc' },
    });
    expect(devicesMock.controlDevice).toHaveBeenCalledWith(job.deviceId, 'off');
    expect(prismaMock.scheduledJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: job.id },
        data: expect.objectContaining({ status: JobStatus.COMPLETED }),
      }),
    );
  });

  it('no relee nada cuando no hay jobs vencidos', async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);

    await service.processJobs();

    expect(prismaMock.scheduledJob.findMany).not.toHaveBeenCalled();
    expect(devicesMock.controlDevice).not.toHaveBeenCalled();
  });
});
