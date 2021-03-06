var $ = require('jquery');
var Backbone = require('backbone');
Backbone.$ = $;

var User = Backbone.Model.extend({
    idAttribute: 'apiID',
    urlRoot: '/api/users',
    parse: function (response, options) {
        response.following = new Backbone.Collection(
            Array.apply(null, response.following).map(function(followed) {return new User(followed)})
        );
        return response;
    }
});

var Frite = Backbone.Model.extend({
    idAttribute: 'apiID',
    urlRoot: '/api/frites',
    defaults: {
        'text': 'No tweet for you!',
    },
    parse: function (response, options) {
        response.poster = new User(response.poster);
        response.author = new User(response.author);
        return response;
    },
});

var Frites = Backbone.Collection.extend({
    model: Frite,
    url: '/api/frites',
    comparator: function (frite) {
        return Date.now() - new Date(frite.get('timestamp'));
    },
    parse: function(response, options){return response.frites;}
});


module.exports = {
    User: User,
    Frite: Frite,
    Frites: Frites
}
