var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var router = express.Router();
var mongoose = require('mongoose');


var fs = require('fs');
var multer = require('multer');
// TODO: Настраивать multer в отдельном модуле и экспортировать в ./routes/index.js

var upload = multer({dest: './uploads'});

var db = require('../db');

var gfs;
var Grid = require("gridfs-stream");
Grid.mongo = mongoose.mongo;

db.once("open", function(){
    gfs = Grid(db.db);
});

router.get('/', function (req, res) {
    res.render('index', { user : req.user });
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
    console.log('FIRST TEST: ' + JSON.stringify(req.file));
    console.log('second TEST: ' +req.file.originalname);

    var dirname = require('path').dirname(__dirname);
    var filename = req.file.originalname;
    var path = req.file.path;
    var type = req.file.mimetype;

    var write_stream = gfs.createWriteStream({
        filename: filename
    });

    fs.createReadStream("./uploads/" + req.file.filename)
        .on("end", function(){fs.unlink("./uploads/"+ req.file.filename, function(err){res.send("success")})})
        .on("err", function(){res.send("Error uploading image")})
        .pipe(write_stream);
    
});

router.get('/file/:id', function(req, res){
    var pic_id = req.param('id');
    var gfs = req.gfs;

    gfs.files.find({filename: pic_id}).toArray(function (err, files) {

        if (err) {
            res.json(err);
        }
        if (files.length > 0) {
            var mime = 'image/jpeg';
            res.set('Content-Type', mime);
            var read_stream = gfs.createReadStream({filename: pic_id});
            read_stream.pipe(res);
        } else {
            res.json('File Not Found');
        }
    });
});

module.exports = router;