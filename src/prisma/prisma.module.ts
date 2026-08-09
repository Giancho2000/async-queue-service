import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * @Global evita tener que importar PrismaModule en cada módulo de negocio:
 * PrismaService queda disponible para inyección en toda la app.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
