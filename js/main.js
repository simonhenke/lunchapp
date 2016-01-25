
var React = require('react');
var ReactDOM = require('react-dom');
var ReactCSSTransitionGroup = require('react-addons-css-transition-group');
var Shuffle = require('react-shuffle');
var LinkedStateMixin = require('react-addons-linked-state-mixin');
//var MagicMove = require('react-magic-move');

// Components:
// ----------------------------------------------------------------------

/** === A list of Locations -
also renders data like userCount, rating, call-to-action, etc =====*/
var LocationList = React.createClass({
	
	/** --- React function to define component features ----- */
	getInitialState: function(){
		return{locations: []};
	},

	/** --- Sorts an array of locations based on their userCount -----*/
	sortLocations: function(locations){
		locations.sort(function(a,b){
				if(a.userCount > b.userCount){return -1}
				if(a.userCount < b.userCount){return 1}
					return 0;
		});
	},

	/** --- Sets/Overwrites the locations which triggers rendering -----*/
	setLocationState: function(locations){
		var self = this;
		this.sortLocations(locations);
		self.setState({
			locations: locations
		});
	},

	/** --- Send Ajax Requests to load all data of locations,
	including rating and userdata -----*/
	loadLocationData: function(){
		var self = this;
		$.ajaxSetup({ cache: false });
		var locations = [];
		$.get("example-data/locations.json", function(result) {
        //$.get("http://lunchapp/locations", function(result) {
	        locations = result;
	        var i = 1;

	        locations.map(function(location){
	        	// Wait for Rating & User Data
		        $.when($.ajax("example-data/usersAt-"+location.location_id+".json"),
		        	   $.ajax( "http://lunchapp/ratingsfromlocation/"+location.location_id)
		        ).done(function( a1, a2 ) { 
					var userData = a1[0]  
					var ratingData = a2[0];
					location.users = userData;
				    location.userCount = userData.length;
			  	 	if(ratingData[0]){location.rating = ratingData[0].stars;}
		      		else{location.rating = undefined;}

		      		if(i === locations.length){ // all data read
		      			self.setLocationState(locations);
		      		}
		      		i++;
				});
	        }); // end of mapping 
	    }); // end of getting locations	
	},

	/** --- Check for 3 conditions: 
	popup not visible, one location focused, no input focused -
	returns true or false ----- */
	focusOnList: function(){
		var $focusedLocation = $(".location--focused");
		var inputIsFocused = $('input:focus').length > 0;
		//condition: popup not visible, one location focused, no input focused
		if(!$(".popup")[0] && $focusedLocation[0] && !inputIsFocused){ 
			return true;
		}
		return false;
	},

	/** --- Adds all needed EventHandlers -----*/
	attachEventHandlers: function(){
		var self = this;
		$(document).keypress(keypressHandler);
		function keypressHandler(e){
		    var keyCode = e.keyCode;
		    if(keyCode == 13){ // enter
		        if(self.focusOnList()){ 
		        	if(self.props.loggedIn){
		        		self.createVisit($focusedLocation.data("location-id"));
		        	}else{
		        		self.showPopup("error","You need to be logged in for this!");
		        	}
		     	}
		    }
		};

		$(document).keydown(keydownHandler);
		function keydownHandler(e){
		    var keyCode = e.keyCode;
		    if(keyCode == 17){ // Ctrl
	    		var focusedLocationIndex = $(".location--focused").data("index");
	    		self.counterClickHandler(focusedLocationIndex);
		    }
		};
	},

	/** ---  updates the rating displayed for a speficic locations ----- */
	updateRatingView: function(location_id){
		
		var self = this;
		var locationsCopy = this.state.locations.slice(0);
		$.get("http://lunchapp/ratingsfromlocation/"+location_id, function(result){
			locationsCopy.map(function(obj,index){
				if(obj.location_id == location_id){
					obj.rating = result[0].stars;
					self.setLocationState(locationsCopy);
				}
			});
		});
	},

	/** --- Removes the earlier attached EventHandlers -----*/
	detachEventHandlers: function(){
		$(document).unbind('keypress', this.keypressHandler);
	},

	/** --- React lifecycle function ----- */
	componentDidMount: function () {

		this.attachEventHandlers();
        this.loadLocationData();
    }, 

    /** --- React lifecycle function ----- */
    componentWillUnmount: function(){
    	this.detachEventHandlers();
    },

    /** --- after cta-click: show dialogue with error or to choose time ----- */
    createVisit: function(location_id){
    	
    	var self = this;

    	$.get("http://lunchapp/visitstodayfromuser/"+this.props.currentUser, function(result) {
		}).done(function(response){
			if(response[0]){
				self.props.showPopup("error","you already eat somewhere today! Todo:Overwrite?");
			}
			else{
				self.props.showPopup("createVisit","when do you want to eat?",location_id);
			}
		});
    },

    /** --- adds 1 to the usercount of the location with the given id ----- */
    incrementUserCount: function(location_id){
    	// copy array to make changes 
    	var locationsUpdated = this.state.locations.slice(0);
    	locationsUpdated.map(function(location){
    		if(location.location_id === location_id){
    			location.userCount =  location.userCount + 1;
    		}
    	});
    	this.setLocationState(locationsUpdated);
    },

    /** --- just delegates the call to the function of the app ----- */
    showPopup:function(type,message,storedData){
    	this.props.showPopup(type,message,storedData);
    },

    /** --- fired when user wants to give a rating (=clicks a star) ----- */
    starClicked: function(stars,location_id){
    	this.props.createRating(stars,location_id);
    },

    counterClickHandler: function(locationItemIndex){
    	if(this.state.locations[locationItemIndex].userCount > 0){
	    	var $locationItem = $(".locationItem")[locationItemIndex];
	    	if($($locationItem).hasClass("showingUsers")){
	    		$($locationItem).removeClass("showingUsers");
	    	}else{
	    		$($locationItem).addClass("showingUsers");
	    	}
    	}
    },

    /** --- React Function to render component ----- */
 	render: function() {
	    return (
	    	<div><ul className="location-list">		     	 
    			{this.state.locations.map(function(location,i){
    				var counter,cta,users;
					if(location.userCount > 0){
						counter = <span onClick={this.counterClickHandler.bind(this,i)} className="location__user-count">{location.userCount}</span>;
						users = <UserList users={location.users}/>;
					}
					
					if(this.props.loggedIn){
						cta = <a onClick={this.createVisit.bind(this,location.location_id)} className="location__cta">Auch</a>
					}
					else{
						cta = <a onClick={this.showPopup.bind(this,"error","You need to be logged in for this!")} className="location__cta">Auch</a>
					}					

   					return <li className={"locationItem"} key={i} data-index={i} data-location-id={location.location_id}>
       					<div className={"locationItem__wrapper"}>
       					<Location 
       						photo={location.photo}
       						name={location.name} 
       						description={location.description} 
       						id={location.location_id} />

       					<Rating
       						stars={location.rating}
       						starClicked={this.starClicked} 
       						location_id={location.location_id}
       						loggedIn = {this.props.loggedIn}
       						showPopup = {this.props.showPopup}/> 
      					
      					{cta}    
      		    				
	       				<div className="location__counter-box">{counter}</div>
	       				{users}	

	       				</div>
   					</li>;
				},this)}
		    </ul></div>
	    );
	}
});

