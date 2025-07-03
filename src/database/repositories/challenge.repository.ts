import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { ChallengeStateDto } from '../../common/dto/challenge.dto';

@Injectable()
export class ChallengeRepository {
	constructor(private readonly db: DatabaseService) {}

	async getAllChallenges(): Promise<ChallengeStateDto[]> {
		return this.db.fetch(`
			SELECT * FROM challenge_states 
			WHERE block_number = (SELECT MAX(block_number) FROM challenge_states)
			ORDER BY challenge_id
		`);
	}

	async getOpenChallenges(): Promise<ChallengeStateDto[]> {
		return this.db.fetch(`
			SELECT * FROM challenge_states 
			WHERE status NOT IN ('AVERTED', 'SUCCEEDED')
				AND block_number = (SELECT MAX(block_number) FROM challenge_states)
			ORDER BY challenge_id
		`);
	}
}