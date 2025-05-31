const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Word = sequelize.define('Word', {
  WordID: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  EngWordName: DataTypes.STRING,
  TurWordName: DataTypes.STRING,
  Picture: DataTypes.STRING,
  Audio: DataTypes.STRING  
}, {
  tableName: 'Words',
  timestamps: false
});

module.exports = Word;
