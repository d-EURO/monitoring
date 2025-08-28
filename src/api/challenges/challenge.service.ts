import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ChallengeStateDto } from '../../common/dto';

@Injectable()
export class ChallengeService {
	constructor(private readonly databaseService: DatabaseService) {}

	async getChallenges(open?: string): Promise<ChallengeStateDto[]> {
		let query = 'SELECT * FROM challenge_states';
		const params: any[] = [];

		if (open === 'true') {
			query += ' WHERE status = $1';
			params.push('ACTIVE');
		}

		query += ' ORDER BY start_timestamp DESC';

		const result = await this.databaseService.query(query, params);
		const challenges = result.rows;

		return challenges.map(this.mapToDto);
	}

	private mapToDto(challenge: any): ChallengeStateDto {
		return {
			id: challenge.challenge_id,
			challenger: challenge.challenger_address,
			position: challenge.position_address,
			positionOwner: challenge.position_owner_address,
			start: challenge.start_timestamp,
			initialSize: challenge.initial_size,
			size: challenge.size,
			collateralAddress: challenge.collateral_address,
			liqPrice: challenge.liq_price,
			phase: challenge.phase,
			status: challenge.status,
			currentPrice: challenge.current_price,
		};
	}
}
