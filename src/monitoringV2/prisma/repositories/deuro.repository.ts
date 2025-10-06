import { Injectable, Logger } from '@nestjs/common';
import { PrismaClientService } from '../client.service';
import { DeuroState } from '../../types';

@Injectable()
export class DeuroRepository {
	private readonly logger = new Logger(DeuroRepository.name);

	constructor(private readonly prisma: PrismaClientService) {}

	async getState(): Promise<DeuroState | null> {
		const state = await this.prisma.deuroState.findUnique({
			where: { id: 1 },
		});

		if (!state) return null;

		return {
			deuroTotalSupply: BigInt(state.deuroTotalSupply.toFixed(0)),
			depsTotalSupply: BigInt(state.depsTotalSupply.toFixed(0)),
			equityShares: BigInt(state.equityShares.toFixed(0)),
			equityPrice: BigInt(state.equityPrice.toFixed(0)),
			reserveTotal: BigInt(state.reserveTotal.toFixed(0)),
			reserveMinter: BigInt(state.reserveMinter.toFixed(0)),
			reserveEquity: BigInt(state.reserveEquity.toFixed(0)),
			savingsTotal: BigInt(state.savingsTotal.toFixed(0)),
			savingsInterestCollected: BigInt(state.savingsInterestCollected.toFixed(0)),
			savingsRate: state.savingsRate,
			deuroLoss: BigInt(state.deuroLoss.toFixed(0)),
			deuroProfit: BigInt(state.deuroProfit.toFixed(0)),
			deuroProfitDistributed: BigInt(state.deuroProfitDistributed.toFixed(0)),
			frontendFeesCollected: BigInt(state.frontendFeesCollected.toFixed(0)),
			frontendsActive: state.frontendsActive,
			usdToEurRate: Number(state.usdToEurRate),
			usdToChfRate: Number(state.usdToChfRate),
			savingsInterestCollected24h: BigInt(state.savingsInterestCollected24h.toFixed(0)),
			savingsAdded24h: BigInt(state.savingsAdded24h.toFixed(0)),
			savingsWithdrawn24h: BigInt(state.savingsWithdrawn24h.toFixed(0)),
			equityTradeVolume24h: BigInt(state.equityTradeVolume24h.toFixed(0)),
			equityTradeCount24h: state.equityTradeCount24h,
			equityDelegations24h: state.equityDelegations24h,
			blockNumber: state.blockNumber,
			timestamp: state.timestamp,
		};
	}

	async upsertState(state: DeuroState): Promise<void> {
		try {
			await this.prisma.deuroState.upsert({
				where: { id: 1 },
				create: {
					id: 1,
					deuroTotalSupply: state.deuroTotalSupply.toString(),
					depsTotalSupply: state.depsTotalSupply.toString(),
					equityShares: state.equityShares.toString(),
					equityPrice: state.equityPrice.toString(),
					reserveTotal: state.reserveTotal.toString(),
					reserveMinter: state.reserveMinter.toString(),
					reserveEquity: state.reserveEquity.toString(),
					savingsTotal: state.savingsTotal.toString(),
					savingsInterestCollected: state.savingsInterestCollected.toString(),
					savingsRate: state.savingsRate,
					deuroLoss: state.deuroLoss.toString(),
					deuroProfit: state.deuroProfit.toString(),
					deuroProfitDistributed: state.deuroProfitDistributed.toString(),
					frontendFeesCollected: state.frontendFeesCollected.toString(),
					frontendsActive: state.frontendsActive,
					usdToEurRate: state.usdToEurRate,
					usdToChfRate: state.usdToChfRate,
					savingsInterestCollected24h: state.savingsInterestCollected24h.toString(),
					savingsAdded24h: state.savingsAdded24h.toString(),
					savingsWithdrawn24h: state.savingsWithdrawn24h.toString(),
					equityTradeVolume24h: state.equityTradeVolume24h.toString(),
					equityTradeCount24h: state.equityTradeCount24h,
					equityDelegations24h: state.equityDelegations24h,
					blockNumber: state.blockNumber,
					timestamp: state.timestamp,
				},
				update: {
					deuroTotalSupply: state.deuroTotalSupply.toString(),
					depsTotalSupply: state.depsTotalSupply.toString(),
					equityShares: state.equityShares.toString(),
					equityPrice: state.equityPrice.toString(),
					reserveTotal: state.reserveTotal.toString(),
					reserveMinter: state.reserveMinter.toString(),
					reserveEquity: state.reserveEquity.toString(),
					savingsTotal: state.savingsTotal.toString(),
					savingsInterestCollected: state.savingsInterestCollected.toString(),
					savingsRate: state.savingsRate,
					deuroLoss: state.deuroLoss.toString(),
					deuroProfit: state.deuroProfit.toString(),
					deuroProfitDistributed: state.deuroProfitDistributed.toString(),
					frontendFeesCollected: state.frontendFeesCollected.toString(),
					frontendsActive: state.frontendsActive,
					usdToEurRate: state.usdToEurRate,
					usdToChfRate: state.usdToChfRate,
					savingsInterestCollected24h: state.savingsInterestCollected24h.toString(),
					savingsAdded24h: state.savingsAdded24h.toString(),
					savingsWithdrawn24h: state.savingsWithdrawn24h.toString(),
					equityTradeVolume24h: state.equityTradeVolume24h.toString(),
					equityTradeCount24h: state.equityTradeCount24h,
					equityDelegations24h: state.equityDelegations24h,
					blockNumber: state.blockNumber,
					timestamp: state.timestamp,
				},
			});

			this.logger.debug('Successfully upserted dEURO state');
		} catch (error) {
			this.logger.error(`Failed to upsert dEURO state: ${error.message}`);
			throw error;
		}
	}
}
