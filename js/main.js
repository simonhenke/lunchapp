
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
		$.ajaxSetup({ cache: false });
		var locations = [];
		self = this;

		window.addEventListener("keypress", myEventHandler, false);
		function myEventHandler(e){
		    var keyCode = e.keyCode;
		    if(keyCode == 13){
		    	var $focusedLocation = $(".location--focused");
		        if(!$(".popup")[0] && $focusedLocation[0]){ // if popup isnt visible
		        	console.log("enter");
		        	
		        	self.createVisit($focusedLocation.data("location-id"));
		     	}
		        
		    }
		};




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
	      				self.setLocationState(locations);
	      			}
	      			i++;
	      		});
	        }); // end map

	    }); // first get	
    }, 

    componentWillUnMount: function(){
    	window.removeEventListener('keypress', myEventHandler);
    },

    createVisit: function(location_id){
    	
    	this.props.showPopup("createVisit","when do you want to eat?",location_id);
 
    	/*
    	var self = this;

    	$.get("http://lunchapp/visitstodayfromuser/"+this.props.currentUser, function(result) {
		}).done(function(response){
			if(response[0]){
				alert("you already visit an other location today ! Todo(show info and delete possibility)");
			}
			else{
				var settings = {
				  "async": true,
				  "crossDomain": true,
				  "url": "http://lunchapp/entity/node",
				  "method": "POST",
				  "headers": {
				    "cache-control": "no-cache",
				    "content-type": "application/json",
				    "x-csrf-token": this.props.token,
				  },
				  "processData": false,
				  //"data": "{\n  \"type\":[{\"target_id\":\"visit\"}],\n  \"title\":[{\"value\":\"json-visit\"}],\n  \"field_user\":[{\"target_id\":\"1\"}],\n  \"field_location\":[{\"target_id\":\"3\"}],\n  \"field_date\":[{\"value\":\"2016-01-18T12:15:00\"}]\n}"
				  "data": "{\n  \"type\":[{\"target_id\":\"visit\"}],\n  \"title\":[{\"value\":\"json-visit\"}],\n  \"field_user\":[{\"target_id\":\""+this.props.currentUser+"\"}],\n  \"field_location\":[{\"target_id\":\""+location_id+"\"}],\n  \"field_date\":[{\"value\":\"2016-01-18T12:15:00\"}]\n}",
				  "error": function(xhr,status,error){
					alert("you have to be logged in !");
				  }
				}

				$.ajax(settings).done(function (response) {
				  self.incrementUserCount(location_id);
				});
			}
		});
	*/
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
							cta = <a onClick={this.createVisit.bind(this,location.location_id)} className="location__cta">Auch</a>
						}

       					return <li key={i} data-index={i} data-location-id={location.location_id}>
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
		if(this.state.user && this.state.password){
			this.sendLoginRequest();
		}
		else{
			console.log("error: empty field(s)");
		}
		
	},

	componentWillMount: function(){
		
		//this.checkLoginStatus();
	},

	getToken: function(){
		var token;
		var self = this;
		$.get("http://lunchapp/rest/session/token", function(result) {
			token = result;
		}).done(function(){
			self.getUserId(self.state.user,token);
		});
	},

	getUserId: function(username,token){
		var uid;
		var self = this;
		$.get("http://lunchapp/getUserId/"+username, function(result) {
			uid = result[0].uid;
		}).done(function(){
			self.tellAppUserLoggedIn(uid,token);
		});
	},

	tellAppUserLoggedIn: function(userId,token){
		this.props.setLogin(userId,token)
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
		  	self.getToken();
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

var popupOnceMounted = false;
var Popup = React.createClass({
	
	componentDidMount:function(){
		var self = this;
		if(!popupOnceMounted){
			// Check for Click outside
			$(document).mouseup(function (e){
	            var container = $(".popup__wrapper");

	            if (!container.is(e.target) // if the target of the click isn't the container...
	                && container.has(e.target).length === 0) // ... nor a descendant of the container
	            {
	            	if($(".popup").length != 0){ // check if popup is actually visible
	            		self.props.hidePopup();
	            	}
	                
	            }
	        });

	        // Check for Escape Press
	        $(document).keyup(function(e) {
	     		if (e.keyCode == 27) {
	     			if($(".popup").length != 0){ // check if popup is actually visible
			    		self.props.hidePopup();  
			    	}  
			    }
			});
			popupOnceMounted = true;
		}

		$(".popup__input").val("13:00");
	},

	render: function() {	

		var content;
		var buttons;
		var cancelButton=<a className="popup__button" onClick={this.props.hidePopup}>cancel</a>;

		if(this.props.type == "createVisit"){
			content = <div><p>{this.props.text}</p>
						<input className="popup__input" type="time"/></div>
						

			buttons = <div>{cancelButton}
						<a className="popup__button" href="#">create visit</a></div>
		}

	    return (
	      <div className="popup">
			<div className="popup__wrapper">
				<div className="popup__border"></div>
				<div className="popup__body">
					{content}
				</div>
				{buttons}
			</div>
		</div>
	    );
	  }
});


// -------------------------------------------


var App = React.createClass({	
	getInitialState:function(){
		return{
			userId:"",
			loggedIn:false,
			token:"",
			popup:"",
			popupData:"",
			popupText:"",
		}
	},

	showPopup: function(type,text,storedData){
		this.setState({
			popup:type,
			popupData: storedData,
			popupText: text
		});
	},

	hidePopup: function(){
		this.setState({
			popup:""
		});
	},

	confirmPopup:function(){

	},

	setLogin: function(_userId,_token){
		this.setState({
			loggedIn:true,
			userId:_userId,
			token:_token,
		});

	},
	render: function() {	
		
		var loginComponent;
		var popup;

		if(!this.state.loggedIn){
			loginComponent = <LoginComponent loggedIn={this.state.loggedIn} setLogin={this.setLogin} />
		}
		if(this.state.popup){
			popup = <Popup type={this.state.popup} 
						   text={this.state.popupText} 
						   storedData={this.state.popupData} 
						   hidePopup={this.hidePopup}
						   confirm={this.confirmPopup} />
		}

	    return (
	      <div className="app">
	      	<ReactCSSTransitionGroup transitionName="login" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
	      		{loginComponent}
	      	</ReactCSSTransitionGroup>
	      	<LocationList showPopup={this.showPopup} loggedIn={this.state.loggedIn} currentUser={this.state.userId} token={this.state.token} />
	      	<ReactCSSTransitionGroup transitionName="popup" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
	      		{popup}
	      	</ReactCSSTransitionGroup>
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




