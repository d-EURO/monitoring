import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import monitoringConfig from './config/monitoring.config';
import { DatabaseModule } from './database/database.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { CollectionModule } from './collection/collection.module';
import { PositionModule } from './api/positions/position.module';
import { ChallengeModule } from './api/challenges/challenge.module';
import { MinterModule } from './api/minters/minter.module';
import { DeuroModule } from './api/deuro/deuro.module';
import { CollateralModule } from './api/collateral/collateral.module';
import { HealthController } from './health/health.controller';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [monitoringConfig],
			envFilePath: ['.env.monitoring', '.env'],
		}),
		ScheduleModule.forRoot(),
		DatabaseModule,
		BlockchainModule,
		CollectionModule,
		PositionModule,
		ChallengeModule,
		MinterModule,
		DeuroModule,
		CollateralModule,
	],
	controllers: [HealthController],
})
export class AppModule {}
