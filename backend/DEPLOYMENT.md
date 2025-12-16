# Backend Deployment Guide for VPS

This guide will help you deploy the Crossflow backend API server on a VPS (Virtual Private Server).

## Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- Node.js 18+ installed
- npm or yarn package manager
- PostgreSQL or SQLite database
- Domain name (optional, for production)
- Reverse proxy (nginx recommended)
- Process manager (PM2 recommended)

## Step 1: Server Setup

### Install Node.js

```bash
# Using NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### Install nginx (Reverse Proxy)

```bash
sudo apt update
sudo apt install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Step 2: Application Setup

### Clone and Install Dependencies

```bash
# Navigate to your deployment directory
cd /opt
sudo git clone <your-repo-url> tempo
cd tempo/backend

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Environment Variables

Create a `.env` file in the `backend` directory:

```bash
sudo nano backend/.env
```

Required environment variables:

```env
# Server
NODE_ENV=production
PORT=4000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/crossflow
# OR for SQLite:
# DATABASE_URL=sqlite:///var/lib/crossflow/database.db

# Blockchain (Tempo Testnet)
# Primary RPC URL
TEMPO_RPC_URL=https://rpc.testnet.tempo.xyz

# Fallback RPC URLs (comma-separated) - used if primary fails
# Recommended to add fallbacks for better reliability
TEMPO_RPC_URLS=https://rpc.testnet.tempo.xyz,https://tempo-testnet.rpc.thirdweb.com

# Token Contract Addresses (configure in .env)
# Legacy: TEMPO_USDC_CONTRACT_ADDRESS (defaults to AlphaUSD)
TEMPO_USDC_CONTRACT_ADDRESS=0x20c0000000000000000000000000000000000001

# Individual token addresses (recommended)
TEMPO_ALPHAUSD_CONTRACT_ADDRESS=0x20c0000000000000000000000000000000000001
TEMPO_BETAUSD_CONTRACT_ADDRESS=0x20c0000000000000000000000000000000000002
TEMPO_THETAUSD_CONTRACT_ADDRESS=0x20c0000000000000000000000000000000000003

OFFRAMP_PRIVATE_KEY=your_offramp_wallet_private_key

# Tempo Fee Payer (Sponsor Gas) - Separate server on port 3100
TEMPO_FEE_PAYER_PRIVATE_KEY=your_fee_payer_wallet_private_key
TEMPO_FEE_PAYER_PORT=3100

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Resend)
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@toanbm.xyz

# CORS
ALLOWED_ORIGINS=https://toanbm.xyz,https://www.toanbm.xyz
CORS_ALLOW_ORIGIN=https://toanbm.xyz
```

### Initialize Database

For SQLite:
```bash
npm run init-db
```

For PostgreSQL:
```bash
# Create database
sudo -u postgres psql
CREATE DATABASE crossflow;
CREATE USER crossflow_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE crossflow TO crossflow_user;
\q

# Run SQL schema
psql -U crossflow_user -d crossflow -f src/config/database.sql
```

## Step 3: Run with PM2

### Start Main Backend Server (port 4000)

```bash
# Start the application
pm2 start dist/server.js --name crossflow-backend

# View logs
pm2 logs crossflow-backend
```

### Start Tempo Fee Payer Server (port 3100)

```bash
# Start fee payer server (for sponsoring gas fees)
pm2 start dist/tempoFeePayerServer.js --name tempo-fee-payer

# View logs
pm2 logs tempo-fee-payer
```

### PM2 Management

```bash
# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown

# View all processes
pm2 list

# Monitor all
pm2 monit

# Restart all
pm2 restart all
```

## Step 4: Configure nginx (Reverse Proxy)

Create nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/crossflow-backend
```

Add configuration:

