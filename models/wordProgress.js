const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const WordProgress = sequelize.define('WordProgress', {
  ID: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  UserID: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  WordID: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  step: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  nextTestDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastAnswered: {
    type: DataTypes.DATE
  },
  isKnown: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
},
{
  tableName: 'WordProgress',
  timestamps: false
});





module.exports = WordProgress;
