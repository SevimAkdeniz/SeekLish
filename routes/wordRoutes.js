const express = require('express');
const router = express.Router();
const multer = require('multer');
const Word = require('../models/word');
const User = require("../models/users")
const WordSample = require('../models/wordSample');
const WordProgress = require('../models/wordProgress'); // ← bu yok

const { Op } = require("sequelize");
const userId = 6; // Geçici olarak sabit, sonra oturumdan alırsın
const axios = require("axios");
const fs = require("fs");
const path = require("path");




// multer ayarı
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// GET
router.get('/kelime-ekle', (req, res) => {
  res.render('index');
});





const generateAudio = require('../generate-audio'); // Dosya yolunu kendine göre ayarla

router.get('/kelime-ekle', (req, res) => {
  res.render('index');
});

// POST kelime ekle
router.post('/kelime-ekle', upload.single('picture'), async (req, res) => {
  try {
    const { engWord, turWord, sample1, sample2, sample3 } = req.body;
    const picturePath = req.file ? `/uploads/${req.file.filename}` : null;

    if (!engWord || !turWord) {
      return res.send("Eksik bilgi var.");
    }

    // 1. Kelimeyi Words tablosuna ekle, Audio şimdilik boş bırak
    const word = await Word.create({
      EngWordName: engWord,
      TurWordName: turWord,
      Picture: picturePath,
      Audio: null
    });

    // 2. Örnek cümleleri ekle
    const samples = [sample1, sample2, sample3].filter(s => s && s.trim() !== '');
    for (const sample of samples) {
      await WordSample.create({
        Samples: sample,
        WordID: word.WordID
      });
    }

    // 3. Ses dosyasını otomatik oluştur ve yolunu al
    const audioFileName = `${engWord.toLowerCase().replace(/[^a-z0-9]/g, '')}.mp3`;
    const audioUrl = await generateAudio(engWord, audioFileName);

    // 4. Kelimenin Audio alanını güncelle
    word.Audio = audioUrl;
    await word.save();

    res.send("Kelime, resim ve ses başarıyla kaydedildi!");
  } catch (err) {
    console.error("Kelime eklerken hata:", err);
    res.status(500).send("Sunucu hatası.");
  }
});





router.get('/profile', async (req, res) => {
  const userID = req.session.userID;
  if (!userID) return res.redirect('/login');

  const user = await User.findByPk(userID);
  const quizCount = user?.quizCount || 5;

  // Bilinen ve bilinmeyen kelime sayısı
  const all = await WordProgress.findAll({ where: { UserID: userID } });
  const known = all.filter(item => item.isKnown === true);
  const unknown = all.filter(item => item.isKnown === false);

  const chartData = {
    knownCount: known.length,
    unknownCount: unknown.length
  };

  // Bilinen kelimeleri Word ve örnek cümlelerle çek
  const rapor = await WordProgress.findAll({
    where: { UserID: userID, isKnown: true },
    include: [
      {
        model: Word,
        include: [WordSample]
      }
    ]
  });

  // Aynı WordID tekrar etmesin diye filtrele
  const uniqueWords = {};
  const kelimeListesi = [];

  rapor.forEach(item => {
    const wordId = item.Word.WordID;

    if (!uniqueWords[wordId]) {
      kelimeListesi.push({
        eng: item.Word.EngWordName,
        tur: item.Word.TurWordName,
        step: item.step,
        sample: item.Word.WordSamples?.map(s => s.Samples).join(" | ") || "Yok"
      });

      uniqueWords[wordId] = true;
    }
  });

  res.render('profile', {
    quizCount,
    chartData,
    kelimeListesi
  });
});


router.post('/profil', async (req, res) => {
  const userID = req.session.userID;
  const adet = parseInt(req.body.adet);
  console.log("Gönderilen adet:", adet);

  if (!adet || isNaN(adet)) return res.send("Geçersiz değer!");

  const [updatedCount] = await User.update(
    { quizCount: adet },
    { where: { id: userID } }
  );

  console.log("Güncellenen satır sayısı:", updatedCount);

  res.redirect('/profile');
});


router.get('/kullanicilar', async (req, res) => {
  const users = await User.findAll();
  console.log("Tüm kullanıcılar:", users.map(u => u.dataValues));
  res.send("Kullanıcılar konsola yazdırıldı.");
});



const sequelize = require('../config/database'); // en üste varsa tekrar yazma


