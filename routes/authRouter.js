
const express = require("express")
const router = express.Router()
const controller = require("../controllers/authController.js")
const User = require("../models/users");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
require("dotenv").config();


// sifremi unuttum sayfasını acıyor
router.get("/forgot-password", (req, res) => {
  res.render("forgot-password");
});

// kod gonderme islemleri  
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({
      where: { email },
      attributes: ['id', 'email', 'resetCode', 'resetCodeExpires', 'resetCodeAttempts']
    });

    if (!user) {
      return res.render("forgot-password", {
        errorMessage: "Bu e-posta adresine kayıtlı hesap bulunamadı."
      });
    }

    //  3 hakkı geçtiyse sıfırla
    if (user.resetCodeAttempts >= 3) {
      await user.update({ resetCodeAttempts: 0 });
    }

    //  6 Haneli Kod + 10 Dakika Süre
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

    await user.update({ resetCode, resetCodeExpires });

    //  Mail gönder
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    transporter.sendMail({
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: "Şifre Sıfırlama Kodu",
      html: `<p>Şifre sıfırlamak için aşağıdaki kodu kullanın:</p>
               <h2>${resetCode}</h2>
               <p>Bu kod 10 dakika geçerlidir.</p>`
    }, (error, info) => {
      if (error) {
        console.error("E-posta gönderme hatası:", error);
        return res.status(500).json({ message: "E-posta gönderilemedi." });
      }

      return res.render("verify-reset-code", { email });
    });

  } catch (err) {
    return res.status(500).json({ message: "Sunucu hatası" });
    
  }
});


// sifre sıfırlama islemleri
router.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;


  try {
    const user = await User.findOne({ where: { email } }); 

    if (!user) {
      return res.status(400).json({ message: "Bu e-posta adresine kayıtlı hesap bulunamadı." });
    }

    if (!newPassword) {
      return res.status(400).json({ message: "Yeni şifre boş olamaz!" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword, resetCode: null, resetCodeExpires: null });


return res.redirect("/login");

  } catch (err) {
    return res.status(500).json({ message: "Sunucu hatası" });
  }
});

router.post("/verify-reset-code", async (req, res) => {
  const { email, resetCode } = req.body;

  try {
    const user = await User.findOne({
      where: { email },
      attributes: ['id', 'email', 'resetCode', 'resetCodeExpires', 'resetCodeAttempts']
    });

    if (!user) {
      return res.render("verify-reset-code", {
        email,
        errorMessage: "Kullanıcı bulunamadı."
      });
    }

    if (!user.resetCode || user.resetCodeExpires < new Date()) {
      return res.render("verify-reset-code", {
        email,
        errorMessage: "Kod geçersiz veya süresi dolmuş. Lütfen yeniden kod isteyin."
      });
    }

    if (user.resetCodeAttempts >= 3) {
      await user.update({
        resetCode: null,
        resetCodeExpires: null,
        resetCodeAttempts: 0
      });

      return res.render("forgot-password", {
        errorMessage: "3 kez yanlış kod girildi. Kod sıfırlandı. Lütfen tekrar kod isteyin."
      });
    }

    if (user.resetCode !== resetCode) {
      const newAttempts = user.resetCodeAttempts + 1;
      await user.update({ resetCodeAttempts: newAttempts });

      return res.render("verify-reset-code", {
        email,
        errorMessage: `Doğrulama kodu yanlış. (${newAttempts}/3)`
      });
    }

    await user.update({
      resetCode: null,
      resetCodeExpires: null,
      resetCodeAttempts: 0
    });

    return res.render("reset-password", { email });
  } catch (err) {
    console.error(err);
    
    return res.render("verify-reset-code", {
      email,
      errorMessage: "Sunucu hatası oluştu. Lütfen tekrar deneyin."
    });
  }
});




router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/"); // çıkıştan sonra nereye gitsin
  });
});



router.get("/login", controller.auth_login)
router.post("/login", controller.auth_login_post)

router.get("/signup", controller.auth_signup)
router.post("/signup", controller.auth_signup_post)

module.exports = router