import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { EventPersistenceService } from './event-persistence.service';
import {
	PositionRepository,
	ChallengeRepository,
	MinterRepository,
	CollateralRepository,
	BridgeRepository,
	DeuroStateRepository,
} from './repositories';

@Global()
@Module({
	providers: [
		DatabaseService,
		EventPersistenceService,
		PositionRepository,
		ChallengeRepository,
		MinterRepository,
		CollateralRepository,
		BridgeRepository,
		DeuroStateRepository,
	],
	exports: [
		DatabaseService,
		EventPersistenceService,
		PositionRepository,
		ChallengeRepository,
		MinterRepository,
		CollateralRepository,
		BridgeRepository,
		DeuroStateRepository,
	],
})
export class DatabaseModule {}
