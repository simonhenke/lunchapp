var settings = {
  "url": "http://lunchapp/entity/file/",
  "method": "POST",
  "headers": {
    "content-type": "application/json",
    "x-csrf-token": this.props.token,
  },
   //"processData": false,
   "data": "{\"_links\":\n{\n  \"type\":{\"href\":\"http://lunchapp/rest/type/file/file\"}\n},\n  \"filename\":[{\"value\":\"mytest.jpg\"}],\n  \"filemime\":[{\"value\":\"image/jpeg\"}],\n  \"data\":[{\"value\":\"test\n\"}] }"
   ,
  "error": function(xhr,status,error){
	console.log(error);
	console.log(xhr);
	console.log(status);
  }
}
$.ajax(settings).done(function (response,statusText,request) {
  alert("created");
});	