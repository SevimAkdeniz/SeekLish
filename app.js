const express = require("express")
const app = express()

const path = require("path")
const wordRoutes = require('./routes/wordRoutes');
require("dotenv").config()
const wordchainRoutes = require('./routes/wordchain');



const progressRoutes = require('./routes/progress');



const session = require('express-session');

const sequelize = require("./config/database"); //  MySQL Bağlantısı

const cookieParser = require("cookie-parser");

const bodyParser = require("body-parser");

const authRoutes = require("./routes/authRouter");
const Word = require('./models/word')
const WordSample = require('./models/wordSample')
const WordProgress = require("./models/wordProgress")

const puzzleRoutes = require('./routes/puzzle');

const generateImageRoutes = require('./routes/generate-image');


// veritabanı senkronizasyonu
sequelize.sync() 
    .then(() => {
        console.log("✅ MySQL veritabanı senkronize edildi");

        //  Sunucuyu Başlat
        app.listen(3000, () => {
            console.log(" Sunucu 3000 portunda çalışıyor...");
        });
    })
    .catch(err => console.error("❌ Veritabanı senkronizasyon hatası:", err));

sequelize.sync().then(() => {
  console.log("Veritabanı senkronize edildi");
});




// gerekli uselar
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(session({
  secret: 'sevim-kelime-oyunu', // istediğin gizli bir string
  resave: false,
  saveUninitialized: false
}));


app.use(wordchainRoutes);
app.use(progressRoutes);
app.use(puzzleRoutes);
app.use(generateImageRoutes)
app.use(wordRoutes); // 🔁 Bu satır en sonda değil, login gibi şeylerden sonra olmalı
app.use(authRoutes);





// ejs ayarları

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));






// İlişkiler

Word.hasMany(WordSample, { foreignKey: 'WordID' });
WordSample.belongsTo(Word, { foreignKey: 'WordID' });

Word.hasMany(WordProgress, { foreignKey: 'WordID' });
WordProgress.belongsTo(Word, { foreignKey: 'WordID' });



// sayfalar


app.get("/", (req, res) => {
    res.render("index");
});

app.get('/login', (req, res) => {
  const redirect = req.query.redirect || '/';
  res.render('login', { redirect });
});



app.get("/signup", (req, res) => {
    res.render("signup");
});

app.get("/profile", (req,res)=>{
    res.render("profile")
})




