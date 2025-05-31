const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WordSample = sequelize.define('WordSample', {
  WordSamplesID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  WordID: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  Samples: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'WordSamples',
  timestamps: false,
  id: false  // ❗ EN ÖNEMLİ SATIR: Sequelize'a "id ekleme" diyoruz
});


// 🔥 ilişkiyi BURADA değil, ayrı bir dosyada tanımlayacağız
module.exports = WordSample;