```nginx
server {
    listen 80;
    server_name api.toanbm.xyz;

    # Stripe webhook endpoint - preserve raw body for signature verification
    location /api/webhooks/stripe {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CRITICAL: Disable buffering to preserve raw body for Stripe signature verification
        proxy_buffering off;
        proxy_request_buffering off;
        
        # Preserve request body
        proxy_set_header Content-Length $content_length;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # All other routes
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/crossflow-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 5: SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.toanbm.xyz

# Auto-renewal is set up automatically
```

## Step 6: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

## Step 7: Stripe Webhook Setup

1. In Stripe Dashboard, go to Webhooks
2. Add endpoint: `https://api.toanbm.xyz/api/webhooks/stripe`
3. Select events: `payment_intent.succeeded`, `payout.paid`, `payout.failed`, `payout.canceled`
4. Copy webhook secret and add to `.env` as `STRIPE_WEBHOOK_SECRET`
5. **Important:** Make sure SSL certificate is configured (Step 5) - Stripe requires HTTPS for webhooks

## Step 8: Monitoring and Maintenance

### View Logs

```bash
# PM2 logs
pm2 logs crossflow-backend

# Winston logs (if configured)
tail -f error.log
tail -f combined.log
```

### Restart Application

```bash
# Restart main backend
pm2 restart crossflow-backend

# Restart fee payer server
pm2 restart tempo-fee-payer

# Or restart all
pm2 restart all
```

### Update Application

```bash
cd /opt/tempo/backend
git pull
npm install
npm run build
pm2 restart crossflow-backend
```

### Health Check

```bash
curl http://localhost:4000/health
# Should return: {"status":"ok","timestamp":"..."}
```

## Troubleshooting

### Application not starting

1. Check PM2 logs: `pm2 logs crossflow-backend`
2. Check environment variables are set correctly
3. Verify database connection
4. Check port 4000 is not in use: `sudo lsof -i :4000`

### Database connection errors

1. Verify database credentials in `.env`
2. Check database is running: `sudo systemctl status postgresql`
3. Test connection manually
4. Check database permissions

### Webhook not working

1. Verify `STRIPE_WEBHOOK_SECRET` is correct
2. Check nginx is forwarding requests correctly
3. Verify webhook endpoint is accessible from Stripe
4. Check PM2 logs for webhook errors

### High memory usage

1. Monitor with `pm2 monit`
2. Restart application periodically: `pm2 restart crossflow-backend`
3. Consider increasing server RAM or optimizing code

## Security Best Practices

1. **Never commit `.env` file** to version control
2. **Use strong passwords** for database and API keys
3. **Keep dependencies updated**: `npm audit` and `npm update`
4. **Use HTTPS only** in production
5. **Restrict CORS origins** to your frontend domain only
6. **Enable rate limiting** (already configured in code)
7. **Regular backups** of database
8. **Monitor logs** for suspicious activity
9. **Keep Node.js updated** for security patches
10. **Use non-root user** for running application (optional)

## Backup Strategy

### Database Backup (PostgreSQL)

```bash
# Daily backup script
pg_dump -U crossflow_user crossflow > backup_$(date +%Y%m%d).sql

# Restore
psql -U crossflow_user crossflow < backup_20240101.sql
```

### Database Backup (SQLite)

```bash
# Copy database file
cp /var/lib/crossflow/database.db backup_$(date +%Y%m%d).db
```

### Automated Backups

Consider setting up a cron job for automated backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * pg_dump -U crossflow_user crossflow > /backups/db_$(date +\%Y\%m\%d).sql
```

## Scaling Considerations

For higher traffic, consider:

1. **Load balancing**: Use nginx as load balancer with multiple backend instances
2. **Database optimization**: Add indexes, connection pooling
3. **Caching**: Add Redis for frequently accessed data
4. **CDN**: Use CDN for static assets
5. **Monitoring**: Set up monitoring tools (Prometheus, Grafana)
6. **Horizontal scaling**: Run multiple PM2 instances: `pm2 start dist/server.js -i 4`

