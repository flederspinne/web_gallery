var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// Устанавливаем соединение с базой данных:
mongoose.connect('mongodb://localhost/web_gallery', { useMongoClient: true });
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

module.exports = db;