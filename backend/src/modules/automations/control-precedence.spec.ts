import { ActionType, AutomationStatus, ConditionOperator, ExecutionStatus, TriggerType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DevicesService } from '../devices/devices.service';
import { JobSchedulerService } from './job-scheduler.service';
import { PlantAnalysisService } from './plant-analysis.service';
import { AutomationsService } from './automations.service';

/**
 * Precedencia de controles automáticos (2026-10-27): la humedad prima sobre la renovación
 * horaria y lo manual prima sobre todo mientras dura la retención. Ids reales de Floración.
 */
describe('AutomationsService · precedencia de controles', () => {
  const EXTRACTOR = 'f43e2503-2ba1-4c63-ae85-c0e586f06cfc';
  const SONOFF = 'c04963d5-c091-426f-9618-4e61ac8c015a';
  const RENOVACION = 'ee38232c-029c-4e8f-af06-7a3c1482b5cf';
  const PRENDER = 'd869eebd-a199-4572-aaab-72cea13480ae';

  const prender = {
    id: PRENDER,
    name: 'Extractor por humedad: prender',
    priority: 10,
    status: AutomationStatus.ACTIVE,
    triggerType: TriggerType.CONDITION,
    daysOfWeek: [],
    startTime: null,
    endTime: null,
    conditions: [
      {
        id: 'cond-prender',
        deviceId: SONOFF,
        property: 'humidity',
        operator: ConditionOperator.GREATER_THAN,
        value: 75,
        logicOperator: 'AND',
      },
    ],
    actions: [{ id: 'act-prender', deviceId: EXTRACTOR, actionType: ActionType.TURN_ON }],
  };

  const renovacion = {
    id: RENOVACION,
    name: 'Renovación de aire',
    priority: 0,
    status: AutomationStatus.ACTIVE,
    triggerType: TriggerType.SCHEDULED,
    actionDuration: 5,
    plantIds: [],
    conditions: [],
    actions: [{ id: 'act-renovacion', deviceId: EXTRACTOR, actionType: ActionType.TURN_ON, duration: null, delayMinutes: 0 }],
  };

  const noHold = { active: false, holdUntil: null, remainingMinutes: 0, action: null, setAt: null, holdMinutes: 60, deviceId: EXTRACTOR };
  const hold = { ...noHold, active: true, holdUntil: '2026-10-27T16:00:00.000Z', remainingMinutes: 42, action: 'on' };

  const prismaMock = {
    automation: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    automationExecution: { create: jest.fn(), update: jest.fn() },
  };
  const devicesMock = { getControlScope: jest.fn(), getDeviceStatus: jest.fn(), controlDevice: jest.fn() };
  const jobSchedulerMock = { scheduleDeviceOff: jest.fn() };

  let service: AutomationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    devicesMock.getControlScope.mockResolvedValue({ deviceIds: [EXTRACTOR], manualHold: noHold });
    devicesMock.getDeviceStatus.mockResolvedValue({ status: { online: true, humidity: 80 } });
    devicesMock.controlDevice.mockResolvedValue({ result: { success: true } });
    prismaMock.automation.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(where.id === PRENDER ? prender : where.id === RENOVACION ? renovacion : null),
    );
    prismaMock.automation.findMany.mockResolvedValue([prender]);
    prismaMock.automationExecution.create.mockResolvedValue({ id: 'exec-1' });

    service = new AutomationsService(
      prismaMock as unknown as PrismaService,
      devicesMock as unknown as DevicesService,
      jobSchedulerMock as unknown as JobSchedulerService,
      {} as PlantAnalysisService,
    );
  });

  describe('checkAutomatedControl', () => {
    it('saltea el apagado de "Renovación de aire" si "prender" tiene la humedad arriba de 75', async () => {
      const verdict = await service.checkAutomatedControl({
        deviceId: EXTRACTOR,
        action: 'off',
        automationId: RENOVACION,
      });

      expect(verdict).toMatchObject({ allowed: false, kind: 'PRIORITY', byAutomationId: PRENDER });
      expect(prismaMock.automation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: AutomationStatus.ACTIVE,
            priority: { gt: 0 },
            id: { not: RENOVACION },
            actions: {
              some: {
                deviceId: { in: [EXTRACTOR] },
                actionType: { in: [ActionType.TURN_ON, ActionType.TRIGGER_IRRIGATION] },
              },
            },
          }),
        }),
      );
      expect(devicesMock.getDeviceStatus).toHaveBeenCalledWith(SONOFF);
    });

    it('deja pasar el apagado cuando la condición de mayor prioridad no se cumple', async () => {
      devicesMock.getDeviceStatus.mockResolvedValue({ status: { online: true, humidity: 70 } });

      await expect(
        service.checkAutomatedControl({ deviceId: EXTRACTOR, action: 'off', automationId: RENOVACION }),
      ).resolves.toEqual({ allowed: true });
    });

    it('sin lectura del sensor la condición no se da por cumplida', async () => {
      devicesMock.getDeviceStatus.mockResolvedValue({ status: { online: false, readingsPaused: true } });

      await expect(
        service.checkAutomatedControl({ deviceId: EXTRACTOR, action: 'off', automationId: RENOVACION }),
      ).resolves.toEqual({ allowed: true });
    });

    it('la retención manual corta antes de mirar prioridades', async () => {
      devicesMock.getControlScope.mockResolvedValue({ deviceIds: [EXTRACTOR], manualHold: hold });

      const verdict = await service.checkAutomatedControl({
        deviceId: EXTRACTOR,
        action: 'on',
        automationId: PRENDER,
        priority: 10,
      });

      expect(verdict).toMatchObject({ allowed: false, kind: 'MANUAL_HOLD', holdUntil: hold.holdUntil });
      expect((verdict as { reason: string }).reason).toContain('quedan 42 min');
      expect(prismaMock.automation.findMany).not.toHaveBeenCalled();
    });

    it('una automatización de prioridad mayor fuera de su horario no gana', async () => {
      prismaMock.automation.findMany.mockResolvedValue([{ ...prender, daysOfWeek: [9] }]);

      await expect(
        service.checkAutomatedControl({ deviceId: EXTRACTOR, action: 'off', automationId: RENOVACION }),
      ).resolves.toEqual({ allowed: true });
      expect(devicesMock.getDeviceStatus).not.toHaveBeenCalled();
    });
  });

  describe('executeActions', () => {
    it('saltea el TURN_ON en retención: no controla, no agenda el apagado y registra el motivo', async () => {
      devicesMock.getControlScope.mockResolvedValue({ deviceIds: [EXTRACTOR], manualHold: hold });

      const result = await service.executeActions(RENOVACION, true);

      expect(devicesMock.controlDevice).not.toHaveBeenCalled();
      expect(jobSchedulerMock.scheduleDeviceOff).not.toHaveBeenCalled();
      expect(result).toMatchObject({ success: true, skipped: true });
      expect(result.results[0]).toMatchObject({ skipped: true, skipKind: 'MANUAL_HOLD' });

      const update = prismaMock.automationExecution.update.mock.calls[0][0];
      expect(update.data.status).toBe(ExecutionStatus.CANCELLED);
      expect(update.data.errorMessage).toMatch(/^Salteada: Retención manual hasta/);
      // lastEvaluatedAt avanza igual: si no, el INTERVAL reintentaría cada minuto
      expect(prismaMock.automation.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: RENOVACION } }),
      );
    });

    it('sin bloqueo prende y agenda el apagado a los 5 min como siempre', async () => {
      prismaMock.automation.findMany.mockResolvedValue([]);

      const result = await service.executeActions(RENOVACION, true);

      expect(devicesMock.controlDevice).toHaveBeenCalledWith(EXTRACTOR, 'on');
      expect(jobSchedulerMock.scheduleDeviceOff).toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: EXTRACTOR, delayMinutes: 5, automationId: RENOVACION }),
      );
      expect(result).toMatchObject({ success: true, skipped: false });
      expect(prismaMock.automationExecution.update.mock.calls[0][0].data).toMatchObject({
        status: ExecutionStatus.COMPLETED,
        errorMessage: null,
      });
    });
  });
});
