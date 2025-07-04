import { Module } from '@nestjs/common';
import { MintersEventsService } from './events.service';
import { MintersStatesService } from './states.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
	imports: [DatabaseModule],
	providers: [MintersEventsService, MintersStatesService],
	exports: [MintersEventsService, MintersStatesService],
})
export class MintersModule {}
