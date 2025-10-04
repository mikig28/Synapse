import { Request, Response } from 'express';
import emailService from '../../services/emailService';

/**
 * Test email sending - for debugging SMTP issues
 * Send a test email to verify SMTP configuration
 */
export const sendTestEmail = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email address is required',
    });
  }

  console.log(`[TestEmail] Attempting to send test email to ${email}`);

  try {
    // Send a simple test email
    const emailSent = await emailService.sendVerificationEmail(
      email,
      'test-token-12345',
      'Test User'
    );

    if (emailSent) {
      return res.json({
        success: true,
        message: `Test email sent successfully to ${email}`,
        note: 'Check your inbox and spam folder',
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send test email. Check server logs for details.',
        note: 'SMTP might be misconfigured or Gmail App Password might be incorrect',
      });
    }
  } catch (error: any) {
    console.error('[TestEmail] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error sending test email',
      error: error.message,
    });
  }
};

export const testEmailController = {
  sendTestEmail,
};
