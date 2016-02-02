
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
		//$.get("example-data/locations.json", function(result) {
        $.get("http://lunchapp/locations", function(result) {
	        locations = result;
	        var i = 1;

	        locations.map(function(location){
	        	// Wait for Rating & User Data
		        $.when($.ajax("http://lunchapp/usersAtLocation/"+location.location_id),
		        //$.when($.ajax("example-data/usersAt-"+location.location_id+".json"),
		        	   $.ajax( "http://lunchapp/ratingsfromlocation/"+location.location_id)
		        ).done(function( a1, a2 ) { 
					var userData = a1[0]  
					var ratingData = a2[0];
					location.users = userData;
				    location.userCount = userData.length;
				 
		      		if(ratingData[0]){
		      		/*	// old code when aggregation worked in drupal
		      			location.rating = ratingData[0].stars;	*/
		      			var sum = 0;
						ratingData.map(function(obj){
							sum += parseInt(obj.stars,10);
						});
		      			location.rating = sum/ratingData.length;
		      		}
		      		else{location.rating = undefined;}

		      		if(i === locations.length){ // all data read
		      			self.setLocationState(locations);
		      			self.loadUserDetails();
		      		}
		      		i++;
				});
	        }); // end of mapping 
	    }); // end of getting locations	
	},

	loadUserDetails: function(){
		var self = this;
		var locationsCopy = self.state.locations.slice(0);
		var locationsWithUsers = 0;
		locationsCopy.map(function(location){ // count locations with users
			if(location.users && location.users[0]){
				locationsWithUsers ++;
			}
		});

		locationsCopy.map(function(location,locationIndex){
			if(location.users && location.users[0]){
				var users = location.users;
				users.map(function(user,userIndex){
					$.get("http://lunchapp/userinfofromid/"+user.userId, function(result){
						var data = result[0];
						if(data){
							user.firstname = data.firstname;
							user.lastname = data.lastname;
							user.picture = data.picture;
						}
						if(userIndex + 1 == users.length){ 
						// got data for this location
							location.users = users;
						}
						if(locationIndex + 1 == locationsWithUsers){ 
						// got all data for every location
							self.setLocationState(locationsCopy);
						}					
					});
				}); // end map users
			}
		}); // end map locations
		
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
					/* old code when aggregation in drupal worked
					obj.rating = result[0].stars;
					*/

					var sum = 0;
					result.map(function(rating){
							sum += parseInt(rating.stars,10);
						});
		      		obj.rating = sum/result.length;

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

    /** --- Either blends in the userlist 
    or, if location is expanded, highlights it briefly ----- */
    counterClickHandler: function(locationItemIndex){
    	if(this.state.locations[locationItemIndex].userCount > 0){
	    	var $locationItem = $(".locationItem")[locationItemIndex];
	    	if($($locationItem).hasClass("expanded")){
	    		var $userList = $($locationItem).find(".user-list");
	    		$userList.addClass("highlighted");
	    		setTimeout(function(){
	    			$userList.removeClass("highlighted");
	    		},300);
	    	}else{
		    	if($($locationItem).hasClass("showingUsers")){
		    		$($locationItem).removeClass("showingUsers");
		    	}else{
		    		$($locationItem).addClass("showingUsers");
		    	}
	    	}
    	}
    },

    expandLocationItem: function(locationItemIndex){
    	//if(this.state.locations[locationItemIndex].userCount > 0){
	    	var $locationItem = $(".locationItem")[locationItemIndex];
	    	if($($locationItem).hasClass("expanded")){
	    		$($locationItem).removeClass("expanded");
	    		// attach user-list
	    		var $userList = $($locationItem).find(".user-list").detach();
	    		$($locationItem).find(".locationItem__wrapper").append($userList);
	    		
	    	}else{
	       		
	    		$($locationItem).addClass("expanded");
	    		if($($locationItem).hasClass("showingUsers")){
	    			$($locationItem).removeClass("showingUsers");
	    		}

	    		var $userList = $($locationItem).find(".user-list")
	    		$userList.find("li").css("transition", "none");
	    		$userList.find("li").css("transform","scale(0.01)");
	    		$userList.find("li").css("transition", "");

	    		$userList.detach();
	    		$($locationItem).find(".location__body-wrapper").append($userList);
	    		setTimeout(function(){
	    			$userList.find("li").css("transform","scale(1)");	
	    		},1);	
	    	}
    	//}
    },

    /** --- React Function to render component ----- */
 	render: function() {
 		var footer;
 		if(this.state.locations[0]){
			//footer = 
		}	
	    return (
	    	<div>

	    	<LocationFilter />

	    	<ul className="location-list">		     	 
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
       						data={location}
       						index={i}
       						titleClickHandler={this.expandLocationItem}/>

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
		    </ul>
		    </div>
	    );
	}
});

