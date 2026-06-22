import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'youvoca-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
