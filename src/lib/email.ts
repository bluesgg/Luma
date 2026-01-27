import { logger } from './logger'

/**
 * Email service integration
 * Uses Resend API in production, console.log in development
 */

interface EmailOptions {
  to: string
  subject: string
  html: string
}

/**
 * Send an email using Resend API or console.log for development
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, html } = options

  // Validate inputs
  if (!to || !subject || !html) {
    throw new Error('Missing required email fields')
  }

  // In development or if Resend is not configured, log to console
  if (process.env.NODE_ENV !== 'production' || !process.env.RESEND_API_KEY) {
    logger.info('='.repeat(80))
    logger.info('📧 Email (Development Mode)')
    logger.info('='.repeat(80))
    logger.info(`To: ${to}`)
    logger.info(`Subject: ${subject}`)
    logger.info(`HTML: ${html}`)
    logger.info('='.repeat(80))
    return
  }

  // In production, use Resend API
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'noreply@luma.app',
        to,
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to send email: ${error}`)
    }

    logger.info(`Email sent successfully to ${to}`)
  } catch (error) {
    logger.error('Failed to send email', error)
    // Don't throw - log and continue
    // We don't want email failures to break the application flow
  }
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  // Ensure token is properly encoded for URL
  const encodedToken = encodeURIComponent(token)
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify?token=${encodedToken}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - Luma</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 40px; text-align: center;">
            <h1 style="color: #111827; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">
              Welcome to Luma!
            </h1>
            <p style="color: #6b7280; margin: 0 0 32px 0; font-size: 16px; line-height: 1.5;">
              Thank you for signing up. Please verify your email address to get started.
            </p>
            <a href="${verificationUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 16px; font-weight: 500;">
              Verify Email Address
            </a>
            <p style="color: #9ca3af; margin: 32px 0 0 0; font-size: 14px;">
              This link will expire in 24 hours.
            </p>
            <p style="color: #9ca3af; margin: 16px 0 0 0; font-size: 14px;">
              If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
          <div style="text-align: center; margin-top: 24px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="color: #6b7280; font-size: 12px; margin: 8px 0 0 0; word-break: break-all;">
              ${verificationUrl}
            </p>
          </div>
        </div>
      </body>
    </html>
  `

  await sendEmail({
    to: email,
    subject: 'Verify your email address - Luma',
    html,
  })
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  // Ensure token is properly encoded for URL
  const encodedToken = encodeURIComponent(token)
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${encodedToken}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - Luma</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 40px; text-align: center;">
            <h1 style="color: #111827; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">
              Reset Your Password
            </h1>
            <p style="color: #6b7280; margin: 0 0 32px 0; font-size: 16px; line-height: 1.5;">
              We received a request to reset your password. Click the button below to create a new password.
            </p>
            <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 16px; font-weight: 500;">
              Reset Password
            </a>
            <p style="color: #9ca3af; margin: 32px 0 0 0; font-size: 14px;">
              This link will expire in 24 hours.
            </p>
            <p style="color: #ef4444; margin: 16px 0 0 0; font-size: 14px; font-weight: 500;">
              If you didn't request a password reset, please ignore this email or contact support if you're concerned.
            </p>
          </div>
          <div style="text-align: center; margin-top: 24px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="color: #6b7280; font-size: 12px; margin: 8px 0 0 0; word-break: break-all;">
              ${resetUrl}
            </p>
          </div>
        </div>
      </body>
    </html>
  `

  await sendEmail({
    to: email,
    subject: 'Reset your password - Luma',
    html,
  })
}
