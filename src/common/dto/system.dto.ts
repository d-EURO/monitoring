import { ApiProperty } from '@nestjs/swagger';
import {
	ChallengeState,
	CollateralState,
	DecentralizedEuroState,
	DEPSWrapperState,
	EquityState,
	FrontendGatewayState,
	MintingHubState,
	PositionState,
	SavingsGatewayState,
	StablecoinBridgeState,
} from '.';
import {
	DeuroTransferEvent,
	DepsTransferEvent,
	DeuroLossEvent,
	DeuroProfitEvent,
	DeuroMinterAppliedEvent,
	DeuroMinterDeniedEvent,
	DeuroProfitDistributedEvent,
	EquityTradeEvent,
	EquityDelegationEvent,
	DepsWrapEvent,
	DepsUnwrapEvent,
	SavingsSavedEvent,
	SavingsInterestCollectedEvent,
	SavingsWithdrawnEvent,
	SavingsRateProposedEvent,
	SavingsRateChangedEvent,
	MintingHubPositionOpenedEvent,
	RollerRollEvent,
	PositionDeniedEvent,
} from './event.dto';

export interface SystemEventsData {
	deuroTransferEvents: DeuroTransferEvent[];
	deuroLossEvents: DeuroLossEvent[];
	deuroProfitEvents: DeuroProfitEvent[];
	deuroMinterAppliedEvents: DeuroMinterAppliedEvent[];
	deuroMinterDeniedEvents: DeuroMinterDeniedEvent[];
	deuroProfitDistributedEvents: DeuroProfitDistributedEvent[];
	equityTradeEvents: EquityTradeEvent[];
	equityDelegationEvents: EquityDelegationEvent[];
	depsWrapEvents: DepsWrapEvent[];
	depsUnwrapEvents: DepsUnwrapEvent[];
	depsTransferEvents: DepsTransferEvent[];
	savingsSavedEvents: SavingsSavedEvent[];
	savingsInterestCollectedEvents: SavingsInterestCollectedEvent[];
	savingsWithdrawnEvents: SavingsWithdrawnEvent[];
	savingsRateProposedEvents: SavingsRateProposedEvent[];
	savingsRateChangedEvents: SavingsRateChangedEvent[];
	mintingHubPositionOpenedEvents: MintingHubPositionOpenedEvent[];
	rollerRollEvents: RollerRollEvent[];
	positionDeniedEvents: PositionDeniedEvent[];

	// Meta data
	lastEventFetch: number;
	blockRange: { from: number; to: number };
}

export interface SystemStateData {
	deuroState: DecentralizedEuroState;
	equityState: EquityState;
	depsState: DEPSWrapperState;
	savingsState: SavingsGatewayState;
	frontendState: FrontendGatewayState;
	mintingHubState: MintingHubState;
	positionsState: PositionState[];
	challengesState: ChallengeState[];
	collateralState: CollateralState[];
	bridgeStates: StablecoinBridgeState[];
}

export class StateHistoryDto {
	@ApiProperty({ description: 'Unique state record ID' })
	id: string;

	@ApiProperty({ description: 'Block number for this state snapshot' })
	block_number: number;

	@ApiProperty({ description: 'Timestamp of the state snapshot' })
	timestamp: Date;

	@ApiProperty({ description: 'Record creation timestamp' })
	created_at: Date;
}
