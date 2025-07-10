import { Module } from '@nestjs/common';
import { MinterEventsService } from './events.service';
import { MinterStatesService } from './states.service';
import { DatabaseModule } from '../../database/database.module';
import { CommonModule } from '../../common/common.module';

@Module({
	imports: [DatabaseModule, CommonModule],
	providers: [MinterEventsService, MinterStatesService],
	exports: [MinterEventsService, MinterStatesService],
})
export class MinterModule {}
