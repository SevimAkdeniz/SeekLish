const fs = require('fs');
const path = require('path');
const gTTS = require('gtts');

async function generateAudio(text, filename) {
  const audioFile = path.join(__dirname, 'public', 'uploads', 'audio', filename);

  // Dosya varsa atla
  if (fs.existsSync(audioFile)) {
    return `/uploads/audio/${filename}`;
  }

  // gTTS ile ses dosyası oluştur
  const gtts = new gTTS(text, 'en');
  await new Promise((resolve, reject) => {
    gtts.save(audioFile, err => {
      if (err) return reject(err);
      resolve();
    });
  });

  return `/uploads/audio/${filename}`;
}

module.exports = generateAudio;
