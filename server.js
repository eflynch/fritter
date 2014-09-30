var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');

var routeViews = require('./views').routeViews
var routeAPI = require('./api').routeAPI;

var app = express();

app.use('/static', express.static(__dirname + '/static'));
app.set('views', './templates');
app.set('view engine', 'jade');
app.engine('jade', require('jade').__express);

var SECRET = 'asdljk1,4mnsadlfiuy4lkdgyuaper8thlakj.vn12o387ou';
app.use(cookieParser(SECRET))
app.use(session({secret: SECRET, resave: true, saveUninitialized: true}));

routeAPI(app);
routeViews(app);

app.listen(8080);
