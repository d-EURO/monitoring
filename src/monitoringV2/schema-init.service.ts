import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class SchemaInitService implements OnModuleInit {
	private readonly logger = new Logger(SchemaInitService.name);

	constructor(private readonly configService: ConfigService) {}

	async onModuleInit() {
		const databaseUrl = this.configService.get('monitoring.databaseUrl');
		const client = new Client({ connectionString: databaseUrl });

		try {
			await client.connect();
			const schemaPath = join(__dirname, '../../database/schema.sql');
			const schemaSql = readFileSync(schemaPath, 'utf8');
			await client.query(schemaSql);
			this.logger.log('Database schema initialized');
		} catch (error) {
			this.logger.error('Failed to initialize schema:', error);
			throw error;
		} finally {
			await client.end();
		}
	}
}