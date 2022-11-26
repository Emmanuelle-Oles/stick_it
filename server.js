'use strict';

//Variables for the server
var http = require('http');
var port = 1339
const app = require('./app.js');
const userModel = require('./models/userModel');
const categoryModel = require('./models/categoryModel');
const postItModel = require('./models/postItModel');
const colorModel = require('./models/colorModel');

let dbName = process.argv[2];
if (!dbName) {
    dbName = 'bulletin_board';
}

//Initialize all tables in database
// userModel.initialize(dbName, false)
// .then(categoryModel.initialize(dbName, false))
// .then(postItModel.initialize(dbName, false))
// .then(colorModel.initialize(dbName, false))
// .then(app.listen(port));
var reset = false;

userModel.initialize('bulletin_board', reset);
categoryModel.initialize('bulletin_board', reset);
postItModel.initialize('bulletin_board', reset);
colorModel.initialize('bulletin_board', reset);

// userModel.initialize('bulletin_board', false);
// categoryModel.initialize('bulletin_board', falsemy);
// postItModel.initialize('bulletin_board', false)
// colorModel.initialize('bulletin_board', false);

//Run the server
app.listen(port)