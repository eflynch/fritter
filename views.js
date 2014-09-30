var routeViews = function (app) {
    // Route root - pass username into boostrap variable
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

    // Route login
    app.get('/login', function(req, res){
        res.render('login');
    });
};

module.exports = {
    routeViews: routeViews
}