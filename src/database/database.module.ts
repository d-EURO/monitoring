import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { EventPersistenceService } from './event-persistence.service';

@Global()
@Module({
	providers: [DatabaseService, EventPersistenceService],
	exports: [DatabaseService, EventPersistenceService],
})
export class DatabaseModule {}
