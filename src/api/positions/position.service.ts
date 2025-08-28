import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { PositionStateDto } from '../../common/dto';

@Injectable()
export class PositionService {
	constructor(private readonly databaseService: DatabaseService) {}

	async getPositions(live?: string, collateral?: string): Promise<PositionStateDto[]> {
		let query = 'SELECT * FROM position_states WHERE 1=1';
		const params: any[] = [];

		if (collateral) {
			params.push(collateral);
			query += ` AND collateral_address = $${params.length}`;
		}

		if (live === 'true') {
			query += ' AND is_closed = false';
		}

		query += ' ORDER BY created DESC NULLS LAST';

		const result = await this.databaseService.query(query, params);
		const positions = result.rows;

		// Sort by created date - descending
		positions.sort((a, b) => (b.created || 0) - (a.created || 0));

		return positions.map(this.mapToDto);
	}

	private mapToDto(position: any): PositionStateDto {
		return {
			address: position.address,
			status: position.status,
			owner: position.owner,
			original: position.original,
			collateralAddress: position.collateralAddress,
			collateralBalance: position.collateralBalance.toString(),
			price: position.price.toString(),
			virtualPrice: position.virtualPrice.toString(),
			expiredPurchasePrice: position.expiredPurchasePrice.toString(),
			collateralRequirement: position.collateralRequirement.toString(),
			debt: position.debt.toString(),
			interest: position.interest.toString(),
			minimumCollateral: position.minimumCollateral.toString(),
			minimumChallengeAmount: position.minimumChallengeAmount.toString(),
			limit: position.limit.toString(),
			principal: position.principal.toString(),
			riskPremiumPPM: position.riskPremiumPPM,
			reserveContribution: position.reserveContribution,
			fixedAnnualRatePPM: position.fixedAnnualRatePPM,
			lastAccrual: position.lastAccrual.toString(),
			start: position.start.toString(),
			cooldown: position.cooldown.toString(),
			expiration: position.expiration.toString(),
			challengedAmount: position.challengedAmount.toString(),
			challengePeriod: position.challengePeriod.toString(),
			isClosed: position.isClosed,
			availableForMinting: position.availableForMinting.toString(),
			availableForClones: position.availableForClones.toString(),
			created: position.created,
			marketPrice: position.marketPrice?.toString(),
			collateralizationRatio: position.collateralizationRatio,
		};
	}
}
