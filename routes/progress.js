const express = require('express');
const router = express.Router();
const Word = require('../models/word');
const WordProgress = require('../models/wordProgress');

// WordProgress kayıtlarını eksikse tamamla
router.get('/progress-tamamla', async (req, res) => {
  const userID = req.session.userID;

  if (!userID) {
    return res.status(401).send("Lütfen önce giriş yapın.");
  }

  try {
    const allWords = await Word.findAll();
    let eklendi = 0;

    for (const word of allWords) {
      const mevcut = await WordProgress.findOne({
        where: {
          UserID: userID,
          WordID: word.WordID
        }
      });

      if (!mevcut) {
        await WordProgress.create({
          UserID: userID,
          WordID: word.WordID,
          step: 0,
          nextTestDate: new Date(),
          lastAnswered: new Date(),
          isKnown: false
        });
        eklendi++;
      }
    }

    res.send(`${eklendi} kelime için WordProgress kaydı oluşturuldu.`);
  } catch (err) {
    console.error("Progress tamamla hatası:", err);
    res.status(500).send("Bir hata oluştu.");
  }
});

module.exports = router;
