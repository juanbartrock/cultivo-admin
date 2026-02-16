import { PrismaService } from '../../prisma/prisma.service';
import { DevicesService } from '../devices/devices.service';
import { JobSchedulerService } from './job-scheduler.service';
import { PlantAnalysisService } from './plant-analysis.service';
import { UpdateAutomationDto } from './dto/automation.dto';
import { AutomationsService } from './automations.service';

describe('AutomationsService', () => {
  let service: AutomationsService;

  const prismaMock = {
    $transaction: jest.fn(),
    automation: {
      findUnique: jest.fn(),
    },
  };

  const txMock = {
    automationCondition: {
      deleteMany: jest.fn(),
    },
    automationAction: {
      deleteMany: jest.fn(),
    },
    automation: {
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock.automation.findUnique.mockResolvedValue({
      id: 'automation-1',
      name: 'A1',
      conditions: [],
      actions: [],
      dependents: [],
      executions: [],
    });

    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock),
    );

    txMock.automationCondition.deleteMany.mockResolvedValue({ count: 1 });
    txMock.automationAction.deleteMany.mockResolvedValue({ count: 1 });
    txMock.automation.update.mockResolvedValue({ id: 'automation-1', name: 'updated' });

    service = new AutomationsService(
      prismaMock as unknown as PrismaService,
      {} as DevicesService,
      {} as JobSchedulerService,
      {} as PlantAnalysisService,
    );
  });

  it('updates conditions/actions inside a prisma transaction', async () => {
    const payload = {
      name: 'updated',
      conditions: [],
      actions: [],
    } as unknown as UpdateAutomationDto;

    await expect(service.update('automation-1', payload)).resolves.toMatchObject({
      id: 'automation-1',
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txMock.automationCondition.deleteMany).toHaveBeenCalledWith({
      where: { automationId: 'automation-1' },
    });
    expect(txMock.automationAction.deleteMany).toHaveBeenCalledWith({
      where: { automationId: 'automation-1' },
    });
    expect(txMock.automation.update).toHaveBeenCalledTimes(1);
  });

  it('propagates failure when transactional update fails', async () => {
    txMock.automation.update.mockRejectedValueOnce(new Error('update failed'));
    const payload = {
      conditions: [],
      actions: [],
    } as unknown as UpdateAutomationDto;

    await expect(service.update('automation-1', payload)).rejects.toThrow('update failed');
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });
});
