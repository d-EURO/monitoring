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
	monitorIntervalMs?: number = 300000; // 5 minutes default

	// Database configuration
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
}

export default registerAs('monitoring', () => {
	// Validate required environment variables first
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

	// Validate the configuration object
	validateConfiguration(config);

	return config;
});

function validateRequiredEnvironmentVariables(): void {
	const required = ['RPC_URL', 'DEPLOYMENT_BLOCK'];
	const missing = required.filter((key) => !process.env[key]);

	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
	}

	// Validate database configuration - either DATABASE_URL or individual DB settings
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
