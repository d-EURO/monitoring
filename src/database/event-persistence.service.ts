import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { SystemEventsData } from '../common/dto';
import pgFormat from 'pg-format';

interface PersistConfig<T> {
	table: string;
	columns: readonly string[];
	mapEvent: (evt: T) => any[];
}

async function persistEvents<T>(client: any, events: T[], { table, columns, mapEvent }: PersistConfig<T>): Promise<void> {
	const values = events.map(mapEvent);
	const query = pgFormat(
		`
		INSERT INTO ${table} (${columns.join(',')})
		VALUES %L
		ON CONFLICT (${columns[0]}, ${columns[2]}) DO NOTHING
		`,
		values
	);
	await client.query(query);
}

@Injectable()
export class EventPersistenceService {
	private readonly logger = new Logger(EventPersistenceService.name);

	private static readonly eventConfigs = {
		deuroTransferEvents: {
			table: 'deuro_transfer_events',
			columns: ['tx_hash', 'timestamp', 'log_index', 'from_address', 'to_address', 'value'],
			mapEvent: (e: any) => [e.txHash, new Date(e.timestamp * 1000), e.logIndex, e.from, e.to, e.value.toString()],
		},
		depsTransferEvents: {
			table: 'deps_transfer_events',
			columns: ['tx_hash', 'timestamp', 'log_index', 'from_address', 'to_address', 'value'],
			mapEvent: (e: any) => [e.txHash, new Date(e.timestamp * 1000), e.logIndex, e.from, e.to, e.value.toString()],
		},
		deuroMinterAppliedEvents: {
			table: 'deuro_minter_applied_events',
			columns: ['tx_hash', 'timestamp', 'log_index', 'minter', 'application_period', 'application_fee', 'message'],
			mapEvent: (e: any) => [
				e.txHash,
				new Date(e.timestamp * 1000),
				e.logIndex,
				e.minter,
				e.applicationPeriod.toString(),
				e.applicationFee.toString(),
				e.message,
			],
		},
		deuroMinterDeniedEvents: {
			table: 'deuro_minter_denied_events',
			columns: ['tx_hash', 'timestamp', 'log_index', 'minter', 'message'],
			mapEvent: (e: any) => [e.txHash, new Date(e.timestamp * 1000), e.logIndex, e.minter, e.message],
		},
		deuroLossEvents: {
			table: 'deuro_loss_events',
			columns: ['tx_hash', 'timestamp', 'log_index', 'reporting_minter', 'amount'],
			mapEvent: (e: any) => [e.txHash, new Date(e.timestamp * 1000), e.logIndex, e.reportingMinter, e.amount.toString()],
		},
		deuroProfitEvents: {
			table: 'deuro_profit_events',
			columns: ['tx_hash', 'timestamp', 'log_index', 'reporting_minter', 'amount'],
			mapEvent: (e: any) => [e.txHash, new Date(e.timestamp * 1000), e.logIndex, e.reportingMinter, e.amount.toString()],
		},
		deuroProfitDistributedEvents: {
			table: 'deuro_profit_distributed_events',
			columns: ['tx_hash', 'timestamp', 'log_index', 'recipient', 'amount'],
			mapEvent: (e: any) => [e.txHash, new Date(e.timestamp * 1000), e.logIndex, e.recipient, e.amount.toString()],
		},
		equityTradeEvents: {
			table: 'equity_trade_events',
			columns: ['tx_hash', 'timestamp', 'log_index', 'who', 'amount', 'tot_price', 'new_price'],
			mapEvent: (e: any) => [
				e.txHash,
				new Date(e.timestamp * 1000),
				e.logIndex,
				e.who,
				e.amount.toString(),
				e.totPrice.toString(),
				e.newPrice.toString(),
			],
		},
		equityDelegationEvents: {
			table: 'equity_delegation_events',
			columns: ['tx_hash', 'timestamp', 'log_index', 'from_address', 'to_address'],
			mapEvent: (e: any) => [e.txHash, new Date(e.timestamp * 1000), e.logIndex, e.from, e.to],
		},
		depsWrapEvents: {
			table: 'deps_wrap_events',
			columns: ['tx_hash', 'timestamp', 'log_index', 'from_address', 'to_address', 'value', 'user_address', 'amount'],
			mapEvent: (e: any) => [
				e.txHash,
				new Date(e.timestamp * 1000),
				e.logIndex,
				e.from,
				e.to,
				e.value.toString(),
				e.user,
				e.amount.toString(),
			],
		},
		depsUnwrapEvents: {
			table: 'deps_unwrap_events',
			columns: ['tx_hash', 'timestamp', 'log_index', 'from_address', 'to_address', 'value', 'user_address', 'amount'],
			mapEvent: (e: any) => [
				e.txHash,
				new Date(e.timestamp * 1000),
				e.logIndex,
				e.from,
				e.to,
				e.value.toString(),
				e.user,
				e.amount.toString(),
			],
		},
		savingsSavedEvents: {
			table: 'savings_saved_events',
			columns: ['tx_hash', 'timestamp', 'log_index', 'account', 'amount'],
			mapEvent: (e: any) => [e.txHash, new Date(e.timestamp * 1000), e.logIndex, e.account, e.amount.toString()],
		},
		savingsInterestCollectedEvents: {
			table: 'savings_interest_collected_events',
			columns: ['tx_hash', 'timestamp', 'log_index', 'account', 'interest'],
			mapEvent: (e: any) => [e.txHash, new Date(e.timestamp * 1000), e.logIndex, e.account, e.interest.toString()],
		},
		savingsWithdrawnEvents: {
			table: 'savings_withdrawn_events',
			columns: ['tx_hash', 'timestamp', 'log_index', 'account', 'amount'],
			mapEvent: (e: any) => [e.txHash, new Date(e.timestamp * 1000), e.logIndex, e.account, e.amount.toString()],
		},
		savingsRateProposedEvents: {
			table: 'savings_rate_proposed_events',
			columns: ['tx_hash', 'timestamp', 'log_index', 'who', 'next_rate', 'next_change'],
			mapEvent: (e: any) => [
				e.txHash,
				new Date(e.timestamp * 1000),
				e.logIndex,
				e.who,
				e.nextRate.toString(),
				e.nextChange.toString(),
			],
		},
		savingsRateChangedEvents: {
			table: 'savings_rate_changed_events',
			columns: ['tx_hash', 'timestamp', 'log_index', 'new_rate'],
			mapEvent: (e: any) => [e.txHash, new Date(e.timestamp * 1000), e.logIndex, e.newRate.toString()],
		},
		mintingHubPositionOpenedEvents: {
			table: 'mintinghub_position_opened_events',
			columns: ['tx_hash', 'timestamp', 'log_index', 'owner', 'position', 'original', 'collateral'],
			mapEvent: (e: any) => [e.txHash, new Date(e.timestamp * 1000), e.logIndex, e.owner, e.position, e.original, e.collateral],
		},
		rollerRollEvents: {
			table: 'roller_roll_events',
			columns: ['tx_hash', 'timestamp', 'log_index', 'source', 'coll_withdraw', 'repay', 'target', 'coll_deposit', 'mint'],
			mapEvent: (e: any) => [
				e.txHash,
				new Date(e.timestamp * 1000),
				e.logIndex,
				e.source,
				e.collWithdraw.toString(),
				e.repay.toString(),
				e.target,
				e.collDeposit.toString(),
				e.mint.toString(),
			],
		},
		positionDeniedEvents: {
			table: 'position_denied_events',
			columns: ['tx_hash', 'timestamp', 'log_index', 'position', 'sender', 'message'],
			mapEvent: (e: any) => [e.txHash, new Date(e.timestamp * 1000), e.logIndex, e.position, e.sender, e.message],
		},
	} as const;

	constructor(private readonly databaseService: DatabaseService) {}

	async persistAllEvents(eventsData: SystemEventsData): Promise<void> {
		try {
			await this.databaseService.withTransaction(async (client) => {
				for (const [eventType, config] of Object.entries(EventPersistenceService.eventConfigs)) {
					const events = eventsData[eventType as keyof SystemEventsData];
					if (Array.isArray(events) && events.length > 0) {
						await persistEvents(client, events, config);
					}
				}
			});

			this.logger.log(`Successfully persisted ${this.getTotalEventCount(eventsData)} events`);
		} catch (error) {
			this.logger.error('Failed to persist events:', error);
			throw error;
		}
	}

	private getTotalEventCount(eventsData: SystemEventsData): number {
		return Object.entries(eventsData).reduce((sum, [key, value]) => {
			if (key === 'lastEventFetch' || key === 'blockRange') return sum;
			return sum + (Array.isArray(value) ? value.length : 0);
		}, 0);
	}
}
