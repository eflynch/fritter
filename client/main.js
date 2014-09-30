var React = require('react');
var $ = require('jquery');
var _ = require('underscore');
var FriteListView = require('./friteview').FriteListView;

var models = require('./models');

var ra = React.DOM;

// Send logout POST to API
var logout = function () {
    return $.ajax('/api/logout',{
        contentType: 'application/json',
        type: 'POST'
    });
};

// Username and logout command
var TopBar = React.createClass({
    render: function(){
        return ra.div({className: 'topbar'},
            'Hi ' + this.props.username,
            ra.a({
                onClick: this.props.logoutCallback
            }, 'logout')
        );
    }
});

// Query input field for $cashtags and @fryers
var QueryBar = React.createClass({
    handleClearQuery: function(){
        this.props.handleSetQuery('');
    },
    handleFocus: function (e){
        var target = e.target;
        setTimeout(function(){target.select();},0);
    },
    render: function (){
        return ra.div({className: 'querybar'}, 
            ra.input({
                value: this.props.query,
                onChange: this.props.handleQueryChange,
                onFocus: this.handleFocus,
                placeholder: 'Search $cashtags and @fryers'
            })
        );
    }
});

// Post input field for POSTing new Frites to API
var PostBar = React.createClass({
    handlePost: function (e){
        if (e.key == 'Enter'){
            e.preventDefault();
            if (this.props.post === ''){
                return;
            }
            var DOMNode = this.getDOMNode();
            this.props.handlePost(e)
            .done(function(){
                DOMNode.children[0].blur();
            })
            .fail();
        }
    },
    handleFocus: function (e){
        var target = e.target;
        setTimeout(function(){target.select();},0);
    },
    render: function (){
        return ra.div({className: 'postBar'},
            ra.textarea({
                maxLength: 140,
                value: this.props.post,
                onChange: this.props.handlePostChange,
                onKeyDown: this.handlePost,
                onFocus: this.handleFocus,
                placeholder: 'Fry one up!'
            })
        );
    }
});

// Root react component
var Fritter = React.createClass({
    logoutCallback: function (){
        logout()
        .then(function() {window.location = '/login';})
        .fail();
    },
    handlePost: function (event){
        var fetchData = this.fetchData;
        var newFrite = new models.Frite({
            text: this.state.post
        });
        var _this = this;
        return newFrite.save()
        .then(function(){
            fetchData();
            _this.setState({
                post: ''
            });
            window.blur();
        });
    },
    handlePatch: function (frite, text){
        var fetchData = this.fetchData;
        frite.save({text: text}, {patch: true})
        .done(function(){
            fetchData();
        })
        .fail();
    },
    handleSetQuery: function (query){
        this.setState({query: query, working: true})
        this.fetchData();
    },
    handleQueryChange: function (event) {
        this.setState({
            query: event.target.value,
            working: true
        });
        this.fetchData();
    },
    handlePostChange: function (event) {
        this.setState({
            post: event.target.value
        });
    },
    handleDelete: function (model){
        var fetchData = this.fetchData;
        model.destroy()
        .done(function(){
            fetchData();
        })
        .fail();
    },
    handleRefry: function (model){
        var fetchData = this.fetchData;
        var refryURL = '/api/frites/' + model.get('apiID') + '/refry'
        $.ajax(refryURL, {
            contentType: 'application/json',
            type: 'POST'
        })
        .done(function(){
            fetchData();
        });
    },
    fetchData: _.debounce(function (){ // All fetches should go through here
        var frites = this.state.frites;
        var cashtags = this.state.query.match(/\$\w+/g);
        var usernames = this.state.query.match(/@\w+/g);
        var _this = this;
        var options = {data: {}}
        if (cashtags !== null){
            options.data.cashtags = cashtags.join();
        }
        if (usernames !== null){
            usernames = Array.apply(null, usernames).map(function(username){return username.substring(1)});
            options.data.usernames = usernames.join();
        }
        frites.fetch(options)
        .done(function(){_this.setState({frites: frites, working: false});});
    }, 300),
    componentDidMount: function (){
        var fetchData = this.fetchData;
        fetchData();
        setInterval(function (){
            fetchData();
        }, 5000);
    },
    getInitialState: function() {
        return {
            query: '',
            post: '',
            frites: this.props.initialCollection,
            working: false
        }
    },
    render: function (){
        return ra.div(null,
            ra.div({className: 'top'},
                ra.img({
                    className: 'potato',
                    src: '/static/img/potato.png'
                }),
                ra.h1(null, 'Fritter'),
                TopBar({
                    username: bootstrap.username,
                    logoutCallback: this.logoutCallback
                }),
                QueryBar({
                    query: this.state.query,
                    handleQueryChange: this.handleQueryChange,
                    handleSetQuery: this.handleSetQuery
                })
            ),
            PostBar({
                post: this.state.post,
                handlePostChange: this.handlePostChange,
                handlePost: this.handlePost
            }),
            FriteListView({
                working: this.state.working,
                frites: this.state.frites,
                handleDelete: this.handleDelete,
                handlePatch: this.handlePatch,
                handleRefry: this.handleRefry,
                handleSetQuery: this.handleSetQuery
            })
        );
    }
});

$(document).ready(function (){
    var frites = new models.Frites();
    var $content = $('.content');
    React.renderComponent(Fritter({
        initialCollection: frites,
    }), $content.get(0));
});
