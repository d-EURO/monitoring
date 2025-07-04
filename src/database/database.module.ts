import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { EventPersistenceService } from './event-persistence.service';
import {
	PositionRepository,
	ChallengeRepository,
	EventRepository,
	MinterRepository,
	SystemStateRepository,
	CollateralRepository,
	BridgeRepository,
	DeuroRepository,
} from './repositories';

@Global()
@Module({
	providers: [
		DatabaseService,
		EventPersistenceService,
		PositionRepository,
		ChallengeRepository,
		EventRepository,
		MinterRepository,
		SystemStateRepository,
		CollateralRepository,
		BridgeRepository,
		DeuroRepository,
	],
	exports: [
		DatabaseService,
		EventPersistenceService,
		PositionRepository,
		ChallengeRepository,
		EventRepository,
		MinterRepository,
		SystemStateRepository,
		CollateralRepository,
		BridgeRepository,
		DeuroRepository,
	],
})
export class DatabaseModule {}
