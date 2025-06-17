import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { MetricsService } from '../monitoring/metrics.service';
import {
	DeuroTransferMetrics,
	DeuroMinterMetrics,
	DeuroProfitLossMetrics,
	DepsFlowMetrics,
	SavingsOverviewMetrics,
	EquityTradingMetrics,
	MintingPositionMetrics,
} from '../monitoring/metrics.dto';

@ApiTags('Monitoring')
@Controller('monitoring')
export class EventsController {
	constructor(private readonly metricsService: MetricsService) {}

	@Get('deuro/transfers')
	@ApiOperation({ summary: 'Get dEURO transfer monitoring metrics' })
	@ApiOkResponse({ type: DeuroTransferMetrics })
	async getDeuroTransferMetrics(): Promise<DeuroTransferMetrics> {
		return this.metricsService.getDeuroTransferMetrics();
	}

	@Get('deuro/minters')
	@ApiOperation({ summary: 'Get dEURO minter monitoring metrics' })
	@ApiOkResponse({ type: DeuroMinterMetrics })
	async getDeuroMinterMetrics(): Promise<DeuroMinterMetrics> {
		return this.metricsService.getDeuroMinterMetrics();
	}

	@Get('deuro/profit-loss')
	@ApiOperation({ summary: 'Get dEURO profit/loss monitoring metrics' })
	@ApiOkResponse({ type: DeuroProfitLossMetrics })
	async getDeuroProfitLossMetrics(): Promise<DeuroProfitLossMetrics> {
		return this.metricsService.getDeuroProfitLossMetrics();
	}

	@Get('deps/flows')
	@ApiOperation({ summary: 'Get DEPS wrap/unwrap flow metrics' })
	@ApiOkResponse({ type: DepsFlowMetrics })
	async getDepsFlowMetrics(): Promise<DepsFlowMetrics> {
		return this.metricsService.getDepsFlowMetrics();
	}

	@Get('savings/overview')
	@ApiOperation({ summary: 'Get savings monitoring overview' })
	@ApiOkResponse({ type: SavingsOverviewMetrics })
	async getSavingsOverviewMetrics(): Promise<SavingsOverviewMetrics> {
		return this.metricsService.getSavingsOverviewMetrics();
	}

	@Get('equity/trading')
	@ApiOperation({ summary: 'Get equity trading monitoring metrics' })
	@ApiOkResponse({ type: EquityTradingMetrics })
	async getEquityTradingMetrics(): Promise<EquityTradingMetrics> {
		return this.metricsService.getEquityTradingMetrics();
	}

	@Get('minting/positions')
	@ApiOperation({ summary: 'Get minting position monitoring metrics' })
	@ApiOkResponse({ type: MintingPositionMetrics })
	async getMintingPositionMetrics(): Promise<MintingPositionMetrics> {
		return this.metricsService.getMintingPositionMetrics();
	}
}
