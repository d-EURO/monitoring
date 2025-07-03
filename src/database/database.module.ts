import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { EventPersistenceService } from './event-persistence.service';
import { PositionRepository, ChallengeRepository, EventRepository } from './repositories';

@Global()
@Module({
	providers: [
		DatabaseService, 
		EventPersistenceService,
		PositionRepository,
		ChallengeRepository,
		EventRepository,
	],
	exports: [
		DatabaseService, 
		EventPersistenceService,
		PositionRepository,
		ChallengeRepository,
		EventRepository,
	],
})
export class DatabaseModule {}
