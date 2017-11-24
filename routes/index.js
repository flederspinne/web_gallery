var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var Image = require('../models/image');
var router = express.Router();

// Mongoose очень придирчив к типам, обычный var id = req.body.id не прокатывает!
ObjectId = require('mongoose').Types.ObjectId;

// Наши дивные самописные функции:
var functions = require('../public/javascripts/functions');
var get_img_data = functions.get_img_data;
var get_subs_data = functions.get_subs_data;

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
    Image.find().sort({ $natural: -1 })
        .then((docs) => {
            var image_arr = docs.map(get_img_data);
            res.render("index", {
                image_arr: image_arr,
                user : req.user
            });
            console.log(docs);
            console.log(image_arr);
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

    Image.find({'metadata.tag': { $all: tag_array }}).sort({ $natural: -1 })
        .then((docs) =>{
            var image_arr = docs.map(get_img_data);
            res.render("index", {
                image_arr: image_arr,
                user : req.user
            });
            console.log(docs);
            console.log(image_arr);
        });
});

router.post('/upload', upload.single('file'), function(req, res){

    console.log("Загружаем изображение: " + JSON.stringify(req.file) +
        "\nДобавляемые теги: " + JSON.stringify(req.body.tag));
    console.log("Автор: " + JSON.stringify(req.user));

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
            author_id: req.user._id,
            author_name: req.user.username,
            likes: []
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

router.post('/upload_avatar', upload.single('file'), function(req, res){

    console.log("Загружаем аватар: " + JSON.stringify(req.file));

    var filename = req.file.originalname;
    var user_id = new ObjectId(req.user._id);

    var write_stream = gfs.createWriteStream({
        filename: filename,
        metadata: {
            type: "Avatar"
        }
    });

    fs.createReadStream("./uploads/" + req.file.filename)
        .on("end", function(){
            fs.unlink("./uploads/"+ req.file.filename, function(err){
                var new_avatar_id = (write_stream.id).toString();

                console.log("Аватар получает id = " + new_avatar_id);

                Account.update(
                    { _id: user_id },
                    { $set: {
                        "avatar": new_avatar_id
                    } },
                    function (err) {
                        if (err) return handleError(err);
                        // TODO: Заменить на вывод аватара на экран в профиле
                        res.redirect('/my_profile');
                    }
                );

            })
        })
        .on("err", function(){
            res.send("Error uploading image")
        })
        .pipe(write_stream);



});

router.get('/my_profile', function(req, res) {

    var my_subscriptions = req.user.subscriptions;
    console.log("LOL подписки: " + JSON.stringify(my_subscriptions));

    Account.find({'_id': { $in: my_subscriptions }})
        .then((docs) => {
            if (docs.length != 0) {
                var subs_arr = docs.map(get_subs_data);
                console.log("Мои подписки: " + JSON.stringify(subs_arr));

                res.render("my_profile", {
                    subs_arr: subs_arr,
                    user : req.user
                });
            } else {
                res.render("my_profile", {
                    user : req.user
                });
            }
        });


});

router.post('/delete_img', function(req, res) {

    var img_id = new ObjectId(req.body.img_id);

    console.log("Собираемся удалить изображение с id = " + img_id);

    gfs.remove({ _id: img_id }, function (err) {
        if (err) return handleError(err);
        console.log("Изображение с id = " + img_id + " успешно удалено");
        res.send("ok");
    });

});

router.post('/delete_myself', function(req, res) {

    var user_id = new ObjectId(req.body.user_id);

    console.log("Пользователь с id = " + user_id + " хочет удалить свой профиль");

    Account.findByIdAndRemove(user_id, function (err) {
        if (err) return handleError(err);
        console.log("Пользователь с id = " + user_id + " успешно удалён");
        res.send("ok");
    });

});

router.get('/img/:id', function(req, res){

    console.log("Получаем изображение по URL: /" + req.params.id);
    var read_stream = gfs.createReadStream({_id: req.params.id});
    read_stream.on("error", function(err){
        console.log("Ошибка! Изображение с id " + req.params.id + " не найдено.");
        res.send("Ошибка! Изображение с id " + req.params.id + " не найдено.");
    });
    read_stream.pipe(res);
});

router.post('/like', function(req, res){

    var img_id = new ObjectId(req.body.img_id);
    var author_id = new ObjectId(req.body.author_id);
    var user_id = (req.user._id).toString();

    console.log("Ставим лайк изображению с id = " + img_id + " автора " + author_id);

    Image.findById(img_id)
        .then((doc) => {
            var doc = doc.toObject();
            var current_likes = doc.metadata.likes;
            current_likes.push(user_id);

            gfs.files.update(
                { _id: img_id },
                { $set: {
                    'metadata.likes': current_likes
                } },
                function (err) {
                    if (err) return handleError(err);
                    res.send({new_likes: current_likes});
                }
            ).then(
                Account.findById(author_id)
                    .then((doc) => {
                        // Если автор есть (мало ли, вдруг страницу удалил), поднимаем ему рейтинг
                        if (doc !== null) {
                            var doc = doc.toObject();
                            var current_rating = parseInt(doc.rating);

                            Account.update(
                                { _id: author_id },
                                { $set: {
                                    'rating': current_rating + 1
                                } },
                                function (err) {
                                    if (err) return handleError(err);
                                }
                            );
                        }
                    })
            )
        });

});

router.get('/author/:id', function(req, res){
    console.log("Профиль автора " + req.params.id);

    var id = new ObjectId(req.params.id);

    Image.find({'metadata.author_id': id}).sort({ $natural: -1 })
        .then((docs) =>{
            var image_arr = docs.map(get_img_data);

            Account.findById(id)
                .then((doc) => {
                    if (doc !== null) {
                        var doc = doc.toObject();
                        console.log("Получена информация об авторе: " + JSON.stringify(doc));

                        res.render("profile", {
                            image_arr: image_arr,
                            user : req.user,
                            author_info: {
                                id : id,
                                name: doc.username,
                                avatar: doc.avatar,
                                subscriptions: doc.subscriptions,
                                rating: doc.rating
                            }
                        });
                    } else {
                        res.render("profile", {
                            user : req.user
                        });
                    }
                });

            console.log(docs);
            console.log(image_arr);
        });

});

router.post('/subscribe', function(req, res){

    var author_id = new ObjectId(req.body.id);
    var user_id = new ObjectId(req.user._id);

    console.log("Подписываемся на автора с id = " + JSON.stringify(author_id) + ", наш id = " + user_id);

    Account.findById(user_id)
        .then((doc) => {
            var doc = doc.toObject();
            console.log("Нашли себя: " + JSON.stringify(doc));
            var current_subscriptions = doc.subscriptions;
            current_subscriptions.push(author_id);

            Account.update(
                { _id: user_id },
                { $set: {
                    'subscriptions': current_subscriptions
                } },
                function (err, ok) {
                    if (err) return handleError(err);
                    res.send(ok);
                }
            );
        });

});

router.post('/unsubscribe', function(req, res){

    var author_id = new ObjectId(req.body.id);
    var user_id = new ObjectId(req.user._id);

    console.log("Отписываемся от автора с id = " + JSON.stringify(author_id) + ", наш id = " + user_id);

    Account.findById(user_id)
        .then((doc) => {
            var doc = doc.toObject();
            console.log("Нашли себя: " + JSON.stringify(doc));
            var current_subscriptions = doc.subscriptions;
            var author_number = current_subscriptions.indexOf(author_id);
            current_subscriptions.splice(author_number, 1);

            Account.update(
                { _id: user_id },
                { $set: {
                    'subscriptions': current_subscriptions
                } },
                function (err, ok) {
                    if (err) return handleError(err);
                    res.send(ok);
                }
            );
        });

});

module.exports = router;