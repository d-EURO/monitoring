import { Module } from '@nestjs/common';
import { PositionController } from './position.controller';
import { PositionService } from './position.service';
import { BlockchainPositionsService } from './blockchain-positions.service';
import { DatabaseModule } from '../../database/database.module';
import { BlockchainModule } from '../../blockchain/blockchain.module';

@Module({
	imports: [DatabaseModule, BlockchainModule],
	controllers: [PositionController],
	providers: [PositionService, BlockchainPositionsService],
})
export class PositionModule {}
