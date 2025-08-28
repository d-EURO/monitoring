import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { MinterStateDto } from '../../common/dto';
import { BridgeStateDto } from '../../common/dto/stablecoinBridge.dto';

@Injectable()
export class MinterService {
	constructor(private readonly databaseService: DatabaseService) {}

	async getMinters(): Promise<MinterStateDto[]> {
		const result = await this.databaseService.query(
			`SELECT * FROM minter_states 
			 WHERE minter_type = 'REGULAR' 
			 ORDER BY application_date DESC`
		);

		return result.rows.map(this.mapMinterToDto);
	}

	async getBridges(): Promise<BridgeStateDto[]> {
		const result = await this.databaseService.query(
			`SELECT * FROM minter_states 
			 WHERE minter_type = 'BRIDGE' 
			 ORDER BY bridge_token_symbol`
		);

		return result.rows.map(this.mapBridgeToDto);
	}

	private mapMinterToDto(minter: any): MinterStateDto {
		return {
			minter: minter.minter_address,
			status: minter.status,
			applicationDate: minter.application_date,
			applicationPeriod: minter.application_period,
			applicationFee: minter.application_fee,
			message: minter.message,
			denialDate: minter.denial_date,
			denialMessage: minter.denial_message,
		};
	}

	private mapBridgeToDto(bridge: any): BridgeStateDto {
		return {
			address: bridge.minter_address,
			eurAddress: bridge.bridge_token_address,
			eurSymbol: bridge.bridge_token_symbol,
			eurDecimals: bridge.bridge_token_decimals,
			dEuroAddress: '', // Not stored in new schema, could be added if needed
			horizon: bridge.bridge_horizon?.toString() || '0',
			limit: bridge.bridge_limit?.toString() || '0',
			minted: bridge.bridge_minted?.toString() || '0',
		};
	}
}
