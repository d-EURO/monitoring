export enum MonitoringStatus {
    IDLE = 'IDLE',
    PROCESSING = 'PROCESSING',
    ERROR = 'ERROR',
}

export enum ContractType {
    DEURO = 'DEURO',
    EQUITY = 'EQUITY',
    DEPS = 'DEPS',
    SAVINGS = 'SAVINGS',
    POSITION = 'POSITION',
    MINTER = 'MINTER',
    BRIDGE = 'BRIDGE',
    FRONTEND_GATEWAY = 'FRONTEND_GATEWAY',
    MINTING_HUB = 'MINTING_HUB',
    ROLLER = 'ROLLER',
    COLLATERAL = 'COLLATERAL',
}

export interface Contract {
    address: string;
    type: ContractType;
    createdAtBlock: number;
    metadata?: Record<string, any>;
    isActive: boolean;
}
