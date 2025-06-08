const express = require('express');
const router = express.Router();

const Word = require('../models/word');
const WordProgress = require('../models/wordProgress');
const User = require('../models/users');

Word.hasMany(WordProgress, { foreignKey: 'WordID' });
WordProgress.belongsTo(Word, { foreignKey: 'WordID' });

function kelimeKaristir(arr) {
  return arr.sort(() => 0.5 - Math.random());
}

router.get('/puzzle', async (req, res) => {
  const userID = req.session.userID;
  if (!userID) return res.redirect('/login');

  const knownWords = await Word.findAll({
    include: [{ model: WordProgress, where: { isKnown: true, UserID: userID } }]
  });

  if (knownWords.length === 0) {
    return res.render('puzzle', { word: null });
  }

  const random = kelimeKaristir(knownWords)[0];
  res.render('puzzle', { word: random }); 
});


router.post('/puzzle-tahmin', async (req, res) => {
  const userID = req.session.userID;
  if (!userID) return res.status(401).json({ hata: "Giriş yapılmamış." });

  const { tahmin, hedef } = req.body;
  const temiz = tahmin.trim().toLowerCase();
  const hedefKelime = hedef.trim().toLowerCase();

  let mesaj = "";
  if (temiz === hedefKelime) {
    mesaj = "✅ Bildin! Süper!";
  } else {
    mesaj = "❌ Yanlış. Bir dahakine olur!";
  }

  const knownWords = await Word.findAll({
    include: [{
      model: WordProgress,
      where: { isKnown: true, UserID: userID }
    }]
  });

  if (knownWords.length === 0) {
    return res.json({ bitti: true });
  }

  const random = kelimeKaristir(knownWords)[0];

  return res.json({
    mesaj,
    yeniKelime: random.EngWordName.toLowerCase(),
    yeniKelimeID: random.id
  });
});



module.exports = router;
