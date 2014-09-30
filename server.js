var cookieParser = require('cookie-parser');
var session = require('express-session');

var app = require('./app').app;


var routeAPI = require('./api').routeAPI;
var routeViews = require('./views').routeViews

var SECRET = 'asdljk1,4mnsadlfiuy4lkdgyuaper8thlakj.vn12o387ou';
app.use(cookieParser(SECRET))
app.use(session({secret: SECRET, resave: true, saveUninitialized: true}));

routeAPI(app);
routeViews(app);

app.listen(8080);
