import { Module } from '@nestjs/common';
import { DeuroEventsService } from './events.service';
import { DeuroStatesService } from './states.service';
import { DatabaseModule } from '../../database/database.module';
import { CommonModule } from '../../common/common.module';

@Module({
	imports: [DatabaseModule, CommonModule],
	providers: [DeuroEventsService, DeuroStatesService],
	exports: [DeuroEventsService, DeuroStatesService],
})
export class DeuroModule {}
