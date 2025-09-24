# dEURO Monitoring

Real-time monitoring service for the dEURO protocol on Ethereum mainnet.

## Architecture

The monitoring service continuously syncs blockchain data to provide real-time insights:

1. **Event Collection**: Fetches all protocol events (PositionOpened, MinterApplied, ChallengeStarted, etc.) from blockchain logs
2. **Dynamic Discovery**: Automatically detects new positions, minters, and bridges as they're created on-chain
3. **State Tracking**: Maintains current state for:
   - Positions (collateral, debt, status, cooldowns)
   - Challenges (active auctions, liquidations)
   - Minters (generic minters and bridge contracts)
   - Collateral aggregation by token type
4. **Token Prices**: Fetches real-time prices from GeckoTerminal API with caching
5. **API Endpoints**: Serves data via REST API for frontend consumption

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Ethereum RPC endpoint (Alchemy/Infura)

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings:
# - DATABASE_URL: PostgreSQL connection string
# - RPC_URL: Ethereum mainnet RPC endpoint
# - BLOCKCHAIN_ID: Must be 1 (Ethereum mainnet)

# Initialize database schema
psql $DATABASE_URL < database/schema.sql

# Generate Prisma client
npm run prisma:generate

# Start the service
npm run build
npm run start:prod
```

## Docker

```bash
# Build the image
docker build -t deuro-monitoring:test .

# Run with your .env file
docker run --name deuro-test -p 3001:3001 --env-file .env deuro-monitoring:test

# Test the API
curl http://localhost:3001/health

# Clean up
docker rm -f deuro-test
```

## API Documentation

Swagger documentation available at: `http://localhost:3001/swagger`

## Deployment

- **Development**: Push to `develop` branch → auto-deploys to `dev.monitoring.deuro.com`
- **Production**: Push to `main` branch → auto-deploys to `monitoring.deuro.com`