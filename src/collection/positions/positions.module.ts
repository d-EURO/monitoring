import { Module } from '@nestjs/common';
import { PositionsEventsService } from './events.service';
import { PositionsStatesService } from './states.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
	imports: [DatabaseModule],
	providers: [PositionsEventsService, PositionsStatesService],
	exports: [PositionsEventsService, PositionsStatesService],
})
export class PositionsModule {}
