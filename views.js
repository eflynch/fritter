var models = require('./model');

var routeViews = function (app) {
    // Route root - pass username into boostrap variable
    app.get('/', function(req, res){
        if (req.session.username) {
            models.User.findOne({username: req.session.username})
            .populate('following')
            .exec(function (err, user){
                if (err) throw err;
                res.render('index', {
                    bootstrap: {
                        currentUser: user
                    }
                });
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
