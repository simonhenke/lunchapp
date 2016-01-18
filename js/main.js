
var React = require('react');
var ReactDOM = require('react-dom');
var ReactCSSTransitionGroup = require('react-addons-css-transition-group');
var Shuffle = require('react-shuffle');
var LinkedStateMixin = require('react-addons-linked-state-mixin');
//var MagicMove = require('react-magic-move');



// Components ----------------------------------


var LocationList = React.createClass({

	getInitialState: function(){
		return{locations: []};
	},

	sortLocations: function(locations){
		locations.sort(function(a,b){
				if(a.userCount > b.userCount){return -1}
				if(a.userCount < b.userCount){return 1}
					return 0;
		});
	},

	setLocationState: function(locations){
		this.sortLocations(locations);
			self.setState({
				locations: locations
			});
	},

	componentDidMount: function () {
		var locations = [];
		self = this;

		function setLocationStateX(locations){
			self.setLocationState(locations);
		}


        $.get("http://lunchapp/locations", function(result) {
	      	// Initialise Locations
	        locations = result;
	        var i = 1;

	        locations.map(function(location){
	          	
	        	$.get("http://lunchapp/usersAtLocation/"+location.location_id, function(users) {
		      		location.users = users;
		      		location.userCount = users.length;
	      		}).done(function(){
	      			if(i === locations.length){
	      				// when finished reading all, set the state
	      				setLocationStateX(locations);
	      			}
	      			i++;
	      		});
	        }); // end map

	    }); // first get	
    }, 

    incrementUserCount: function(location_id){

    	// -- Make Changes to the Model

    	// copy array to make changes 
    	var locationsUpdated = this.state.locations.slice(0);
    	locationsUpdated.map(function(location){
    		if(location.location_id === location_id){
    			location.userCount =  location.userCount + 1;
    		}
    	});
    	this.setLocationState(locationsUpdated);

    	// -- Make Changes to DB

    },

 	render: function() {			
	    return (
	    	<div>
		     	<ul className="location-list">		     	 
	    			{this.state.locations.map(function(location,i) {

	    				var counter;
						if(location.userCount > 0){
							 counter = <span className="location__user-count">{location.userCount}</span>
						}
						var cta;
						//if(this.props.loggedIn){
						if(true){
							cta = <a onClick={this.incrementUserCount.bind(this,location.location_id)} className="location__cta">Auch</a>
						}


       					return <li key={i}>
           					<Location 
           					
           					name={location.name} 
           					description={location.description} 
           					id={location.location_id} />

           					<div className="location__rating rating-4">
           						<div className="icon-star"></div>
           						<div className="icon-star"></div>
           						<div className="icon-star"></div>
           						<div className="icon-star"></div>
           						<div className="icon-star"></div>
           					</div>
           					{cta}          				
		       				<div className="location__counter-box">{counter}</div>

       					</li>;
    				},this)}
		     	</ul>
	     	</div>
	    );
	}
});


var Location = React.createClass({	
	render: function() {			
	    return (
	      <div className="location">
	      	<div className="location__image">
	      		<img src="https://placeimg.com/600/400/nature" />
	      	</div>
	      	<div className="location__body">
	      		<div className="location__body-wrapper">
		        	<h2 className="location__name">{this.props.name}</h2>
		        	<p className="location__description">{this.props.description}</p>				 
	        	</div>
	        </div>
	      </div>
	    );
	  }
});


var LoginComponent = React.createClass({
	mixins: [LinkedStateMixin],
	getInitialState: function(){
		return{
			user:"",
			password:"",
			loginFailed:false
		}
	},

	login: function(e){
		e.preventDefault();
		//console.log(this.state.user);
		this.sendLoginRequest();
	},

	componentWillMount: function(){
		
		//this.checkLoginStatus();
	},

	getUserId: function(username){
		var uid;
		var self = this;
		$.get("http://lunchapp/getUserId/"+username, function(result) {
			uid = result[0].uid;
		}).done(function(){
			self.tellAppUserLoggedIn(uid);
		});
		/*
		var settings = {
		  "async": true,
		  "crossDomain": true,
		  "url": "http://lunchapp/getUserId/simonhenke",
		  "method": "GET",
		  "headers": {
		    "cache-control": "no-cache",
		  }
		}
		$.ajax(settings).done(function (response) {
		  console.log(response);
		});*/
	},

	tellAppUserLoggedIn(userId){
		this.props.setLogin(userId)
	},

	checkLoginStatus: function(){
		var self = this;
		var settings = {
		  "async": true,
		  "crossDomain": true,
		  "url": "http://lunchapp/loginCheck/secret",
		  "method": "GET",
		  "headers": {
		    //"x-csrf-token": sessionToken,
		    "content-type": "application/json",
		  },
		  "error": function(xhr,status,error){
			console.log("login failed !!!")
		  }
		}

		$.ajax(settings).done(function (response,statusText,request) {
		  if(request.status == 200){
		  	self.getUserId(self.state.user);
		  }
		});
	},

	sendLoginRequest:function(){

		var sessionToken ="";
		var self = this;

		var settings = {
		  "async": true,
		  "crossDomain": true,
		  "url": "http://lunchapp/user/login",
		  "method": "POST",
		  "headers": {
		   "content-type": "application/x-www-form-urlencoded",
		   //"cache-control":"no-cache"
		  },
		  "data": {
		    "name": this.state.user,
		    "pass": this.state.password,
		    "form_id": "user_login_form"
		  },
		  "error": function(xhr,status,error){
		  	console.log(error);
		  }
		}

		$.ajax(settings).done(function (response,statusText,request) {
		  //getToken();
		  self.checkLoginStatus();
		});
	},

	render: function(){
		return (
			<div className="login">
        	<form role="form">
		        <div className="form-group">
		          <input type="text" valueLink={this.linkState('user')}placeholder="Username" />
		          <input type="password" valueLink={this.linkState('password')} placeholder="Password" />
		        </div>
		        <button type="submit" onClick={this.login}>Login</button>
	     	</form>
	     	</div>
	    );
	}
});


// -------------------------------------------


var App = React.createClass({	
	getInitialState:function(){
		return{
			userId:"",
			loggedIn:false
		}
	},
	setLogin: function(_userId){
		this.setState({
			loggedIn:true,
			userId:_userId
		});

	},
	render: function() {	
		
		var loginComponent;
		if(!this.state.loggedIn){
			loginComponent = <LoginComponent loggedIn={this.state.loggedIn} setLogin={this.setLogin} />
		}		
	    return (
	      <div className="app">
	      	<ReactCSSTransitionGroup transitionName="example" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
	      		{loginComponent}
	      	</ReactCSSTransitionGroup>
	      	<LocationList loggedIn={this.state.loggedIn} currentUser={this.state.userId} />
	      </div>
	    );
	}
});

/*
ReactDOM.render(
  <LocationList/>,locations
);

ReactDOM.render(
  <LoginComponent/>,login
);
*/

ReactDOM.render(
  <App/>,locations
);




