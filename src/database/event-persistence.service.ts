import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { SystemEventsData } from '../common/dto';
import pgFormat from 'pg-format';

@Injectable()
export class EventPersistenceService {
	private readonly logger = new Logger(EventPersistenceService.name);

	constructor(private readonly databaseService: DatabaseService) {}

	async persistAllEvents(eventsData: SystemEventsData): Promise<void> {
		try {
			await this.databaseService.withTransaction(async (client) => {
				// Persist dEURO transfer events
				if (eventsData.deuroTransferEvents.length > 0) {
					await this.persistDeuroTransferEvents(client, eventsData.deuroTransferEvents);
				}

				// Persist DEPS transfer events
				if (eventsData.depsTransferEvents.length > 0) {
					await this.persistDepsTransferEvents(client, eventsData.depsTransferEvents);
				}

				// Persist dEURO minter events
				if (eventsData.deuroMinterAppliedEvents.length > 0) {
					await this.persistDeuroMinterAppliedEvents(client, eventsData.deuroMinterAppliedEvents);
				}

				if (eventsData.deuroMinterDeniedEvents.length > 0) {
					await this.persistDeuroMinterDeniedEvents(client, eventsData.deuroMinterDeniedEvents);
				}

				// Persist dEURO loss/profit events
				if (eventsData.deuroLossEvents.length > 0) {
					await this.persistDeuroLossEvents(client, eventsData.deuroLossEvents);
				}

				if (eventsData.deuroProfitEvents.length > 0) {
					await this.persistDeuroProfitEvents(client, eventsData.deuroProfitEvents);
				}

				if (eventsData.deuroProfitDistributedEvents.length > 0) {
					await this.persistDeuroProfitDistributedEvents(client, eventsData.deuroProfitDistributedEvents);
				}

				// Persist equity events
				if (eventsData.equityTradeEvents.length > 0) {
					await this.persistEquityTradeEvents(client, eventsData.equityTradeEvents);
				}

				if (eventsData.equityDelegationEvents.length > 0) {
					await this.persistEquityDelegationEvents(client, eventsData.equityDelegationEvents);
				}

				// Persist DEPS wrap/unwrap events
				if (eventsData.depsWrapEvents.length > 0) {
					await this.persistDepsWrapEvents(client, eventsData.depsWrapEvents);
				}

				if (eventsData.depsUnwrapEvents.length > 0) {
					await this.persistDepsUnwrapEvents(client, eventsData.depsUnwrapEvents);
				}

				// Persist savings events
				if (eventsData.savingsSavedEvents.length > 0) {
					await this.persistSavingsSavedEvents(client, eventsData.savingsSavedEvents);
				}

				if (eventsData.savingsInterestCollectedEvents.length > 0) {
					await this.persistSavingsInterestCollectedEvents(client, eventsData.savingsInterestCollectedEvents);
				}

				if (eventsData.savingsWithdrawnEvents.length > 0) {
					await this.persistSavingsWithdrawnEvents(client, eventsData.savingsWithdrawnEvents);
				}

				if (eventsData.savingsRateProposedEvents.length > 0) {
					await this.persistSavingsRateProposedEvents(client, eventsData.savingsRateProposedEvents);
				}

				if (eventsData.savingsRateChangedEvents.length > 0) {
					await this.persistSavingsRateChangedEvents(client, eventsData.savingsRateChangedEvents);
				}

				// Persist minting hub events
				if (eventsData.mintingHubPositionOpenedEvents.length > 0) {
					await this.persistMintingHubPositionOpenedEvents(client, eventsData.mintingHubPositionOpenedEvents);
				}

				// Persist roller events
				if (eventsData.rollerRollEvents.length > 0) {
					await this.persistRollerRollEvents(client, eventsData.rollerRollEvents);
				}

				// Persist position denied events
				if (eventsData.positionDeniedEvents.length > 0) {
					await this.persistPositionDeniedEvents(client, eventsData.positionDeniedEvents);
				}
			});

			this.logger.log(`Successfully persisted ${this.getTotalEventCount(eventsData)} events`);
		} catch (error) {
			this.logger.error('Failed to persist events:', error);
			throw error;
		}
	}

	private async persistDeuroTransferEvents(client: any, events: any[]): Promise<void> {
		const values = events.map((event) => [
			event.txHash,
			new Date(event.timestamp * 1000),
			event.logIndex,
			event.from,
			event.to,
			event.value.toString(),
		]);

		const query = pgFormat(
			`
      INSERT INTO deuro_transfer_events (tx_hash, timestamp, log_index, from_address, to_address, value)
      VALUES %L
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `,
			values
		);

		await client.query(query);
	}