// ----------------------------------------------------------------------

/** === A Location that renders its image,name and description =====*/
var Location = React.createClass({	

	/** --- React function to render component ----- */
	render: function() {	

		var imageAttributes = this.props.photo.match(/"(.*?)"/);
		var imageSrc = imageAttributes[0].replace(/['"]+/g, '');

	    return (
	      <div className="location">
	      	<div className="location__image">
	      		<img src={imageSrc}/>
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

// ----------------------------------------------------------------------

/** === A star rating from 1 to 5 =====*/
var Rating = React.createClass({	

	starClickHandler: function(stars){
		if(this.props.loggedIn){
			this.props.starClicked(stars,this.props.location_id);
		}else{
			this.props.showPopup("error","You have to be logged in to rate a location !");
		}
		
	},

	/** --- React function to render component ----- */
	render: function() {	
		var stars = Math.round(this.props.stars);
		var classString = "location__rating rating-"+stars;

	    return (
	      	<div className={classString}>
				<div className="icon-star star-5" onClick={this.starClickHandler.bind(this,5)}></div>
				<div className="icon-star star-4" onClick={this.starClickHandler.bind(this,4)}></div>
				<div className="icon-star star-3" onClick={this.starClickHandler.bind(this,3)}></div>
				<div className="icon-star star-2" onClick={this.starClickHandler.bind(this,2)}></div>
				<div className="icon-star star-1" onClick={this.starClickHandler.bind(this,1)}></div>
       		</div>
	    );
	  }
});

// ----------------------------------------------------------------------

/** === Listing of users and their dates at one location =====*/
var UserList = React.createClass({	
	
	/* --- converts a single digit X into the format 0X -----*/
	forceTwoDigits: function(e){
	  if(e<10){
	    return '0' + e;
	  }else{
	    return e;
	  }
	},

	/** --- React function to render component ----- */
	render: function() {	
		var self = this;
	    return (
	      	<ul className="user-list"><div className="user-list__content">
	      	{this.props.users.map(function(user,index){
	      		var date = new Date(user.date);
	      		var time = self.forceTwoDigits(date.getUTCHours())
	      		      +":"+self.forceTwoDigits(date.getUTCMinutes())+" Uhr";
				return <li key={user+""+index}>
					<div className="user-list__picture"><img src={"http://lunchapp/sites/default/files/profilepictures/"+user.username+".jpg"}/></div>
					<p className="user-list__username">{user.username}</p>
					<p className="user-list__time">{time}</p>
				</li>;
			})}
			</div></ul>
	    );
	  }
});

// ----------------------------------------------------------------------

/** === Form to handle user login =====*/
var LoginComponent = React.createClass({
	mixins: [LinkedStateMixin],
	/** --- React function to define component features ----- */
	getInitialState: function(){
		return{
			user:"",
			password:"",
			loginFailed:false
		}
	},

	/** --- triggered after click on login button -
	takes further steps after validation ----- */
	login: function(e){
		e.preventDefault();
		if(this.state.user && this.state.password){
			this.sendLoginRequest();
		}
		else{
			this.props.showPopup("error","Login failed due to empty fields!");
		}
	},

	/** --- React Lifecycle Function ----- */
	componentWillMount: function(){
		//this.checkLoginStatus();
	},

	/** --- Sends request to recieve session token ----- */
	getToken: function(){
		var token;
		var self = this;
		$.get("http://lunchapp/rest/session/token", function(result) {
			token = result;
		}).done(function(){
			self.getUserId(self.state.user,token);
		});
	},

	/** --- Send request to get the userId related to a username ----- */
	getUserId: function(username,token){
		var uid;
		var self = this;
		$.get("http://lunchapp/getUserId/"+username, function(result) {
			uid = result[0].uid;
		}).done(function(){
			self.tellAppUserLoggedIn(uid,token);
		});
	},

	/** --- Sends data and status of the successful login to the app component  ----- */
	tellAppUserLoggedIn: function(userId,token){
		this.props.setLogin(userId,token)
	},

	/** --- Checks if login was successfull 
	This is a workaround (request to an url where u need to be logged in).
	Necessary, because Drupal always sends statusCode 200 on rest login ----- */
	checkLoginStatus: function(){
		var self = this;
		var settings = {
		  "url": "http://lunchapp/loginCheck/secret",
		  "method": "GET",
		  "headers": {
		    "content-type": "application/json",
		  },
		  "error": function(xhr,status,error){
			self.props.showPopup("error","Login failed: Couldnt verify successfull login on Drupal");
		  }
		}

		$.ajax(settings).done(function(response,statusText,request){
		  if(request.status == 200){
		  	self.getToken();
		  }
		});
	},

	/** --- Sends ajax request to login ----- */
	sendLoginRequest:function(){

		var self = this;
		var settings = {
		  "url": "http://lunchapp/user/login",
		  "method": "POST",
		  "headers": {
		   "content-type": "application/x-www-form-urlencoded",
		  },
		  "data": {
		    "name": this.state.user,
		    "pass": this.state.password,
		    "form_id": "user_login_form"
		  },
		  "error": function(xhr,status,error){
		  	self.props.showPopup("error","login request failed:"+error);
		  }
		}

		$.ajax(settings).done(function (response,statusText,request) {
		  self.checkLoginStatus();
		});
	},

	/** --- React function to render component ----- */
	render: function(){
		return (
			<div className="login">
        	<form role="form">
		        <div className="form-group">
		          <input type="text" valueLink={this.linkState('user')} placeholder="Username" />
		          <input type="password" valueLink={this.linkState('password')} placeholder="Password" />
		        </div>
		        <button type="submit" onClick={this.login}>Login</button>
	     	</form>
	     	</div>
	    );
	}
});

// ----------------------------------------------------------------------

/** === A popup/dialogue to show errors or to take further steps =====*/
var Popup = React.createClass({
	mixins: [LinkedStateMixin],

	/** --- React function to define component features ----- */
	getInitialState: function(){
		return{
			inputData:"",
		}
	},

	/** --- adds all needed EventHandlers ----- */
	attachEventHandlers: function(){
		var self = this;
		$(document).mouseup(mouseupHandler);
		function mouseupHandler(e){
			// Check for Click outside
			var container = $(".popup__wrapper");
            if (!container.is(e.target) // if the target of the click isn't the container...
                && container.has(e.target).length === 0) // ... nor a descendant of the container
            {
            	if($(".popup").length != 0){ // check if popup is actually visible
            		self.props.hidePopup();
            	}
            }
		}

		$(document).keyup(keyupHandler);
		function keyupHandler(e){
			if (e.keyCode == 27 || e.keyCode == 8) { // Escape | Backspace
     			if($(".popup").length != 0){ // check if popup is actually visible
		    		self.props.hidePopup();  
		    	}  
		    }
		}

		// use body so that the handler wont get overwritten
		$("body").keypress(keypressHandler);
		function keypressHandler(e){
		    var keyCode = e.keyCode;
		    if(keyCode == 13){
		    	var $focusedLocation = $(".location--focused");
		        if($(".popup")[0]){ // if popup visible
		        	self.props.confirm();
		        	e.preventDefault();
		     	}	 
		    }
		};

		$("body").keydown(keydownHandler);
		function keydownHandler(e){
			if($(".popup")[0]){ // if popup visible
				var keyCode = e.keyCode;
				if(keyCode == 37){ //left
					var currentVal = $(".popup__input").val();

					$(".popup__input")[0].stepDown(10);
				}
				if(keyCode == 39){ //right
					var currentVal = $(".popup__input").val();
					$(".popup__input")[0].stepUp(10);
				}
			}
		}
	},

	/** --- React lifecycle function ----- */
	componentDidMount:function(){
		
		this.attachEventHandlers();
		this.setDefaultTime();
	},

	/** --- sets the initial value for the time field when creating a visit ----- */
	setDefaultTime: function(){
		$(".popup__input--time").val("13:00");
	},

	/** --- React lifecycle function ----- */
	componentWillUnmount: function(){
		$(document).unbind('mouseup', this.mouseupHandler);
		$(document).unbind('keyup', this.keyupHandler);
		$("body").unbind('keypress', this.keypressHandler);
		$("body").unbind('keydown', this.keydownHandler);
	},

	/** --- React function to render component ----- */
	render: function() {	
		var self = this;
		var content;
		var buttons;
		var cancelButton=<a className="popup__button" onClick={this.props.hidePopup}>cancel</a>;
		var confirmButton=<a className="popup__button" onClick={this.props.confirm}>create visit</a>
		var okButton=<a className="popup__button popup__button--single" onClick={this.props.confirm}>ok</a>
		if(this.props.type == "createVisit"){
			content = <div><p>{this.props.text}</p>
						<input className="popup__input popup__input--time" valueLink={this.linkState('inputData')} type="time"/></div>
						
			buttons = <div>{cancelButton} {confirmButton}
						</div>
		}

		if(this.props.type == "error" || this.props.type == "confirm"){
			content = <div><p>{this.props.text}</p></div>	
			buttons = <div>{okButton}</div>
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


// ----------------------------------------------------------------------

/** === App Component which renders all other components and holds important data =====*/
var App = React.createClass({

	/** --- React function to define component features ----- */	
	getInitialState:function(){
		return{
			userId:"",
			loggedIn:false,
			token:"",
			popup:"",
			popupData:"",
			popupText:"",
			updateData:false
		}
	},

	/** --- shows the popup - types:"error","createVisit" ----- */	
	showPopup: function(type,text,storedData){
		this.setState({
			popup:type,
			popupData: storedData,
			popupText: text
		});
	},

	/** --- hides the popup ----- */	
	hidePopup: function(){
		this.setState({
			popup:""
		});
	},

	updateData: function(){
		this.setState({
			updateData:true
		});
	},

	/** --- fired after user clicked the star rating.
	It first checks if the exact rating or a rating for the same location 
	exists already in the local storare. If not, it looks inside the DB and
	then takes the needed action (block,update,create)----- */	
	userRatedHandler: function(stars,location_id){

		var self = this;	
		var locationRatedAlreadyIndex;
		var sameRatingExists = false;

		if(!localStorage.ratings){
			// Prepare LocalStorage to hold an Array
			var a = [];
			a.push(JSON.parse(localStorage.getItem('ratings')));
			localStorage.setItem('ratings', JSON.stringify(a));
		}
		
		var storedRatings = [];
		storedRatings = JSON.parse(localStorage.getItem('ratings'));
		
		storedRatings.map(function(storedRating,index){
			if(storedRating){
				if(storedRating.location_id == location_id){
					locationRatedAlreadyIndex = index;
					if(storedRating.stars == stars){
						sameRatingExists = true;
					}
				}
			}
		});

		if(sameRatingExists){
			self.showPopup("error","This rating is a duplicate, stop spaming, you $%!& ")

		}else if(locationRatedAlreadyIndex){
			console.log("exists1");	
			// Update star rating in DB
			var nodeIdToUpdate = storedRatings[locationRatedAlreadyIndex].nodeId;
			self.updateRating(nodeIdToUpdate,location_id,stars); 

			// Update star rating in local Storage
			storedRatings[locationRatedAlreadyIndex].stars = stars;
			localStorage.setItem('ratings', JSON.stringify(storedRatings));
		}
		else{
			// nothing found in local storage, so search in database
			$.get("http://lunchapp/ratingsfromlocationbyuser/"
				+location_id+"/"+this.state.userId,function(rating){
				var nodeId;	
				if(rating[0]){
					if(rating[0].stars == stars){
						// Same rating is already in db
						self.showPopup("error","This rating is a duplicate, stop spaming, you $%!& ")
					}else{
						// rating for this location changed -> update DB 
						self.updateRating(rating[0].nodeId,location_id,rating[0].stars);
						self.pushRatingToLocalStorage(location_id,stars,rating[0].nodeId);
					}
				}
				else{
					// No rating found for this location
					self.createRating(location_id,stars);
				}
			});
		}
	},

	/** --- creates an object of the given data and pushes it to local storage ----- */
	pushRatingToLocalStorage: function(location_id,stars,nodeId){
		var storedRatings = [];
		storedRatings = JSON.parse(localStorage.getItem('ratings'));
		// push the rating to the local storage
		var thisRating = {
			"stars":stars,
			"location_id":location_id,
			"nodeId":nodeId
		};	
		storedRatings.push(thisRating);
		localStorage.setItem('ratings', JSON.stringify(storedRatings));

	},

	/** --- creates a new rating in the db and also pushes it to local storage -----*/
	createRating: function(location_id,stars){
		var self = this;
		var settings = {
		  "url": "http://lunchapp/entity/node",
		  "method": "POST",
		  "headers": {
		    "content-type": "application/json",
		    "x-csrf-token": this.state.token,
		  },
		  "processData": false,
		  "data": "{\n  \"type\":[{\"target_id\":\"rating\"}],\n  \"title\":[{\"value\":\"rating_user-"+this.state.userId+"_location-"+location_id+"\"}],\n  \"field_user\":[{\"target_id\":\""+this.state.userId+"\"}],\n  \"field_location\":[{\"target_id\":\""+location_id+"\"}],\n  \"field_stars\":[{\"value\":\""+stars+"\"}]\n}",
		  "error": function(xhr,status,error){
			self.showPopup("error","failed to save rating!");
		  }
		}
		$.ajax(settings).done(function (response,statusText,request) {
		  var url = request.getResponseHeader("Location");
		  var createdNodeId = url.substring(url.lastIndexOf("/")+1,url.length);
		  self.pushRatingToLocalStorage(location_id,stars,createdNodeId);
		  self.showPopup("confirm","Congrats, your rating was saved");
		  // Update View
		  self.refs.locationList.updateRatingView(location_id);
		});		

	},

	/** --- updates the rating with the given nodeId in the db ----- */
	updateRating: function(nodeId, location_id, newStars){
		var self = this;
		var settings = {
		  	"url": "http://lunchapp/node/"+nodeId,
		  	"method": "PATCH",
		 	"headers": {
		    "x-csrf-token": this.state.token,
		    "content-type": "application/json",
		  },
		  "processData": false,
		  "data": "{\n  \"nid\":[{\"value\":\""+nodeId+"\"}],\n  \"type\":[{\"target_id\":\"rating\"}],\n  \"field_stars\":[{\"value\":\""+newStars+"\"}]\n}"
		}
		$.ajax(settings).done(function (response) {
		  self.showPopup("confirm","Your rating got updated.");
		  // Update View
		  self.refs.locationList.updateRatingView(location_id);
		});
	},

	/** --- logic executed after popup get confirmed ----- */
	confirmPopup:function(){
		if(this.state.popup == "createVisit"){
			// Create time format Drupal can read in json
			var today = this.getTodaysDate();
			var time = $(".popup__input--time").val();
			var dateTime = today+"T"+time+":00";
			dateTime = this.adjustTimezone(dateTime);	
			this.createVisit(this.state.popupData,dateTime);
		}
		this.hidePopup();
	},

	/** --- Subtract 1 Hour to prevent false data display in backend -----*/
	adjustTimezone:function(date){
		var date = new Date(date);
		date.setHours(date.getHours()-2);
		// Subtract 2, because the function toLocaleTimeString will add 1
		return this.getTodaysDate()+"T"+date.toLocaleTimeString();
	},

	/** --- returns the todays date in format yyyy-mm-dd ----- */
	getTodaysDate:function(){
		var today = new Date();
		var dd = today.getDate();
		var mm = today.getMonth()+1; //January is 0!
		var yyyy = today.getFullYear();

		if(dd<10) {
		    dd='0'+dd
		} 

		if(mm<10) {
		    mm='0'+mm
		} 
		today = yyyy+"-"+mm+"-"+dd;
		return today;
	},

	/** --- sends a request to create a visit in the DB ----- */
	createVisit: function(location_id,datetime){
		var self = this;
		var settings = {
		  "async": true,
		  "crossDomain": true,
		  "url": "http://lunchapp/entity/node",
		  "method": "POST",
		  "headers": {
		    "cache-control": "no-cache",
		    "content-type": "application/json",
		    "x-csrf-token": this.state.token,
		  },
		  "processData": false,
		  "data": "{\n  \"type\":[{\"target_id\":\"visit\"}],\n  \"title\":[{\"value\":\"json-visit\"}],\n  \"field_user\":[{\"target_id\":\""+this.state.userId+"\"}],\n  \"field_location\":[{\"target_id\":\""+location_id+"\"}],\n  \"field_date\":[{\"value\":\""+datetime+"\"}]\n}",
		  "error": function(xhr,status,error){
			self.props.showPopup("error","you have to be logged in to create a visit!");
		  }
		}
		$.ajax(settings).done(function (response) {
		  self.refs.locationList.incrementUserCount(location_id);
		});			
	},

	/** --- function called by other components to register a successfull login ----- */
	setLogin: function(_userId,_token){
		this.setState({
			loggedIn:true,
			userId:_userId,
			token:_token,
		});
	},

	/** --- React function to render component ----- */
	render: function() {	
		
		var loginComponent, popup, locationList;

		if(!this.state.loggedIn){
			loginComponent = <LoginComponent loggedIn={this.state.loggedIn} 
											 setLogin={this.setLogin} 
											 showPopup={this.showPopup}/>
		}
		if(this.state.popup){
			popup = <Popup type={this.state.popup} 
						   text={this.state.popupText} 
						   storedData={this.state.popupData} 
						   hidePopup={this.hidePopup}
						   confirm={this.confirmPopup} />
		}

		locationList = <LocationList showPopup={this.showPopup} 
									 loggedIn={this.state.loggedIn} 
									 currentUser={this.state.userId}
									 createRating={this.userRatedHandler}
									 token={this.state.token} 
									 ref={"locationList"}/>



	    return (
	      <div className="app">
	      	<ReactCSSTransitionGroup transitionName="login" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
	      		{loginComponent}
	      	</ReactCSSTransitionGroup>

	      	{locationList}

	      	<ReactCSSTransitionGroup transitionName="popup" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
	      		{popup}
	      	</ReactCSSTransitionGroup>
	      </div>
	    );
	}
});


// ----------------------------------------------------------------------


// Injecting React Component into Dom 
ReactDOM.render(
  <App/>,locations
);




