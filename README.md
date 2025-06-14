# dEURO Monitoring V2 with NestJS API

A comprehensive monitoring system for the dEURO protocol built with NestJS, featuring PostgreSQL database persistence, scheduled monitoring tasks, and REST API endpoints for frontend integration.

## Features

- **NestJS Architecture**: Clean, modular design with dependency injection and decorators
- **Scheduled Monitoring**: Automated blockchain monitoring using `@nestjs/schedule`
- **REST API Endpoints**: Full API for historical events, states, and analytics
- **Complete Event Monitoring**: Tracks all protocol events with dedicated database tables
- **Daily State Snapshots**: Captures daily protocol state with automatic updates
- **Incremental Processing**: Only fetches new events since last monitoring cycle
- **Database Persistence**: PostgreSQL with optimized schemas for fast queries
- **Swagger Documentation**: Auto-generated API documentation
- **Container Ready**: Simple Docker deployment, works with any hosting provider
- **Database Flexibility**: Works with any PostgreSQL provider (AWS, GCP, Railway, etc.)

## Architecture

```
src/
├── main.ts                    # NestJS bootstrap
├── app.module.ts             # Root application module
├── config/                   # Configuration management
├── monitoring/               # Scheduled blockchain monitoring
├── events/                   # Events API and persistence
├── states/                   # States API and persistence
├── analytics/                # Aggregated metrics and analytics
├── database/                 # Database service and repositories
├── blockchain/               # Contract interactions and utilities
└── common/                   # Shared DTOs and types
```

## API Endpoints

### Events
- `GET /events/transfers` - dEURO transfer events
- `GET /events/minting` - Position minting events
- `GET /events/equity` - Equity trade events
- `GET /events/savings` - Savings-related events
- `GET /events/challenges` - Challenge events

### States
- `GET /states/deuro/current` - Current dEURO protocol state
- `GET /states/equity/current` - Current equity token state
- `GET /states/positions/current` - Current open positions
- `GET /states/daily/{stateType}` - Historical daily states

### Analytics
- `GET /analytics/summary` - Protocol summary metrics
- `GET /analytics/volume` - Volume metrics over time
- `GET /analytics/positions` - Position distribution analytics

### Health
- `GET /health/monitoring` - Monitoring system status
- `GET /health/database` - Database connection status

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.monitoring.example .env.monitoring
   # Edit .env.monitoring with your database and RPC configuration
   ```

3. **Set up PostgreSQL database:**
   - Use any PostgreSQL provider (AWS RDS, Google Cloud SQL, Railway, etc.)
   - Run the schema: `psql $DATABASE_URL < database/schema.sql`

4. **Build and start:**
   ```bash
   npm run build
   npm run start:dev
   ```

5. **Access API documentation:**
   Open `http://localhost:3001` for Swagger UI

## Container Deployment

### **Docker Build:**
```bash
docker build -t deuro-monitoring .
```

### **Docker Run:**
```bash
docker run -e DATABASE_URL="postgresql://..." -e RPC_URL="https://..." -p 3001:3001 deuro-monitoring
```

### **Deploy Anywhere:**
- **Railway**: Connect GitHub, add PostgreSQL addon
- **Vercel**: Container deployment with external database
- **DigitalOcean App Platform**: Container + managed database
- **AWS ECS/Fargate**: Container + RDS PostgreSQL
- **Google Cloud Run**: Container + Cloud SQL
- **Any Kubernetes cluster**: Standard deployment patterns

## Scripts

- `npm run build` - Build the application
- `npm run start` - Start production server
- `npm run start:dev` - Start development server with watch mode
- `npm run start:debug` - Start with debugging enabled
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run format` - Format code with Prettier