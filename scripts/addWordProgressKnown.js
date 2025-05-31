const WordProgress = require('../models/wordProgress');
const sequelize = require('../config/database');

(async () => {
  await sequelize.sync();

  const progressEntries = [];

  for (let i = 10; i < 20; i++) {
    progressEntries.push({
      UserID: 6,
      WordID: i,
      step: 6,
      isKnown: true,
      lastAnswered: new Date(),
      nextTestDate: new Date()
    });
  }

  await WordProgress.bulkCreate(progressEntries);
  process.exit();
})();
