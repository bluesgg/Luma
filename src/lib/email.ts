import { logger } from '@/lib/logger';
/**
 * Email service for sending verification and password reset emails
 * In development, logs to console. In production, would use email service provider.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const APP_NAME = 'Luma Web';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send an email (mock implementation for development)
 * In production, replace with actual email service (Resend, SendGrid, etc.)
 */
async function sendEmail(options: EmailOptions): Promise<void> {
  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    logger.info('📧 Email sent:', {
      to: options.to,
      subject: options.subject,
    });
    return;
  }

  // In production, integrate with email service provider
  // Example with Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: 'noreply@luma.app',
  //   to: options.to,
  //   subject: options.subject,
  //   html: options.html,
  // });
}

/**
 * Send email verification email
 * @param email - Recipient email address
 * @param token - Verification token
 */
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verifyUrl = `${APP_URL}/verify?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #0070f3;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Welcome to ${APP_NAME}!</h2>
          <p>Thank you for registering. Please verify your email address to activate your account.</p>
          <a href="${verifyUrl}" class="button">Verify Email</a>
          <p>Or copy and paste this link into your browser:</p>
          <p>${verifyUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <div class="footer">
            <p>If you didn't create an account, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Welcome to ${APP_NAME}!

Thank you for registering. Please verify your email address to activate your account.

Verification link: ${verifyUrl}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.
  `;

  await sendEmail({
    to: email,
    subject: `Verify your ${APP_NAME} account`,
    html,
    text,
  });
}

/**
 * Send password reset email
 * @param email - Recipient email address
 * @param token - Reset token
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #0070f3;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .warning { background-color: #fff3cd; padding: 10px; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password for your ${APP_NAME} account.</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p>${resetUrl}</p>
          <div class="warning">
            <strong>Important:</strong> This link will expire in 1 hour.
          </div>
          <div class="footer">
            <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Password Reset Request

We received a request to reset your password for your ${APP_NAME} account.

Reset link: ${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
  `;

  await sendEmail({
    to: email,
    subject: `Reset your ${APP_NAME} password`,
    html,
    text,
  });
}