	private async persistDepsTransferEvents(client: any, events: any[]): Promise<void> {
		const values = events.map((event) => [
			event.txHash,
			new Date(event.timestamp * 1000),
			event.logIndex,
			event.from,
			event.to,
			event.value.toString(),
		]);

		const query = pgFormat(
			`
      INSERT INTO deps_transfer_events (tx_hash, timestamp, log_index, from_address, to_address, value)
      VALUES %L
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `,
			values
		);

		await client.query(query);
	}

	private async persistDeuroMinterAppliedEvents(client: any, events: any[]): Promise<void> {
		const values = events.map((event) => [
			event.txHash,
			new Date(event.timestamp * 1000),
			event.logIndex,
			event.minter,
			event.applicationPeriod.toString(),
			event.applicationFee.toString(),
			event.message,
		]);

		const query = pgFormat(
			`
      INSERT INTO deuro_minter_applied_events (tx_hash, timestamp, log_index, minter, application_period, application_fee, message)
      VALUES %L
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `,
			values
		);

		await client.query(query);
	}

	private async persistDeuroMinterDeniedEvents(client: any, events: any[]): Promise<void> {
		const values = events.map((event) => [event.txHash, new Date(event.timestamp * 1000), event.logIndex, event.minter, event.message]);

		const query = pgFormat(
			`
      INSERT INTO deuro_minter_denied_events (tx_hash, timestamp, log_index, minter, message)
      VALUES %L
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `,
			values
		);

		await client.query(query);
	}

	private async persistDeuroLossEvents(client: any, events: any[]): Promise<void> {
		const values = events.map((event) => [
			event.txHash,
			new Date(event.timestamp * 1000),
			event.logIndex,
			event.reportingMinter,
			event.amount.toString(),
		]);

		const query = pgFormat(
			`
      INSERT INTO deuro_loss_events (tx_hash, timestamp, log_index, reporting_minter, amount)
      VALUES %L
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `,
			values
		);

		await client.query(query);
	}

	private async persistDeuroProfitEvents(client: any, events: any[]): Promise<void> {
		const values = events.map((event) => [
			event.txHash,
			new Date(event.timestamp * 1000),
			event.logIndex,
			event.reportingMinter,
			event.amount.toString(),
		]);

		const query = pgFormat(
			`
      INSERT INTO deuro_profit_events (tx_hash, timestamp, log_index, reporting_minter, amount)
      VALUES %L
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `,
			values
		);

		await client.query(query);
	}

	private async persistDeuroProfitDistributedEvents(client: any, events: any[]): Promise<void> {
		const values = events.map((event) => [
			event.txHash,
			new Date(event.timestamp * 1000),
			event.logIndex,
			event.recipient,
			event.amount.toString(),
		]);

		const query = pgFormat(
			`
      INSERT INTO deuro_profit_distributed_events (tx_hash, timestamp, log_index, recipient, amount)
      VALUES %L
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `,
			values
		);

		await client.query(query);
	}

	private async persistEquityTradeEvents(client: any, events: any[]): Promise<void> {
		const values = events.map((event) => [
			event.txHash,
			new Date(event.timestamp * 1000),
			event.logIndex,
			event.who,
			event.amount.toString(),
			event.totPrice.toString(),
			event.newPrice.toString(),
		]);

		const query = pgFormat(
			`
      INSERT INTO equity_trade_events (tx_hash, timestamp, log_index, who, amount, tot_price, new_price)
      VALUES %L
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `,
			values
		);

		await client.query(query);
	}

	private async persistEquityDelegationEvents(client: any, events: any[]): Promise<void> {
		const values = events.map((event) => [event.txHash, new Date(event.timestamp * 1000), event.logIndex, event.from, event.to]);

		const query = pgFormat(
			`
      INSERT INTO equity_delegation_events (tx_hash, timestamp, log_index, from_address, to_address)
      VALUES %L
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `,
			values
		);

		await client.query(query);
	}

	private async persistDepsWrapEvents(client: any, events: any[]): Promise<void> {
		const values = events.map((event) => [
			event.txHash,
			new Date(event.timestamp * 1000),
			event.logIndex,
			event.from,
			event.to,
			event.value.toString(),
			event.user,
			event.amount.toString(),
		]);

		const query = pgFormat(
			`
      INSERT INTO deps_wrap_events (tx_hash, timestamp, log_index, from_address, to_address, value, user_address, amount)
      VALUES %L
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `,
			values
		);

		await client.query(query);
	}

