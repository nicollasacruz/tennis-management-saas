import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { SystemUserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TestWhatsappDto } from './dto/test-whatsapp.dto';
import { UpdateWhatsappConfigDto } from './dto/update-whatsapp-config.dto';
import { TenantWhatsappConfigService } from './tenant-whatsapp-config.service';
import { WhatsappQueueService } from './whatsapp-queue.service';
import { normalizeWhatsappNumber } from './whatsapp.helpers';

const TEST_DOCUMENT_URL =
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

@UseGuards(JwtAuthGuard)
@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappQueueService: WhatsappQueueService,
    private readonly whatsappConfigService: TenantWhatsappConfigService,
  ) {}

  @Get('config')
  getConfig() {
    return this.whatsappConfigService.getForCurrentTenant();
  }

  @Put('config')
  @UseGuards(RolesGuard)
  @Roles(SystemUserRole.ADMIN)
  updateConfig(@Body() dto: UpdateWhatsappConfigDto) {
    return this.whatsappConfigService.upsertForCurrentTenant(dto);
  }

  @Post('test')
  async test(@Body() dto: TestWhatsappDto) {
    const number = normalizeWhatsappNumber(dto.number);

    if (!number) {
      throw new BadRequestException(
        'Número de WhatsApp inválido. Use um número português móvel, por exemplo 910000001 ou +351910000001.',
      );
    }

    const job = await this.whatsappQueueService.enqueue(
      {
        number,
        type: 'document',
        url: dto.url ?? TEST_DOCUMENT_URL,
        filename: dto.filename ?? 'teste-whatsapp.pdf',
        caption: dto.caption ?? 'Teste de envio WhatsApp ESAF',
      },
      {
        referenceType: 'whatsapp:test',
      },
    );

    return {
      message: 'Envio de teste WhatsApp colocado na fila.',
      jobId: job.id,
      status: job.status,
      number,
      scheduledAt: job.scheduledAt,
    };
  }
}
