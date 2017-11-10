var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var router = express.Router();
var mongoose = require('mongoose');


var fs = require('fs');
var multer = require('multer');
// TODO: Настраивать multer в отдельном модуле и экспортировать в ./routes/index.js

var upload = multer({dest: 'D:\\Projects\\untitled\\uploads\\'});

var db = require('../db');

var gfs;
var Grid = require("gridfs-stream");
Grid.mongo = mongoose.mongo;

var Schema = mongoose.Schema;
var Image = mongoose.model("Image",
    new Schema({filename : String, contentType : String, uploadDate : Date}),
    "fs.files"
);

db.once("open", function(){


    // var img_schema = new Schema({name: String}, {versionKey: false});

    // var img = mongoose.model("fs.files", img_schema);

    /* img.find({}, {'_id': 0, 'filename': 1}, function(err, docs){
        mongoose.disconnect();

        if(err) return console.log(err);

        var result = "";

        for (var i = 0; i < docs.length; i++) {
            result += docs[i].toObject().filename;
            result += " ";
        }
        console.log(result);
    }); */

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
                user : req.user,
                lalki : "LOL"
            })
            console.log(imageNames)
        });

    // TODO: Попробовать передавать в index.jade имена файлов в качестве параметров?
    // Возможно, идёт какой-то конфликт, связанный с попыткой доступа к изображениям одновременно
    // отсюда и по URL из шаблона.
    // Но если мы перемещаем запрос на имена файлов в db.once("open", ), это не помогает: имена
    // получаем успешно, а картинки не грузятся.
    // Возможно, это потому, что db.once("open", ) отрабатывает на попытке добыть картинки.
    // res.render('index', { user : req.user, lalki : "LOL" });

});

router.get('/register', function(req, res) {

    res.render('register', { });
});

router.post('/register', function(req, res, next) {
    console.log("BODY: " + JSON.stringify(req.body));
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
// !!! Если убрать глобальное использование body-parser, passport не работает !!!
router.post('/login', passport.authenticate('local'), function(req, res) {
    console.log("Пытаемся войти: " + JSON.stringify(req.body));
    res.redirect('/');
});

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

router.get('/ping', function(req, res){
    res.status(200).send("pong!");
});

router.post('/upload', upload.single('file'), function(req, res){
    console.log('TEST: ' +req.file.filename);

    var dirname = require('path').dirname(__dirname);
    var filename = req.file.originalname;
    var path = req.file.path;
    var type = req.file.mimetype;

    var write_stream = gfs.createWriteStream({
        filename: filename
    });

    // pipe multer's temp file /uploads/filename into the stream we created above. On end deletes the temporary file.
    fs.createReadStream("./uploads/" + req.file.filename)
        .on("end", function(){
            fs.unlink("./uploads/"+ req.file.filename, function(err){
                res.send("success")
            })
        })
        .on("err", function(){
            res.send("Error uploading image")
        })
        .pipe(write_stream);

});

/* router.get('/:filename', function(req, res){
    console.log("Тянем картинушку по URL: " + JSON.stringify(req.params))
    var read_stream = gfs.createReadStream({filename: req.params.filename});
    read_stream.on("error", function(err){
        res.send("No image found with that title");
    });
    read_stream.pipe(res);
}); */

module.exports = router;