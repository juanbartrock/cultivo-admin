import * as Joi from 'joi';

const NODE_ENV_VALUES = ['development', 'test', 'production'] as const;

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid(...NODE_ENV_VALUES)
    .default('development'),
  PORT: Joi.number().port().default(4000),

  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),

  JWT_SECRET: Joi.string().min(32).required(),
  ADMIN_USER: Joi.string().min(3).optional(),
  ADMIN_PASSWORD: Joi.string().min(6).optional(),

  CORS_ALLOWED_ORIGINS: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().trim().min(1).required(),
    otherwise: Joi.string().default('http://localhost:3001'),
  }),
  REALTIME_ALLOW_GUEST: Joi.boolean()
    .truthy('true')
    .truthy('1')
    .falsy('false')
    .falsy('0')
    .optional(),

  SUPABASE_URL: Joi.string().uri().optional().allow(''),
  SUPABASE_KEY: Joi.string().optional().allow(''),
  SUPABASE_BUCKET_NAME: Joi.string().optional().allow(''),

  MS_SONOFF_URL: Joi.string().uri().default('http://sonoff-service:3000'),
  MS_TUYA_URL: Joi.string().uri().default('http://tuya-service:3000'),
  MS_TAPO_URL: Joi.string().uri().default('http://tapo-service:3000'),
  MS_ESP32_URL: Joi.string().uri().default('http://esp32-service:3000'),
});

export function parseBooleanEnv(value: string | boolean | undefined, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;

  return fallback;
}

export function parseCorsOrigins(value: string | undefined): string[] {
  if (!value || value.trim().length === 0) {
    return ['http://localhost:3001'];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
