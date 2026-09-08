import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { SEED_RANGE_VALUES } from './stage-range.constants';

const RANGE_KEYS = new Set(Object.keys(SEED_RANGE_VALUES));

/**
 * Rechaza los rangos que llegan como string (`{"tempIdealMin":"18"}`).
 *
 * El `ValidationPipe` global corre con `enableImplicitConversion`, así que para cuando el DTO
 * se valida `"18"` ya es `18` y `@IsNumber()` lo deja pasar. Los interceptores corren antes que
 * los pipes: acá se mira el body crudo, que es el único lugar donde todavía se sabe que vino
 * entre comillas. Las claves que no son del DTO las sigue rechazando `forbidNonWhitelisted`.
 */
@Injectable()
export class NumericBodyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const body = context.switchToHttp().getRequest<{ body?: unknown }>().body;

    if (body && typeof body === 'object' && !Array.isArray(body)) {
      const invalid = Object.entries(body as Record<string, unknown>)
        .filter(([key, value]) => RANGE_KEYS.has(key) && typeof value !== 'number')
        .map(([key, value]) => `${key} tiene que ser un número, llegó ${typeof value}`);

      if (invalid.length) {
        throw new BadRequestException(invalid);
      }
    }

    return next.handle();
  }
}
