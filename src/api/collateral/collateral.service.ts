import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CollateralStateDto } from '../../common/dto';

@Injectable()
export class CollateralService {
	constructor(private readonly databaseService: DatabaseService) {}

	async getCollateralStates(): Promise<CollateralStateDto[]> {
		const result = await this.databaseService.query('SELECT * FROM collateral_states ORDER BY total_collateral DESC');

		return result.rows.map(this.mapToDto);
	}

	private mapToDto(state: any): CollateralStateDto {
		return {
			tokenAddress: state.token_address,
			symbol: state.symbol,
			decimals: state.decimals,
			totalCollateral: state.total_collateral,
			positionCount: state.position_count,
			totalLimit: state.total_limit,
			totalAvailableForMinting: state.total_available_for_minting,
			price: state.price ? state.price.toString() : '0',
		};
	}
}
