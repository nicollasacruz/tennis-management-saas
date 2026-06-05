import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

@Controller('health')
export class AppController {
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Get()
  getHealth() {
    return {
      service: 'clubtenispro-api',
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  }
}
