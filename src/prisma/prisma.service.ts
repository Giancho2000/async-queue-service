import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/**
 * Envuelve el PrismaClient generado y lo integra al ciclo de vida de Nest.
 *
 * - Prisma 7 exige un driver adapter: usamos PrismaPg (paquete `pg`).
 * - onModuleInit  -> abre la conexión al arrancar (fail-fast si la BD no responde).
 * - onModuleDestroy -> cierra la conexión limpio en el graceful shutdown.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
    });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
