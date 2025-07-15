import { Module } from '@nestjs/common';
import { CollateralStatesService } from './states.service';
import { DatabaseModule } from '../../database/database.module';
import { CommonModule } from '../../common/common.module';
import { BlockchainModule } from '../../blockchain/blockchain.module';

@Module({
	imports: [DatabaseModule, CommonModule, BlockchainModule],
	providers: [ CollateralStatesService],
	exports: [ CollateralStatesService],
})
export class CollateralModule {}
