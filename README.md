# dEURO Monitoring V2 with NestJS API

A comprehensive monitoring system for the dEURO protocol built with NestJS, featuring PostgreSQL database persistence, scheduled monitoring tasks, and REST API endpoints for frontend integration.

## Local Development Setup

```bash
# 1. Reset the database
node reset_database.js

# 2. Build the project
npm run build

# 3. Start monitoring in the background
nohup npm run start:prod > monitoring.log 2>&1 &

# 4. (Optional) Monitor the log file in real-time
tail -f monitoring.log

# Or as a one-liner:
node reset_database.js && npm run build && npm run start:prod > monitoring.log 2>&1 &

# To check if it's running:
# Check the process
ps aux | grep "node.*monitoring" | grep -v grep

# Check the latest logs
tail -n 50 monitoring.log

# To stop it later:
# Find the process ID
ps aux | grep "node dist/main.js"

# Kill it
kill <PID>
```

The 2>&1 redirects both stdout and stderr to the log file, and & runs it in the background.
