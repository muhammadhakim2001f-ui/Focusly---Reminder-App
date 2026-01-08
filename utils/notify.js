// utils/notify.js
const nodemailer = require("nodemailer");
const Notification = require("../models/Notification");
const User = require("../models/User");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "muhammadhakim2001f@gmail.com", // Email Anda
    pass: "pmpm vaap eofh nlnu", // App Password Anda
  },
});

// Fungsi Internal: Kirim Email Raw
const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: '"Focusly App" <muhammadhakim2001f@gmail.com>',
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to}`);
    return true;
  } catch (e) {
    console.error("❌ Email Error:", e);
    return false;
  }
};

// Fungsi 1: Notifikasi ke User (Simpan DB + Email)
exports.notify = async (userId, title, message) => {
  try {
    await Notification.create({ userId, title, message });
    const user = await User.findById(userId);
    if (user && user.email) {
      await sendEmail(
        user.email,
        `Focusly: ${title}`,
        `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #6C63FF;">${title}</h2>
                    <p>Hi ${user.name},</p>
                    <p>${message}</p>
                </div>
            `
      );
    }
  } catch (e) {
    console.error(e);
  }
};

// Fungsi 2: Export sendEmail agar bisa dipakai untuk Invite
exports.sendEmail = sendEmail;
