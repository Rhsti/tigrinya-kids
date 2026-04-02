const nodemailer = require('nodemailer');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const hasRealSmtpConfig = () => {
  const host = String(process.env.SMTP_HOST || '').trim();
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();

  if (!host || !user || !pass) {
    return false;
  }

  const placeholderUser = /^your_email@example\.com$/i.test(user);
  const placeholderPass = /^your_email_app_password$/i.test(pass);
  return !(placeholderUser || placeholderPass);
};

const buildTransporter = () => {
  if (!hasRealSmtpConfig()) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

async function sendPurchaseConfirmationEmail({ toEmail, course, paymentMethod = 'card', receiptUrl }) {
  const transporter = buildTransporter();
  if (!transporter || !toEmail || !course) {
    return false;
  }

  const paymentLabel = paymentMethod === 'paypal' ? 'PayPal' : 'Credit Card';
  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const lines = [
    `Thank you for your purchase on Tigrinya Kids.`,
    `Course: ${course.title}`,
    `Amount: $${Number(course.price).toFixed(2)}`,
    `Payment Method: ${paymentLabel}`,
    `Access your course: ${FRONTEND_URL}/lessons/${course.id}`,
  ];

  if (receiptUrl) {
    lines.push(`Stripe receipt: ${receiptUrl}`);
  }

  await transporter.sendMail({
    from: fromAddress,
    to: toEmail,
    subject: `Payment confirmed: ${course.title}`,
    text: lines.join('\n'),
  });

  return true;
}

async function sendWelcomeEmail({ toEmail }) {
  const transporter = buildTransporter();
  if (!transporter || !toEmail) {
    return false;
  }

  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const lines = [
    `Welcome to Tigrinya Kids!`,
    `Your account has been created successfully.`,
    `Start learning here: ${FRONTEND_URL}/dashboard`,
    `If you did not create this account, please contact support immediately.`,
  ];

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f6fbff; padding: 24px; color: #16324d;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #dbe8f5; overflow: hidden;">
        <div style="padding: 16px 20px; background: linear-gradient(135deg, #1f7a6c, #1a5f7a); color: #ffffff; font-weight: 700; font-size: 18px;">
          Welcome to Tigrinya Kids
        </div>
        <div style="padding: 20px; line-height: 1.6;">
          <p style="margin: 0 0 12px;">Your account has been created successfully.</p>
          <p style="margin: 0 0 16px;">Start learning Tigrinya with guided lessons and progress tracking.</p>
          <a href="${FRONTEND_URL}/dashboard" style="display: inline-block; padding: 10px 14px; border-radius: 999px; background: #1a5f7a; color: #ffffff; text-decoration: none; font-weight: 700;">Go to Dashboard</a>
          <p style="margin: 16px 0 0; color: #5a7188; font-size: 13px;">If you did not create this account, please contact support immediately.</p>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: fromAddress,
    to: toEmail,
    subject: 'Welcome to Tigrinya Kids',
    text: lines.join('\n'),
    html,
  });

  return true;
}

async function sendPasswordResetEmail({ toEmail, resetUrl }) {
  const transporter = buildTransporter();
  if (!transporter || !toEmail || !resetUrl) {
    return false;
  }

  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const lines = [
    `We received a request to reset your Tigrinya Kids password.`,
    `Reset your password using this link: ${resetUrl}`,
    `This link expires in 1 hour.`,
    `If you did not request this, you can safely ignore this email.`,
  ];

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f6fbff; padding: 24px; color: #16324d;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #dbe8f5; overflow: hidden;">
        <div style="padding: 16px 20px; background: linear-gradient(135deg, #f3c56b, #1a5f7a); color: #12324d; font-weight: 800; font-size: 18px;">
          Reset Your Password
        </div>
        <div style="padding: 20px; line-height: 1.6;">
          <p style="margin: 0 0 12px;">We received a request to reset your Tigrinya Kids password.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 14px; border-radius: 999px; background: #1a5f7a; color: #ffffff; text-decoration: none; font-weight: 700;">Reset Password</a>
          <p style="margin: 14px 0 0; color: #5a7188; font-size: 13px;">This link expires in 1 hour.</p>
          <p style="margin: 6px 0 0; color: #5a7188; font-size: 13px;">If you did not request this, you can safely ignore this email.</p>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: fromAddress,
    to: toEmail,
    subject: 'Reset your Tigrinya Kids password',
    text: lines.join('\n'),
    html,
  });

  return true;
}

module.exports = {
  hasRealSmtpConfig,
  sendPurchaseConfirmationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
};
