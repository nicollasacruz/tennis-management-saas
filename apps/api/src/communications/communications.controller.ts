import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommunicationsService } from './communications.service';

@UseGuards(JwtAuthGuard)
@Controller('communications/jobs')
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Get()
  list(
    @Query('channel') channel?: string,
    @Query('status') status?: string,
  ) {
    return this.communicationsService.list(channel, status);
  }

  @Post(':channel/:id/retry')
  retry(@Param('channel') channel: string, @Param('id') id: string) {
    return this.communicationsService.retry(channel, id);
  }
}
