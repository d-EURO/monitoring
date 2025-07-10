import { Module } from '@nestjs/common';
import { PositionEventsService } from './events.service';
import { PositionStatesService } from './states.service';
import { DatabaseModule } from '../../database/database.module';
import { CommonModule } from '../../common/common.module';

@Module({
	imports: [DatabaseModule, CommonModule],
	providers: [PositionEventsService, PositionStatesService],
	exports: [PositionEventsService, PositionStatesService],
})
export class PositionModule {}
