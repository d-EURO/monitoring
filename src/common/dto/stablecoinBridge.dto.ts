import { ApiProperty } from '@nestjs/swagger';

export enum Bridge {
	EURT = 'bridgeEURT',
	EURS = 'bridgeEURS',
	VEUR = 'bridgeVEUR',
	EURC = 'bridgeEURC',
	EURR = 'bridgeEURR',
	EUROP = 'bridgeEUROP',
	EURI = 'bridgeEURI',
	EURE = 'bridgeEURE',
}

export interface StablecoinBridgeState {
	bridgeType: Bridge;
	address: string;
	eurAddress: string;
	eurSymbol: string;
	eurDecimals: number;
	dEuroAddress: string;
	limit: bigint;
	minted: bigint;
	horizon: bigint;
}

export class BridgeStateDto {
	@ApiProperty({ description: 'Bridge type', enum: Bridge })
	bridgeType: Bridge;

	@ApiProperty({ description: 'Bridge contract address' })
	address: string;

	@ApiProperty({ description: 'EUR token contract address' })
	eurAddress: string;

	@ApiProperty({ description: 'EUR token symbol' })
	eurSymbol: string;

	@ApiProperty({ description: 'EUR token decimal places' })
	eurDecimals: number;

	@ApiProperty({ description: 'dEURO contract address' })
	dEuroAddress: string;

	@ApiProperty({ description: 'Bridge minting limit' })
	limit: string;

	@ApiProperty({ description: 'Amount currently minted' })
	minted: string;

	@ApiProperty({ description: 'Time horizon for the bridge' })
	horizon: string;

	@ApiProperty({ description: 'Block number for this state snapshot' })
	block_number: number;

	@ApiProperty({ description: 'Timestamp of the state snapshot' })
	timestamp: Date;
}
