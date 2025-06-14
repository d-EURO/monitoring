# dEURO Monitoring V2 with NestJS API

A comprehensive monitoring system for the dEURO protocol built with NestJS, featuring PostgreSQL database persistence, scheduled monitoring tasks, and REST API endpoints for frontend integration.

## Architecture

```
src/
├── monitoring.main.ts         # NestJS bootstrap
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