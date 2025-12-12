
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    // Example method to broadcast device updates
    emitDeviceUpdate(deviceId: string, status: any) {
        this.server.emit('device_update', { deviceId, status });
    }

    // Example method to broadcast sensor readings
    emitSensorUpdate(deviceId: string, reading: any) {
        this.server.emit('sensor_update', { deviceId, reading });
    }

    @SubscribeMessage('subscribe_device')
    handleSubscribeDevice(client: Socket, deviceId: string) {
        client.join(`device_${deviceId}`);
        return { event: 'subscribed', data: deviceId };
    }
}
