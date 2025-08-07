import { Injectable } from '@nestjs/common';
import { CollateralRepository } from '../../database/repositories';
import { CollateralState, CollateralStateDto } from '../../common/dto';

@Injectable()
export class CollateralService {
	constructor(private readonly collateralRepository: CollateralRepository) {}

	async getAllCollateral(): Promise<CollateralStateDto[]> {
		const collaterals = await this.collateralRepository.getAllCollateralStates();
		
		// Sort by totalLimit, then TVL - descending
		collaterals.sort((a, b) => {
			const limitDiff = BigInt(b.totalLimit) - BigInt(a.totalLimit);
			if (limitDiff !== 0n) return limitDiff > 0n ? 1 : -1;
	
			const tvlA = Number(a.totalCollateral) * Number(a.price);
			const tvlB = Number(b.totalCollateral) * Number(b.price);
			return tvlB - tvlA;
		});
		
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