# Email Verification Setup Guide

## Overview
This guide explains how to configure email verification for your SYNAPSE deployment on Render.com with MongoDB Atlas.

## Feature Summary
- ✅ Email verification required for email/password signups
- ✅ Google OAuth users auto-verified (trusted provider)
- ✅ JWT tokens with 1-hour expiration for security
- ✅ Rate limiting to prevent abuse (3 resend requests per 15 minutes)
- ✅ Professional HTML email templates with SYNAPSE branding
- ✅ Resend verification functionality for expired links

## Environment Variables Configuration

### Required Environment Variables (Render Dashboard)

Navigate to your Render service dashboard and add the following environment variables:

#### Email Service Configuration
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM_NAME=SYNAPSE
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

#### Frontend URL (for verification links)
```bash
FRONTEND_URL=https://your-frontend-domain.com
```

### Gmail Setup Instructions

If using Gmail as your SMTP provider:

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password
   - Use this as `SMTP_PASSWORD` (NOT your regular Gmail password)

3. **Alternative: Use App-Specific Password**:
   ```
   Settings → Security → 2-Step Verification → App Passwords
   ```

### Alternative SMTP Providers

#### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

#### AWS SES
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
```

#### Mailgun
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgunapp.com
SMTP_PASSWORD=your-mailgun-smtp-password
```

## User Flow

### Email/Password Registration
1. User fills out registration form with email and password
2. Account created but **not verified** (cannot login yet)
3. Verification email sent with 1-hour token
4. User clicks verification link in email
5. Email verified → User redirected to login
6. User can now login with credentials

### Google OAuth Registration
1. User clicks "Sign in with Google"
2. Google authentication completes
3. Account created with `isEmailVerified: true` automatically
4. User immediately logged in → Dashboard access

## API Endpoints

### Registration
```
POST /api/v1/auth/register
Body: { fullName, email, password }
Response: { success: true, message: "Check your email...", requiresVerification: true }
```

### Email Verification
```
GET /api/v1/auth/verify-email/:token
Response: { success: true, message: "Email verified successfully!", email }
```

### Resend Verification (Rate Limited)
```
POST /api/v1/auth/resend-verification
Body: { email }
Response: { success: true, message: "Verification email sent!" }
```

### Login
```
POST /api/v1/auth/login
Body: { email, password }
Response (unverified): 403 { message: "Please verify your email...", requiresVerification: true }
Response (verified): 200 { _id, fullName, email, token }
```

## Frontend Routes

- `/register` - Registration page
- `/verify-email?token=xxx` - Email verification page
- `/login` - Login page

## Security Features

### Token Security
- Verification tokens are 32-byte random hex strings
- Tokens are hashed (SHA-256) before database storage
- Tokens expire after 1 hour
- Tokens are single-use (deleted after verification)

### Rate Limiting
- Resend verification: 3 requests per 15 minutes per IP
- Prevents email spam and abuse

### Protected Routes
- All authenticated routes check `isEmailVerified` flag
- Unverified users blocked with 403 error
- Google OAuth users bypass verification check

## Database Schema

### User Model Updates
```typescript
interface IUser {
  email: string;
  password?: string;
  googleId?: string;
  isEmailVerified: boolean; // Default: false
  emailVerificationToken?: string; // Hashed token
  emailVerificationExpires?: Date; // 1 hour from creation
}
```

## Troubleshooting

### Email Not Sending
1. Check SMTP credentials in Render environment variables
2. Verify SMTP_PORT is correct (587 for TLS, 465 for SSL)
3. For Gmail: Ensure App Password is used, not regular password
4. Check backend logs for email service errors

### Verification Link Not Working
1. Ensure FRONTEND_URL matches your actual frontend domain
2. Check token hasn't expired (1 hour limit)
3. Verify `/verify-email` route is configured in frontend router
4. Check browser console for API errors

### Rate Limiting Issues
1. Wait 15 minutes before requesting new verification email
2. Rate limit resets every 15 minutes
3. Contact admin if persistent issues

## Testing Locally

### Local Development Setup
```bash
# .env (backend)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_NAME=SYNAPSE
SMTP_FROM_EMAIL=noreply@localhost
FRONTEND_URL=http://localhost:5173
```

### Install Dependencies
```bash
cd src/backend
npm install
```

### Run Backend
```bash
npm run dev
```

### Test Flow
1. Register new user at http://localhost:5173/register
2. Check email inbox for verification link
3. Click link → Redirected to verification page
4. Login at http://localhost:5173/login

## Production Deployment Checklist

- [ ] SMTP credentials added to Render environment variables
- [ ] FRONTEND_URL points to production domain
- [ ] Gmail App Password generated (if using Gmail)
- [ ] Test registration flow end-to-end
- [ ] Verify emails are being received
- [ ] Test verification link clicks
- [ ] Test rate limiting on resend endpoint
- [ ] Test Google OAuth still works (auto-verified)
- [ ] Monitor backend logs for email service errors

## MongoDB Atlas Considerations

No special MongoDB configuration required. The User model schema automatically includes email verification fields. Existing users will have:
- `isEmailVerified: false` (default for old accounts)
- Can be manually updated in Atlas if needed

## Support

For issues:
1. Check Render service logs for email errors
2. Verify environment variables are set correctly
3. Test SMTP connection using nodemailer test tools
4. Review backend API responses in browser DevTools

## Additional Resources

- [Nodemailer Documentation](https://nodemailer.com/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [Render Environment Variables](https://render.com/docs/configure-environment-variables)
