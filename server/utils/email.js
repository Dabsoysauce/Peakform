const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, code) {
  if (!resend) {
    console.warn('RESEND_API_KEY not set — verification code:', code);
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Athlete Edge <onboarding@resend.dev>',
      to: [email],
      subject: 'Verify your Athlete Edge account',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #e85d04;">Athlete Edge</h2>
          <p>Thanks for signing up! Use the code below to verify your email:</p>
          <div style="background: #1e1e30; padding: 20px; border-radius: 12px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #fff;">${code}</span>
          </div>
          <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. If you didn't create an account, ignore this email.</p>
        </div>
      `,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err) {
    console.error('Email send error:', err);
    return { success: false, error: err.message };
  }
}

module.exports = { generateCode, sendVerificationEmail };
