import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class AppController {
  @Get()
  getHealth() {
    return {
      service: 'esaf-api',
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  }
}
