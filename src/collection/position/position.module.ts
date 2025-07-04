import { Module } from '@nestjs/common';
import { PositionEventsService } from './events.service';
import { PositionStatesService } from './states.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
	imports: [DatabaseModule],
	providers: [PositionEventsService, PositionStatesService],
	exports: [PositionEventsService, PositionStatesService],
})
export class PositionModule {}
