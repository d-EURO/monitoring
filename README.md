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
- **Docker Ready**: Self-contained containerization for cloud deployment
- **Azure Integration**: Complete Azure deployment with Container Apps and PostgreSQL

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
   # Edit .env.monitoring with your configuration
   ```

3. **Build the application:**
   ```bash
   npm run build
   ```

4. **Start development server:**
   ```bash
   npm run start:dev
   ```

5. **Access API documentation:**
   Open `http://localhost:3001` for Swagger UI

## Scripts

- `npm run build` - Build the application
- `npm run start` - Start production server
- `npm run start:dev` - Start development server with watch mode
- `npm run start:debug` - Start with debugging enabled
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run format` - Format code with Prettier