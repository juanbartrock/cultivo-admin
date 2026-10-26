import { PrismaService } from '../../prisma/prisma.service';
import { DevicesService } from '../devices/devices.service';
import { JobSchedulerService } from './job-scheduler.service';
import { PlantAnalysisService } from './plant-analysis.service';
import { UpdateAutomationDto } from './dto/automation.dto';
import { AutomationsService, clockMinutesSince } from './automations.service';

describe('AutomationsService', () => {
  let service: AutomationsService;

  const prismaMock = {
    $transaction: jest.fn(),
    automation: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
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

  describe('intervalo de evaluación', () => {
    // Ciclo real del 2026-10-26: evaluada 3 s después del tick de las 11:40, el cron vuelve a las 11:45
    const evaluatedAt = new Date('2026-10-26T11:40:03.100Z');

    const automationRow = (overrides: Record<string, unknown>) => ({
      id: 'automation-1',
      name: 'Humedad bajo 75',
      triggerType: 'CONDITION',
      scheduleType: null,
      interval: 5,
      lastEvaluatedAt: evaluatedAt,
      daysOfWeek: [],
      startTime: null,
      endTime: null,
      activeStartTime: null,
      activeEndTime: null,
      intervalMinutes: null,
      specificTimes: [],
      ...overrides,
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('cuenta minutos de reloj, no la resta de timestamps', () => {
      expect(clockMinutesSince(evaluatedAt, new Date('2026-10-26T11:45:00.005Z'))).toBe(5);
      expect(clockMinutesSince(evaluatedAt, new Date('2026-10-26T11:44:59.999Z'))).toBe(4);
    });

    it('evalúa una CONDITION de 5 min en el tick de las 11:45, no a las 11:46', async () => {
      prismaMock.automation.findMany.mockResolvedValue([automationRow({})]);
      jest.useFakeTimers().setSystemTime(new Date('2026-10-26T11:44:00.005Z'));
      await expect(service.getAutomationsToEvaluate()).resolves.toHaveLength(0);

      jest.setSystemTime(new Date('2026-10-26T11:45:00.005Z'));
      await expect(service.getAutomationsToEvaluate()).resolves.toMatchObject([
        { id: 'automation-1', shouldExecute: true },
      ]);
    });

    it('ejecuta un SCHEDULED INTERVAL de 5 min en el tick de las 11:45', async () => {
      prismaMock.automation.findMany.mockResolvedValue([
        automationRow({ triggerType: 'SCHEDULED', scheduleType: 'INTERVAL', intervalMinutes: 5 }),
      ]);
      jest.useFakeTimers().setSystemTime(new Date('2026-10-26T11:44:00.005Z'));
      await expect(service.getAutomationsToEvaluate()).resolves.toHaveLength(0);

      jest.setSystemTime(new Date('2026-10-26T11:45:00.005Z'));
      await expect(service.getAutomationsToEvaluate()).resolves.toMatchObject([
        { id: 'automation-1', shouldExecute: true, actionType: 'on' },
      ]);
    });
  });
});
