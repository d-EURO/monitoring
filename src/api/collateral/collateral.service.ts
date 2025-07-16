import { Injectable } from '@nestjs/common';
import { CollateralRepository } from '../../database/repositories';
import { CollateralState, CollateralStateDto } from '../../common/dto';

@Injectable()
export class CollateralService {
	constructor(private readonly collateralRepository: CollateralRepository) {}

	async getAllCollateral(): Promise<CollateralStateDto[]> {
		const collaterals = await this.collateralRepository.getAllCollateralStates();
		return collaterals.map(this.mapToDto);
	}

	private mapToDto(collateral: CollateralState): CollateralStateDto {
		return {
			tokenAddress: collateral.tokenAddress,
			symbol: collateral.symbol,
			decimals: collateral.decimals,
			totalCollateral: collateral.totalCollateral,
			positionCount: collateral.positionCount,
			totalLimit: collateral.totalLimit,
			totalAvailableForMinting: collateral.totalAvailableForMinting,
			price: collateral.price,
		};
	}
}