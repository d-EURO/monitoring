import { registerAs } from '@nestjs/config';
import { IsString, IsNumber, IsOptional, IsUrl, Min, Max, validateSync, IsBoolean } from 'class-validator';
import { Transform, plainToClass } from 'class-transformer';

export class MonitoringConfig {
	@IsUrl()
	rpcUrl: string;

	@Transform(({ value }) => parseInt(value))
	@IsNumber()
	@Min(1)
	blockchainId: number;

	@Transform(({ value }) => parseInt(value))
	@IsNumber()
	@Min(1)
	deploymentBlock: number;

	@IsString()
	databaseUrl: string;

	@Transform(({ value }) => parseInt(value))
	@IsOptional()
	@IsNumber()
	@Min(1)
	@Max(100)
	pgMaxClients?: number;

	@IsOptional()
	@IsString()
	allowedOrigins?: string;

	@Transform(({ value }) => parseInt(value))
	@IsOptional()
	@IsNumber()
	@Min(60000)
	@Max(3600000)
	priceCacheTtlMs?: number;

	@Transform(({ value }) => parseInt(value))
	@IsOptional()
	@IsNumber()
	@Min(1)
	blockPerBatch?: number;

	@IsOptional()
	@IsString()
	telegramBotToken?: string;

	@IsOptional()
	@IsString()
	telegramChatId?: string;

	@IsOptional()
	@IsBoolean()
	telegramAlertsEnabled?: boolean;

	@IsOptional()
	@IsNumber()
	@Min(1)
	alertTimeframeHours?: number;
}

export default registerAs('monitoring', () => {
	const config = new MonitoringConfig();

	config.allowedOrigins = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';

	config.rpcUrl = process.env.RPC_URL;
	config.blockchainId = parseInt(process.env.BLOCKCHAIN_ID || '1');
	config.deploymentBlock = parseInt(process.env.DEPLOYMENT_BLOCK || '22088283');

	config.databaseUrl = process.env.DATABASE_URL;
	config.pgMaxClients = parseInt(process.env.PG_MAX_CLIENTS || '10');
	config.priceCacheTtlMs = parseInt(process.env.PRICE_CACHE_TTL_MS || '120000');
	config.blockPerBatch = parseInt(process.env.MAX_BLOCKS_PER_BATCH || '500');

	config.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
	config.telegramChatId = process.env.TELEGRAM_CHAT_ID || '';
	config.telegramAlertsEnabled = (process.env.TELEGRAM_ALERTS_ENABLED || 'false').toLowerCase() === 'true';
	config.alertTimeframeHours = parseInt(process.env.ALERT_TIMEFRAME_HOURS || '12');

	const errors = validateSync(plainToClass(MonitoringConfig, config));
	if (errors.length > 0) throw new Error(`Config validation failed: ${errors}`);

	return config;
});
