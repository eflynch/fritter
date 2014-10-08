var React = require('react');
var $ = require('jquery');

var ra = React.DOM;

// POST login to API
var login = function () {
    var username = $('.username').val();
    var password = $('.password').val();
    return $.ajax('/api/login',{
        data: JSON.stringify({
            username: username,
            password: password
        }),
        contentType: 'application/json',
        type: 'POST'
    });
};

// POST users API
var createUser = function () {
    var username = $('.username').val();
    var password = $('.password').val();
    return $.ajax('/api/users',{
        data: JSON.stringify({
                username: username,
                password: password
            }),
        contentType: 'application/json',
        type: 'POST'
    });
};

var CreateUser = React.createClass({
    handleConfirm: function (e){
        $('.username').focus();
        this.props.onClick(e);
    },
    render: function (){
        if (this.props.create === 'init'){
            return ra.a({
                className: 'create-user',
                onClick: this.handleConfirm
            }, 'new user');
        } else if (this.props.create === 'confirm'){
            return ra.a({
                className: 'create-user confirm',
                onClick: this.props.onClick
            }, 'create');
        } else if (this.props.create === 'success'){
            return ra.div({
                className: 'create-user success',
            }, 'success')
        } else if (this.props.create === 'login'){
            return ra.div({
                className: 'create-user success login',
                onClick: this.props.onClick
            }, 'login')
        } else if (this.props.create === 'fail'){
            return ra.div({
                className: 'create-user fail',
            }, 'username unavailable')
        }
    }
});

var LoginError = React.createClass({
    render: function (){
        if (this.props.active){
            return ra.div({
                className: 'login-error',
            }, 'Wrong Username or Password');
        } else{
            return null
        }
    }
});

var Login = React.createClass({
    getInitialState: function(){
        return {
            error: false,
            create: 'init',
            working: false
        };
    },
    createUser: function (){
        var that = this;
        createUser()
        .done(function(){
            that.setState({create: 'success'});
            setTimeout(function(){that.setState({create: 'login'})}, 1000);
        })
        .fail(function (){
            that.setState({create: 'fail'});
            setTimeout(function(){that.setState({create: 'init'})}, 3000);
        });
    },
    login: function (){
        var that = this;
        that.setState({working: true});
        login()
        .done(function(){
            window.location = '/';
        })
        .fail(function (){
            that.setState({error: true, working: false});
            setTimeout(function(){ that.setState({error: false});}, 4000);
        });
    },
    loginHandler: function (e){
        if (e.key === 'Enter'){
            if (this.state.create === 'confirm') {
                return this.createUser();
            }
            e.target.blur();
            this.login();
            
        }
    },
    createUserHandler: function (){
        if (this.state.create === 'init'){
            this.setState({create: 'confirm'});
            return;
        }
        if (this.state.create === 'confirm'){
            this.createUser();
            return;
        }
        if (this.state.create === 'login'){
            this.login();
            return;
        }
    },
    getWorkingDivStyle: function (){
        if (this.state.working){
            return {};
        } else {
            return {display: 'none'};
        }
    },
    render: function (){
        return ra.div(null, 
            ra.img({
                src:'/static/img/potato.png',
                draggable: false
            }),
            ra.div(
                {className: 'working',
                style: this.getWorkingDivStyle()
            }),
            ra.form(null,
                ra.input({
                    className: 'username',
                    placeholder: 'Username',
                    type: 'text',
                    onKeyDown: function (e){
                        if (e.key === 'Enter'){
                            $('.password').focus();
                        }
                    }
                }),
                ra.input({
                    className: 'password',
                    placeholder: 'Password',
                    type: 'password',
                    onKeyDown: this.loginHandler
                })
            ),
            LoginError({active: this.state.error}),
            CreateUser({
                onClick: this.createUserHandler,
                create: this.state.create
            })
        );
    }
});


$(document).ready(function (){
    var $content = $('.content');
    React.renderComponent(Login(null), $content.get(0));
});
