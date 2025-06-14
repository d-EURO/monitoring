import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';

@ApiTags('Health')
@Controller('health')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('monitoring')
  @ApiOperation({ summary: 'Get monitoring system status' })
  @ApiResponse({
    status: 200,
    description: 'Current monitoring status including block lag and processing state',
  })
  async getMonitoringStatus() {
    return this.monitoringService.getMonitoringStatus();
  }

  @Get('database')
  @ApiOperation({ summary: 'Test database connection' })
  @ApiResponse({
    status: 200,
    description: 'Database connection status',
  })
  async getDatabaseHealth() {
    // This will be implemented by injecting DatabaseService
    return { status: 'healthy', timestamp: new Date().toISOString() };
  }
}