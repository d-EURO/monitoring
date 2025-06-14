import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { EventsService } from './events.service';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('transfers')
  @ApiOperation({ summary: 'Get dEURO transfer events' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO string)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of results', type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of dEURO transfer events',
  })
  async getTransferEvents(
    @Query('from') fromDate?: string,
    @Query('to') toDate?: string,
    @Query('limit') limit: number = 100,
  ) {
    return this.eventsService.getTransferEvents(fromDate, toDate, limit);
  }

  @Get('minting')
  @ApiOperation({ summary: 'Get minting-related events' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO string)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of results', type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of minting events including position opened events',
  })
  async getMintingEvents(
    @Query('from') fromDate?: string,
    @Query('to') toDate?: string,
    @Query('limit') limit: number = 100,
  ) {
    // Implementation will query minting_hub_position_opened_events table
    return { message: 'Minting events endpoint - to be implemented' };
  }

  @Get('equity')
  @ApiOperation({ summary: 'Get equity trade events' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO string)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of results', type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of equity trade events',
  })
  async getEquityEvents(
    @Query('from') fromDate?: string,
    @Query('to') toDate?: string,
    @Query('limit') limit: number = 100,
  ) {
    // Implementation will query equity_trade_events table
    return { message: 'Equity events endpoint - to be implemented' };
  }

  @Get('savings')
  @ApiOperation({ summary: 'Get savings-related events' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO string)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of results', type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of savings events (saved, withdrawn, interest collected)',
  })
  async getSavingsEvents(
    @Query('from') fromDate?: string,
    @Query('to') toDate?: string,
    @Query('limit') limit: number = 100,
  ) {
    // Implementation will query savings-related tables
    return { message: 'Savings events endpoint - to be implemented' };
  }

  @Get('challenges')
  @ApiOperation({ summary: 'Get challenge-related events' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO string)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of results', type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of challenge events',
  })
  async getChallengeEvents(
    @Query('from') fromDate?: string,
    @Query('to') toDate?: string,
    @Query('limit') limit: number = 100,
  ) {
    // Implementation will query challenge-related tables
    return { message: 'Challenge events endpoint - to be implemented' };
  }
}