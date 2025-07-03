import { Module } from '@nestjs/common';
import { BridgeController } from './bridge.controller';
import { BridgeService } from './bridge.service';
import { MinterModule } from '../minters/minter.module';
import { BlockchainModule } from '../../blockchain/blockchain.module';

@Module({
	imports: [MinterModule, BlockchainModule],
	controllers: [BridgeController],
	providers: [BridgeService],
	exports: [BridgeService],
})
export class BridgeModule {}