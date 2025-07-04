import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';

@Injectable()
export class EventRepository {
	constructor(private readonly db: DatabaseService) {}

	// === Transfer events ===

	async getDEuroTransfers(filters?: { from?: string; to?: string; startTime?: Date; endTime?: Date; limit?: number }): Promise<any[]> {
		let query = 'SELECT * FROM deuro_transfer_events WHERE 1=1';
		const params: any[] = [];

		if (filters?.from) {
			params.push(filters.from.toLowerCase());
			query += ` AND from_address = $${params.length}`;
		}

		if (filters?.to) {
			params.push(filters.to.toLowerCase());
			query += ` AND to_address = $${params.length}`;
		}

		if (filters?.startTime) {
			params.push(filters.startTime);
			query += ` AND timestamp >= $${params.length}`;
		}

		if (filters?.endTime) {
			params.push(filters.endTime);
			query += ` AND timestamp <= $${params.length}`;
		}

		query += ' ORDER BY timestamp DESC';

		if (filters?.limit) {
			params.push(filters.limit);
			query += ` LIMIT $${params.length}`;
		}

		return this.db.fetch(query, params);
	}

	async getDepsTransfers(address?: string, limit: number = 100): Promise<any[]> {
		if (address) {
			return this.db.fetch(
				`
				SELECT * FROM deps_transfer_events 
				WHERE from_address = $1 OR to_address = $1
				ORDER BY timestamp DESC 
				LIMIT $2
			`,
				[address.toLowerCase(), limit]
			);
		}

		return this.db.fetch(
			`
			SELECT * FROM deps_transfer_events 
			ORDER BY timestamp DESC 
			LIMIT $1
		`,
			[limit]
		);
	}

	// === Position events ===

	async getPositionOpenedEvents(filters?: { owner?: string; position?: string; collateral?: string; limit?: number }): Promise<any[]> {
		let query = 'SELECT * FROM mintinghub_position_opened_events WHERE 1=1';
		const params: any[] = [];

		if (filters?.owner) {
			params.push(filters.owner.toLowerCase());
			query += ` AND owner = $${params.length}`;
		}

		if (filters?.position) {
			params.push(filters.position.toLowerCase());
			query += ` AND position = $${params.length}`;
		}

		if (filters?.collateral) {
			params.push(filters.collateral.toLowerCase());
			query += ` AND collateral = $${params.length}`;
		}

		query += ' ORDER BY timestamp DESC';

		if (filters?.limit) {
			params.push(filters.limit);
			query += ` LIMIT $${params.length}`;
		}

		return this.db.fetch(query, params);
	}

	async getPositionDeniedEvents(position?: string): Promise<any[]> {
		if (position) {
			return this.db.fetch(
				`
				SELECT * FROM position_denied_events 
				WHERE position = $1 
				ORDER BY timestamp DESC
			`,
				[position.toLowerCase()]
			);
		}

		return this.db.fetch(`
			SELECT * FROM position_denied_events 
			ORDER BY timestamp DESC
		`);
	}

	async getPositionMintingUpdates(position: string): Promise<any[]> {
		return this.db.fetch(
			`
			SELECT * FROM position_minting_update_events 
			WHERE position = $1 
			ORDER BY timestamp DESC
		`,
			[position.toLowerCase()]
		);
	}

	// === Challenge events ===

	async getChallengeStartedEvents(filters?: {
		challenger?: string;
		position?: string;
		minSize?: string;
		limit?: number;
	}): Promise<any[]> {
		let query = 'SELECT * FROM mintinghub_challenge_started_events WHERE 1=1';
		const params: any[] = [];

		if (filters?.challenger) {
			params.push(filters.challenger.toLowerCase());
			query += ` AND challenger = $${params.length}`;
		}

		if (filters?.position) {
			params.push(filters.position.toLowerCase());
			query += ` AND position = $${params.length}`;
		}

		if (filters?.minSize) {
			params.push(filters.minSize);
			query += ` AND size >= $${params.length}`;
		}

		query += ' ORDER BY timestamp DESC';

		if (filters?.limit) {
			params.push(filters.limit);
			query += ` LIMIT $${params.length}`;
		}

		return this.db.fetch(query, params);
	}

	async getChallengeAvertedEvents(position?: string): Promise<any[]> {
		if (position) {
			return this.db.fetch(
				`
				SELECT * FROM mintinghub_challenge_averted_events 
				WHERE position = $1 
				ORDER BY timestamp DESC
			`,
				[position.toLowerCase()]
			);
		}

		return this.db.fetch(`
			SELECT * FROM mintinghub_challenge_averted_events 
			ORDER BY timestamp DESC
		`);
	}

