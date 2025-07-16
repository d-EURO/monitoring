import { ApiProperty } from '@nestjs/swagger';

export enum MinterStatus {
	PENDING = 'PENDING',
	APPROVED = 'APPROVED',
	DENIED = 'DENIED',
}

export interface MinterState {
	minter: string;
	status: MinterStatus;
	applicationDate: Date;
	applicationPeriod: string;
	applicationFee: string;
	message?: string;
	denialDate?: Date;
	denialMessage?: string;
}

export class MinterStateDto {
	@ApiProperty({ description: 'Minter address' })
	minter: string;

	@ApiProperty({ description: 'Current minter status', enum: MinterStatus })
	status: MinterStatus;

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
