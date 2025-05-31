const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");


const bcrypt = require("bcrypt");

const User = sequelize.define("User", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false


    },
    resetCode: {
        type: DataTypes.STRING,
        allowNull: true
    },
    resetCodeExpires: {
        type: DataTypes.DATE,
        allowNull: true
    },
    resetCodeAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        // ❗ MySQL'deki gerçek sütun adı küçük olabilir
    },
     puan: {
      type: DataTypes.INTEGER,
      defaultValue: 0 // başlangıç puanı
    },

    quizCount: {
        type: DataTypes.INTEGER,
        defaultValue: 5
    }


}, {
    hooks: {
        beforeCreate: async (user) => {
            if (user.password && !user.password.startsWith("$2b$")) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed("password") && !user.password.startsWith("$2b$")) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        }
    }
});




User.auth_login = async function (email, password) {
    const user = await User.findOne({ where: { email } });

    if (!user) {
        console.log("Kullanıcı bulunamadı:", email);
        throw new Error("Kullanıcı bulunamadı");
    }

    console.log("Girilen şifre:", password);
    console.log("Veritabanındaki hash:", user.password);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Şifre eşleşti mi?:", isMatch);

    if (!isMatch) {
        console.log("Girilen şifre yanlış");
        throw new Error("Şifre yanlış");
    }

    return user;
};




module.exports = User;
