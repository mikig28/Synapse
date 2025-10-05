import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: Mail | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      console.warn('[EmailService] SMTP credentials not configured. Email features will be disabled.');
      this.transporter = null;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: parseInt(smtpPort, 10) === 465, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      console.log('[EmailService] Email service initialized successfully');
    } catch (error) {
      console.error('[EmailService] Failed to initialize email service:', error);
      this.transporter = null;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.error('[EmailService] Email service not configured. Cannot send email.');
      console.error('[EmailService] Please set SMTP environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD');
      return false;
    }

    try {
      const fromName = process.env.SMTP_FROM_NAME || 'SYNAPSE';
      const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

      console.log(`[EmailService] Attempting to send email to ${options.to}...`);
      console.log(`[EmailService] Using SMTP: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);

      const info = await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      console.log(`[EmailService] ✅ Email sent successfully to ${options.to}`);
      console.log(`[EmailService] Message ID: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('[EmailService] ❌ Failed to send email:', error.message);
      console.error('[EmailService] Full error object:', error);
      console.error('[EmailService] Error details:', {
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        stack: error.stack,
      });

      // Provide specific guidance based on error type
      if (error.code === 'EAUTH') {
        console.error('[EmailService] 🔐 AUTHENTICATION FAILED!');
        console.error('[EmailService] Common causes:');
        console.error('[EmailService] 1. Wrong Gmail App Password (should be 16 chars, no spaces)');
        console.error('[EmailService] 2. Using regular password instead of App Password');
        console.error('[EmailService] 3. 2FA not enabled on Gmail account');
        console.error('[EmailService] 4. App Password was revoked or expired');
        console.error('[EmailService] Generate new App Password: https://myaccount.google.com/apppasswords');
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        console.error('[EmailService] 🌐 CONNECTION FAILED!');
        console.error('[EmailService] Check SMTP_HOST and SMTP_PORT are correct');
        console.error('[EmailService] Current: ' + process.env.SMTP_HOST + ':' + process.env.SMTP_PORT);
      }

      return false;
    }
  }

  async sendVerificationEmail(email: string, token: string, fullName?: string): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;
    const displayName = fullName || 'there';

    console.log(`[EmailService] Preparing verification email for ${email}`);
    console.log(`[EmailService] Verification link: ${verificationLink}`);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
            padding: 40px 20px;
          }
          .card {
            background: white;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          }
          .logo {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo-text {
            font-size: 32px;
            font-weight: bold;
            background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          h1 {
            color: #1a1a1a;
            font-size: 24px;
            margin-bottom: 20px;
            text-align: center;
          }
          p {
            color: #555;
            margin-bottom: 20px;
            font-size: 16px;
          }
          .button {
            display: inline-block;
            padding: 16px 40px;
            background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
            color: white !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
            font-size: 16px;
          }
          .button-container {
            text-align: center;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #888;
            font-size: 14px;
          }
          .expiry-notice {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 14px;
            color: #92400e;
          }
          .link-text {
            word-break: break-all;
            font-size: 12px;
            color: #888;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">
              <div class="logo-text">🧠 SYNAPSE</div>
            </div>

            <h1>Welcome to SYNAPSE, ${displayName}!</h1>

            <p>Thank you for signing up. We're excited to have you on board!</p>

            <p>To complete your registration and start using SYNAPSE, please verify your email address by clicking the button below:</p>

            <div class="button-container">
              <a href="${verificationLink}" class="button">Verify Email Address</a>
            </div>

            <div class="expiry-notice">
              ⏰ This verification link will expire in <strong>1 hour</strong> for security reasons.
            </div>

            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <div class="link-text">${verificationLink}</div>

            <div class="footer">
              <p>If you didn't create an account with SYNAPSE, you can safely ignore this email.</p>
              <p>© ${new Date().getFullYear()} SYNAPSE. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to SYNAPSE, ${displayName}!

Thank you for signing up. To complete your registration, please verify your email address by clicking the link below:

${verificationLink}

This link will expire in 1 hour for security reasons.

If you didn't create an account with SYNAPSE, you can safely ignore this email.

© ${new Date().getFullYear()} SYNAPSE. All rights reserved.
    `.trim();

    return this.sendEmail({
      to: email,
      subject: 'Verify Your SYNAPSE Account',
      html,
      text,
    });
  }

  async sendFeedbackEmail(
    userEmail: string,
    userName: string,
    feedbackType: string,
    message: string,
    rating?: number
  ): Promise<boolean> {
    const developerEmail = 'mikig20@gmail.com';
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    console.log(`[EmailService] Preparing feedback email from ${userEmail} (${userName})`);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
            padding: 40px 20px;
          }
          .card {
            background: white;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          }
          .logo {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo-text {
            font-size: 32px;
            font-weight: bold;
            background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          h1 {
            color: #1a1a1a;
            font-size: 24px;
            margin-bottom: 20px;
            text-align: center;
          }
          .info-section {
            background: #f9fafb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .info-row {
            display: flex;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          .info-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }
          .info-label {
            font-weight: 600;
            color: #374151;
            min-width: 120px;
          }
          .info-value {
            color: #6b7280;
          }
          .feedback-type {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .type-bug {
            background: #fee2e2;
            color: #991b1b;
          }
          .type-feature {
            background: #dbeafe;
            color: #1e40af;
          }
          .type-improvement {
            background: #fef3c7;
            color: #92400e;
          }
          .type-other {
            background: #e5e7eb;
            color: #374151;
          }
          .message-box {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 15px;
            line-height: 1.6;
          }
          .rating-stars {
            color: #f59e0b;
            font-size: 24px;
            letter-spacing: 4px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #888;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">
              <div class="logo-text">🧠 SYNAPSE</div>
            </div>

            <h1>📬 New User Feedback</h1>

            <div class="info-section">
              <div class="info-row">
                <span class="info-label">From:</span>
                <span class="info-value">${userName} (${userEmail})</span>
              </div>
              <div class="info-row">
                <span class="info-label">Type:</span>
                <span class="info-value">
                  <span class="feedback-type type-${feedbackType.toLowerCase()}">${feedbackType}</span>
                </span>
              </div>
              ${rating ? `
              <div class="info-row">
                <span class="info-label">Rating:</span>
                <span class="info-value">
                  <span class="rating-stars">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</span>
                  <span style="margin-left: 10px; color: #6b7280;">(${rating}/5)</span>
                </span>
              </div>
              ` : ''}
              <div class="info-row">
                <span class="info-label">Submitted:</span>
                <span class="info-value">${timestamp} UTC</span>
              </div>
            </div>

            <h2 style="color: #374151; font-size: 18px; margin-top: 30px; margin-bottom: 10px;">Message:</h2>
            <div class="message-box">${message}</div>

            <div class="footer">
              <p style="margin: 5px 0; color: #6b7280;">Reply directly to this email to contact the user</p>
              <p style="margin: 5px 0;">© ${new Date().getFullYear()} SYNAPSE Feedback System</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
SYNAPSE USER FEEDBACK
=====================

From: ${userName} (${userEmail})
Type: ${feedbackType}
${rating ? `Rating: ${rating}/5 stars\n` : ''}Submitted: ${timestamp} UTC

MESSAGE:
--------
${message}

---
Reply directly to this email to contact the user.
© ${new Date().getFullYear()} SYNAPSE Feedback System
    `.trim();

    return this.sendEmail({
      to: developerEmail,
      subject: `SYNAPSE Feedback: ${feedbackType} from ${userName}`,
      html,
      text,
    });
  }
}

export default new EmailService();
