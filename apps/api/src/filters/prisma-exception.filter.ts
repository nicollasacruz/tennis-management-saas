import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

const PRISMA_ERROR_MAP: Record<string, { status: number; message: (meta: unknown) => string }> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    message: (meta: unknown) => {
      const target = Array.isArray((meta as Record<string, unknown>)?.target)
        ? ((meta as Record<string, unknown>).target as string[]).join(', ')
        : 'desconhecido';
      return `Já existe um registo com os mesmos valores (${target}).`;
    },
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    message: () => 'Registo não encontrado.',
  },
  P2003: {
    status: HttpStatus.BAD_REQUEST,
    message: (meta: unknown) => {
      const field = ((meta as Record<string, unknown>)?.field_name as string) ?? 'desconhecido';
      return `Violação de integridade referencial (${field}).`;
    },
  },
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const handler = PRISMA_ERROR_MAP[exception.code];

    if (handler) {
      const status = handler.status;
      const message = handler.message(exception.meta);

      this.logger.warn(`Erro Prisma ${exception.code}: ${message}`);
      response.status(status).json({ statusCode: status, message });
      return;
    }

    this.logger.error(
      `Erro Prisma não tratado (${exception.code}): ${exception.message}`,
      exception.stack,
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ocorreu um erro inesperado no servidor.',
    });
  }
}
