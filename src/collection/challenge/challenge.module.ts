import { Module } from '@nestjs/common';
import { ChallengeEventsService } from './events.service';
import { ChallengeStatesService } from './states.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
	imports: [DatabaseModule],
	providers: [ChallengeEventsService, ChallengeStatesService],
	exports: [ChallengeEventsService, ChallengeStatesService],
})
export class ChallengeModule {}