	async getChallengeSucceededEvents(position?: string): Promise<any[]> {
		if (position) {
			return this.db.fetch(
				`
				SELECT * FROM mintinghub_challenge_succeeded_events 
				WHERE position = $1 
				ORDER BY timestamp DESC
			`,
				[position.toLowerCase()]
			);
		}

		return this.db.fetch(`
			SELECT * FROM mintinghub_challenge_succeeded_events 
			ORDER BY timestamp DESC
		`);
	}

	// === Minter events ===

	async getMinterApplications(minter?: string): Promise<any[]> {
		if (minter) {
			return this.db.fetch(
				`
				SELECT * FROM deuro_minter_applied_events 
				WHERE minter = $1 
				ORDER BY timestamp DESC
			`,
				[minter.toLowerCase()]
			);
		}

		return this.db.fetch(`
			SELECT * FROM deuro_minter_applied_events 
			ORDER BY timestamp DESC
		`);
	}

	async getMinterDenials(minter?: string): Promise<any[]> {
		if (minter) {
			return this.db.fetch(
				`
				SELECT * FROM deuro_minter_denied_events 
				WHERE minter = $1 
				ORDER BY timestamp DESC
			`,
				[minter.toLowerCase()]
			);
		}

		return this.db.fetch(`
			SELECT * FROM deuro_minter_denied_events 
			ORDER BY timestamp DESC
		`);
	}

	// === Financial events ===

	async getProfitEvents(timeframe?: { start: Date; end: Date }): Promise<any[]> {
		if (timeframe) {
			return this.db.fetch(
				`
				SELECT * FROM deuro_profit_events 
				WHERE timestamp >= $1 AND timestamp <= $2
				ORDER BY timestamp DESC
			`,
				[timeframe.start, timeframe.end]
			);
		}

		return this.db.fetch(`
			SELECT * FROM deuro_profit_events 
			ORDER BY timestamp DESC
		`);
	}

	async getLossEvents(timeframe?: { start: Date; end: Date }): Promise<any[]> {
		if (timeframe) {
			return this.db.fetch(
				`
				SELECT * FROM deuro_loss_events 
				WHERE timestamp >= $1 AND timestamp <= $2
				ORDER BY timestamp DESC
			`,
				[timeframe.start, timeframe.end]
			);
		}

		return this.db.fetch(`
			SELECT * FROM deuro_loss_events 
			ORDER BY timestamp DESC
		`);
	}

	async getProfitDistributions(recipient?: string): Promise<any[]> {
		if (recipient) {
			return this.db.fetch(
				`
				SELECT * FROM deuro_profit_distributed_events 
				WHERE recipient = $1 
				ORDER BY timestamp DESC
			`,
				[recipient.toLowerCase()]
			);
		}

		return this.db.fetch(`
			SELECT * FROM deuro_profit_distributed_events 
			ORDER BY timestamp DESC
		`);
	}

	// === Equity events ===

	async getEquityTrades(trader?: string, limit: number = 100): Promise<any[]> {
		if (trader) {
			return this.db.fetch(
				`
				SELECT * FROM equity_trade_events 
				WHERE who = $1 
				ORDER BY timestamp DESC 
				LIMIT $2
			`,
				[trader.toLowerCase(), limit]
			);
		}

		return this.db.fetch(
			`
			SELECT * FROM equity_trade_events 
			ORDER BY timestamp DESC 
			LIMIT $1
		`,
			[limit]
		);
	}

	async getEquityDelegations(address?: string): Promise<any[]> {
		if (address) {
			return this.db.fetch(
				`
				SELECT * FROM equity_delegation_events 
				WHERE from_address = $1 OR to_address = $1
				ORDER BY timestamp DESC
			`,
				[address.toLowerCase()]
			);
		}

		return this.db.fetch(`
			SELECT * FROM equity_delegation_events 
			ORDER BY timestamp DESC
		`);
	}

	// === Savings events ===

