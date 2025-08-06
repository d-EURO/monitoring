import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

interface BlockRow extends QueryResultRow {
	last_processed_block: string | number;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(DatabaseService.name);
	private pool: Pool;

	constructor(private readonly configService: ConfigService) {}

	async onModuleInit() {
		await this.connect();
		await this.initializeSchema();
	}

	async onModuleDestroy() {
		await this.close();
	}

	private async connect() {
		const monitoringConfig = this.configService.get('monitoring');

		let sslConfig: any = false;
		if (monitoringConfig.dbSsl === true) {
			sslConfig = { rejectUnauthorized: true };
		} else if (process.env.NODE_ENV === 'development' && monitoringConfig.dbSsl) {
			sslConfig = { rejectUnauthorized: false };
		}

		const poolConfig: any = {
			ssl: sslConfig,
			max: monitoringConfig.pgMaxClients || 10,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 2000,
		};

		if (monitoringConfig.databaseUrl) {
			poolConfig.connectionString = monitoringConfig.databaseUrl;
		} else {
			poolConfig.host = monitoringConfig.dbHost || 'localhost';
			poolConfig.port = monitoringConfig.dbPort || 5432;
			poolConfig.database = monitoringConfig.dbName || 'deuro_monitoring';
			poolConfig.user = monitoringConfig.dbUser || 'postgres';
			poolConfig.password = monitoringConfig.dbPassword || '';
		}

		this.pool = new Pool(poolConfig);

		this.pool.on('error', (err: Error) => {
			this.logger.error('Database pool error:', err);
		});

		await this.testConnection();
	}

	async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
		try {
			return await this.pool.query<T>(text, params);
		} catch (error: any) {
			this.logger.error('Database query failed:', {
				sql: text.substring(0, 100),
				errorCode: error.code,
				errorMessage: error.message,
			});
			throw error;
		}
	}

	async fetch<T extends QueryResultRow>(text: string, params?: any[]): Promise<T[]> {
		const result = await this.query<T>(text, params);
		return result.rows;
	}

	async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
		const client = await this.pool.connect();
		try {
			await client.query('BEGIN');
			const result = await fn(client);
			await client.query('COMMIT');
			return result;
		} catch (err) {
			await client.query('ROLLBACK');
			throw err;
		} finally {
			client.release();
		}
	}

	async initializeSchema(): Promise<void> {
		try {
			// Check if schema already exists by checking for core tables
			const tablesExist = await this.fetch(`
				SELECT COUNT(*) as count 
				FROM information_schema.tables 
				WHERE table_schema = 'public' 
				AND table_name IN ('deuro_state', 'position_states', 'monitoring_metadata')
			`);
			
			if (tablesExist[0].count === '3') {
				this.logger.log('Database schema already exists, skipping initialization');
				return;
			}

			const schemaPath = process.env.DB_SCHEMA_PATH || join(__dirname, '../../database/schema.sql');
			const schemaSql = readFileSync(schemaPath, 'utf8');

			this.logger.log('Initializing database schema...');

			const statements = schemaSql
				.split(';')
				.map((stmt) => stmt.trim())
				.filter((stmt) => stmt.length > 0);

			await this.withTransaction(async (client) => {
				await client.query('SET statement_timeout = 900000'); // 15 minutes for schema initialization
				
				for (const statement of statements) {
					await client.query(statement);
				}
			});

			this.logger.log('Database schema initialized successfully');
		} catch (error) {
			this.logger.error('Failed to initialize database schema:', error);
			throw error;
		}
	}

	async recordMonitoringCycle(lastBlock: number, eventsProcessed: number, durationMs: number): Promise<void> {
		const query = `
      INSERT INTO monitoring_metadata (last_processed_block, events_processed, processing_duration_ms)
      VALUES ($1, $2, $3)
    `;
		await this.query(query, [lastBlock, eventsProcessed, durationMs]);
	}

	async getLastProcessedBlock(): Promise<number | null> {
		const query = `
      SELECT last_processed_block 
      FROM monitoring_metadata 
      ORDER BY cycle_timestamp DESC 
      LIMIT 1
    `;
		const rows = await this.fetch<BlockRow>(query);
		return rows.length > 0 ? Number(rows[0].last_processed_block) : null;
	}

	async updateLastProcessedBlock(client: any, blockNumber: number): Promise<void> {
		const query = `
      INSERT INTO monitoring_metadata (last_processed_block, events_processed, processing_duration_ms)
      VALUES ($1, 0, 0)
    `;
		// If client is provided, use it (for transaction context)
		// Otherwise, use the pool directly (for incremental updates)
		if (client) {
			await client.query(query, [blockNumber]);
		} else {
			await this.query(query, [blockNumber]);
		}
	}

	async close(): Promise<void> {
		if (this.pool) {
			this.logger.log('Closing database connection pool...');
			await this.pool.end();
			this.logger.log('Database connection pool closed');
		}
	}

	async testConnection(): Promise<boolean> {
		try {
			const result = await this.query<{ current_time: Date } & QueryResultRow>('SELECT NOW() as current_time');
			this.logger.debug('Database connection successful:', result.rows[0].current_time);
			return true;
		} catch (error) {
			this.logger.error('Database connection failed:', error);
			return false;
		}
	}
}
