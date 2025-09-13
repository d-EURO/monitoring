import { Module } from '@nestjs/common';
import { MinterController } from './minter.controller';
import { MinterService } from './minter.service';
import { BlockchainMintersService } from './blockchain-minters.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
	imports: [DatabaseModule],
	controllers: [MinterController],
	providers: [MinterService, BlockchainMintersService],
	exports: [MinterService, BlockchainMintersService],
})
export class MinterModule {}
