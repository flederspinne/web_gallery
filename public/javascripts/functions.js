var get_img_data = function(e) {
    var img_data = {};
    var current_obj = e.toObject();

    img_data.filename = current_obj.filename;
    img_data.author = current_obj.metadata.author;
    img_data.tag = current_obj.metadata.tag;
    img_data.likes = current_obj.metadata.likes;

    return img_data;
}

module.exports.get_img_data = get_img_data;