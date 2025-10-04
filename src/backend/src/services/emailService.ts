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
      return false;
    }

    try {
      const fromName = process.env.SMTP_FROM_NAME || 'SYNAPSE';
      const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      console.log(`[EmailService] Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
      return false;
    }
  }

  async sendVerificationEmail(email: string, token: string, fullName?: string): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;
    const displayName = fullName || 'there';

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
}

export default new EmailService();
