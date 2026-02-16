import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HttpRequest');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<{ method: string; originalUrl?: string; url?: string; ip?: string; headers: Record<string, unknown> }>();
    const response = http.getResponse<{ statusCode: number; setHeader: (name: string, value: string) => void }>();

    const incomingRequestId = request.headers['x-request-id'];
    const requestId =
      typeof incomingRequestId === 'string' && incomingRequestId.trim().length > 0
        ? incomingRequestId
        : randomUUID();

    response.setHeader('x-request-id', requestId);

    const startedAt = Date.now();
    const method = request.method;
    const path = request.originalUrl || request.url || '/';

    this.logger.log(
      JSON.stringify({
        event: 'http.request.started',
        requestId,
        method,
        path,
        ip: request.ip ?? 'unknown',
      }),
    );

    return next.handle().pipe(
      finalize(() => {
        const durationMs = Date.now() - startedAt;
        this.logger.log(
          JSON.stringify({
            event: 'http.request.completed',
            requestId,
            method,
            path,
            statusCode: response.statusCode,
            durationMs,
          }),
        );
      }),
    );
  }
}
