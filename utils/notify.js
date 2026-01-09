const nodemailer = require("nodemailer");
const Notification = require("../models/Notification");
const User = require("../models/User");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // AMBIL DARI ENV
    pass: process.env.EMAIL_PASS, // AMBIL DARI ENV
  },
});

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: '"Focusly App" <' + process.env.EMAIL_USER + ">",
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

exports.notify = async (userId, title, message) => {
  try {
    await Notification.create({ userId, title, message });
    const user = await User.findById(userId);
    // Cek user exists agar tidak crash
    if (user && user.email) {
      await sendEmail(
        user.email,
        `Focusly: ${title}`,
        `<div style="font-family:sans-serif;padding:20px;border:1px solid #ddd;border-radius:10px;">
            <h2 style="color:#6C63FF;">${title}</h2>
            <p>Hi ${user.name},</p>
            <p>${message}</p>
         </div>`
      );
    }
  } catch (e) {
    console.error(e);
  }
};

exports.sendEmail = sendEmail;
