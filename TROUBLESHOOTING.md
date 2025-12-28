# Troubleshooting Guide

## Service Not Starting After Reboot

If the service works on localhost but not via domain after a reboot, check the following:

### 1. Check if the Application is Running

```bash
# Check if Node.js process is running
ps aux | grep node

# Or check specific port
sudo netstat -tlnp | grep :3000
# Or
sudo ss -tlnp | grep :3000
```

### 2. Check PM2 Status (if using PM2)

```bash
pm2 list
pm2 status
pm2 logs email-service
```

If not running, start it:

```bash
cd ~/ycw-email-relay
pm2 start dist/index.js --name email-service
pm2 save
```

### 3. Check systemd Service (if using systemd)

```bash
# Check service status
sudo systemctl status email-service

# Check if enabled to start on boot
sudo systemctl is-enabled email-service

# If not enabled, enable it:
sudo systemctl enable email-service
sudo systemctl start email-service
```

### 4. Check Nginx Status

```bash
# Check if Nginx is running
sudo systemctl status nginx

# If not running, start it:
sudo systemctl start nginx
sudo systemctl enable nginx

# Check Nginx configuration
sudo nginx -t

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### 5. Check Firewall

```bash
# Check if port 80/443 is open
sudo ufw status

# If needed, allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### 6. Quick Fix: Start Everything Manually

```bash
# Start the application
cd ~/ycw-email-relay
pnpm start &
# Or with PM2:
pm2 start dist/index.js --name email-service
pm2 save

# Start Nginx
sudo systemctl start nginx

# Verify it's working
curl http://localhost:3000/health
curl https://email.ycwadelaide.adenmgb.com/health
```

## Setting Up Auto-Start (Choose One Method)

### Option 1: PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
cd ~/ycw-email-relay
pm2 start dist/index.js --name email-service

# Save PM2 configuration
pm2 save

# Generate startup script
pm2 startup
# Follow the instructions it outputs (usually involves running a sudo command)

# Verify it's set up
pm2 list
```

### Option 2: systemd Service

Create `/etc/systemd/system/email-service.service`:

```bash
sudo nano /etc/systemd/system/email-service.service
```

Add this content (adjust paths as needed):

```ini
[Unit]
Description=YCW Email Relay Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/ycw-email-relay
ExecStart=/usr/bin/node /home/ubuntu/ycw-email-relay/dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/home/ubuntu/ycw-email-relay/.env

[Install]
WantedBy=multi-user.target
```

Then:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable email-service

# Start the service
sudo systemctl start email-service

# Check status
sudo systemctl status email-service
```

## Common Issues

### Port Already in Use

```bash
# Find what's using port 3000
sudo lsof -i :3000
# Or
sudo netstat -tlnp | grep :3000

# Kill the process if needed
sudo kill -9 <PID>
```

### Permission Denied

```bash
# Make sure the user has permissions
sudo chown -R ubuntu:ubuntu ~/ycw-email-relay
chmod +x dist/index.js
```

### Environment Variables Not Loading

```bash
# Check .env file exists
ls -la ~/ycw-email-relay/.env

# Verify it's readable
cat ~/ycw-email-relay/.env
```
