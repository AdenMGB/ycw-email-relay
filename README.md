# YCW Email Relay Service

A standalone email service application that runs on a VPS with a mailserver, providing API endpoints for sending emails. This service is used by the YCW Adelaide website (Cloudflare Workers) to send transactional emails.

## Features

- 🔐 API Key-based authentication
- 📧 Email sending (single and bulk)
- 📊 Email logging and status tracking
- ⚡ Rate limiting per API key
- 🗄️ JSON file storage (simple and lightweight, no database server required)
- 🔒 Security best practices (Helmet, CORS, input validation)
- 📝 Comprehensive logging

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js 4.x
- **Language:** TypeScript
- **Database:** JSON file storage (no database server required)
- **Email:** Nodemailer (supports Postfix, SendGrid, Mailgun, AWS SES)

## Quick Start

### Prerequisites

- Node.js 18+ installed
- pnpm (or npm/yarn)
- Mail server configured (Postfix, SendGrid, Mailgun, or AWS SES)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd ycw-email-relay
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Initialize the storage:

```bash
pnpm migrate
```

5. Build the project:

```bash
pnpm build
```

6. Start the server:

```bash
pnpm start
```

For development with hot reload:

```bash
pnpm dev
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options. Key variables:

- `PORT`: Server port (default: 3000)
- `DATABASE_PATH`: Path to database directory (default: `./database`)
- `SMTP_HOST`: SMTP server hostname
- `SMTP_PORT`: SMTP server port
- `DEFAULT_FROM_EMAIL`: Default sender email address
- `CORS_ORIGIN`: Allowed CORS origins (use `*` for all)

### Mail Server Setup

The service supports multiple mail server options (in priority order):

1. **SendGrid** (recommended for production)
   - Set `SENDGRID_API_KEY` in `.env`

2. **Mailgun**
   - Set `MAILGUN_API_KEY` and `MAILGUN_DOMAIN` in `.env`

3. **AWS SES**
   - Set `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, and `AWS_REGION` in `.env`

4. **Local SMTP (Postfix)**
   - Set `SMTP_HOST`, `SMTP_PORT`, and optionally `SMTP_USER`/`SMTP_PASS` in `.env`

## API Endpoints

Base URL: `http://localhost:3000/api/v1`

### Health Check

```
GET /health
```

### Generate API Key

```
POST /api-keys/generate
Content-Type: application/json

{
  "name": "YCW Adelaide Website",
  "permissions": ["send_email"],
  "rate_limit": 1000,
  "expires_at": "2026-12-31T23:59:59Z" // Optional
}
```

### List API Keys

```
GET /api-keys
Authorization: Bearer <api_key>
```

### Revoke API Key

```
DELETE /api-keys/:client_id
Authorization: Bearer <api_key>
```

### Send Email

```
POST /emails/send
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "to": "user@example.com",
  "from": "noreply@ycwadelaide.adenmgb.com",
  "subject": "Welcome to YCW Adelaide Newsletter",
  "html": "<h1>Welcome!</h1><p>Thank you for subscribing.</p>",
  "text": "Welcome! Thank you for subscribing.",
  "reply_to": "contact@ycwadelaide.adenmgb.com"
}
```

### Send Bulk Email

```
POST /emails/send-bulk
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "recipients": ["user1@example.com", "user2@example.com"],
  "from": "noreply@ycwadelaide.adenmgb.com",
  "subject": "Newsletter Update",
  "html": "<h1>Newsletter</h1><p>Content here...</p>",
  "reply_to": "contact@ycwadelaide.adenmgb.com"
}
```

### Get Email Status

```
GET /emails/:message_id
Authorization: Bearer <api_key>
```

### Get Email Logs

```
GET /emails/logs?limit=50&offset=0&status=sent
Authorization: Bearer <api_key>
```

## Deployment

### Using PM2

1. Install PM2 globally:

```bash
npm install -g pm2
```

2. Start the application:

```bash
pm2 start dist/index.js --name email-service
pm2 save
pm2 startup # Follow instructions to enable on boot
```

### Using systemd

Create `/etc/systemd/system/email-service.service`:

```ini
[Unit]
Description=YCW Email Relay Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/email-service
ExecStart=/usr/bin/node /var/www/email-service/dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/var/www/email-service/.env

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable email-service
sudo systemctl start email-service
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name email.ycwadelaide.adenmgb.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL Setup (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d email.ycwadelaide.adenmgb.com
```

## Integration with Cloudflare Workers

Add the email service API key to your Cloudflare Workers environment variables:

```typescript
// In your Cloudflare Worker
const EMAIL_SERVICE_URL = 'https://email.ycwadelaide.adenmgb.com/api/v1'
const EMAIL_SERVICE_API_KEY = env.EMAIL_SERVICE_API_KEY

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch(`${EMAIL_SERVICE_URL}/emails/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${EMAIL_SERVICE_API_KEY}`,
    },
    body: JSON.stringify({
      to,
      from: 'noreply@ycwadelaide.adenmgb.com',
      subject,
      html,
    }),
  })

  return await response.json()
}
```

## Testing

### Health Check

```bash
curl http://localhost:3000/health
```

### Generate API Key

```bash
curl -X POST http://localhost:3000/api/v1/api-keys/generate \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Key", "permissions": ["send_email"]}'
```

### Send Email

```bash
curl -X POST http://localhost:3000/api/v1/emails/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "from": "noreply@ycwadelaide.adenmgb.com",
    "subject": "Test Email",
    "html": "<h1>Test</h1><p>This is a test email.</p>"
  }'
```

## Project Structure

```
email-service/
├── src/
│   ├── index.ts                 # Main application entry point
│   ├── config/
│   │   └── config.ts            # Configuration management
│   ├── database/
│   │   ├── jsonStorage.ts       # JSON file storage system
│   │   └── migrate.ts           # Storage initialization script
│   ├── models/
│   │   ├── apiKey.ts            # API key model
│   │   └── emailLog.ts          # Email log model
│   ├── services/
│   │   ├── apiKeyService.ts     # API key generation/validation
│   │   ├── emailService.ts      # Email sending logic
│   │   └── mailServer.ts        # Mail server configuration
│   ├── middleware/
│   │   ├── auth.ts              # Authentication middleware
│   │   ├── validation.ts        # Input validation
│   │   └── rateLimit.ts         # Rate limiting
│   ├── routes/
│   │   ├── api.ts               # API routes
│   │   ├── apiKeys.ts           # API key routes
│   │   ├── emails.ts            # Email routes
│   │   └── health.ts            # Health check route
│   └── utils/
│       ├── logger.ts            # Logging utility
│       └── errors.ts            # Error classes
├── database/                    # Database files (created at runtime)
├── .env.example                 # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

## Security Considerations

- API keys are hashed using bcrypt before storage
- Rate limiting per API key
- Input validation on all endpoints
- CORS protection
- Helmet.js for security headers
- SQL injection protection via parameterized queries

## Troubleshooting

### Storage errors

- Ensure the `database/` directory exists and is writable
- Run `pnpm migrate` to initialize the storage files
- Check file permissions on the `database/` directory
- Ensure sufficient disk space is available

### Email sending fails

- Verify your mail server configuration in `.env`
- Check that your SMTP credentials are correct
- For SendGrid, ensure your API key is valid
- Check application logs for detailed error messages
- Test SMTP connection: `telnet <smtp-host> <smtp-port>`

### API key validation fails

- Ensure you're using the full API key (starts with `yk_live_`)
- Check that the API key hasn't been revoked
- Verify the API key hasn't expired

## License

Private - YCW Adelaide

## Support

For issues or questions, contact the development team.
