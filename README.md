# dEURO Monitoring V2 with Database Persistence

A comprehensive monitoring system for the dEURO protocol with PostgreSQL database persistence, designed for self-contained Docker deployment on Azure.

## Features

- **Complete Event Monitoring**: Tracks all protocol events with dedicated database tables
- **Daily State Snapshots**: Captures daily protocol state with automatic updates
- **Incremental Processing**: Only fetches new events since last monitoring cycle
- **Database Persistence**: PostgreSQL with optimized schemas for fast queries
- **Docker Ready**: Self-contained containerization for cloud deployment
- **Azure Integration**: Complete Azure deployment with Container Apps and PostgreSQL