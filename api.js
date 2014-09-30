var bodyParser = require('body-parser');
var bcrypt = require('bcrypt');

var models = require('./model');

var routeAPI = function (app) {
    // Middleware
    var requireLoggedIn = function (req, res, next) {
        if (req.session.username) {
            next();
        } else {
            res.status(401).json({status: 401, error: 'Requires logged in'});
        }
    };

    app.route('/api/*')
    .post(bodyParser.json())
    .patch(bodyParser.json())


    // API
    app.post('/api/login', function(req, res){
        if (!req.body.hasOwnProperty('username') || !req.body.hasOwnProperty('password')){
            res.status(400).json({status: 400, error: 'Requires username and password'}).end();
            return;
        }
        var username = req.body.username;
        var password = req.body.password;
        models.User.findOne({'username': username}, function (err, result){
            if (err) throw err;
            req.session.regenerate(function (){
                if (result === null) {
                    return res.status(404).json({message: 'username not found'}).end();
                }
                if (!bcrypt.compareSync(password, result.hash)){
                    return res.status(401).json({message: 'wrong password'}).end();
                }
                req.session.username = result.username;
                req.session.save();
                return res.json({message: 'logged in as '+ result.username}).end();
            });
        });
    });

    app.post('/api/logout', function(req, res){
        req.session.destroy( function() {
            res.json({message: 'logged out'});
        });
    });


    // User Routes
    app.route('/api/users')
    .post(function(req, res) {
        if (!req.body.hasOwnProperty('username') || !req.body.hasOwnProperty('password')){
            res.status(400).json({status: 400, error: 'Requires username and password'}).end();
            return;
        }
        var username = req.body.username;
        var password = req.body.password;
        models.User.findOne({'username': username}, function (err, user){
            if (user){
                res.status(400).json({status: 400, error: 'Username unavailable'}).end();
                return; 
            }
            var hash = bcrypt.hashSync(password, 10);
            var user = new models.User({username: username, hash: hash})
            user.save();
            res.json({username: username}).end();
        });
    });


    // Frite Routes
    var validatefrite = function (req, res, callback) {
        if (!req.body.hasOwnProperty('text')) {
            res.status(400).json({status: 400, error: 'Requires field "text"'}).end();
            return false;
        }
        if (!(req.body.text instanceof String || typeof req.body.text === 'string')) {
            res.status(400).json({status: 400, error: 'Requires "text" field must be a string'}).end();
            return false;
        }
        if (req.body.text.length > 140) {
            res.status(400).json({status: 400, error: 'Frite must be less than 140 characters'}).end();
            return false;
        }
            
        return callback(req.body.text);
    }

    app.route('/api/frites')
    .post(requireLoggedIn)
    .post(function (req, res) {
        models.User.findOne({'username': req.session.username}, function (err, user){
            if (err) {
                return res.status(400).json({status: 400, error: 'You are logged in as a non-existent user. How did you do that?'}).end();
            }
            validatefrite(req, res, function(text){
                var cashtags = text.match(/\$\w+/g);
                var frite = new models.Frite({text: text, user: user, cashtags: cashtags});
                frite.save()
                res.json(frite.toJSON()).end();
            });
        }); 
    })
    .get(function (req, res) {
        var cashtags = [];
        var usernames = [];
        if (req.query.cashtags !== undefined && req.query.cashtags !== null){
            cashtags = req.query.cashtags.split(',');
            cashtags = Array.apply(null, cashtags).map(function (cashtag){
                if (cashtag.charAt(0) !== '$') {
                    return '$' + cashtag;
                }
                return cashtag;
            });
        }
        if (req.query.usernames !== undefined && req.query.usernames !== null){
            usernames = req.query.usernames.split(',');
        }
        models.User.where('username').in(usernames).exec(function (err, result){
            if (err) throw err;

            var query = models.Frite.find({}).populate('user').populate('refry');
            if (cashtags.length){
                query.where('cashtags').all(cashtags);
            }
            if (usernames.length){
                query.where('user').in(result);
            }
            query.exec(function(err, result){
                res.json({frites: result}).end();
            });
        });
        
        
    });

    app.route('/api/frites/:friteID')
    .get(function (req, res) {
        models.Frite.findOne({apiID: req.params.friteID}).populate('user').populate('refry').populate('refry').exec(function (err, frite){
            if (err) {
                return res.status(404).json({status: 404, error: 'Frite ' + req.params.friteID + 'not found'}).end();
            }
            return res.json(frite.toJSON()).end();
        })
    })
    .delete(requireLoggedIn)
    .delete(function (req, res) {
        models.Frite.findOne({apiID: req.params.friteID}).populate('user').exec(function (err, frite){
            if (err) throw err;
            if (frite === null){
                return res.status(404).json({status: 404, error: 'Not found'}).end();
            }
            if (req.session.username !== frite.user.username){
                return res.status(401).json({status: 401, error: 'Not authorized to delete'}).end();
            }
            models.Frite.remove({ apiID: req.params.friteID}, function (err) {
                if (err) {
                    res.status(404).json({status: 404, error: 'Not found'}).end();
                } else {
                    res.json({message: 'Deleted frite ' + req.params.friteID}).end();
                }
            });
        });
    })
    .patch(requireLoggedIn)
    .patch(function (req, res) {
        validatefrite(req, res, function(text){
            models.Frite.findOne({apiID: req.params.friteID}).populate('user').exec(function (err, frite){
                if (req.session.username !== frite.user.username){
                    return res.status(401).json({status: 401, error: 'Not authorized to patch'}).end();
                }
                var cashtags = text.match(/\$\w+/g);
                models.Frite.update({apiID: req.params.friteID}, {text: text, timestamp: Date.now(), refry: null, cashtags: cashtags}, function (err, numberAffected, raw){
                    if (err) {
                        return res.status(404).json({status: 404, error: 'Frite ' + req.params.friteID + 'not found'}).end();
                    }
                    models.Frite.findOne({apiID: req.params.friteID}, function (err, frite){
                        res.json(frite.toJSON()).end();
                    });
                });
            }); 
        });
    });

    app.route('/api/frites/:friteID/refry')
    .post(requireLoggedIn)
    .post(function (req, res){
        models.User.findOne({'username': req.session.username}, function (err, user){
            models.Frite.findOne({apiID: req.params.friteID}, function (err, frite){
                if (err) {
                    return res.status(404).json({status: 404, error: 'Could not find request frite'}).end();
                }
                var newRefry;
                if (frite.refry === null || frite.refry === undefined){
                    newRefry = frite.user;
                } else {
                    newRefry = frite.refry;
                }
                var refry = new models.Frite({
                    text: frite.text,
                    user: user, refry:
                    newRefry,
                    cashtags: frite.cashtags
                });
                refry.save()
                res.json(refry.toJSON()).end();
            });
        });
    });


    // Catch everything that falls through
    app.get('/api/*', function(req, res) {
        res.status(404).json({status: 404, error: 'Resource not found'}).end();
    });
};

module.exports = {
    routeAPI: routeAPI
}