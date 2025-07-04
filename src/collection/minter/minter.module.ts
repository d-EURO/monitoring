import { Module } from '@nestjs/common';
import { MinterEventsService } from './events.service';
import { MinterStatesService } from './states.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
	imports: [DatabaseModule],
	providers: [MinterEventsService, MinterStatesService],
	exports: [MinterEventsService, MinterStatesService],
})
export class MinterModule {}
