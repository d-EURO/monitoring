import { ApiProperty } from '@nestjs/swagger';

export enum MinterStatusEnum {
	PENDING = 'pending',
	APPROVED = 'approved',
	DENIED = 'denied',
}

export interface MinterStatus {
	minter: string;
	status: MinterStatusEnum;
	applicationDate: Date;
	applicationPeriod: string;
	applicationFee: string;
	message?: string;
	denialDate?: Date;
	denialMessage?: string;
	// Bridge-specific fields (only for StablecoinBridge minters)
	isBridge?: boolean;
	bridgeLimit?: string;
	bridgeMinted?: string;
	bridgeHorizon?: Date;
	bridgeSourceToken?: string;
	bridgeSourceSymbol?: string;
}

export class MinterStatusDto {
	@ApiProperty({ description: 'Minter address' })
	minter: string;

	@ApiProperty({ 
		description: 'Current minter status',
		enum: MinterStatusEnum,
	})
	status: MinterStatusEnum;

	@ApiProperty({ description: 'Date when minter applied' })
	applicationDate: Date;

	@ApiProperty({ description: 'Application period in seconds' })
	applicationPeriod: string;

	@ApiProperty({ description: 'Application fee paid' })
	applicationFee: string;

	@ApiProperty({ description: 'Application message', required: false })
	message?: string;

	@ApiProperty({ description: 'Date when minter was denied', required: false })
	denialDate?: Date;

	@ApiProperty({ description: 'Denial reason', required: false })
	denialMessage?: string;
}