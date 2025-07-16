import { Injectable } from '@nestjs/common';
import { DeuroStateRepository } from '../../database/repositories';
import { DeuroStateData, DeuroStateDto } from 'src/common/dto';

@Injectable()
export class DeuroService {
	constructor(private readonly deuroRepository: DeuroStateRepository) {}

	async getCurrentState(): Promise<DeuroStateDto | null> {
		const state = await this.deuroRepository.getDeuroState();
		if (!state) return null;

		return this.mapToDto(state);
	}

	private mapToDto(state: DeuroStateData): DeuroStateDto {
		return {
			deuroTotalSupply: state.deuro_total_supply.toString(),
			depsTotalSupply: state.deps_total_supply.toString(),
			equityShares: state.equity_shares.toString(),
			equityPrice: state.equity_price.toString(),
			reserveTotal: state.reserve_total.toString(),
			reserveMinter: state.reserve_minter.toString(),
			reserveEquity: state.reserve_equity.toString(),
			deuroVolume24h: state.deuro_volume_24h.toString(),
			deuroTransferCount24h: state.deuro_transfer_count_24h,
			deuroUniqueAddresses24h: state.deuro_unique_addresses_24h,
			depsVolume24h: state.deps_volume_24h.toString(),
			depsTransferCount24h: state.deps_transfer_count_24h,
			depsUniqueAddresses24h: state.deps_unique_addresses_24h,
			equityTradeVolume24h: state.equity_trade_volume_24h.toString(),
			equityTradeCount24h: state.equity_trade_count_24h,
			equityDelegations24h: state.equity_delegations_24h,
			savingsAdded24h: state.savings_added_24h.toString(),
			savingsWithdrawn24h: state.savings_withdrawn_24h.toString(),
			savingsInterestCollected24h: state.savings_interest_collected_24h.toString(),
			deuroLoss: state.deuro_loss.toString(),
			deuroProfit: state.deuro_profit.toString(),
			deuroProfitDistributed: state.deuro_profit_distributed.toString(),
			savingsTotal: state.savings_total.toString(),
			savingsInterestCollected: state.savings_interest_collected.toString(),
			savingsRate: state.savings_rate.toString(),
			frontendFeesCollected: state.frontend_fees_collected.toString(),
			frontendsActive: state.frontends_active,
			usdToEurRate: state.usd_to_eur_rate,
			usdToChfRate: state.usd_to_chf_rate,
			deuroMinted24h: state.deuro_minted_24h.toString(),
			deuroBurned24h: state.deuro_burned_24h.toString(),
		};
	}
}
