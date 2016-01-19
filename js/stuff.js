
// Rating Logic

$(document).on('mouseenter','.icon-star', function (event) {
	var $parent = $(this).closest(".location__rating");
	var $reachedThis = false;
	var $hovered = this;
	$parent.find(".icon-star").map(function(i,obj){

		if($reachedThis){
			$(obj).addClass("icon-star-inactive");
		}else{
			$(obj).addClass("icon-star-active");
			if(obj === $hovered){
				$reachedThis = true;
			}
		}
	});
}).on('mouseleave','.icon-star',  function(){
	var $parent = $(this).closest(".location__rating");
	$parent.find(".icon-star").map(function(i,obj){
		$(obj).removeClass("icon-star-active");
		$(obj).removeClass("icon-star-inactive");
	});
});


$(function(){


// Keyboard Navigation

var blockKey = true;
var $locations;
var $locationPointer;

/*
$(document).keypress(function(e) {
    if(e.which == 13) { // Enter
    	console.log("enter");
        var $focusedLocation = $(".location--focused");
        console.log($focusedLocation.find(".location__cta"));
        $focusedLocation.find(".location__cta").trigger("onClick");
    }
});*/

$(document).keydown(function(e) {

	if (event.repeat != undefined) {
	    blockKey = event.repeat;
	}
	if (blockKey) return;
	blockKey = true;

	// prevent errors - only continue when locations in DOM
	if($(".location-list li")[0]){ 
		$locations = $(".location-list li");
	    switch(e.which) {
	        case 37: // left
	        	goToPreviousLocation();
	        break;

	        case 39: // right
	        	goToNextSnippet();
	        break;
	        
	        default: return; 
	    }
    }

    e.preventDefault();
});

function goToNextSnippet(){
	
	var $next;
	if($locationPointer){
		$locations.each(function(i,obj){
			if($(obj).data("index") == $($locationPointer).data("index")){
				$next = $locations[i+1];
			}
		});
	}
	if(! $next){
		$next = $locations.first();
	}
	
	focusLocation($next);
	unfocusLocation($locationPointer);
	
	$locationPointer = $next;
}


function goToPreviousLocation(){
	
	var $previous;
	if($locationPointer){
		$locations.each(function(i,obj){
			if($(obj).data("index") == $($locationPointer).data("index")){
				$previous = $locations[i-1];
			}
		});
	}
	if(! $previous){
		$previous = $locations.last();
	}
	
	unfocusLocation($locationPointer);
	focusLocation($previous);

	$locationPointer = $previous;
}

function focusLocation(location){

	$(location).addClass("location--focused");
	centerLocationOnScreen(location);
}

function unfocusLocation(location){

	$(location).removeClass("location--focused");
}

function centerLocationOnScreen(location){
	var height = $(location).height();
	$('html, body').animate({
		scrollTop: $(location).offset().top - 
		($(window).height() - (height+70))/2
	}, 400);
}


});