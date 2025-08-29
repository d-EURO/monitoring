# dEURO Monitoring V2 with NestJS API

A comprehensive monitoring system for the dEURO protocol built with NestJS, featuring PostgreSQL database persistence, scheduled monitoring tasks, and REST API endpoints for frontend integration.

## Setup

### Local Development

1. **Environment Configuration:**
```bash
# Copy the environment template
cp .env.example .env

# Edit .env with your local settings:
# - DATABASE_URL: Your local PostgreSQL connection
# - RPC_URL: Your Alchemy/Infura API key
```

2. **Development Server:**
```bash
npm install
npm run build
npm run start:prod
```

### Production Deployment (Azure)

1. **Build Docker Image:**
```bash
docker build -t deuro-monitoring .
```

2. **Environment Variables** (Set in Azure App Service):
```bash
DATABASE_URL=postgresql://user:pass@your-azure-postgres.postgres.database.azure.com:5432/deuro_monitoring?sslmode=require
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR-PRODUCTION-KEY
ALLOWED_ORIGINS=https://monitoring.deuro.com
PORT=3001
DEPLOYMENT_BLOCK=22088283
BLOCKCHAIN_ID=1
PRICE_CACHE_TTL_MS=120000
PG_MAX_CLIENTS=10
```

3. **API Documentation:** Available at `https://your-domain.com/swagger`


# TODO

- Make sure leadrate change proposal is captured in dashboard
- Make sure position status are colored correctly
- Sort tables in a logical order
- Check ready-to-deploy state