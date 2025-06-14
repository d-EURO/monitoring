import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import monitoringConfig from './config/monitoring.config';
import { DatabaseModule } from './database/database.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { EventsModule } from './events/events.module';
import { StatesModule } from './states/states.module';
import { AnalyticsModule } from './analytics/analytics.module';

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
    MonitoringModule,
    EventsModule,
    StatesModule,
    AnalyticsModule,
  ],
})
export class AppModule {}