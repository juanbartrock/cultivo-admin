import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';

@Global()
@Module({
    imports: [
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'SECRET_KEY_CAMBIAR_EN_PROD',
            signOptions: { expiresIn: '7d' },
        }),
    ],
    providers: [RealtimeGateway],
    exports: [RealtimeGateway],
})
export class RealtimeModule {}
