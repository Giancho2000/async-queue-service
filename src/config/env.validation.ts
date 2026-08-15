import * as Joi from 'joi';

/**
 * Esquema de validación de variables de entorno.
 *
 * Se valida al arrancar la app (fail-fast): si falta una variable obligatoria
 * o tiene un formato inválido, Nest no levanta y muestra el detalle del error.
 */
export const envValidationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  // PostgreSQL
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_DB: Joi.string().required(),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),

  // Redis
  REDIS_PASSWORD: Joi.string().required(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),

  //Queue attempts
  QUEUE_MAX_ATTEMPTS: Joi.number().integer().min(1).default(3),
  QUEUE_BACKOFF_DELAY: Joi.number().integer().min(0).default(5000),

  //BULL BOARD
  BULL_BOARD_USER: Joi.string().required(),
  BULL_BOARD_PASS: Joi.string().required(),
});
