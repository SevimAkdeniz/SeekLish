// gerekli modeller
const jwt = require("jsonwebtoken");
const User = require("../models/users");
const bcrypt = require("bcryptjs");
const maxAge = 60 * 60 * 24;
const Word = require("../models/word");
const WordProgress = require("../models/wordProgress");

// Güvenli redirect listesi
const allowedRedirects = ["/", "/admin", "/profil", "/test", "/wordchain", "/dashboard"];

// JWT token oluştur
const createToken = (id) => {
    return jwt.sign({ id }, "gizli", { expiresIn: maxAge });
};

// Giriş Sayfası
const auth_login = (req, res) => {
    const rawRedirect = req.query.redirect || "/";
    const redirect = allowedRedirects.includes(rawRedirect) ? rawRedirect : "/";
    res.render("login", { redirect, errorMessage: null });
};

// Kullanıcı Girişi İşlemi
const auth_login_post = async (req, res) => {
    const { email, password, redirect: rawRedirect } = req.body;
    const redirect = allowedRedirects.includes(rawRedirect) ? rawRedirect : "/";

    if (email == "sevimakdeniz7@gmail.com" && password == "sev") {
        return res.redirect("/admin");
    }

    try {
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.render("login", {
                errorMessage: "Epostaya ait kullanıcı bulunamadı.",
                redirect
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render("login", {
                errorMessage: "Yanlış şifre girildi.",
                redirect
            });
        }

        req.session.userID = user.id;
        req.session.userName = user.UserName;

        const token = createToken(user.id);
        res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });

        res.redirect(redirect);

    } catch (err) {
        res.status(500).json({ message: "Sunucu hatası" });
        throw err;
    }
};

// Kayıt Sayfası
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
                redirect: "/"
            });
        }

        if (userNam) {
            return res.render("signup", {
                errorMessage: "Kullanıcı adı kullanılıyor.",
                redirect: "/"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            username,
            email,
            role,
            password: hashedPassword,
        });

        const userID = newUser.UserID || newUser.id;
        const allWords = await Word.findAll();

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
        res.status(500).json({ message: "Kayıt işlemi başarısız" });
        throw err;
    }
};

module.exports = {
    auth_login,
    auth_signup,
    auth_signup_post,
    auth_login_post,
};
