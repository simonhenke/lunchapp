

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


	
