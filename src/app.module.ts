import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import monitoringConfig from './config/monitoring.config';
import { MonitoringV2Module } from './monitoringV2/monitoring-v2.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [monitoringConfig],
			envFilePath: ['.env.monitoring', '.env'],
		}),
		ScheduleModule.forRoot(),
		MonitoringV2Module,
	],
	controllers: [],
})
export class AppModule {}
