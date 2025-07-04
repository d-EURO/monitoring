import { Module } from '@nestjs/common';
import { MinterController } from './minter.controller';
import { MinterService } from './minter.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
	imports: [DatabaseModule],
	controllers: [MinterController],
	providers: [MinterService],
	exports: [MinterService],
})
export class MinterModule {}
