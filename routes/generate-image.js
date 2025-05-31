// routes/generateImage.js
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const router = express.Router();


router.get('/generate-image', async (req, res) => {
  const word = req.query.word;
  if (!word) return res.status(400).send("Kelime boş");

  try {
    const replicateRes = await axios.post('https://api.replicate.com/v1/predictions', {
      version: "db21e45e...", // Stable Diffusion v1.5 ID — güncel ID'yi site üzerinden al
      input: {
        prompt: `a clean realistic image of a ${word} on white background`
      }
    }, {
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const predictionURL = replicateRes.data.urls.get;

    // Görsel tamamlanana kadar kontrol et (polling)
    let imageURL;
    while (!imageURL) {
      const check = await axios.get(predictionURL, {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`
        }
      });

      if (check.data.status === "succeeded") {
        imageURL = check.data.output[0];
      } else if (check.data.status === "failed") {
        return res.status(500).send("Görsel üretilemedi.");
      }

      await new Promise(r => setTimeout(r, 2000)); // 2sn bekle
    }

    // Görseli indirip uploads klasörüne kaydet
    const fileName = `${Date.now()}-${word}.png`;
    const filePath = path.join(__dirname, '..', 'public', 'uploads', fileName);

    const imageStream = await axios.get(imageURL, { responseType: 'stream' });
    const writer = fs.createWriteStream(filePath);
    imageStream.data.pipe(writer);

    writer.on("finish", () => {
      res.json({ path: `/uploads/${fileName}` });
    });
    writer.on("error", () => {
      res.status(500).send("Dosya kaydedilemedi");
    });

  } catch (err) {
    console.error("AI görsel üretim hatası:", err.message);
    res.status(500).send("AI hatası");
  }
});

module.exports = router;
