var $ = require('jquery');
var Backbone = require('backbone');
Backbone.$ = $;

var User = Backbone.Model.extend({
    idAttribute: 'apiID',
    urlRoot: '/users'
});

var Frite = Backbone.Model.extend({
    idAttribute: 'apiID',
    urlRoot: '/api/frites',
    defaults: {
        'text': 'No tweet for you!',
    },
    parse: function (response, options) {
        response.user = new User(response.user);
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
