import { registerAs } from '@nestjs/config';
import { IsString, IsNumber, IsOptional, IsUrl, Min, Max, validateSync } from 'class-validator';
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

	@Transform(({ value }) => parseInt(value))
	@IsNumber()
	@Min(10000)
	@IsOptional()
	monitorIntervalMs?: number = 300000; // 5min

	@IsOptional()
	@IsString()
	databaseUrl?: string;

	@IsOptional()
	@IsString()
	dbHost?: string;

	@Transform(({ value }) => parseInt(value))
	@IsOptional()
	@IsNumber()
	@Min(1)
	@Max(65535)
	dbPort?: number;

	@IsOptional()
	@IsString()
	dbName?: string;

	@IsOptional()
	@IsString()
	dbUser?: string;

	@IsOptional()
	@IsString()
	dbPassword?: string;

	@Transform(({ value }) => value === 'true')
	@IsOptional()
	dbSsl?: boolean;

	@Transform(({ value }) => parseInt(value))
	@IsOptional()
	@IsNumber()
	@Min(1)
	@Max(100)
	pgMaxClients?: number = 10;

	@IsOptional()
	@IsString()
	allowedOrigins?: string;

	@Transform(({ value }) => parseInt(value))
	@IsOptional()
	@IsNumber()
	@Min(60000) // Minimum 1 minute
	@Max(3600000) // Maximum 1 hour
	priceCacheTtlMs?: number = 300000; // Default 5 minutes
}

export default registerAs('monitoring', () => {
	validateRequiredEnvironmentVariables();

	const config = new MonitoringConfig();

	config.rpcUrl = process.env.RPC_URL;
	config.blockchainId = parseInt(process.env.BLOCKCHAIN_ID || '1');
	config.deploymentBlock = parseInt(process.env.DEPLOYMENT_BLOCK);
	config.monitorIntervalMs = parseInt(process.env.MONITOR_INTERVAL_MS || '300000');

	config.databaseUrl = process.env.DATABASE_URL;
	config.dbHost = process.env.DB_HOST;
	config.dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined;
	config.dbName = process.env.DB_NAME;
	config.dbUser = process.env.DB_USER;
	config.dbPassword = process.env.DB_PASSWORD;
	config.dbSsl = process.env.DB_SSL === 'true';
	config.pgMaxClients = process.env.PG_MAX_CLIENTS ? parseInt(process.env.PG_MAX_CLIENTS) : 10;
	config.allowedOrigins = process.env.ALLOWED_ORIGINS;
	config.priceCacheTtlMs = process.env.PRICE_CACHE_TTL_MS ? parseInt(process.env.PRICE_CACHE_TTL_MS) : 300000;

	validateConfiguration(config);

	return config;
});

function validateRequiredEnvironmentVariables(): void {
	const required = ['RPC_URL', 'DEPLOYMENT_BLOCK'];
	const missing = required.filter((key) => !process.env[key]);

	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
	}

	const hasDatabaseUrl = !!process.env.DATABASE_URL;
	const hasIndividualDbConfig = !!(process.env.DB_HOST && process.env.DB_NAME);

	if (!hasDatabaseUrl && !hasIndividualDbConfig) {
		throw new Error('Database configuration required: Either DATABASE_URL or DB_HOST+DB_NAME must be provided');
	}
}

function validateConfiguration(config: MonitoringConfig): void {
	const validatedConfig = plainToClass(MonitoringConfig, config);
	const errors = validateSync(validatedConfig, { skipMissingProperties: false });

	if (errors.length > 0) {
		const errorMessages = errors
			.map((error) => {
				const constraints = Object.values(error.constraints || {});
				return `${error.property}: ${constraints.join(', ')}`;
			})
			.join('\n');

		throw new Error(`Configuration validation failed:\n${errorMessages}`);
	}
}
