var routeViews = function (app) {
    var requireLoggedIn = function (req, res, next) {
        if (req.session.username) {
            next();
        } else {
            res.status(401).json({status: 401, error: 'Requires logged in'});
        }
    };

    app.get('/', function(req, res){
        if (req.session.username) {
            res.render('index', {
                bootstrap: {
                    username: req.session.username
                }
            });
        } else {
            res.render('login');
        }
    });

    app.get('/login', function(req, res){
        res.render('login');
    });
};

module.exports = {
    routeViews: routeViews
}