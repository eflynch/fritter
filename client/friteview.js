var React = require('react');
var ra = React.DOM;
var moment = require('moment');

FriteButton = React.createClass({
    render: function() {
        if (this.props.active) {
            return ra.span({
                className: 'frite-button ' + this.props.className,
                onClick: this.props.handler
            }, this.props.children);
        } else {
            return ra.span();
        }
    }
})

FriteListView = React.createClass({
    getWorkingDivStyle: function (){
        if (this.props.working){
            return {};
        } else {
            return {display: 'none'};
        }
    },
    getFrites: function (){
        if (this.props.showing === 'following' && this.props.currentUser.get('following').length === 0){
            return ra.div({className: 'no-frites'}, 'it looks like you are not following anyone yet');
        }
        if (this.props.frites.models.length === 0){
            return ra.div({className:'no-frites'}, 'no frites found :(');
        }
        var results = [];
        for (var _i = 0, _len = this.props.frites.models.length; _i < _len; _i++) {
            var frite = this.props.frites.models[_i];
            results.push(Frite({
                key: frite.get('apiID'),
                poster: frite.get('poster'),
                text: frite.get('text'),
                author: frite.get('author'),
                timestamp: frite.get('timestamp'),
                frite: frite,
                currentUser: this.props.currentUser,
                handleDelete: this.props.handleDelete,
                handleRefry: this.props.handleRefry,
                handleFollow: this.props.handleFollow,
                handleUnfollow: this.props.handleUnfollow,
                handlePatch: this.props.handlePatch,
                handleSetQuery: this.props.handleSetQuery
            }));
        }
        return results;
    },
    render: function() {
        return ra.ul({className: 'fritterlist'},
            ra.div({className: 'working', style: this.getWorkingDivStyle()}),
            this.getFrites()
        )
    }
});

var splitWithSeparators = function(string, separator){
    var alltext = [];
    var inbetweens = string.split(separator);
    var separators = string.match(new RegExp(separator.source, 'g'));
    var mergeAlternating = function(array1, array2) {
        var mergedArray = [];

        for (var i = 0, len = Math.max(array1.length, array2.length); i < len; i++) {
            if (i < array1.length) {
                mergedArray.push(array1[i]);
            }
            if (i < array2.length) {
                mergedArray.push(array2[i]);
            }
        }
        return mergedArray;
    }
    if (separators !== null){
        return mergeAlternating(inbetweens, separators);
    }
    return inbetweens;
}

FriteText = React.createClass({
    handleClickCashtag: function (e){
        if (this.props.deleted){
            return;
        }
        this.props.handleSetQuery(e.target.innerHTML);
    },
    getTextElements: function (){
        var re = /\$\w+/;
        var pieces = splitWithSeparators(this.props.text, re);
        var handleClickCashtag = this.handleClickCashtag;
        pieces = Array.apply(null, pieces).map(function (piece){
            if (piece === '') return;
            if (piece.charAt(0) === '$'){
                return ra.span({
                    className: 'cashtag',
                    onClick: handleClickCashtag}, piece);
            }
            return ra.span(null, piece);
        });
        return pieces;
    },
    render: function (){
        if (this.props.edit){
            return ra.textarea({
                className: 'text',
                value: this.props.text,
                onChange: this.props.onChange,
                onKeyDown: this.props.onKeyDown,
                maxLength: 140
            });
        } else {
            var refryCitation = '';
            if (this.props.author.get('username') !== this.props.poster.get('username')){
                refryCitation = this.props.author.get('username') + ' said: ';
            }
            return ra.p({
                className: 'text',
            },
                ra.span({className: 'refry-text'}, refryCitation),
                ra.span(null, this.getTextElements())
            );
        }
    }
});

FollowButton = React.createClass({
    render: function (){
        if (this.props.isPoster) {
            return ra.div();
        }

        if (this.props.isFollowing) {
            return ra.div({className: 'unfollow follow-button', onClick: this.props.handleUnfollow}, '-');
        }

        return ra.div({className: 'follow follow-button', onClick: this.props.handleFollow}, '+');
    }
});

Frite = React.createClass({
    formatTimeStamp: function (){
        return moment(this.props.timestamp).fromNow();
    },
    getInitialState: function (){
        return {
            edit: false,
            text: this.props.text,
            deleted: false
        };
    },
    componentWillReceiveProps: function(nextProps){
        if (!this.state.edit){
            this.setState({
                text: nextProps.text
            })
        }
    },
    onChangeHandler: function(e){
        this.setState({text: e.currentTarget.value});
    },
    onKeyDownHandler: function(e){
        if (e.key == 'Enter'){
            e.preventDefault();
            this.setState({edit: false});
            this.props.handlePatch(this.props.frite, e.currentTarget.value);
        }
    },
    startEditingHandler: function (){
        this.setState({edit: true});
    },
    handleDelete: function(){
        this.setState({deleted: true});
        this.props.handleDelete(this.props.frite);
    },
    handleRefry: function(){
        this.props.handleRefry(this.props.frite);
    },
    handleFollow: function(){
        this.props.handleFollow(this.props.poster);
    },
    handleUnfollow: function(){
        this.props.handleUnfollow(this.props.poster);
    },
    handleSetQueryToUser: function(){
        if (this.state.deleted){
            return;
        }
        this.props.handleSetQuery('@' + this.props.poster.get('username'));
    },
    getListProps: function(){
        var classes = []
        if (this.state.deleted){
            classes.push('deleted');
        }
        if (this.isPoster()){
            classes.push('poster');
        }
        if (this.isAuthor()){
            classes.push('author');
        }
        if (this.isFollowing()){
            classes.push('following');
        }
        return {className: classes.join(' ')};
    },
    isFollowing: function () {
        return (this.props.currentUser.get('following').where({username: this.props.poster.get('username')}).length > 0);
    },
    isPoster: function () {
        return this.props.poster.get('username') === this.props.currentUser.get('username');
    },
    isAuthor: function () {
        return this.props.author.get('username') === this.props.currentUser.get('username');
    },
    render: function (){

        return ra.li(this.getListProps(),
            ra.div({className: 'follow-button-wrapper'},
                ra.span({className: 'title', onClick: this.handleSetQueryToUser}, this.props.poster.get('username')),
                FollowButton({
                    isFollowing: this.isFollowing(),
                    isPoster: this.isPoster(),
                    handleFollow: this.handleFollow,
                    handleUnfollow: this.handleUnfollow
                })
            ),
            FriteText({
                deleted: this.state.deleted,
                text: this.state.text,
                onChange: this.onChangeHandler,
                onKeyDown: this.onKeyDownHandler,
                handleSetQuery: this.props.handleSetQuery,
                edit: this.state.edit,
                author: this.props.author,
                poster: this.props.poster
            }),
            ra.p({className:'timestamp'},
                this.formatTimeStamp(),
                FriteButton({
                    className: 'refry',
                    active: !this.isAuthor() && !this.isPoster(),
                    handler: this.handleRefry
                }, 'refry'),
                FriteButton({
                    className: 'delete',
                    active:  this.isPoster() && !this.state.deleted,
                    handler: this.handleDelete
                }, 'delete'),
                FriteButton({
                    className: 'edit',
                    active:  this.isPoster() && !this.state.edit && !this.state.deleted,
                    handler: this.startEditingHandler
                }, 'edit')
            )
        );
    }
});


module.exports = {
    FriteListView: FriteListView
}
