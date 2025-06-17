import { Controller, Get, Query, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { StatesService } from './states.service';
import { DeuroStateDto } from '../common/dto/deuro.dto';
import { EquityStateDto } from '../common/dto/equity.dto';
import { DepsStateDto } from '../common/dto/depsWrapper.dto';
import { SavingsStateDto } from '../common/dto/savingsGateway.dto';
import { FrontendStateDto } from '../common/dto/frontendGateway.dto';
import { PositionStateDto } from '../common/dto/position.dto';
import { MintingHubStateDto } from '../common/dto/mintingHub.dto';
import { ChallengeStateDto } from '../common/dto/challenge.dto';
import { CollateralStateDto } from '../common/dto/collateral.dto';
import { BridgeStateDto } from '../common/dto/stablecoinBridge.dto';
import { StateHistoryDto } from '../common/dto/system.dto';

@ApiTags('States')
@Controller('states')
export class StatesController {
	private readonly logger = new Logger(StatesController.name);

	constructor(private readonly statesService: StatesService) {}

	@Get('deuro/current')
	@ApiOperation({ summary: 'Get current dEURO protocol state' })
	@ApiOkResponse({ type: DeuroStateDto })
	async getCurrentDeuroState(): Promise<DeuroStateDto> {
		return this.statesService.getCurrentDeuroState() as Promise<DeuroStateDto>;
	}

	@Get('equity/current')
	@ApiOperation({ summary: 'Get current equity token state' })
	@ApiOkResponse({ type: EquityStateDto })
	async getCurrentEquityState(): Promise<EquityStateDto> {
		return this.statesService.getCurrentEquityState() as Promise<EquityStateDto>;
	}

	@Get('deps/current')
	@ApiOperation({ summary: 'Get current DEPS wrapper state' })
	@ApiOkResponse({ type: DepsStateDto })
	async getCurrentDepsState(): Promise<DepsStateDto> {
		return this.statesService.getCurrentDepsState() as Promise<DepsStateDto>;
	}

	@Get('positions/current')
	@ApiOperation({ summary: 'Get current positions state' })
	@ApiOkResponse({ type: [PositionStateDto] })
	async getCurrentPositionsState(): Promise<PositionStateDto[]> {
		return this.statesService.getCurrentPositionsState() as Promise<PositionStateDto[]>;
	}

	@Get('savings/current')
	@ApiOperation({ summary: 'Get current savings gateway state' })
	@ApiOkResponse({ type: SavingsStateDto })
	async getCurrentSavingsState(): Promise<SavingsStateDto> {
		return this.statesService.getCurrentSavingsState() as Promise<SavingsStateDto>;
	}

	@Get('frontend/current')
	@ApiOperation({ summary: 'Get current frontend gateway state' })
	@ApiOkResponse({ type: FrontendStateDto })
	async getCurrentFrontendState(): Promise<FrontendStateDto> {
		return this.statesService.getCurrentFrontendState() as Promise<FrontendStateDto>;
	}

	@Get('minting-hub/current')
	@ApiOperation({ summary: 'Get current minting hub state' })
	@ApiOkResponse({ type: MintingHubStateDto })
	async getCurrentMintingHubState(): Promise<MintingHubStateDto> {
		return this.statesService.getCurrentMintingHubState() as Promise<MintingHubStateDto>;
	}

	@Get('daily/:stateType')
	@ApiOperation({ summary: 'Get daily state history for a specific component' })
	@ApiParam({
		name: 'stateType',
		description: 'Type of state (deuro, equity, deps, savings, frontend, minting_hub, position, challenge, collateral, bridge)',
		enum: ['deuro', 'equity', 'deps', 'savings', 'frontend', 'minting_hub', 'position', 'challenge', 'collateral', 'bridge'],
	})
	@ApiQuery({ name: 'days', required: false, description: 'Number of days to fetch (default: 30)', type: Number })
	@ApiOkResponse({ type: StateHistoryDto, isArray: true })
	async getDailyStateHistory(@Param('stateType') stateType: string, @Query('days') days: number = 30): Promise<StateHistoryDto[]> {
		try {
			return this.statesService.getDailyStateHistory(stateType, days) as Promise<StateHistoryDto[]>;
		} catch (error) {
			this.logger.error(`Failed to get daily state history for ${stateType}`, error);
			throw error;
		}
	}

	@Get('challenges/active')
	@ApiOperation({ summary: 'Get active challenges' })
	@ApiOkResponse({ type: [ChallengeStateDto] })
	async getActiveChallenges(): Promise<ChallengeStateDto[]> {
		try {
			return this.statesService.getActiveChallenges() as Promise<ChallengeStateDto[]>;
		} catch (error) {
			this.logger.error('Failed to get active challenges', error);
			throw error;
		}
	}

	@Get('collateral/current')
	@ApiOperation({ summary: 'Get current collateral states' })
	@ApiOkResponse({ type: [CollateralStateDto] })
	async getCurrentCollateralStates(): Promise<CollateralStateDto[]> {
		try {
			return this.statesService.getCurrentCollateralStates() as Promise<CollateralStateDto[]>;
		} catch (error) {
			this.logger.error('Failed to get current collateral states', error);
			throw error;
		}
	}

	@Get('bridges/current')
	@ApiOperation({ summary: 'Get current bridge states' })
	@ApiOkResponse({ type: [BridgeStateDto] })
	async getCurrentBridgeStates(): Promise<BridgeStateDto[]> {
		try {
			return this.statesService.getCurrentBridgeStates() as Promise<BridgeStateDto[]>;
		} catch (error) {
			this.logger.error('Failed to get current bridge states', error);
			throw error;
		}
	}
}
