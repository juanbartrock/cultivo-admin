import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3001',
        credentials: true,
    },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(RealtimeGateway.name);

    @WebSocketServer()
    server: Server;

    constructor(private jwtService: JwtService) {}

    /**
     * Maneja conexiones de clientes con autenticación JWT
     */
    async handleConnection(client: Socket) {
        try {
            // Obtener token del handshake (auth.token o header Authorization)
            const token = 
                client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.replace('Bearer ', '');

            if (!token) {
                this.logger.warn(`Client ${client.id} connected without token`);
                // Permitir conexión sin auth pero con funcionalidad limitada
                // En producción estricta, descomentar las siguientes líneas:
                // client.emit('error', { message: 'No token provided' });
                // client.disconnect();
                // return;
                client.data.authenticated = false;
                client.join('global'); // Unir a room global para broadcast general
                return;
            }

            // Verificar JWT
            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET || 'SECRET_KEY_CAMBIAR_EN_PROD',
            });

            client.data.userId = payload.sub;
            client.data.username = payload.username;
            client.data.authenticated = true;

            // Unir a room global
            client.join('global');

            this.logger.log(`Client ${client.id} authenticated as user ${payload.username || payload.sub}`);
        } catch (error) {
            this.logger.warn(`Client ${client.id} failed authentication: ${error.message}`);
            // Permitir conexión sin auth pero marcar como no autenticado
            client.data.authenticated = false;
            client.join('global');
            // En producción estricta:
            // client.emit('error', { message: 'Invalid token' });
            // client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        this.logger.debug(`Client disconnected: ${client.id}`);
    }

    /**
     * Suscribirse a actualizaciones de una sección específica
     */
    @SubscribeMessage('join_section')
    handleJoinSection(client: Socket, sectionId: string) {
        const room = `section_${sectionId}`;
        client.join(room);
        this.logger.debug(`Client ${client.id} joined room ${room}`);
        return { event: 'joined', data: sectionId };
    }

    /**
     * Desuscribirse de actualizaciones de una sección
     */
    @SubscribeMessage('leave_section')
    handleLeaveSection(client: Socket, sectionId: string) {
        const room = `section_${sectionId}`;
        client.leave(room);
        this.logger.debug(`Client ${client.id} left room ${room}`);
        return { event: 'left', data: sectionId };
    }

    /**
     * Suscribirse a un dispositivo específico
     */
    @SubscribeMessage('subscribe_device')
    handleSubscribeDevice(client: Socket, deviceId: string) {
        const room = `device_${deviceId}`;
        client.join(room);
        this.logger.debug(`Client ${client.id} subscribed to device ${deviceId}`);
        return { event: 'subscribed', data: deviceId };
    }

    /**
     * Desuscribirse de un dispositivo
     */
    @SubscribeMessage('unsubscribe_device')
    handleUnsubscribeDevice(client: Socket, deviceId: string) {
        const room = `device_${deviceId}`;
        client.leave(room);
        return { event: 'unsubscribed', data: deviceId };
    }

    /**
     * Emite actualización de sensor a clientes suscritos a la sección
     * Si no hay sección, emite a todos (global)
     */
    emitSensorUpdate(deviceId: string, sectionId: string | null, reading: any) {
        const data = { deviceId, sectionId, reading, timestamp: new Date().toISOString() };

        // Emitir a la sección específica
        if (sectionId) {
            this.server.to(`section_${sectionId}`).emit('sensor_update', data);
        }

        // También emitir a suscriptores del dispositivo específico
        this.server.to(`device_${deviceId}`).emit('sensor_update', data);

        // Emitir a global para dashboards generales
        this.server.to('global').emit('sensor_update', data);
    }

    /**
     * Emite cambio de estado de dispositivo
     */
    emitDeviceUpdate(deviceId: string, sectionId: string | null, status: any) {
        const data = { deviceId, sectionId, status, timestamp: new Date().toISOString() };

        // Emitir a la sección específica
        if (sectionId) {
            this.server.to(`section_${sectionId}`).emit('device_update', data);
        }

        // También emitir a suscriptores del dispositivo específico
        this.server.to(`device_${deviceId}`).emit('device_update', data);

        // Emitir a global
        this.server.to('global').emit('device_update', data);
    }

    /**
     * Emite una alerta a todos los clientes conectados
     */
    emitAlert(alert: { type: string; message: string; severity: 'info' | 'warning' | 'error' | 'critical'; sectionId?: string }) {
        if (alert.sectionId) {
            this.server.to(`section_${alert.sectionId}`).emit('alert', alert);
        } else {
            this.server.emit('alert', alert);
        }
    }

    /**
     * Obtiene estadísticas del gateway
     */
    getStats() {
        const rooms = this.server?.sockets?.adapter?.rooms;
        const roomStats: Record<string, number> = {};

        if (rooms) {
            rooms.forEach((sockets, roomName) => {
                // Filtrar rooms que no son socket IDs individuales
                if (!roomName.includes('-')) {
                    roomStats[roomName] = sockets.size;
                }
            });
        }

        return {
            connectedClients: this.server?.sockets?.sockets?.size || 0,
            rooms: roomStats,
        };
    }
}
