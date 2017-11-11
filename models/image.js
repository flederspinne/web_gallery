var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var Image = mongoose.model("Image",
    new Schema({
        filename : String
    }),
    "fs.files"
);

module.exports = Image;