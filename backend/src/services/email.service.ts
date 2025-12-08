import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    if (!config.email.host || !config.email.user || !config.email.pass) {
      logger.warn('Email service not configured. Emails will be logged instead.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port || 587,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }

  private async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      // Log email in development if transporter not configured
      logger.info('Email would be sent:', {
        to: options.to,
        subject: options.subject,
      });
      return;
    }

    try {
      await this.transporter.sendMail({
        from: config.email.from || `SecureAuth Pro <${config.email.user}>`,
        ...options,
      });
      logger.info(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(
    email: string,
    firstName: string,
    token: string
  ): Promise<void> {
    const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email</h1>
          </div>
          <div class="content">
            <p>Hello ${firstName},</p>
            <p>Thank you for registering with SecureAuth Pro. Please verify your email address by clicking the button below:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4F46E5;">${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} SecureAuth Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email - SecureAuth Pro',
      html,
      text: `Hello ${firstName}, Please verify your email by visiting: ${verificationUrl}`,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    token: string
  ): Promise<void> {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #DC2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          .warning { background: #FEF3C7; border: 1px solid #F59E0B; padding: 10px; border-radius: 6px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <p>Hello ${firstName},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #DC2626;">${resetUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <div class="warning">
              <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} SecureAuth Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Reset Your Password - SecureAuth Pro',
      html,
      text: `Hello ${firstName}, Reset your password by visiting: ${resetUrl}`,
    });
  }

  /**
   * Send password changed notification
   */
  async sendPasswordChangedEmail(email: string, firstName: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          .warning { background: #FEF3C7; border: 1px solid #F59E0B; padding: 10px; border-radius: 6px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Changed</h1>
          </div>
          <div class="content">
            <p>Hello ${firstName},</p>
            <p>Your password has been successfully changed.</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <div class="warning">
              <strong>Security Notice:</strong> If you didn't make this change, please contact support immediately and reset your password.
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} SecureAuth Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Password Changed - SecureAuth Pro',
      html,
      text: `Hello ${firstName}, Your password has been successfully changed.`,
    });
  }

  /**
   * Send 2FA enabled notification
   */
  async send2FAEnabledEmail(email: string, firstName: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>2FA Enabled</h1>
          </div>
          <div class="content">
            <p>Hello ${firstName},</p>
            <p>Two-factor authentication has been enabled on your account.</p>
            <p>Your account is now more secure. You'll need to enter a verification code from your authenticator app each time you log in.</p>
            <p><strong>Important:</strong> Make sure to save your backup codes in a safe place. You'll need them if you lose access to your authenticator app.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} SecureAuth Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Two-Factor Authentication Enabled - SecureAuth Pro',
      html,
      text: `Hello ${firstName}, Two-factor authentication has been enabled on your account.`,
    });
  }

  /**
   * Send new login alert
   */
  async sendNewLoginAlert(
    email: string,
    firstName: string,
    deviceInfo: { device?: string; browser?: string; os?: string; ipAddress: string }
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          .info-box { background: white; border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .warning { background: #FEF3C7; border: 1px solid #F59E0B; padding: 10px; border-radius: 6px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Login Detected</h1>
          </div>
          <div class="content">
            <p>Hello ${firstName},</p>
            <p>A new login to your account was detected:</p>
            <div class="info-box">
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Device:</strong> ${deviceInfo.device || 'Unknown'}</p>
              <p><strong>Browser:</strong> ${deviceInfo.browser || 'Unknown'}</p>
              <p><strong>Operating System:</strong> ${deviceInfo.os || 'Unknown'}</p>
              <p><strong>IP Address:</strong> ${deviceInfo.ipAddress}</p>
            </div>
            <div class="warning">
              <strong>Wasn't you?</strong> If you don't recognize this login, please change your password immediately and review your active sessions.
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} SecureAuth Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'New Login to Your Account - SecureAuth Pro',
      html,
      text: `Hello ${firstName}, A new login to your account was detected from ${deviceInfo.browser || 'Unknown browser'} on ${deviceInfo.os || 'Unknown OS'}.`,
    });
  }
}

export const emailService = new EmailService();
