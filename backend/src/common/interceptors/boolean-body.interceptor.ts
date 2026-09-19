import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Type,
  mixin,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Rechaza los booleanos que llegan como string (`{"readingsEnabled":"false"}`).
 *
 * El `ValidationPipe` global corre con `enableImplicitConversion`, así que para cuando el DTO se
 * valida el string ya se convirtió y `@IsBoolean()` lo deja pasar. Los interceptores corren
 * antes que los pipes: acá se mira el body crudo, el único lugar donde todavía se sabe que el
 * valor vino entre comillas. Un `"false"` mal convertido dejaría las lecturas prendidas creyendo
 * que se apagaron.
 *
 * Se usa como fábrica para nombrar las claves de cada endpoint:
 * `@UseInterceptors(BooleanBodyInterceptor('readingsEnabled', 'recordHistory'))`.
 */
export function BooleanBodyInterceptor(...keys: string[]): Type<NestInterceptor> {
  const watched = new Set(keys);

  @Injectable()
  class MixinBooleanBodyInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
      const body = context.switchToHttp().getRequest<{ body?: unknown }>().body;

      if (body && typeof body === 'object' && !Array.isArray(body)) {
        const invalid = Object.entries(body as Record<string, unknown>)
          .filter(([key, value]) => watched.has(key) && typeof value !== 'boolean')
          .map(([key, value]) => `${key} tiene que ser booleano, llegó ${typeof value}`);

        if (invalid.length) {
          throw new BadRequestException(invalid);
        }
      }

      return next.handle();
    }
  }

  return mixin(MixinBooleanBodyInterceptor);
}
