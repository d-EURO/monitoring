import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { DecentralizedEUROABI, ADDRESS } from '@deuro/eurocoin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BlockchainMintersService {
  private readonly logger = new Logger(BlockchainMintersService.name);
  private provider: ethers.Provider;
  private deuroContract: ethers.Contract;
  private cachedCount: number | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 60000; // 1 minute cache

  constructor(private readonly configService: ConfigService) {
    const monitoringConfig = this.configService.get('monitoring');
    this.provider = new ethers.JsonRpcProvider(monitoringConfig.rpcUrl);
    const blockchainId = monitoringConfig.blockchainId;
    const deuroAddress = ADDRESS[blockchainId].decentralizedEURO;
    this.deuroContract = new ethers.Contract(deuroAddress, DecentralizedEUROABI, this.provider);
  }

  async getTotalMintersFromBlockchain(): Promise<number> {
    try {
      // Check cache
      const now = Date.now();
      if (this.cachedCount !== null && (now - this.lastFetch) < this.CACHE_DURATION) {
        return this.cachedCount;
      }

      this.logger.log('Fetching total minters from blockchain...');

      // Fetch all MinterApplied events
      const appliedFilter = this.deuroContract.filters.MinterApplied();
      const appliedEvents = await this.deuroContract.queryFilter(appliedFilter, 0, 'latest');

      // Get unique minter addresses
      const uniqueMinters = new Set<string>();
      for (const event of appliedEvents) {
        // Type guard for EventLog vs Log
        if ('args' in event && event.args?.[0]) {
          uniqueMinters.add(event.args[0].toLowerCase());
        }
      }

      this.cachedCount = uniqueMinters.size;
      this.lastFetch = now;

      this.logger.log(`Found ${uniqueMinters.size} total unique minter applications`);
      return uniqueMinters.size;
    } catch (error) {
      this.logger.error('Error fetching minters from blockchain:', error);
      // Return cached value if available, otherwise 0
      return this.cachedCount || 0;
    }
  }
}