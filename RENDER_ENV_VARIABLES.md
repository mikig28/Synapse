# Render Environment Variables - Email Verification

## Quick Setup for Render.com

Add these environment variables to your Render backend service dashboard:

### Required Email Service Variables

```bash
# SMTP Configuration (Gmail Example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM_NAME=SYNAPSE
SMTP_FROM_EMAIL=noreply@synapse.ai

# Frontend URL for verification links
FRONTEND_URL=https://synapse-frontend.onrender.com
```

## Gmail App Password Setup

1. Go to your Google Account: https://myaccount.google.com
2. Navigate to **Security** → **2-Step Verification** (enable if not already)
3. Scroll to **App passwords** → Click to generate
4. Select **Mail** and **Other (Custom name)** → Name it "SYNAPSE"
5. Copy the 16-character password
6. Use this as `SMTP_PASSWORD` in Render environment variables

**Important**: Use the App Password, NOT your regular Gmail password!

## Adding Variables to Render

1. Go to your Render dashboard
2. Select your backend service: `synapse-backend-7lq6`
3. Click **Environment** tab
4. Click **Add Environment Variable**
5. Add each variable from the list above
6. Click **Save Changes**
7. Render will automatically redeploy your service

## Alternative SMTP Providers

### SendGrid (Recommended for production)
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

### AWS SES
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
```

## Testing After Setup

1. Wait for Render to redeploy (2-3 minutes)
2. Go to: https://synapse-frontend.onrender.com/register
3. Register a new test account
4. Check your email for verification link
5. Click verification link
6. Should redirect to: https://synapse-frontend.onrender.com/verify-email?token=xxx
7. After verification, login should work

## Verification Email Sample

**Subject**: Verify Your SYNAPSE Account

**Content**:
- Welcome message with user's name
- "Verify Email Address" button (links to frontend)
- 1-hour expiration notice
- Plain text link as backup
- SYNAPSE branding

## Troubleshooting

### Email not sending
- Check Render logs for SMTP errors
- Verify SMTP credentials are correct
- For Gmail: Ensure App Password is used, not regular password
- Check SMTP_PORT is 587 (not 465)

### Verification link not working
- Ensure FRONTEND_URL is exactly: `https://synapse-frontend.onrender.com`
- No trailing slash in FRONTEND_URL
- Check token hasn't expired (1 hour limit)

### Rate limit errors
- Resend is limited to 3 requests per 15 minutes per IP
- Wait 15 minutes before trying again

## Current Setup Summary

- **Backend**: https://synapse-backend-7lq6.onrender.com
- **Frontend**: https://synapse-frontend.onrender.com
- **Database**: MongoDB Atlas
- **Email Flow**: Nodemailer → SMTP → User inbox
- **Verification Link**: https://synapse-frontend.onrender.com/verify-email?token=xxx

## Security Notes

- Verification tokens are hashed before storage (SHA-256)
- Tokens expire after 1 hour
- Tokens are single-use (deleted after verification)
- Google OAuth users bypass email verification (trusted provider)
- Rate limiting prevents email spam abuse

## Next Steps After Setup

1. ✅ Add environment variables to Render
2. ✅ Generate Gmail App Password
3. ✅ Wait for Render redeploy
4. ✅ Test registration flow
5. ✅ Verify email delivery
6. ✅ Test verification link
7. ✅ Test login with verified account
8. ✅ Confirm Google OAuth still works

## Support

If you encounter issues:
1. Check Render service logs
2. Verify all environment variables are set
3. Test SMTP credentials manually
4. Review `EMAIL_VERIFICATION_SETUP.md` for detailed troubleshooting