// GET: İlk açıldığında sadece buton gözüksün
router.get('/quiz', async (req, res) => {
  
  const userID = req.session.userID;
  if (!userID) return res.redirect('/login');

  const bugun = new Date();
  const user = await User.findByPk(userID);
  const quizCount = user.quizCount || 5;

  // ✅ Eksik WordProgress kayıtlarını tamamlama
  const allWords = await Word.findAll();
  for (const word of allWords) {
    const mevcut = await WordProgress.findOne({
      where: { UserID: userID, WordID: word.WordID }
    });

    if (!mevcut) {
      await WordProgress.create({
        UserID: userID,
        WordID: word.WordID,
        step: 0,
        nextTestDate: new Date(),
        isKnown: false,
        lastAnswered: new Date()
      });
    }
  }

  // 1. Yeni öğrenilecek kelimeler
  const yeniKelimeler = await WordProgress.findAll({
    where: { UserID: userID, isKnown: false, step: 0 },
    include: [Word],
    order: sequelize.random(),
    limit: quizCount
  });

  // 2. Test zamanı gelenler
  const testKelimeler = await WordProgress.findAll({
    where: {
      UserID: userID,
      isKnown: false,
      step: { [Op.gte]: 1 },
      nextTestDate: { [Op.lte]: bugun }
    },
    include: [Word],
    order: sequelize.random()
  });

  const kelimeler = [...yeniKelimeler, ...testKelimeler];

  // 3. Her kelimeye 3 yanlış seçenek ekle
  const enriched = await Promise.all(kelimeler.map(async item => {
    const word = item.Word;
    const correctAnswer = word.TurWordName;

    const yanlislar = await Word.findAll({
      where: {
        WordID: { [Op.ne]: word.WordID },
        TurWordName: { [Op.ne]: correctAnswer }
      },
      order: sequelize.random(),
      limit: 3
    });

    const sample = await WordSample.findOne({
      where: { WordID: word.WordID },
      order: sequelize.random()
    });

    const secenekler = [...yanlislar.map(w => w.TurWordName), correctAnswer];
    for (let i = secenekler.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [secenekler[i], secenekler[j]] = [secenekler[j], secenekler[i]];
    }

    return {
      wordID: word.WordID,
      eng: word.EngWordName,
      tur: correctAnswer,
      secenekler,
      picture: word.Picture,
      sample: sample?.Samples || "Örnek cümle yok.",
       audio: word.Audio || ""
    };
  }));

  res.render('quiz', { kelimeler: enriched });
});







// POST: Butona basıldığında rastgele kelimeler gelsin
router.post('/quiz', async (req, res) => {
  const userId = 6; // aktif kullanıcı
  const bugun = new Date();

  const user = await User.findByPk(userId);
  const adet = user.quizCount || 5;

  // 1. step >=1 olanlar → test zamanı gelenler
  const testKelimeler = await WordProgress.findAll({
    where: {
      UserID: userId,
      isKnown: false,
      nextTestDate: { [Op.lte]: bugun }
    },
    order: sequelize.random()
  });

  const testWordIDs = testKelimeler.map(wp => wp.WordID);

  // 2. Yeni kelimeleri bul (step = 0 ve daha önce yukarıda gelmemiş olanlar)
  const mevcutIDs = testWordIDs.length > 0 ? { [Op.notIn]: testWordIDs } : {};

  const yeniKelimeler = await WordProgress.findAll({
    where: {
      UserID: userId,
      isKnown: false,
      step: 0,
      WordID: mevcutIDs
    },
    order: sequelize.random()
  });

  // ❗️İŞTE BURADA tanımlıyoruz
  const yeniIDs = yeniKelimeler.map(wp => wp.WordID);
  const toplamKelimeIDs = [...testWordIDs, ...yeniIDs].slice(0, adet);

  // 3. Kelime detaylarını al
  const words = await Word.findAll({
    where: { WordID: toplamKelimeIDs }
  });

  // 4. Cümleleri ekle
  const enriched = await Promise.all(words.map(async word => {
    const sample = await WordSample.findOne({
      where: { WordID: word.WordID },
      order: sequelize.random()
    });

    return {
      eng: word.EngWordName,
      tur: word.TurWordName,
      sample: sample?.Samples || "Örnek yok",
      picture: word.Picture,
      audio: word.Audio,
    };
  }));

  res.render('quiz', { words: enriched });
});