// ----------------------------------------------------------------------

/** === A Location that renders its image,name and description =====*/
var Location = React.createClass({	

	/*--- Calls the respective Handler of the List -----*/
	titleClickHandler: function(index){
		this.props.titleClickHandler(index);
	},

	/*--- Decodes entities like &amp; -----*/
	decodeEntities: function(encodedString) {
    	var textArea = document.createElement('textarea');
    	textArea.innerHTML = encodedString;
    	return textArea.value;
	},

	formatDistance: function(distance){
		var newDistance;

		var num = parseFloat(distance);
		if(num<1){
			newDistance = num*1000+" Meter";
		}else{
			newDistance = num + " Kilometer";
		}
		return newDistance;
	},

	/** --- React function to render component ----- */
	render: function() {	
		var data = this.props.data;
		var imageSrc,name,description,address,distance;

		name = this.decodeEntities(data.name);
		description = this.decodeEntities(data.description);

		var imageAttributes = data.photo.match(/"(.*?)"/);
		if(imageAttributes){
			imageSrc = imageAttributes[0].replace(/['"]+/g, '');
		}		
		else if(data.external_image){
			imageSrc = data.external_image;
		}else{
			imageSrc = "http://lunchapp/sites/default/files/pictures/noimage.png";
		}
		if(data.street){
			address = <span className="location__address">{"Adresse: "+data.street+" "+data.house_number}</span> 
		}

		if(data.distance){
			var distanceString = this.formatDistance(data.distance);
			distance = <span className="location__distance">{"Entfernung: "+ distanceString}</span>
		} 

	    return (
	      <div className="location">
	      	<div className="location__image" onClick={this.titleClickHandler.bind(this,this.props.index)}>
	      		<img src={imageSrc}/>
	      	</div>
	      	<div className="location__body">
	      		<div className="location__body-wrapper">
		        	<h2 className="location__name" onClick={this.titleClickHandler.bind(this,this.props.index)}>{name}</h2>
		        	<p className="location__description">{description}</p>
		        	<div className="location__additional-data">{address}{distance}</div>				 
	        	</div>
	        </div>
	      </div>
	    );
	  }
});

/** === A Location that renders its image,name and description =====*/
var CreateLocationForm = React.createClass({	

	mixins: [LinkedStateMixin],
	/** --- React function to define component features ----- */
	getInitialState: function(){
		return{
			name:"",
			description:"",
			photo:"",
			externalImage:"",
			city:"",
			street:"",
			houseNumber:"",
		}
	},

	hideOrShowForm: function(){
		var $form = $(".new-location__form");
		if($($form).hasClass("new-location__form--visible")){
			$($form).removeClass("new-location__form--visible");
		}else{
			$($form).addClass("new-location__form--visible");
		}
	},

	checkIfLocationExists: function(){
		var self = this;
		$.get("http://lunchapp/locationwithname/"+this.state.name, function(result){
			if(result[0]){
				self.props.showPopup("error","This location exists already. Please don\'t submit duplicates");
			}
			else{
				self.requestDistance();
			}
		});
	},

	requestDistance: function(){

		var self = this;
		var originObject = this.props.originAddress;
		//var origin = originObject.city+"+"+originObject.street+"+"+originObject.houseNumber;
		var origin = originObject.name;
		var dest = this.state.city+"+"+this.state.street+"+"+this.state.houseNumber;
		
		//origin ="Düsseldorf+Am Handelshafen+2";
		//dest = "Düsseldorf+Hammerstraße+26";

		/*
		var key = this.props.distanceApiKey;
		var mode = "bicycling";
		var urlBase = "https://maps.googleapis.com/maps/api/distancematrix/json?"
		var urlParam = "origins="+origin+"&destinations="+dest+"&mode="+mode+"&key="+key+"&callback=distanceResult";
		*/

		
  		var service = new google.maps.DistanceMatrixService();
		    service.getDistanceMatrix({
		        origins: [origin],
		        destinations: [dest],
		        travelMode: google.maps.TravelMode.BICYCLING,
		    }, function (response, status) {
		        if (status == google.maps.DistanceMatrixStatus.OK && response.rows[0].elements[0].status != "ZERO_RESULTS") {
		            var distance = response.rows[0].elements[0].distance.text;
		         	var distanceVal = distance.substring(0,distance.indexOf("km")-1);
		         	distanceVal = distanceVal.replace(/,/g,'.');
		         	self.createLocationRequest(distanceVal);
		        } else {
		            console.log("Unable to calculate distance.");
		        }
		    });

	},

	createLocationRequest: function(distance){
		var self = this;
		console.log(distance);
		var settings = {
		  "url": "http://lunchapp/entity/node",
		  "method": "POST",
		  "headers": {
		    "content-type": "application/json",
		    "x-csrf-token": this.props.token,
		  },
		  "processData": false,
		  "data": "{\n  \"type\":[{\"target_id\":\"location\"}],\n  \"title\":[{\"value\":\""+this.state.name+"\"}],\n  \"field_description\":[{\"value\":\""+this.state.description+"\"}],\n  \"field_location_photo\":[{\"value\":\"xxx\"}],\n  \"field_city\":[{\"value\":\""+this.state.city+"\"}],\n  \"field_street\":[{\"value\":\""+this.state.street+"\"}],\n  \"field_house_number\":[{\"value\":\""+this.state.houseNumber+"\"}],\n  \"field_distance\":[{\"value\":\""+distance+"\"}],\n  \"field_external_image_url\":[{\"value\":\""+this.state.externalImage+"\"}]\n}"
		  
		  ,"error": function(xhr,status,error){
			self.props.showPopup("error","failed to create location - Error: "+error);
		  }
		}
		$.ajax(settings).done(function (response,statusText,request) {
		  	self.props.showPopup("confirm","Congrats, the location has been created. It now has to be published by an administrator.")
		});
	},

	/** --- React function to render component ----- */
	render: function() {	 
	    return (
	      <div className="new-location">
	      	<a className="new-location__link" onClick={this.hideOrShowForm}>Create a new location</a>
	      	<form role="form" className="new-location__form">
	      		<input className="new-location__name" type="text" placeholder="name" valueLink={this.linkState('name')} />
	      		<input className="new-location__file-input" type="file" id="file" valueLink={this.linkState('photo')} />
	      		<label className="new-location__file-upload" htmlFor="fileDEACTIVATED">Upload photo</label> 
	      		<img src=""/>
	      		<textarea className="new-location__description" rows={3} placeholder="description" valueLink={this.linkState('description')}></textarea>
	      		<input className="new-location__externalImage" type="text" placeholder="external image URL" valueLink={this.linkState('externalImage')} />
	      		<div className="new-location__address">
	      			<input className="new-location__city" type="text" placeholder="city" valueLink={this.linkState('city')} />
		      		<input className="new-location__street" type="text" placeholder="street" valueLink={this.linkState('street')} />
		      		<input className="new-location__number" type="text" placeholder="nr." valueLink={this.linkState('houseNumber')} />
	      		</div>
	      		<button className="new-location__submit" type="button" onClick={this.checkIfLocationExists}>Create</button>
	      	</form>
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
		var classString = "rating location__rating rating-"+stars;

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

/** === A star rating from 1 to 5 =====*/
var LocationFilter = React.createClass({

	componentDidMount: function(){
		function DropDown(el) {
		    this.dd = el;
		    this.opts = this.dd.find('ul.dropdown > li');
		    this.val = [];
		    this.index = [];
		    this.initEvents();
		}
		DropDown.prototype = {
		    initEvents : function() {
		        var obj = this;

		        obj.dd.on('click', function(event){
		            $(this).toggleClass('active');
		            event.stopPropagation();
		        });

		        obj.opts.children('label').on('click',function(event){
		            var opt = $(this).parent(),
		                chbox = opt.children('input'),
		                val = chbox.val(),
		                idx = opt.index();

		            ($.inArray(val, obj.val) !== -1) ? obj.val.splice( $.inArray(val, obj.val), 1 ) : obj.val.push( val );
		            ($.inArray(idx, obj.index) !== -1) ? obj.index.splice( $.inArray(idx, obj.index), 1 ) : obj.index.push( idx );
		        });
		    },
		    getValue : function() {
		        return this.val;
		    },
		    getIndex : function() {
		        return this.index;
		    }
		}
		var dd = new DropDown( $('#dd') );
	},	

	minRatingChanged: function(stars){

	},

	hideOrShowFilter: function(){

		var $filter = $(".location-filter__elements");
		if($($filter).hasClass("location-filter__elements--visible")){
			$($filter).removeClass("location-filter__elements--visible");
		}else{
			$($filter).addClass("location-filter__elements--visible");
		}
	},

	/** --- React function to render component ----- */
	render: function() {	

		var tagChoice = 
		<div id="dd" className="tags-filter">Tags
			<ul className="tags-dropdown">
				<li><input type="checkbox" id="el-1" name="el-1"/><label htmlFor="el-1">vegetarian</label></li>
				<li><input type="checkbox" id="el-2" name="el-2"/><label htmlFor="el-2">low budget</label></li>
				<li><input type="checkbox" id="el-3" name="el-3"/><label htmlFor="el-3">Pizza</label></li>
			</ul>
		</div>

		var rating = 
		<div className=" rating location-filter__rating">
			<span>min.</span>
			<div className="icon-star star-5" onClick={this.minRatingChanged.bind(this,5)}></div>
			<div className="icon-star star-4" onClick={this.minRatingChanged.bind(this,4)}></div>
			<div className="icon-star star-3" onClick={this.minRatingChanged.bind(this,3)}></div>
			<div className="icon-star star-2" onClick={this.minRatingChanged.bind(this,2)}></div>
			<div className="icon-star star-1" onClick={this.minRatingChanged.bind(this,1)}></div>
   		</div>

		return (
	      	<div className="location-filter">
	      		<a className="location-filter__trigger" onClick={this.hideOrShowFilter}>Filter Locations</a>
	      		<div className="location-filter__elements">
	      			{tagChoice}
	      			{rating}
	      			<input className="location-filter__name" type="text" placeholder="Location Name" />
	      			<input className="location-filter__visited-by" type="text" placeholder="Visited By" />
       			</div>
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
		var lastTime;
	    return (
	      	<ul className="user-list"><div className="user-list__content">
	      	{this.props.users.map(function(user,index){
	      		var date = new Date(user.date);
	      		var groupTitle,firstname,lastname,lastnameShort;
	      		
	      		var time = self.forceTwoDigits(date.getUTCHours())
	      		      +":"+self.forceTwoDigits(date.getUTCMinutes())+" Uhr";

	 			var itemClass ="user-list__item";

	 			var users = self.props.users;
	 			if(index + 1 < users.length){
	 				if(user.date != users[index+1].date){
	      				
	      				itemClass += " line-break";
	      			}
	 			}
	 			if(time != lastTime){
	 				groupTitle = <span className="user-list__group-title">{time}</span>
	 				itemClass += " new-line";
	 			}
	 			lastTime = time;

	 			var imageSrc,imageAttributes;
	 			if(user.picture){
	 				imageAttributes = user.picture.match(/"(.*?)"/);
	 				imageSrc = imageAttributes[0].replace(/['"]+/g, '');
	 			}else{
					imageSrc = "http://lunchapp/sites/default/files/profilepictures/unknown.png"
				}

				firstname = user.firstname ? user.firstname : "Unknown";
				lastname = user.lastname ? user.lastname : "";
				lastnameShort = user.lastname ? user.lastname.charAt(0)+"." : "";



				return <li className={itemClass} key={"user-"+index}>
					{groupTitle}
					<div className="user-list__picture"><img src={imageSrc}/></div>
					<p className="user-list__username">
					<span className="user-list__firstname">{firstname}</span>
					<span className="user-list__lastname">{lastname}</span>
					<span className="user-list__lastnameShort">{lastnameShort}</span>
					</p>
					<p className="user-list__time">{time}</p>
				</li>;
			})}
			</div></ul>
	    );
	  }
});

// ----------------------------------------------------------------------

/** === a headline displaying which day it is =====*/
var DateNotice = React.createClass({	
	 /** --- React function to render component ----- */
	render: function() {	
		var today = new Date().toLocaleDateString();
	    return (
	    	<div className="dateNotice">
	      	<h1>{today}</h1>
	      	</div>
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
	loginClickHandler: function(e){
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
	getToken: function(userInfo){
		var token;
		var self = this;
		$.get("http://lunchapp/rest/session/token", function(result) {
			token = result;
		}).done(function(){
			userInfo.token = token;
			self.getRatings(userInfo);
		});
	},

	/* --- sends request to get all ratings of the logged in user.
	Then, it sets the LoginData in the App Component ----- */
	getRatings: function(userInfo){
		var self = this;
		$.get("http://lunchapp/myratings", function(myRatings){
			userInfo.ratings = myRatings;
			self.props.setLoginData(userInfo);

		});
	},

	/** --- Checks if login was successfull 
	Request the User Info ----- */
	getUserInfo: function(){
		var self = this;
		var userInfo;
		$.get("http://lunchapp/userinfologgedin",function(result) {
			userInfo = result;
		}).done(function(){
			if(userInfo[0]){ // data exists -> user successfully logged in
				self.getToken(userInfo[0]);
			}else{
				if(self.state.user){
					// only show error popup when the form was sent 
					// and not on the initial test if logged in
					self.props.showPopup("error","Login failed. Make sure you entered a valid username and password");
				}else{
					self.props.setLoginStatusKnown();
				}
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
		  self.getUserInfo();
		});
	},

	logoutClickHandler: function(){
		var self = this;
		$.get("http://lunchapp/user/logout",function(result) {
		}).done(function(){
			self.props.setLogout();
		});
	},

	/** --- React function to render component ----- */
	render: function(){

		var loginForm,loggedInInfo;
		if(!this.props.loginStatusUnknown){
			if(this.props.loggedIn){
				var userInfo = this.props.userInfo;
				var fullname = userInfo.firstname+" "+this.props.userInfo.lastname;
				var imageAttributes = userInfo.picture.match(/"(.*?)"/);
				var imageSrc;
				if(imageAttributes){
					 imageSrc = imageAttributes[0].replace(/['"]+/g, '');
				}else{
					imageSrc = "http://lunchapp/sites/default/files/profilepictures/unknown.png"
				}
				

				loggedInInfo = 
				<div className="loggedInInfo">
					<span>{"Logged in as "}</span>
					<div className="loggedInInfo__picture"><img src={imageSrc}/></div>
					<span className="loggedInInfo__name">{fullname}</span>
					<span>.</span>
					<a className="loggedInInfo__logout-link" onClick={this.logoutClickHandler}>Logout</a>
				</div>
			}else{
				loginForm =
				<div className="login">
		        	<form role="form">
				        <div className="login__inputs">
				          <input type="text" valueLink={this.linkState('user')} placeholder="Username" />
				          <input type="password" valueLink={this.linkState('password')} placeholder="Password" />
				        </div>
				        <button className="login__submit" type="submit" onClick={this.loginClickHandler}>Login</button>
				        <div className="register-area">
				        	<span className="register-text">{"Don\'t"} have an account yet? </span>
				       		<a className="register-link" href="http://lunchapp/user/register">register here</a>
			     		</div>
			     	</form>
		     	</div>;
			}
		}

		return (
			<div>
			{loginForm}
			{loggedInInfo}
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
			userInfo:"",
			loggedIn:false,
			loginStatusUnknown:true,
			token:"",
			popup:"",
			popupData:"",
			popupText:"",
			newData:""
		}
	},

	componentDidMount: function(){
		this.refs.loginComponent.getUserInfo();
		setTimeout(this.checkForNewContent,10000);
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

	checkForNewContent: function(){
		var self = this;
		$.ajaxSetup({
		    cache: false
		});
		$.get("http://lunchapp/newcontent",function(result){
			if(result[0]){
				// there have been changes
				self.refs.locationList.loadLocationData();
			}else{
			}
			setTimeout(self.checkForNewContent,30000);
		});
	},

	/** --- fired after user clicked the star rating.
	creates a new rating or updates the old one for the location ----- */	
	userRatedHandler: function(stars,location_id){

		var self = this;	
		
		$.get("http://lunchapp/ratingsfromlocationbyuser/"
			+location_id+"/"+this.state.userInfo.userId,function(rating){
			var nodeId;	
			if(rating[0]){
				if(rating[0].stars == stars){
					// Same rating is already in db
					self.showPopup("error","This rating is a duplicate, stop spaming, you $%!& ")
				}else{
					// rating for this location changed -> update DB 
					self.updateRating(rating[0].nodeId,location_id,stars);
				}
			}
			else{
				// No rating found for this location
				self.createRating(location_id,stars);
			}
		});
		
	},

	/** --- creates a new rating in the db -----*/
	createRating: function(location_id,stars){
		var self = this;
		var settings = {
		  "url": "http://lunchapp/entity/node",
		  "method": "POST",
		  "headers": {
		    "content-type": "application/json",
		    "x-csrf-token": this.state.userInfo.token,
		  },
		  "processData": false,
		  "data": "{\n  \"type\":[{\"target_id\":\"rating\"}],\n  \"title\":[{\"value\":\"rating_user-"+this.state.userInfo.userId+"_location-"+location_id+"\"}],\n  \"field_user\":[{\"target_id\":\""+this.state.userInfo.userId+"\"}],\n  \"field_location\":[{\"target_id\":\""+location_id+"\"}],\n  \"field_stars\":[{\"value\":\""+stars+"\"}]\n}",
		  "error": function(xhr,status,error){
			self.showPopup("error","failed to save rating!");
		  }
		}
		$.ajax(settings).done(function (response,statusText,request) {
		  //var url = request.getResponseHeader("Location");
		  //var createdNodeId = url.substring(url.lastIndexOf("/")+1,url.length);
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
		    "x-csrf-token": this.state.userInfo.token,
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
		    "x-csrf-token": this.state.userInfo.token,
		  },
		  "processData": false,
		  "data": "{\n  \"type\":[{\"target_id\":\"visit\"}],\n  \"title\":[{\"value\":\"json-visit\"}],\n  \"field_user\":[{\"target_id\":\""+this.state.userInfo.userId+"\"}],\n  \"field_location\":[{\"target_id\":\""+location_id+"\"}],\n  \"field_date\":[{\"value\":\""+datetime+"\"}]\n}",
		  "error": function(xhr,status,error){
			self.props.showPopup("error","you have to be logged in to create a visit!");
		  }
		}
		$.ajax(settings).done(function (response) {
		  self.refs.locationList.incrementUserCount(location_id);
		});			
	},

	/** --- function called by other components to register a successfull login ----- */
	setLoginData: function(_userInfo){
		this.setState({
			loggedIn:true,
			loginStatusUnknown:false,
			userInfo:_userInfo
		});
	},

	/** --- Called after initial testing if logged in.
	Only after the login status is known, 
	the login form or info gets displayed ----- */
	setLoginStatusKnown: function(){
		this.setState({
			loginStatusUnknown: false
		});
	},

	setLogout: function(){
		this.setState({
			loggedIn:false,
			userInfo:""
		});
	},

	/** --- React function to render component ----- */
	render: function() {	
		var loginComponent, popup, locationList, newLocation;

		loginComponent = <LoginComponent loggedIn={this.state.loggedIn} 
										 setLoginData={this.setLoginData}
										 setLogout={this.setLogout} 
										 showPopup={this.showPopup}
										 ref={"loginComponent"}
										 loginStatusUnknown={this.state.loginStatusUnknown}
										 setLoginStatusKnown={this.setLoginStatusKnown}
										 userInfo={this.state.userInfo}/>
		
		
		if(this.state.popup){
			popup = <Popup type={this.state.popup} 
						   text={this.state.popupText} 
						   storedData={this.state.popupData} 
						   hidePopup={this.hidePopup}
						   confirm={this.confirmPopup} />
		}

		locationList = <LocationList showPopup={this.showPopup} 
									 loggedIn={this.state.loggedIn} 
									 currentUser={this.state.userInfo.userId}
									 createRating={this.userRatedHandler}
									 token={this.state.userInfo.token} 
									 ref={"locationList"}
									 newData={this.state.newData}/>
		if(this.state.loggedIn){
			newLocation = <CreateLocationForm token={this.state.userInfo.token} 
											  originAddress={this.props.address}
										   	  distanceApiKey={this.props.distanceApiKey}
										 	  showPopup={this.showPopup}/>
		}



	    return (
	      <div className="app">
	      	<ReactCSSTransitionGroup transitionName="login" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
	      		{loginComponent}
	      	</ReactCSSTransitionGroup>

	      	<DateNotice />

	      	{locationList}

	      	{newLocation}

	      	<ReactCSSTransitionGroup transitionName="popup" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
	      		{popup}
	      	</ReactCSSTransitionGroup>
	      </div>
	    );
	}
});


// ----------------------------------------------------------------------

var address = {
	city : "Düsseldorf",
	street : "Am Handelshafen",
	houseNumber : "2",
	name : "Ogilvy & Mather Düsseldorf"
}

var distanceApiKey = "AIzaSyC-aGJ34Aw4NhJRMaTWWkd4m1Ery3VDBQs";

// Injecting React Component into Dom 
ReactDOM.render(
  <App address={address} distanceApiKey={distanceApiKey}/>,app
);




