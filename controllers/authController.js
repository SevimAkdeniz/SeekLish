// gerekli modeller

const jwt = require("jsonwebtoken");
const User = require("../models/users"); // ✅ MySQL Modelini Kullan
const bcrypt = require("bcryptjs");
const maxAge = 60 * 60 * 24;
const Word = require("../models/word"); // 🔁 Word tablosu modeli
const WordProgress = require("../models/wordProgress"); // ⬅ Eğer yoksa bu da eklenmeli


// jswonweb token olusturuyoruz
const createToken = (id) => {
    return jwt.sign({ id }, "gizli", { expiresIn: maxAge });
};

// Giriş Sayfası
const auth_login = (req, res) => {
    const redirect = req.query.redirect || "/";
    res.render("login", { redirect, errorMessage: null });




};

// Kullanıcı Girişi İşlemi
const auth_login_post = async (req, res) => {
    const { email, password, redirect } = req.body;


    if (email == "sevimakdeniz7@gmail.com" && password == "sev") {  // admin sayfası
        res.redirect("/admin")


    } else {
        try {
            // MySQL için Sequelize findOne kullanımı
            const user = await User.findOne({ where: { email } });

            if (!user) {
                console.log("Kullanıcı bulunamadı");
                return res.render("login", {
                    errorMessage: "Epostaya ait Kullanıcı bulunamadı.",
                    redirect: req.body.redirect || ""
                });




            }

            //  Şifre karşılaştırma (bcrypt ile)
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                console.log("Şifre yanlış");
                return res.render("login", {
                    errorMessage: "Yanlış şifre girildi.",
                    redirect: req.body.redirect || ""
                });

            }

            req.session.userID = user.id;
            req.session.userName = user.UserName;
            console.log("Aktif kullanıcı ID:", req.session.userID);

            // JWT Token oluştur
            const token = createToken(user.id);
            res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
            res.redirect(redirect);






        } catch (e) {
            console.log(e);
            res.status(500).json({ message: "Sunucu hatası" });
        }

    }


};

// Kayıt Sayfasını Göster
const auth_signup = (req, res) => {
    res.render("signup");
};

// Kullanıcı Kaydı İşlemi
const auth_signup_post = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        const userMail = await User.findOne({ where: { email } });
        const userNam = await User.findOne({ where: { username } });

        if (userMail) {
            return res.render("signup", {
                    errorMessage: "Bu epostaya ait hesap var.",
                    redirect: req.body.redirect || ""
                });

        }
        if (userNam) {
            return res.render("signup", {
                    errorMessage: "Kullanıcı adı kullanılıyor.",
                    redirect: req.body.redirect || ""
                });

        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            username,
            email,
            role,
            password: hashedPassword,
        });

        // ✅ UserID çek
        const userID = newUser.UserID || newUser.id;

        // ✅ Tüm kelimeleri çek
        const allWords = await Word.findAll();

        // ✅ Progress kayıtlarını oluştur
        for (const word of allWords) {
            await WordProgress.create({
                UserID: userID,
                WordID: word.WordID,
                step: 0,
                nextTestDate: new Date(),
                lastAnswered: new Date(),
                isKnown: false
            });
        }

        res.redirect("/login");

    } catch (err) {
        console.log("HATA:", err);
        res.status(500).json({ message: "Kayıt işlemi başarısız" });
    }
};



module.exports = {
    auth_login,
    auth_signup,
    auth_signup_post,
    auth_login_post,
};
