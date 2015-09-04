var bodyParser = require('body-parser');
var bcrypt = require('bcrypt');

var models = require('./model');

var routeAPI = function (app) {
    
    // Checks if username is set in session cookie -- if not 401's
    var requireLoggedIn = function (req, res, next) {
        if (req.session.username) {
            next();
        } else {
            res.status(401).json({status: 401, error: 'Requires logged in'});
        }
    };

    // Check if request has username and password properties
    validateUserProperties = function(req, res, callback){
        if (!req.body.hasOwnProperty('username') || !req.body.hasOwnProperty('password')){
            res.status(400).json({status: 400, error: 'Requires username and password'}).end();
            return callback(new Error('Requires username and password'), null);
        }
        return callback(null, {username: req.body.username, password: req.body.password});
    }

    // Check if request has text field of appropriate length
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

    // Middleware
    app.route('/api/*')
    .post(bodyParser.json())
    .patch(bodyParser.json())


    /***************************** 
    * Endpoint: /api/login
    * Methods: POST
    * Fields: [username, password]
    * Required: [username, password]
    * Effects: Sets session.username to username upon successful authentication
    * Returns: {message: 'logged in as [username]'}
    ******************************/
    app.post('/api/login', function(req, res){
        validateUserProperties(req, res, function(err, result){
            if (result === null) return;
            var username = result.username;
            var password = result.password;
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
    });


    /*****************************
    * Endpoint: /api/logout
    * Methods: POST
    * Effects: Destroys session
    * Returns: {message: 'logged out'}
    ******************************/
    app.post('/api/logout', function(req, res){
        req.session.destroy( function() {
            res.json({message: 'logged out'}).end();
        });
    });


    /*****************************
    * Endpoint: /api/users
    * Methods: POST
    * Fields: [username, password]
    * Required: [username, password]
    * Effects: Saves new User model to db
    * Returns: new user toJSON
    ******************************/
    app.route('/api/users')
    .post(function(req, res) {
        validateUserProperties(req, res, function(err, result){
            if (result === null) return;
            var username = result.username;
            var password = result.password;
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
    });

    /*****************************
    * Endpoint: /api/users/u_userID
    * Methods: GET
    * Returns: user toJSON
    ******************************/
    app.route('/api/users/:userID')
    .get(function (req, res){
        models.User.findOne({apiID: req.params.userID})
        .populate('following')
        .exec(function (err, user){
            if (err) throw err;
            if (user === null){
                return res.status(404).json({status: 404, error: 'User not found'}).end();
            }
            return res.json(user.toJSON()).end();
        });
    });

    /*****************************
    * Endpoint: /api/users/u_userID/following
    * Methods: PATCH
    * PATCH:
    *   Fields: [apiID]
    *   Required: [apiID]
    *   Effects: Adds user to list of followers of u_userID
    *   Conditions: LOGGED_IN, u_userID = session user
    *   Return: updated user.toJSON
    ******************************/
    app.route('/api/users/:userID/following')
    .patch(requireLoggedIn)
    .patch(function (req, res) {
        models.User.findOne({'username': req.session.username, apiID: req.params.userID})
        .populate('following')
        .exec(function (err, user){
            if (err || user === null) {
                return res.status(404).json({status: 404, error: 'Could not update user'}).end();
            }
            if (!req.body.hasOwnProperty('apiID')){
                return res.status(400).json({status: 400, error: 'User apiID field is required'}).end();
            }
            var userToAdd = req.body.apiID
            models.User.findOne({apiID: req.body.apiID}, function (err, userToAdd){
                if (err) throw err;
                if (userToAdd === null){
                    return res.status(404).json({status: 404, error: 'User to follow does not exist'}).end();
                }

                var newFollowingList = user.following;
                newFollowingList.push(userToAdd);

                models.User.update({apiID: req.params.userID},
                                   {following: newFollowingList}, function (err, numberAffected, raw){
                    if (err || (numberAffected < 1)) {
                        return res.status(404).json({status: 404, error: 'User ' + req.params.userID + 'not found'}).end();
                    }
                    models.User.findOne({apiID: req.params.userID}).populate('following').exec(function (err, user){
                        res.json(user.toJSON()).end();
                    });
                });
            });
        });
    });

    /*****************************
    * Endpoint: /api/users/u_userID1/following/u_userID2
    * Methods: DELETE
    * DELETE:
    *   Effects: Deletes u_userID2 from following list of u_userID1
    *   Return: updated u_userID1.toJSON
    ******************************/
    app.route('/api/users/:userID/following/:userID2')
    .delete(requireLoggedIn)
    .delete(function (req, res){
        models.User.findOne({'username': req.session.username, apiID: req.params.userID})
        .populate('following')
        .exec(function (err, user){
            if (err || user === null) {
                return res.status(404).json({status: 404, error: 'Could not update user'}).end();
            }
            models.User.findOne({apiID: req.params.userID2}, function (err, userToDelete){
                if (err) throw err;
                if (userToDelete === null){
                    return res.status(404).json({status: 404, error: 'User to unfollow does not exist'}).end();
                }

                var newFollowingList = user.following;
                newFollowingList.splice(newFollowingList.indexOf(userToDelete), 1);
                models.User.update({apiID: req.params.userID},
                                   {following: newFollowingList}, function (err, numberAffected, raw){
                    if (err || (numberAffected < 1)) {
                        return res.status(404).json({status: 404, error: 'User ' + req.params.userID + 'not found'}).end();
                    }
                    models.User.findOne({apiID: req.params.userID}, function (err, user){
                        res.json(user.toJSON()).end();
                    });
                });
            });
        });
    });


    /*****************************
    * Endpoint: /api/frites
    * Methods: POST, GET
    * GET:
    *   Query: [usernames, cashtags, followers]
    *   Return: Array of Frites toJSON
    *       Filtered to match union of
    *           any of query.usernames 
    *           all of query.cashtags
    *           any of each user in query.following
    *
    * POST:
    *   Fields: [text]
    *   Conditions: LOGGED_IN
    *   Effects: Saves new Frite model to db
    *   Returns: new Frite model's toJSON
    ******************************/
    app.route('/api/frites')
    .post(requireLoggedIn)
    .post(function (req, res) {
        models.User.findOne({'username': req.session.username}, function (err, user){
            if (err) {
                return res.status(400).json({status: 400, error: 'You are logged in as a non-existent user. How did you do that?'}).end();
            }
            validatefrite(req, res, function(text){
                var cashtags = text.match(/\$\w+/g);
                var frite = new models.Frite({text: text, author: user, poster: user, cashtags: cashtags});
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

        models.User.findOne({username: req.query.following}).populate('following').exec(function (err, followedUser){
            if (err) throw err;
            if (followedUser !== null){
                if (followedUser.following.length === 0){
                    return res.json({frites:[]}).end();
                }
                usernames = usernames.concat(Array.apply(null, followedUser.following).map(function (user) {return user.username;}));
            }
            models.User.where('username').in(usernames).exec(function (err, result){
                if (err) throw err;

                var query = models.Frite.find({}).populate('author').populate('poster');
                if (cashtags.length){
                    query.where('cashtags').all(cashtags);
                }
                if (result.length){
                    query.find({$or: [ {poster: {$in: result}}, {author: {$in: result}}]});
                }
                query.sort({timestamp: -1}).limit(20).exec(function(err, result){
                    res.json({frites: result}).end();
                });
            });

        });
        
    });


    /*****************************
    * Endpoint: /api/frites/fr_friteID
    * Methods: GET, DELETE, PATCH
    * GET:
    *   Returns: Frite toJSON which matches fr_friteID to apiID field 
    *
    * DELETE:
    *   Effects: Deletes Frite from db which matches fr_friteID to apiID field
    *   Condition: session.username must match Frite's user field, LOGGED_IN
    *   Returns: {message: 'Deleted frite fr_friteID'}
    *
    * PATCH:
    *   Fields: [text]
    *   RequireFields: [text]
    *   Condition: session.username must match Frite's user field, LOGGED_IN
    *   Effects: Updates frite which matches fr_friteID to apiID field with new text field
    *       resets timestamp and clears refry field (to prevent misattributing quoted Frite text)
    *   Returns: update Frites toJSON
    ******************************/
    app.route('/api/frites/:friteID')
    .get(function (req, res) {
        models.Frite.findOne({apiID: req.params.friteID}).populate('poster').populate('author').exec(function (err, frite){
            if (err) {
                return res.status(404).json({status: 404, error: 'Frite ' + req.params.friteID + 'not found'}).end();
            }
            return res.json(frite.toJSON()).end();
        })
    })
    .delete(requireLoggedIn)
    .delete(function (req, res) {
        models.Frite.findOne({apiID: req.params.friteID}).populate('poster').exec(function (err, frite){
            if (err) throw err;
            if (frite === null){
                return res.status(404).json({status: 404, error: 'Not found'}).end();
            }
            if (req.session.username !== frite.poster.username){
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
            models.Frite.findOne({apiID: req.params.friteID}).populate('poster').exec(function (err, frite){
                if (req.session.username !== frite.poster.username){
                    return res.status(401).json({status: 401, error: 'Not authorized to patch'}).end();
                }
                var cashtags = text.match(/\$\w+/g);
                models.Frite.update({apiID: req.params.friteID},
                {
                    text: text,                 // Sets new text
                    timestamp: Date.now(),      // Reset timestampe
                    author: frite.poster,       // Reset author to poster
                    cashtags: cashtags          // Reevaluates cashtags
                }, function (err, numberAffected, raw){
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


    /*****************************
    * Endpoint: /api/frites/fr_friteID/refry
    * Methods: POST
    * POST:
    *   Conditions: LoggedIN
    *   Effects: saves new Frite to db which is copy of fr_friteID with refry field set
    *       to fr_friteID.refry or fr_friteID.user (whichever is present) --- could be changed to "author" and "poster" fields.
    *       and user field set to the session user
    *   Returns: toJSON of new Frite
    ******************************/
    app.route('/api/frites/:friteID/refry')
    .post(requireLoggedIn)
    .post(function (req, res){
        models.User.findOne({'username': req.session.username}, function (err, user){
            models.Frite.findOne({apiID: req.params.friteID}, function (err, frite){
                if (err) {
                    return res.status(404).json({status: 404, error: 'Could not find request frite'}).end();
                }
                var refry = new models.Frite({
                    text: frite.text,
                    poster: user,
                    author: frite.author,
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