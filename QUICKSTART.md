# Quick Start Guide

## Installation

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Set up environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Initialize database:**

   ```bash
   pnpm migrate
   ```

4. **Build the project:**

   ```bash
   pnpm build
   ```

5. **Start the server:**

   ```bash
   # Development (with hot reload)
   pnpm dev

   # Production
   pnpm start
   ```

## First Steps

1. **Generate an API Key:**

   ```bash
   curl -X POST http://localhost:3000/api/v1/api-keys/generate \
     -H "Content-Type: application/json" \
     -d '{
       "name": "YCW Adelaide Website",
       "permissions": ["send_email"],
       "rate_limit": 1000
     }'
   ```

   **Important:** Save the `api_key` value - it's only shown once!

2. **Test sending an email:**

   ```bash
   curl -X POST http://localhost:3000/api/v1/emails/send \
     -H "Authorization: Bearer YOUR_API_KEY_HERE" \
     -H "Content-Type: application/json" \
     -d '{
       "to": "test@example.com",
       "from": "noreply@ycwadelaide.adenmgb.com",
       "subject": "Test Email",
       "html": "<h1>Hello!</h1><p>This is a test email.</p>"
     }'
   ```

3. **Check email status:**
   ```bash
   curl http://localhost:3000/api/v1/emails/MESSAGE_ID_HERE \
     -H "Authorization: Bearer YOUR_API_KEY_HERE"
   ```

## Configuration

### Mail Server Setup

Choose one of the following options:

**Option 1: SendGrid (Recommended)**

```env
SENDGRID_API_KEY=your_sendgrid_api_key
```

**Option 2: Local SMTP (Postfix)**

```env
SMTP_HOST=localhost
SMTP_PORT=25
SMTP_SECURE=false
```

**Option 3: Mailgun**

```env
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_domain.com
```

**Option 4: AWS SES**

```env
AWS_ACCESS_KEY=your_access_key
AWS_SECRET_KEY=your_secret_key
AWS_REGION=us-east-1
```

## Production Deployment

See the main [README.md](README.md) for detailed deployment instructions including:

- PM2 process management
- systemd service setup
- Nginx reverse proxy configuration
- SSL/TLS setup with Let's Encrypt

## Troubleshooting

### Database errors

- Ensure the `database/` directory exists and is writable
- Run `pnpm migrate` to initialize the schema

### Email sending fails

- Verify your mail server configuration in `.env`
- Check that your SMTP credentials are correct
- For SendGrid, ensure your API key is valid
- Check application logs for detailed error messages

### API key validation fails

- Ensure you're using the full API key (starts with `yk_live_`)
- Check that the API key hasn't been revoked
- Verify the API key hasn't expired

## Support

For issues or questions, refer to the main README.md or contact the development team.
