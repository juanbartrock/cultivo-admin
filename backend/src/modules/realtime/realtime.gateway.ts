import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { parseBooleanEnv, parseCorsOrigins } from '../../config/config.schema';
import { JwtPayload } from '../auth/types/authenticated-user.type';

interface SensorUpdateData {
  deviceId: string;
  sectionId: string | null;
  reading: Record<string, unknown>;
  timestamp: string;
}

interface DeviceUpdateData {
  deviceId: string;
  sectionId: string | null;
  status: Record<string, unknown>;
  timestamp: string;
}

// El backend vive detrás de Caddy, que sólo enruta `/api/*` hacia acá.
// El namespace por defecto (`/`) se mantiene; lo que cambia es la ruta HTTP del handshake.
@WebSocketGateway({
  path: '/api/socket.io',
  cors: {
    origin: parseCorsOrigins(process.env.CORS_ALLOWED_ORIGINS),
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    const allowGuest = this.isGuestAllowed();
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      if (!allowGuest) {
        this.rejectClient(client, 'No token provided');
        return;
      }

      client.data.authenticated = false;
      client.join('global');
      this.logger.warn(`Client ${client.id} connected as guest`);
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });

      client.data.userId = payload.sub;
      client.data.username = payload.username;
      client.data.authenticated = true;
      client.join('global');

      this.logger.log(
        `Client ${client.id} authenticated as user ${payload.username || payload.sub}`,
      );
    } catch (error) {
      if (!allowGuest) {
        this.rejectClient(client, 'Invalid token');
        return;
      }

      client.data.authenticated = false;
      client.join('global');

      const message = error instanceof Error ? error.message : 'Unknown auth error';
      this.logger.warn(`Client ${client.id} failed authentication, continuing as guest: ${message}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_section')
  handleJoinSection(client: Socket, sectionId: string) {
    const room = `section_${sectionId}`;
    client.join(room);
    this.logger.debug(`Client ${client.id} joined room ${room}`);
    return { event: 'joined', data: sectionId };
  }

  @SubscribeMessage('leave_section')
  handleLeaveSection(client: Socket, sectionId: string) {
    const room = `section_${sectionId}`;
    client.leave(room);
    this.logger.debug(`Client ${client.id} left room ${room}`);
    return { event: 'left', data: sectionId };
  }

  @SubscribeMessage('subscribe_device')
  handleSubscribeDevice(client: Socket, deviceId: string) {
    const room = `device_${deviceId}`;
    client.join(room);
    this.logger.debug(`Client ${client.id} subscribed to device ${deviceId}`);
    return { event: 'subscribed', data: deviceId };
  }

  @SubscribeMessage('unsubscribe_device')
  handleUnsubscribeDevice(client: Socket, deviceId: string) {
    const room = `device_${deviceId}`;
    client.leave(room);
    return { event: 'unsubscribed', data: deviceId };
  }

  emitSensorUpdate(
    deviceId: string,
    sectionId: string | null,
    reading: Record<string, unknown>,
  ) {
    const data: SensorUpdateData = {
      deviceId,
      sectionId,
      reading,
      timestamp: new Date().toISOString(),
    };

    if (sectionId) {
      this.server.to(`section_${sectionId}`).emit('sensor_update', data);
    }

    this.server.to(`device_${deviceId}`).emit('sensor_update', data);
    this.server.to('global').emit('sensor_update', data);
  }

  emitDeviceUpdate(
    deviceId: string,
    sectionId: string | null,
    status: Record<string, unknown>,
  ) {
    const data: DeviceUpdateData = {
      deviceId,
      sectionId,
      status,
      timestamp: new Date().toISOString(),
    };

    if (sectionId) {
      this.server.to(`section_${sectionId}`).emit('device_update', data);
    }

    this.server.to(`device_${deviceId}`).emit('device_update', data);
    this.server.to('global').emit('device_update', data);
  }

  emitAlert(alert: {
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    sectionId?: string;
  }) {
    if (alert.sectionId) {
      this.server.to(`section_${alert.sectionId}`).emit('alert', alert);
      return;
    }

    this.server.emit('alert', alert);
  }

  getStats() {
    const rooms = this.server?.sockets?.adapter?.rooms;
    const roomStats: Record<string, number> = {};

    if (rooms) {
      rooms.forEach((sockets, roomName) => {
        if (!roomName.includes('-')) {
          roomStats[roomName] = sockets.size;
        }
      });
    }

    return {
      connectedClients: this.server?.sockets?.sockets?.size || 0,
      rooms: roomStats,
      guestAllowed: this.isGuestAllowed(),
    };
  }

  private isGuestAllowed(): boolean {
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    if (nodeEnv === 'production') {
      return false;
    }

    const configuredValue = this.configService.get<string | boolean>('REALTIME_ALLOW_GUEST');
    return parseBooleanEnv(configuredValue, true);
  }

  private rejectClient(client: Socket, message: string) {
    this.logger.warn(`Client ${client.id} rejected: ${message}`);
    client.emit('error', { message });
    client.disconnect(true);
  }
}