	async getSavingsActivity(account: string): Promise<any> {
		// Get all savings-related events for an account
		const saved = await this.db.fetch(
			`
			SELECT 'saved' as type, timestamp, amount 
			FROM savings_saved_events 
			WHERE account = $1
		`,
			[account.toLowerCase()]
		);

		const withdrawn = await this.db.fetch(
			`
			SELECT 'withdrawn' as type, timestamp, amount 
			FROM savings_withdrawn_events 
			WHERE account = $1
		`,
			[account.toLowerCase()]
		);

		const interest = await this.db.fetch(
			`
			SELECT 'interest' as type, timestamp, interest as amount 
			FROM savings_interest_collected_events 
			WHERE account = $1
		`,
			[account.toLowerCase()]
		);

		return [...saved, ...withdrawn, ...interest].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
	}

	async getSavingsRateChanges(): Promise<any[]> {
		return this.db.fetch(`
			SELECT * FROM savings_rate_changed_events 
			ORDER BY timestamp DESC
		`);
	}

	// === Analytics queries ===

	async getEventCounts(startTime: Date, endTime: Date): Promise<any> {
		const result = await this.db.fetch(
			`
			SELECT 
				(SELECT COUNT(*) FROM deuro_transfer_events WHERE timestamp >= $1 AND timestamp <= $2) as deuro_transfers,
				(SELECT COUNT(*) FROM mintinghub_position_opened_events WHERE timestamp >= $1 AND timestamp <= $2) as positions_opened,
				(SELECT COUNT(*) FROM mintinghub_challenge_started_events WHERE timestamp >= $1 AND timestamp <= $2) as challenges_started,
				(SELECT COUNT(*) FROM mintinghub_challenge_succeeded_events WHERE timestamp >= $1 AND timestamp <= $2) as challenges_succeeded,
				(SELECT COUNT(*) FROM equity_trade_events WHERE timestamp >= $1 AND timestamp <= $2) as equity_trades,
				(SELECT COUNT(*) FROM savings_saved_events WHERE timestamp >= $1 AND timestamp <= $2) as savings_deposits
		`,
			[startTime, endTime]
		);
		return result[0];
	}

	async getTransferVolume(tokenType: 'deuro' | 'deps', timeframe?: { start: Date; end: Date }): Promise<any> {
		const table = tokenType === 'deuro' ? 'deuro_transfer_events' : 'deps_transfer_events';
		let query = `SELECT SUM(value::numeric) as total_volume, COUNT(*) as transfer_count FROM ${table}`;
		const params: any[] = [];

		if (timeframe) {
			query += ' WHERE timestamp >= $1 AND timestamp <= $2';
			params.push(timeframe.start, timeframe.end);
		}

		const result = await this.db.fetch(query, params);
		return result[0];
	}

	// === Recent activity ===

	async getRecentActivity(limit: number = 50): Promise<any[]> {
		// Union query to get recent events across all event types
		return this.db.fetch(
			`
			(
				SELECT 'transfer' as event_type, tx_hash, timestamp, 
					json_build_object('from', from_address, 'to', to_address, 'value', value) as data
				FROM deuro_transfer_events
				ORDER BY timestamp DESC
				LIMIT ${limit}
			)
			UNION ALL
			(
				SELECT 'position_opened' as event_type, tx_hash, timestamp,
					json_build_object('owner', owner, 'position', position, 'collateral', collateral) as data
				FROM mintinghub_position_opened_events
				ORDER BY timestamp DESC
				LIMIT ${limit}
			)
			UNION ALL
			(
				SELECT 'challenge_started' as event_type, tx_hash, timestamp,
					json_build_object('challenger', challenger, 'position', position, 'size', size) as data
				FROM mintinghub_challenge_started_events
				ORDER BY timestamp DESC
				LIMIT ${limit}
			)
			ORDER BY timestamp DESC
			LIMIT $1
		`,
			[limit]
		);
	}

	// === Forced sale and liquidation events ===

	async getForcedSales(position?: string): Promise<any[]> {
		if (position) {
			return this.db.fetch(
				`
				SELECT * FROM mintinghub_forced_sale_events 
				WHERE pos = $1 
				ORDER BY timestamp DESC
			`,
				[position.toLowerCase()]
			);
		}

		return this.db.fetch(`
			SELECT * FROM mintinghub_forced_sale_events 
			ORDER BY timestamp DESC
		`);
	}

	async getPostponedReturns(beneficiary?: string): Promise<any[]> {
		if (beneficiary) {
			return this.db.fetch(
				`
				SELECT * FROM mintinghub_postponed_return_events 
				WHERE beneficiary = $1 
				ORDER BY timestamp DESC
			`,
				[beneficiary.toLowerCase()]
			);
		}

		return this.db.fetch(`
			SELECT * FROM mintinghub_postponed_return_events 
			ORDER BY timestamp DESC
		`);
	}
}
