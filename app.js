var express = require('express');

var app = express();
app.use('/static', express.static(__dirname + '/static'));
app.set('views', './templates');
app.set('view engine', 'jade');
app.engine('jade', require('jade').__express);

module.exports = {app: app};
