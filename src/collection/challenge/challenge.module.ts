import { Module } from '@nestjs/common';
import { ChallengeEventsService } from './events.service';
import { ChallengeStatesService } from './states.service';
import { DatabaseModule } from '../../database/database.module';
import { CommonModule } from '../../common/common.module';

@Module({
	imports: [DatabaseModule, CommonModule],
	providers: [ChallengeEventsService, ChallengeStatesService],
	exports: [ChallengeEventsService, ChallengeStatesService],
})
export class ChallengeModule {}
