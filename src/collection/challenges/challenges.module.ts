import { Module } from '@nestjs/common';
import { ChallengesEventsService } from './events.service';
import { ChallengesStatesService } from './states.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
	imports: [DatabaseModule],
	providers: [ChallengesEventsService, ChallengesStatesService],
	exports: [ChallengesEventsService, ChallengesStatesService],
})
export class ChallengesModule {}