router.post('/quiz-sonuc', async (req, res) => {
  const userId = 6; // Geçici kullanıcı
  const { wordID, answer, correctAnswer } = req.body;

  const temizCevap = answer.trim().toLowerCase();
  const dogruCevap = correctAnswer.trim().toLowerCase();

  const stepDelays = [1, 7, 30, 90, 180, 365];

  try {
    const progress = await WordProgress.findOne({
      where: {
        UserID: userId,
        WordID: wordID
      }
    });

    if (!progress) return res.status(404).send("Kelime kaydı bulunamadı.");

    let durumMesaji = "";

    if (temizCevap === dogruCevap) {
      if (progress.step < 5) {
        progress.step += 1;
        progress.nextTestDate = new Date(Date.now() + stepDelays[progress.step] * 24 * 60 * 60 * 1000);
      } else {
        progress.step = 6;
        progress.isKnown = true;
        progress.nextTestDate = progress.nextTestDate = null;
      }

      durumMesaji = `✔️ Doğru! "${dogruCevap}" doğru cevaptı.`;
    } else {
      progress.step = 0;
      progress.isKnown = false;
      progress.nextTestDate = new Date(Date.now() + stepDelays[0] * 24 * 60 * 60 * 1000);

      durumMesaji = `❌ Yanlış! Doğru cevap: "${correctAnswer}".`;
    }

    await progress.save();

    // View'e mesajı gönder
    res.render('quiz-sonuc', { durumMesaji });
  } catch (err) {
    console.error(err);
    res.status(500).send("Sunucu hatası.");
  }
});



router.post('/quiz-bitir', async (req, res) => {
  const userID = req.session.userID;
  if (!userID) return res.redirect('/login');

  try {
    const cevaplar = JSON.parse(req.body.sonuclar); // [{ wordID, correct }, ...]
    const stepDelays = [1, 7, 30, 90, 180, 365]; // gün cinsinden
    const ozet = [];
    let toplamPuan = 0;

    const user = await User.findByPk(userID); // ❗️tek seferde alındı

    for (const cevap of cevaplar) {
      const { wordID, correct } = cevap;
      const word = await Word.findByPk(wordID);
      if (!word) continue;

      const progress = await WordProgress.findOne({
        where: { UserID: userID, WordID: wordID }
      });
      if (!progress) continue;

      // 👇 Doğru/Yanlış/Geçilen tüm durumlar
      let dogruMu = false;

      if (correct === true) {
        if (progress.step < 5) {
          progress.step += 1;
          progress.nextTestDate = new Date(Date.now() + stepDelays[progress.step] * 86400000);
        } else {
          progress.step = 6;
          progress.isKnown = true;
          progress.nextTestDate = new Date('2100-01-01');
        }
        dogruMu = true;
        toplamPuan += 10; // ✅ Doğru: +10
      } else if (correct === false) {
        progress.step = 0;
        progress.isKnown = false;
        progress.nextTestDate = new Date(Date.now() + stepDelays[0] * 86400000);
        toplamPuan -= 5; // ❌ Yanlış: -5
      } else {
        // 🟡 Geçilen
        toplamPuan += 0;
      }

      await progress.save();

      ozet.push({
        eng: word.EngWordName,
        tur: word.TurWordName,
        correct: correct // true/false/null direkt gönderiyoruz
      });
    }

    // ✅ En son puanı güncelle
    if (user) {
      user.puan += toplamPuan;
      await user.save();
    }

    res.render('quiz-sonuc', { ozet, toplamPuan }); // 🎯 skor gösterimi için

  } catch (err) {
    console.error("Quiz bitirirken hata:", err);
    res.status(500).send("Sunucu hatası.");
  }
});






router.get('/progress-tamamla', async (req, res) => {
  const userID = req.session.userID;

  if (!userID) return res.redirect('/login');

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
        isKnown: false,
        lastAnswered: new Date()
      });
      eklendi++;
    }
  }

  res.send(`${eklendi} kelime için WordProgress kaydı oluşturuldu.`);
});



router.get('/rapor/bilinenler', async (req, res) => {
  const userID = req.session.userID;
  if (!userID) return res.redirect('/login');

  const all = await WordProgress.findAll({ where: { UserID: userID } });

  const known = all.filter(item => item.isKnown === true);
  const unknown = all.filter(item => item.isKnown === false);

  const chartData = {
    knownCount: known.length,
    unknownCount: unknown.length
  };

  const rapor = await WordProgress.findAll({
    where: { UserID: userID, isKnown: true },
    include: [{
      model: Word,
      include: [WordSample] // 💡 buraya koymalısın
    }]
  });


  const kelimeListesi = rapor.map(item => ({
    eng: item.Word.EngWordName,
    tur: item.Word.TurWordName,
    step: item.step,
    sample: item.Word.WordSamples?.map(s => s.Samples).join(" | ") || "Yok"
  }));


  res.render("rapor-bilinenler", {
    kelimeListesi,
    chartData
  });

});




WordProgress.belongsTo(User, { foreignKey: 'UserID' });
WordProgress.belongsTo(Word, { foreignKey: 'WordID' });



module.exports = router;
