import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { PositionStateDto } from '../../common/dto/position.dto';

@Injectable()
export class PositionRepository {
	constructor(private readonly db: DatabaseService) {}

	async getAllPositions(): Promise<PositionStateDto[]> {
		return this.db.fetch(`
			SELECT * FROM position_states 
			WHERE block_number = (SELECT MAX(block_number) FROM position_states)
			ORDER BY position_address
		`);
	}

	async getLivePositions(): Promise<PositionStateDto[]> {
		return this.db.fetch(`
			SELECT * FROM position_states 
			WHERE is_closed = false 
				AND block_number = (SELECT MAX(block_number) FROM position_states)
			ORDER BY position_address
		`);
	}

	async getPositionsByCollateral(collateralAddress: string): Promise<PositionStateDto[]> {
		return this.db.fetch(
			`
			SELECT * FROM position_states 
			WHERE collateral_address = $1 
				AND block_number = (SELECT MAX(block_number) FROM position_states)
			ORDER BY position_address
		`,
			[collateralAddress.toLowerCase()]
		);
	}
}
