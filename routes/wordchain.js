const express = require('express');
const router = express.Router();
const { CohereClient } = require("cohere-ai");

// ✅ fetch düzeltmesi (node-fetch ile)
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));


const cohere = new CohereClient({
  token: process.env.CO_API_KEY,
});

router.get('/wordchain',  (req, res) => {
  res.render('wordchain-form');
});

router.post('/wordchain', async (req, res) => {
  const { word1, word2, word3, word4, word5 } = req.body;
  const kelimeler = [word1, word2, word3, word4, word5];

  const prompt = `Create a short story using the following five words: ${kelimeler.join(", ")}. Make it about 2-3 sentences.`;

  try {
    // 1. Hikaye oluştur
    const response = await cohere.generate({
      model: "command",
      prompt,
      maxTokens: 200,
      temperature: 0.8,
    });

    const story = response.generations[0].text;

    // 2. Replicate ile görsel üret
    const replicateResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4", // ✅ en son stabil SD versiyon
        input: {
         prompt : `A children's book illustration of: ${word1}, ${word2}, ${word3}, ${word4}, and ${word5}.`,

          width: 512,
          height: 512
        }
      })
    });
    

    const prediction = await replicateResponse.json();

    // 3. Eğer geçersizse işlemeyi bırak
    if (!prediction || !prediction.urls || !prediction.urls.get) {
      console.error("❌ Görsel üretim URL'si alınamadı:", prediction);
      return res.render("wordchain-result", {
        kelimeler,
        story,
        imageUrl: null
      });
    }

    const predictionURL = prediction.urls.get;

    // 4. Görsel hazır olana kadar bekle
    let finalImage = null;
    for (let i = 0; i < 10; i++) {
      const pollRes = await fetch(predictionURL, {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`
        }
      });

      const pollData = await pollRes.json();

      if (pollData.status === "succeeded") {
        finalImage = pollData.output[0];
        break;
      } else if (pollData.status === "failed") {
        console.error("❌ Görsel üretimi başarısız:", pollData);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 saniye bekle
    }

    // 5. Ekrana gönder
    res.render("wordchain-result", {
      kelimeler,
      story,
      imageUrl: finalImage
    });


    

  } catch (err) {
    console.error("🔥 LLM veya görsel hatası:", err);
    res.send("Bir şeyler ters gitti.");
    throw err;
  }



});

module.exports = router;
