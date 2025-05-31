const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("KelimeOyunu", "root", "Kirazmevsimi7.", {
    host: "localhost",
    dialect: "mysql",
    logging: false // Logları kapatmak için
});

module.exports = sequelize;
