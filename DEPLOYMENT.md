# Deployment Guide

## Problem: Dashboard Crashes with nohup

When running the dashboard with `nohup npx next start`, it crashes periodically (every 45-90 minutes) due to:

1. **No process supervision** — If Next.js crashes, nothing restarts it
2. **Resource limits** — System may kill the process under load
3. **No crash recovery** — Errors cause permanent downtime until manual restart

## Solution: Use PM2

PM2 is a production-grade process manager that provides:
- ✅ **Auto-restart** on crash
- ✅ **Memory monitoring** with auto-restart limits
- ✅ **Log management** and rotation
- ✅ **Boot persistence** (survives system reboots)
- ✅ **Monitoring dashboard** for real-time stats

### Quick Start

```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Build the dashboard
npm run build

# 3. Start with PM2
pm2 start ecosystem.config.js

# 4. (Optional) Enable auto-start on boot
pm2 startup
pm2 save
```

### Common Commands

```bash
pm2 status              # View running processes
pm2 logs                # Stream logs
pm2 monit               # Real-time monitoring dashboard
pm2 restart openclaw-dashboard  # Restart the dashboard
pm2 stop openclaw-dashboard     # Stop the dashboard
pm2 delete openclaw-dashboard   # Remove from PM2
```

### Configuration

The `ecosystem.config.js` file contains PM2 configuration:

- **max_memory_restart**: Auto-restart if process exceeds 512MB
- **autorestart**: Automatically restart on crash
- **error_file/out_file**: Separate error and output logs
- **time**: Timestamp all log entries

### Log Management

Logs are stored in `./logs/`:
- `error.log` — Error output
- `out.log` — Standard output
- `combined.log` — Both streams merged

Rotate logs with pm2-logrotate:
```bash
pm2 install pm2-logrotate
```

### Migration from nohup

**Old method (fragile):**
```bash
nohup npx next start -p 3003 -H 0.0.0.0 > logs/next.out 2>&1 &
```

**New method (production-ready):**
```bash
pm2 start ecosystem.config.js
```

### Troubleshooting

**Dashboard not starting?**
```bash
pm2 logs openclaw-dashboard --lines 50
```

**High memory usage?**
```bash
pm2 monit  # Check real-time memory usage
```

**Need to restart?**
```bash
pm2 restart openclaw-dashboard
```

### Production Deployment

For production servers, consider:
1. Use `pm2 startup` to enable boot persistence
2. Set up `pm2-logrotate` to prevent disk space issues
3. Monitor with `pm2 plus` (optional paid service)
4. Use reverse proxy (nginx/caddy) for SSL and caching

## Why PM2 vs nohup?

| Feature | nohup | PM2 |
|---------|-------|-----|
| Auto-restart on crash | ❌ | ✅ |
| Memory monitoring | ❌ | ✅ |
| Log rotation | ❌ | ✅ (with plugin) |
| Boot persistence | ❌ | ✅ |
| Monitoring dashboard | ❌ | ✅ |
| Process management | ❌ | ✅ |
| Zero-downtime reload | ❌ | ✅ |

PM2 is the industry standard for Node.js process management in production.
