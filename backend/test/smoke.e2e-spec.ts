import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Connector } from '@prisma/client';
import * as request from 'supertest';
import { HealthController } from '../src/health.controller';
import { PrismaService } from '../src/prisma/prisma.service';
import { AutomationsController } from '../src/modules/automations/automations.controller';
import { AutomationsService } from '../src/modules/automations/automations.service';
import { JobProcessorService } from '../src/modules/automations/job-processor.service';
import { ContextBuilderService } from '../src/modules/ai-assistant/context-builder.service';
import { NotificationsController } from '../src/modules/notifications/notifications.controller';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { IoTGatewayService } from '../src/modules/devices/iot-gateway.service';

describe('HTTP Smoke', () => {
  let app: INestApplication;

  const automationsServiceMock = {
    findAll: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    setStatus: jest.fn(),
    evaluateConditions: jest.fn(),
    executeActions: jest.fn(),
    getExecutions: jest.fn(),
    getEffectivenessStats: jest.fn(),
    getPendingProposals: jest.fn(),
    approveProposal: jest.fn(),
    rejectProposal: jest.fn(),
    getPendingProposalsCount: jest.fn(),
  };

  const jobProcessorMock = {
    getJobs: jest.fn(),
    getStats: jest.fn(),
    getProcessorStatus: jest.fn(),
    getJobById: jest.fn(),
    retryJob: jest.fn(),
    cancelJob: jest.fn(),
  };

  const contextBuilderMock = {
    analyzeSystemCapabilities: jest.fn(),
  };

  const notificationsServiceMock = {
    findAll: jest.fn(),
    count: jest.fn(),
    getSummary: jest.fn(),
    countUnread: jest.fn(),
    create: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteMany: jest.fn(),
    deleteAllRead: jest.fn(),
    deleteOld: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    markAsRead: jest.fn(),
    delete: jest.fn(),
  };

  const prismaMock = {
    $queryRaw: jest.fn(),
  };

  const iotGatewayMock = {
    checkAllConnectorsHealth: jest.fn(),
  };

  const healthyConnectors: Record<Connector, boolean> = {
    [Connector.SONOFF]: true,
    [Connector.TUYA]: false,
    [Connector.TAPO]: false,
    [Connector.ESP32]: false,
    [Connector.VIRTUAL]: true,
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        AutomationsController,
        NotificationsController,
        HealthController,
      ],
      providers: [
        { provide: AutomationsService, useValue: automationsServiceMock },
        { provide: JobProcessorService, useValue: jobProcessorMock },
        { provide: ContextBuilderService, useValue: contextBuilderMock },
        { provide: NotificationsService, useValue: notificationsServiceMock },
        { provide: PrismaService, useValue: prismaMock },
        { provide: IoTGatewayService, useValue: iotGatewayMock },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    jobProcessorMock.getJobs.mockResolvedValue([
      { id: 'job-1', status: 'pending' },
    ]);

    notificationsServiceMock.getSummary.mockResolvedValue({
      unreadCount: 2,
      criticalCount: 0,
    });
    notificationsServiceMock.deleteOld.mockResolvedValue({ count: 3 });

    prismaMock.$queryRaw.mockResolvedValue([{ value: 1 }]);
    iotGatewayMock.checkAllConnectorsHealth.mockResolvedValue(healthyConnectors);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /api/health should return 200', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200);
  });

  it('GET /api/health/live should return 200', async () => {
    await request(app.getHttpServer()).get('/api/health/live').expect(200);
  });

  it('GET /api/health/ready should return 200 when DB and connectors are healthy', async () => {
    await request(app.getHttpServer()).get('/api/health/ready').expect(200);
  });

  it('GET /api/health/ready should return 503 when DB check fails', async () => {
    prismaMock.$queryRaw.mockRejectedValueOnce(new Error('db down'));

    await request(app.getHttpServer()).get('/api/health/ready').expect(503);
  });

  it('GET /api/automations/jobs should not collide with GET /api/automations/:id', async () => {
    await request(app.getHttpServer())
      .get('/api/automations/jobs?limit=5')
      .expect(200);

    expect(jobProcessorMock.getJobs).toHaveBeenCalledTimes(1);
    expect(automationsServiceMock.findById).not.toHaveBeenCalled();
  });

  it('DELETE /api/notifications/cleanup should not collide with DELETE /api/notifications/:id', async () => {
    await request(app.getHttpServer())
      .delete('/api/notifications/cleanup')
      .expect(200);

    expect(notificationsServiceMock.deleteOld).toHaveBeenCalledWith(30);
    expect(notificationsServiceMock.delete).not.toHaveBeenCalled();
  });

  it('GET /api/notifications/summary should not collide with GET /api/notifications/:id', async () => {
    await request(app.getHttpServer())
      .get('/api/notifications/summary')
      .expect(200);

    expect(notificationsServiceMock.getSummary).toHaveBeenCalledTimes(1);
    expect(notificationsServiceMock.findById).not.toHaveBeenCalled();
  });
});
