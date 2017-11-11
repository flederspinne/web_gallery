var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var Image = require('../models/image');
var router = express.Router();

// Модули для работы с БД:
var mongoose = require('mongoose');
var fs = require('fs');
var multer = require('multer');
var upload = multer({dest: 'D:\\Projects\\untitled\\uploads\\'});
var db = require('../db');

var gfs;
var Grid = require("gridfs-stream");
Grid.mongo = mongoose.mongo;

db.once("open", function(){
    gfs = Grid(db.db);
});

router.get('/', function (req, res) {
    Image.find()
        .then((docs) =>{
            var imageNames = docs.map((e) => {
                return e.filename
            })
            res.render("index", {
                imageNames,
                user : req.user
            })
            console.log(docs)
        });
});

router.get('/register', function(req, res) {

    res.render('register', { });
});

router.post('/register', function(req, res, next) {
    console.log("Регистрация пользователя: " + JSON.stringify(req.body));
    Account.register(new Account({ username : req.body.username }), req.body.password, function(err, account) {
        if (err) {
            return res.render('register', { error : err.message });
        }

        passport.authenticate('local')(req, res, function () {
            console.log();
            req.session.save(function (err) {
                if (err) {
                    return next(err);
                }
                res.redirect('/');
            });
        });
    });
});

// Путь к странице логина
router.get('/login', function(req, res) {
    res.render('login' , { user : req.user } );
});

// Вход в аккаунт
router.post('/login', passport.authenticate('local'), function(req, res) {
    console.log("Пытаемся войти: " + JSON.stringify(req.body));
    res.redirect('/');
});

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

router.post('/search', function(req, res){

    console.log('Идёт поиск по тегам: ' + JSON.stringify(req.body.search_tag));
    // Получаем введённые пользователем теги в виде строки
    var tag = req.body.search_tag.toString();
    // Разбиваем на элементы массива
    var tag_array = tag.split(" ");

    Image.find({'metadata.tag': { $all: tag_array }})
        .then((docs) =>{
            var imageNames = docs.map((e) => {
                return e.filename
            })
            res.render("index", {
                imageNames,
                user : req.user
            })
            console.log(imageNames)
        });
});

router.post('/upload', upload.single('file'), function(req, res){

    console.log("Загружаем изображение: " + JSON.stringify(req.file) +
        "\nДобавляемые теги: " + JSON.stringify(req.body.tag));

    var filename = req.file.originalname;
    // Получаем добавленные пользователем теги в виде строки
    var tag = req.body.tag.toString();
    // Удаляем пробелы
    tag = tag.replace(/\s+/g, '');
    // Разбиваем на элементы массива
    var tag_array = tag.split(",");

    var write_stream = gfs.createWriteStream({
        filename: filename,
        metadata: {
            tag: tag_array,
            author: req.user.username
        }
    });

    fs.createReadStream("./uploads/" + req.file.filename)
        .on("end", function(){
            fs.unlink("./uploads/"+ req.file.filename, function(err){
                // TODO: Выводить что-то типа "Файл успешно загружен"
                res.redirect('/');
            })
        })
        .on("err", function(){
            res.send("Error uploading image")
        })
        .pipe(write_stream);
});

router.get('/:filename', function(req, res){

    console.log("Получаем изображение по URL: /" + req.params.filename);
    var read_stream = gfs.createReadStream({filename: req.params.filename});
    read_stream.on("error", function(err){
        console.log("Ошибка! Изображение с именем " + req.params.filename + " не найдено.");
        res.send("Ошибка! Изображение с именем " + req.params.filename + " не найдено.");
    });
    read_stream.pipe(res);
});

module.exports = router;