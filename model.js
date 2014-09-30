var mongoose = require('mongoose');


// Database Instance
var db = mongoose.connect('mongodb://localhost/fritter');


// Helper Methods
var makeID = function (prefix, length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for( var i=0; i < length; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return prefix + '_' + text;
}


// User Model
var UserSchema = new mongoose.Schema({
    username: String,
    hash: String,
    apiID: {type: String, default: function () {return makeID('u', 10);}}
});
UserSchema.set('toJSON', {
    transform: function(doc, ret, options) {
        return {
            username: ret.username,
            apiID: ret.apiID
        };
    }
});

var User = db.model('users', UserSchema);


// Frite Model
var FriteSchema = new mongoose.Schema({
    text: String,
    timestamp: {type: Date, default: Date.now},
    apiID: {type: String, default: function () {return makeID('fr', 10);}},
    cashtags: [String],
    user: {type: mongoose.Schema.ObjectId, ref: 'users'},
    refry: {type: mongoose.Schema.ObjectId, ref: 'users'}
});
FriteSchema.set('toJSON', {
    transform: function(doc, ret, options) {
        return {
            text: ret.text,
            timestamp: ret.timestamp,
            apiID: ret.apiID,
            cashtags: ret.cashtags,
            user: ret.user,
            refry: ret.refry
        };
    }
});


var Frite = db.model('frites', FriteSchema);

module.exports = {
    Frite: Frite,
    User: User
};
