export interface ContractRecord {
	/** Contract address */
	address: string;
	/** Contract type (e.g., 'position', 'minting_hub') */
	type: string;
	/** Block number when contract was created */
	created_at_block: number;
	/** Optional JSON metadata */
	metadata: string | null;
	/** Whether contract is currently active */
	is_active: boolean;
}
