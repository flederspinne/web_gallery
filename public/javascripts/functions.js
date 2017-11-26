var get_img_data = function(e) {
    var img_data = {};
    var current_obj = e.toObject();

    img_data.id = current_obj._id;
    img_data.filename = current_obj.filename;
    img_data.author_id = current_obj.metadata.author_id;
    img_data.author_name = current_obj.metadata.author_name;
    img_data.tag = current_obj.metadata.tag;
    img_data.likes = current_obj.metadata.likes;
    img_data.type = current_obj.metadata.type;

    return img_data;
};

var get_subs_data = function(e) {
    var author_data = {};
    var current_obj = e.toObject();

    author_data.id = current_obj._id;
    author_data.username = current_obj.username;

    return author_data;
};

// Для клиента
// Отправка id картинки для выставления лайка
var like = function(img_id, author_id) {
    $.post(
        "/like", {
            img_id: img_id,
            author_id: author_id
        },
        function(data) {
            $("#img_item_" + img_id + " .like_button").removeAttr("onclick");
            $("#img_item_" + img_id + " .like_button").addClass("disabled");
            $("#likes_count_" + img_id).text(data.new_likes.length);
        }
    );
};

// Подписка на автора
var subscribe = function (author_id) {
    $.post(
        "/subscribe", {
            id: author_id
        },
        function(data) {
            alert("Ура!");
        }
    );
};

// Отписаться от автора
var unsubscribe = function (author_id) {
    $.post(
        "/unsubscribe", {
            id: author_id
        },
        function(data) {
            alert("Ура!");
        }
    );
};

// Поиск по тегу
var search_by_tag = function (tag) {
    $.post(
        "/search", {
            search_tag: tag
        },
        function(data) {
            document.open();
            document.write(data);
            document.close();
        }
    );
};

// Удаление изображения
var delete_img = function (id) {
    if (confirm("Вы действительно хотите удалить это изображение?" +
        "\nОтменить это действие будет невозможно!")) {
        $.post(
            "/delete_img", {
                img_id: id
            },
            function(data) {
                if (window.location.href.indexOf("large") === -1) {
                    location.reload();
                } else {
                    window.location = document.referrer;
                }
            }
        );
    }
};

// Удаление своего профиля
var delete_myself = function (user_id) {
    if (confirm("Вы действительно хотите удалить свой профиль?" +
            "\nОтменить это действие будет невозможно!")) {
        $.post(
            "/delete_myself", {
                user_id: user_id
            },
            function(data) {
                window.location = "/";
            }
        );
    }
};

var get_large_img = function (img_id) {
    window.location = "/large/" + img_id;
};

var show_upload = function () {
    $("#input_file_tag, #button_file_submit").css("visibility", "visible");
};

module.exports.get_img_data = get_img_data;
module.exports.get_subs_data = get_subs_data;