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


	@IsString()
	databaseUrl: string;

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
	priceCacheTtlMs?: number = 120000; // Default 2 minutes
}

export default registerAs('monitoring', () => {
	validateRequiredEnvironmentVariables();

	const config = new MonitoringConfig();

	config.rpcUrl = process.env.RPC_URL;
	config.blockchainId = parseInt(process.env.BLOCKCHAIN_ID || '1');
	config.deploymentBlock = parseInt(process.env.DEPLOYMENT_BLOCK);

	config.databaseUrl = process.env.DATABASE_URL;
	config.pgMaxClients = process.env.PG_MAX_CLIENTS ? parseInt(process.env.PG_MAX_CLIENTS) : 10;
	config.allowedOrigins = process.env.ALLOWED_ORIGINS;
	config.priceCacheTtlMs = process.env.PRICE_CACHE_TTL_MS ? parseInt(process.env.PRICE_CACHE_TTL_MS) : 120000;

	validateConfiguration(config);

	return config;
});

function validateRequiredEnvironmentVariables(): void {
	const required = ['RPC_URL', 'DEPLOYMENT_BLOCK', 'DATABASE_URL'];
	const missing = required.filter((key) => !process.env[key]);

	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
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