	private async persistDepsUnwrapEvents(client: any, events: any[]): Promise<void> {
		const values = events.map((event) => [
			event.txHash,
			new Date(event.timestamp * 1000),
			event.logIndex,
			event.from,
			event.to,
			event.value.toString(),
			event.user,
			event.amount.toString(),
		]);

		const query = pgFormat(
			`
      INSERT INTO deps_unwrap_events (tx_hash, timestamp, log_index, from_address, to_address, value, user_address, amount)
      VALUES %L
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `,
			values
		);

		await client.query(query);
	}

	private async persistSavingsSavedEvents(client: any, events: any[]): Promise<void> {
		const values = events.map((event) => [
			event.txHash,
			new Date(event.timestamp * 1000),
			event.logIndex,
			event.account,
			event.amount.toString(),
		]);

		const query = pgFormat(
			`
      INSERT INTO savings_saved_events (tx_hash, timestamp, log_index, account, amount)
      VALUES %L
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `,
			values
		);

		await client.query(query);
	}

	private async persistSavingsInterestCollectedEvents(client: any, events: any[]): Promise<void> {
		const values = events.map((event) => [
			event.txHash,
			new Date(event.timestamp * 1000),
			event.logIndex,
			event.account,
			event.interest.toString(),
		]);

		const query = pgFormat(
			`
      INSERT INTO savings_interest_collected_events (tx_hash, timestamp, log_index, account, interest)
      VALUES %L
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `,
			values
		);

		await client.query(query);
	}

	private async persistSavingsWithdrawnEvents(client: any, events: any[]): Promise<void> {
		const values = events.map((event) => [
			event.txHash,
			new Date(event.timestamp * 1000),
			event.logIndex,
			event.account,
			event.amount.toString(),
		]);

		const query = pgFormat(
			`
      INSERT INTO savings_withdrawn_events (tx_hash, timestamp, log_index, account, amount)
      VALUES %L
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `,
			values
		);

		await client.query(query);
	}

	private async persistSavingsRateProposedEvents(client: any, events: any[]): Promise<void> {
		const values = events.map((event) => [
			event.txHash,
			new Date(event.timestamp * 1000),
			event.logIndex,
			event.who,
			event.nextRate.toString(),
			event.nextChange.toString(),
		]);

		const query = pgFormat(
			`
      INSERT INTO savings_rate_proposed_events (tx_hash, timestamp, log_index, who, next_rate, next_change)
      VALUES %L
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `,
			values
		);

		await client.query(query);
	}

	private async persistSavingsRateChangedEvents(client: any, events: any[]): Promise<void> {
		const values = events.map((event) => [event.txHash, new Date(event.timestamp * 1000), event.logIndex, event.newRate.toString()]);

		const query = pgFormat(
			`
      INSERT INTO savings_rate_changed_events (tx_hash, timestamp, log_index, new_rate)
      VALUES %L
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `,
			values
		);

		await client.query(query);
	}

	private async persistMintingHubPositionOpenedEvents(client: any, events: any[]): Promise<void> {
		const values = events.map((event) => [
			event.txHash,
			new Date(event.timestamp * 1000),
			event.logIndex,
			event.owner,
			event.position,
			event.original,
			event.collateral,
		]);

		const query = pgFormat(
			`
      INSERT INTO minting_hub_position_opened_events (tx_hash, timestamp, log_index, owner, position, original, collateral)
      VALUES %L
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `,
			values
		);

		await client.query(query);
	}

	private async persistRollerRollEvents(client: any, events: any[]): Promise<void> {
		const values = events.map((event) => [
			event.txHash,
			new Date(event.timestamp * 1000),
			event.logIndex,
			event.source,
			event.collWithdraw.toString(),
			event.repay.toString(),
			event.target,
			event.collDeposit.toString(),
			event.mint.toString(),
		]);

		const query = pgFormat(
			`
      INSERT INTO roller_roll_events (tx_hash, timestamp, log_index, source, coll_withdraw, repay, target, coll_deposit, mint)
      VALUES %L
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `,
			values
		);

		await client.query(query);
	}

	private async persistPositionDeniedEvents(client: any, events: any[]): Promise<void> {
		const values = events.map((event) => [
			event.txHash,
			new Date(event.timestamp * 1000),
			event.logIndex,
			event.position,
			event.sender,
			event.message,
		]);

		const query = pgFormat(
			`
      INSERT INTO position_denied_events (tx_hash, timestamp, log_index, position, sender, message)
      VALUES %L
      ON CONFLICT (tx_hash, log_index) DO NOTHING
    `,
			values
		);

		await client.query(query);
	}

	private getTotalEventCount(eventsData: SystemEventsData): number {
		return Object.entries(eventsData).reduce((sum, [key, value]) => {
			if (key === 'lastEventFetch' || key === 'blockRange') return sum;
			return sum + (Array.isArray(value) ? value.length : 0);
		}, 0);
	}
}
