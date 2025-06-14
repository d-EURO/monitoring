import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { StatesService } from './states.service';

@ApiTags('States')
@Controller('states')
export class StatesController {
  constructor(private readonly statesService: StatesService) {}

  @Get('deuro/current')
  @ApiOperation({ summary: 'Get current dEURO protocol state' })
  @ApiResponse({
    status: 200,
    description: 'Current dEURO state including total supply, reserve balance, etc.',
  })
  async getCurrentDeuroState() {
    return this.statesService.getCurrentDeuroState();
  }

  @Get('equity/current')
  @ApiOperation({ summary: 'Get current equity token state' })
  @ApiResponse({
    status: 200,
    description: 'Current equity state including price, total supply, etc.',
  })
  async getCurrentEquityState() {
    return this.statesService.getCurrentEquityState();
  }

  @Get('positions/current')
  @ApiOperation({ summary: 'Get current positions state' })
  @ApiResponse({
    status: 200,
    description: 'List of current open positions with their details',
  })
  async getCurrentPositionsState() {
    return this.statesService.getCurrentPositionsState();
  }

  @Get('daily/:stateType')
  @ApiOperation({ summary: 'Get daily state history for a specific component' })
  @ApiParam({ 
    name: 'stateType', 
    description: 'Type of state (deuro, equity, deps, savings, frontend, minting_hub)',
    enum: ['deuro', 'equity', 'deps', 'savings', 'frontend', 'minting_hub']
  })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to fetch (default: 30)', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Historical daily state snapshots',
  })
  async getDailyStateHistory(
    @Param('stateType') stateType: string,
    @Query('days') days: number = 30,
  ) {
    return this.statesService.getDailyStateHistory(stateType, days);
  }

  @Get('savings/current')
  @ApiOperation({ summary: 'Get current savings gateway state' })
  @ApiResponse({
    status: 200,
    description: 'Current savings state including rates and total savings',
  })
  async getCurrentSavingsState() {
    // Implementation will query savings_state_daily table
    return { message: 'Current savings state endpoint - to be implemented' };
  }

  @Get('challenges/active')
  @ApiOperation({ summary: 'Get active challenges' })
  @ApiResponse({
    status: 200,
    description: 'List of currently active challenges',
  })
  async getActiveChallenges() {
    // Implementation will query challenge_states table
    return { message: 'Active challenges endpoint - to be implemented' };
  }

  @Get('collateral/list')
  @ApiOperation({ summary: 'Get list of supported collateral types' })
  @ApiResponse({
    status: 200,
    description: 'List of collateral types with their details',
  })
  async getCollateralTypes() {
    // Implementation will query collateral_states table
    return { message: 'Collateral types endpoint - to be implemented' };
  }

  @Get('bridges/current')
  @ApiOperation({ summary: 'Get current bridge states' })
  @ApiResponse({
    status: 200,
    description: 'Current state of all stablecoin bridges',
  })
  async getCurrentBridgeStates() {
    // Implementation will query bridge_states table
    return { message: 'Bridge states endpoint - to be implemented' };
  }
}