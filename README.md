# dEURO Monitoring

dEURO protocol monitoring service with PostgreSQL database and REST API endpoints.

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

### Deployment

#### Automatic (GitHub Actions)
- Push to `develop` → Deploys to `dev.monitoring.deuro.com`
- Push to `main` → Deploys to `monitoring.deuro.com`

#### Manual (Azure)
1. **Build:** `docker build -t deuro-monitoring .`
2. **Environment Variables:** Set in Azure App Service
```bash
DATABASE_URL=postgresql://user:pass@server.postgres.database.azure.com:5432/database?sslmode=require
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR-KEY
ALLOWED_ORIGINS=https://dev.monitoring.deuro.com  # or https://monitoring.deuro.com
PORT=3001
DEPLOYMENT_BLOCK=22088283
BLOCKCHAIN_ID=1
PRICE_CACHE_TTL_MS=120000
PG_MAX_CLIENTS=10
```
3. **Docs:** Available at `/swagger`


# TODO

- Make sure leadrate change proposal is captured in dashboard
- Make sure position status are colored correctly
- Sort tables in a logical order