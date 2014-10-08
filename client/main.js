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

var ShowingButton = React.createClass({
    handleClick: function (){
        this.props.handleSetShowing(this.props.showing);
    },
    render: function () {
        var className = 'showing-button ' + this.props.showing;
        if (this.props.active){
            className += ' active';
        }
        return ra.div({className: className, onClick: this.handleClick})
    }
});

var ShowingBar = React.createClass({
    render: function (){
        return ra.div({className: 'showing-bar'},
            ShowingButton({
                showing: 'all',
                active: this.props.showing === 'all',
                handleSetShowing: this.props.handleSetShowing
            }),
            ShowingButton({
                showing: 'following',
                active: this.props.showing === 'following',
                handleSetShowing: this.props.handleSetShowing
            }),
            ShowingButton({
                showing: 'search',
                active: this.props.showing === 'search',
                handleSetShowing: this.props.handleSetShowing
            })
        );
    }
});

// Username and logout command
var TopBar = React.createClass({
    formatUsername: function (){
        if (this.props.username.length > 14) {
            return this.props.username.slice(0, 11) + '...';
        } else {
            return this.props.username;
        }
    },
    render: function(){
        return ra.div({className: 'topbar'},
            'Hi ' + this.formatUsername(),
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
        var className = 'queryfield'
        if (this.props.active){
            className += ' active';
        }
        return ra.div({className: 'querybar'}, 
            ra.input({
                className: className,
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
        this.setState({query: query, working: true, showing: 'search'})
        this.fetchData();
    },
    handleQueryChange: function (event) {
        this.setState({
            query: event.target.value,
            working: true,
            showing: 'search'
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
    handleFollow: function (user){
        var fetchData = this.fetchData;
        var followURL = '/api/users/' + this.state.currentUser.get('apiID') + '/following'
        $.ajax(followURL, {
            contentType: 'application/json',
            type: 'PATCH',
            data: JSON.stringify({
                apiID: user.get('apiID')
            })
        })
        .done(function(){
            fetchData();
        });
    },
    handleUnfollow: function (user){
        var fetchData = this.fetchData;
        var followURL = '/api/users/' + this.state.currentUser.get('apiID') + '/following/' + user.get('apiID');
        $.ajax(followURL, {
            contentType: 'application/json',
            type: 'DELETE',
        })
        .done(function(){
            fetchData();
        });
    },
    handleSetShowing: function (newShowing){
        if (this.state.showing !== newShowing){
            this.setState({showing: newShowing, working: true});
        }
        this.fetchData();
        console.log(this.state.showing);
    },
    fetchData: _.debounce(function (){ // All fetches should go through here
        var frites = this.state.frites;
        var currentUser = this.state.currentUser;
        var cashtags = this.state.query.match(/\$\w+/g);
        var usernames = this.state.query.match(/@\w+/g);
        var _this = this;
        var options = {data: {}}
        if (this.state.showing === 'search') {
            if (cashtags !== null){
                options.data.cashtags = cashtags.join();
            }
            if (usernames !== null){
                usernames = Array.apply(null, usernames).map(function(username){return username.substring(1)});
                options.data.usernames = usernames.join();
            }
        }
        if (this.state.showing === 'following') {
            options.data.following = this.state.currentUser.get('username')
        }
        
        $.when(frites.fetch(options), currentUser.fetch())
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
            showing: 'all',
            query: '',
            post: '',
            frites: this.props.initialCollection,
            currentUser: this.props.initialCurrentUser,
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
                    username: this.state.currentUser.get('username'),
                    logoutCallback: this.logoutCallback
                }),
                QueryBar({
                    active: this.state.showing === 'search',
                    query: this.state.query,
                    handleQueryChange: this.handleQueryChange,
                    handleSetQuery: this.handleSetQuery
                }),
                ShowingBar({
                    showing: this.state.showing,
                    handleSetShowing: this.handleSetShowing
                })
            ),
            PostBar({
                post: this.state.post,
                handlePostChange: this.handlePostChange,
                handlePost: this.handlePost
            }),
            FriteListView({
                showing: this.state.showing,
                working: this.state.working,
                frites: this.state.frites,
                currentUser: this.state.currentUser,
                handleDelete: this.handleDelete,
                handlePatch: this.handlePatch,
                handleRefry: this.handleRefry,
                handleFollow: this.handleFollow,
                handleUnfollow: this.handleUnfollow,
                handleSetQuery: this.handleSetQuery
            })
        );
    }
});

$(document).ready(function (){
    var frites = new models.Frites();
    var currentUser = new models.User(bootstrap.currentUser);
    window.c = currentUser;
    currentUser.fetch();
    var $content = $('.content');
    React.renderComponent(Fritter({
        initialCollection: frites,
        initialCurrentUser: currentUser
    }), $content.get(0));
});
