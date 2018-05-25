/*DataSets URl*/
const NAMESNEIGHBORHOOD ="https://data.cityofnewyork.us/api/views/xyye-rtrs/rows.json?accessType=DOWNLOAD";

/*
CD is a  COMMUNITY DISTRICT
[9] Point of Neighborhood
[10] Complete Name Neighborhood
[11] CD to which belongs(Orden inverted 12 is de 1 CD)
*/
const SHAPECD = "https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nycd/FeatureServer/0/query?where=1=1&outFields=*&outSR=4326&f=geojson"
/*
features[i].properties.BoroCD  = 100 * BOROUGH + CD
features[i].geometry.coordinates[j] = Coordinates of Shape
*/
const HOUSEDATA = "https://data.cityofnewyork.us/api/views/hg8x-zxpr/rows.json?accessType=DOWNLOAD";
/*Crimes filtered DataSets*/
const CRIMES = "https://data.cityofnewyork.us/Public-Safety/Filtered12-31-2015Crimes/qcnt-82dk";
const BOROUGH = ["Manhattan", "Bronx", "Brooklyn", "Queens", "Staten Island"];

/*(Joint of Interest Areas) Not living posible Areas*/
var colorJIA = "rgba(59, 255, 0, 1)";


const coordUniversity = {	/*Position University*/
	lat:40.7291, lng:-73.9965
};

/*JSON filtered */

var borough=[];
var crimeCoordinates = [];
var unlivableDistricts = [];
/*Variables for GMaps*/
var map;
var shapeActive;
var heatmap;
var directionsService;
var directionsRenderer;

/*ranking variables*/
var maxDistance = 0;
var preferenceDistance = false;
var preferencePrice = false;
/*Community District Sorted By distance between neighborhoods to NYU*/
var filteredCD = [];


/*
Objects
BOROUGH[
CommunityDistrict{ IMPORTANT
NEIGHBORHOOD[]
}
]
*/

/*Manage */
function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomColorRGBA( a ){
	var color;
	var r = getRandomInt(0, 255);
	var g = getRandomInt(0, 255);
	var b = getRandomInt(0, 255);
	if(r != 59 && g != 255 && b != 0){
		return ("rgba(" +r+ "," +g+ "," +b+ "," +a+ ")");
	}else{
		randomColorRGBA(a)
	}
}
/*Data Treatment
*/
function numberBorough( numberCD ){
	/*Number of CD define your BOROUGH */
	var n = (Number(numberCD) /100)-1;
	return	parseInt(n);
}

function coordinateGmaps( chain ){
	/*Cast Strng POINT to GmapsFormat*/
	var temp = chain.split(" ");
	temp[1] = temp[1].substring(1,(temp[1].length));
	temp[2] = temp[2].substring(0,(temp[2].length-1));
	var point = new google.maps.LatLng(
		Number(temp[2]),
		Number(temp[1]),
	)
	return point;
}

function neighborhoodToCD(neighborhood,numberBoro){
	for(var i = 0; i < borough[numberBoro].length ; i++){
		if(pointInPath(neighborhood.coorCenter, borough[numberBoro][i].coordLimits)){
			borough[numberBoro][i].neighborhoods.push(neighborhood);
		}
	}
}

function getCrimes(callback){

	$.ajax({
		url: "https://data.cityofnewyork.us/resource/fj84-7huk.json",
	}).done(function(data){
		for (var i = 0; i < data.length; i++) {
			crimeCoordinates.push(
				new google.maps.LatLng(
					data[i].latitude,
					data[i].longitude
				)
			);
		}
		document.getElementById("crimes").setAttribute('onclick','toggleHeatmap()')
		callback();
	});


	return crimeCoordinates;

}
function getDataShapeDistric(callback){
	/*Organize DataSets of borough */
	var geoCD = [[],[],[],[],[]];
	var data = $.get(SHAPECD, () => {})
	.done(function () {
		var responseJSON = JSON.parse(data.responseText)
		for(var i = 0 ;i < responseJSON.features.length ;i++){	/*Number of CD*/
			var communityDistrict;
			var subShape = [];
			var multiPolygon = false;
			if (responseJSON.features[i].geometry.type == "MultiPolygon") {
				for (var j = 0; j < responseJSON.features[i].geometry.coordinates.length; j++) {
					for (var g = 0; g < responseJSON.features[i].geometry.coordinates[j].length; g++) {
						var subCoor = [];
						for (var k = 0; k < responseJSON.features[i].geometry.coordinates[j][g].length; k++) {
							var point = new google.maps.LatLng(
								responseJSON.features[i].geometry.coordinates[j][g][k][1],
								responseJSON.features[i].geometry.coordinates[j][g][k][0]
							)
							subCoor.push(point);
						}
					}
					subShape.push(subCoor);
				}
				multiPolygon = true;
			}else{
				for (var j = 0; j < responseJSON.features[i].geometry.coordinates.length; j++) {
					for (var g = 0; g < responseJSON.features[i].geometry.coordinates[j].length; g++) {
						var point = new google.maps.LatLng(
							responseJSON.features[i].geometry.coordinates[j][g][1],
							responseJSON.features[i].geometry.coordinates[j][g][0]
						);
						subShape.push(point);
					}
				}
			}

			communityDistrict = new CommunityDistrict(
				responseJSON.features[i].properties.BoroCD,
				subShape,
				multiPolygon /*Is a multipolygon*/
			);
			communityDistrict.incomeUnits = [,,,,,];
			communityDistrict.bedroomUnits = new Array(0, 0, 0);
			/*SortByCommunityDistrict*/
			if(communityDistrict.habitable){
				filteredCD.push(communityDistrict);
				communityDistrict.draw( "rgba(0, 0, 0, 0)" );
			}else{
				unlivableDistricts.push(communityDistrict);
				communityDistrict.draw(communityDistrict.color);
				communityDistrict.infowindow("<div class=\"infoIna\"><h5> CommunityDistrict:"+responseJSON.features[i].properties.BoroCD+"</h5>No habitable </div>");
			}
			geoCD[numberBorough(responseJSON.features[i].properties.BoroCD)].push(communityDistrict);

		}
		;
		callback();

	}).fail(function (error) {
		console.error(error);
	})

	return geoCD;
}

/*Functions for Google Maps*/

function setMarker(image,coordinates,textHover) {
	var marker = new google.maps.Marker({
		position:coordinates,
		map: map,
		/*Mapa donde se colocara el marker*/
		icon: image,
		title: textHover,
		/*Text show in event Hover*/
		zIndex: 100
	});
	marker.setMap(map);
	return marker;
}
var lineSymbol = {
  path: 'M 0,-1 0,1',
  strokeOpacity: 1,
  scale: 4
};
function initMap() {
	map = new google.maps.Map(document.getElementById('map'), {
		center: coordUniversity,
		zoom: 11,
		zoomControl : false,
		fullscreenControl: false,
		mapTypeControl:false,
		/*29 levels to Zoom*/
		styles:[
			{
				"elementType": "geometry",
				"stylers": [
					{
						"color": "#242f3e"
					}
				]
			},
			{
				"elementType": "labels.text.fill",
				"stylers": [
					{
						"color": "#746855"
					}
				]
			},
			{
				"elementType": "labels.text.stroke",
				"stylers": [
					{
						"color": "#242f3e"
					}
				]
			},
			{
				"featureType": "administrative.locality",
				"elementType": "labels.text.fill",
				"stylers": [
					{
						"color": "#d59563"
					}
				]
			},
			{
				"featureType": "poi",
				"elementType": "labels.text.fill",
				"stylers": [
					{
						"color": "#d59563"
					}
				]
			},
			{
				"featureType": "poi.park",
				"elementType": "geometry",
				"stylers": [
					{
						"color": "#263c3f"
					}
				]
			},
			{
				"featureType": "poi.park",
				"elementType": "labels.text.fill",
				"stylers": [
					{
						"color": "#6b9a76"
					}
				]
			},
			{
				"featureType": "road",
				"elementType": "geometry",
				"stylers": [
					{
						"color": "#38414e"
					}
				]
			},
			{
				"featureType": "road",
				"elementType": "geometry.stroke",
				"stylers": [
					{
						"color": "#212a37"
					}
				]
			},
			{
				"featureType": "road",
				"elementType": "labels.text.fill",
				"stylers": [
					{
						"color": "#9ca5b3"
					}
				]
			},
			{
				"featureType": "road.highway",
				"elementType": "geometry",
				"stylers": [
					{
						"color": "#746855"
					}
				]
			},
			{
				"featureType": "road.highway",
				"elementType": "geometry.stroke",
				"stylers": [
					{
						"color": "#1f2835"
					}
				]
			},
			{
				"featureType": "road.highway",
				"elementType": "labels.text.fill",
				"stylers": [
					{
						"color": "#f3d19c"
					}
				]
			},
			{
				"featureType": "transit",
				"elementType": "geometry",
				"stylers": [
					{
						"color": "#2f3948"
					}
				]
			},
			{
				"featureType": "transit.station",
				"elementType": "labels.text.fill",
				"stylers": [
					{
						"color": "#d59563"
					}
				]
			},
			{
				"featureType": "water",
				"elementType": "geometry",
				"stylers": [
					{
						"color": "#17263c"
					}
				]
			},
			{
				"featureType": "water",
				"elementType": "labels.text.fill",
				"stylers": [
					{
						"color": "#515c6d"
					}
				]
			},
			{
				"featureType": "water",
				"elementType": "labels.text.stroke",
				"stylers": [
					{
						"color": "#17263c"
					}
				]
			}
		]
	});

	var centerControlDiv = document.createElement('div');
	var centerControl = new CenterControl(centerControlDiv, map);

	centerControlDiv.index = 1;
	map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(centerControlDiv);

	directionsService = new google.maps.DirectionsService();
	directionsRenderer = new google.maps.DirectionsRenderer({
    polylineOptions: {
			strokeOpacity: 0.5,
    	strokeWeight: 6,
			icons: [{
	    icon: lineSymbol,
	    offset: '0',
	    repeat: '20px'
	  }],
		zIndex:99,
    },
		suppressMarkers:true,
  });

	var image = {
		url: 'https://i.imgur.com/QDsm8jB.png',
		size: new google.maps.Size(45, 45),
		origin: new google.maps.Point(0, 0),
		anchor: new google.maps.Point(25,45)
	};

	setMarker(image,coordUniversity,'NYC University');
	heatmap = new google.maps.visualization.HeatmapLayer({
		data: crimeCoordinates,
		map: map
	});
}

function pointInPath( point , coordLimits){
	var shape = new google.maps.Polygon({paths: coordLimits});
	return google.maps.geometry.poly.containsLocation(point, shape) ?
	true:
	false;
}


class Neighborhood {
	/*In the communityDistrict*/
	constructor(name,coorCenter,coordLimits) {
		this._name = name;
		this._coorCenter = coordinateGmaps(coorCenter);
		this.distanceCar  = [],
		this._info
	}
	get name() {
		return this._name;
	}
	get coorCenter(){
		return this._coorCenter;
	}

	draw(){
		/*Icon To Neighborhood*/
		const imageNB = {
			url: 'https://i.imgur.com/PQwY47e.png?1',
			size: new google.maps.Size(32, 32),
			origin: new google.maps.Point(0, 0),
			anchor: new google.maps.Point(15.5,15.5)
		};
		if(this.distanceCar.length > 0){
			console.log(this.distanceCar[0]);
			this._info = "<div class=\"infoNeigh\"><h5>"+this._name+"</h5>Neighborhood <p>Distance To NYU :"+ (this.distanceCar[0]/1000).toFixed(2) +" Km</p></div>";
		}else{
			this._info = "<div class=\"infoNeigh\"><h5>"+this._name+"</h5>Neighborhood <p>"+"</p></div>";
		}
		var coor = this.coorCenter;
		var marker = setMarker(imageNB,this.coorCenter,this.name);
		var infowindow = new google.maps.InfoWindow({
			content:this._info,

		});
		marker.addListener('click', function () {
			infowindow.open(map,marker);
			console.log(coor);
			getRoute(coor);

		});
		marker.addListener('mouseover', function () {
			infowindow.open(map,marker);
		});
		marker.addListener('mouseout', function () {
			infowindow.close();
		});

		return marker;
	}
}

class CommunityDistrict {
	/*CommunityDistrict in the 5 district */
	constructor(num,coordLimits,multiPol){
		this._id = Number(num);
		this._coordLimits = coordLimits;
		this._neighborhoods = [];
		this._multiPolygon = multiPol;
		this._bedroomUnits = new Array(
			/*Number of Bedroom by unit*/
			{"value":0 ,"text":"0"},
			{"value":0 ,"text":"1"},
			{"value":0 ,"text":"2"},
			{"value":0 ,"text":"3"},
			{"value":0 ,"text":"4"},
			{"value":0 ,"text":"5"},
			{"value":0 ,"text":"6"},
			{"value":0 ,"text":"UD"}),
			this._incomeUnits = new Array(
				/*Level of IncomeUnits*/
				{"value":0 ,"text":"Extremely low"},
				{"value":0 ,"text":"Very low "},
				{"value":0 ,"text":"Low "},
				{"value":0 ,"text":"Moderate low "},
				{"value":0 ,"text":"Middle "},
				{"value":0 ,"text":"Other "});
				this.affordableUnits = 0,
				this._communityDistrShape ,
				this.numberUnits = 0;
				if((num-(numberBorough(num)+1)*100) < 26){
					/*JIA is a different color for the user*/
					this._color = randomColorRGBA(0.9); /*Problema colores muy similares*/
				}else{
					this._color = colorJIA;

				}
			}
			get id() {
				return this._id;
			}
			get multiPolygon(){
				return this._multiPolygon;
			}

			get neighborhoods(){
				return this._neighborhoods;
			}
			get borough(){
				return BOROUGH[numberBorough(this._id)];
			}
			get coordLimits(){
				return this._coordLimits;
			}
			get habitable(){
				if((this._id-(numberBorough(this._id)+1)*100) < 26){ /*Validate if is habitable*/
					return true;
				}else {
					return false;
				}
			}
			get color(){
				return this._color;
			}
			get incomeUnits(){
				return this._incomeUnits;
			}
			get bedroomUnits(){
				return this._bedroomUnits;
			}
			get numberCD(){
				return this._id-((numberBorough(this._id)+1)*100);
			}
			get shape(){
				return this._communityDistrShape;
			}
			draw(fill){
				this._communityDistrShape = new google.maps.Polygon({

					paths: this._coordLimits,
					strokeColor: this._color,
					strokeWeight: 2,
					fillColor: fill,
					communityD:this
				});
				this._communityDistrShape.setMap(map);
				return this._communityDistrShape;
			}
			infowindow(text){
				var infowindow = new google.maps.InfoWindow();
				google.maps.event.addListener(this._communityDistrShape, 'mouseover', function (event) {
					infowindow.setContent(text);
					infowindow.setPosition(this.getPath().getAt(0));
					infowindow.open(map);
				});
				google.maps.event.addListener(this._communityDistrShape, 'mouseout', function (event) {
					infowindow.close();
				});
			}

			drawNB(){
				var neighborhoodMarkers = [];
				for( var i = 0 ;i < this._neighborhoods.length ; i++){
					//if(this._neighborhoods[i].distanceCar.length > 0){
						neighborhoodMarkers.push(this._neighborhoods[i].draw());
					//}
				}
				return neighborhoodMarkers;
			}
		}
		function getDataNeighborhood(){
			/*Como parametro podria tener la URL */
			var data = $.get(NAMESNEIGHBORHOOD,function(){})
			.done(function(){
				let responseJSON = JSON.parse(data.responseText);
				for(var i = 0 ;i < data.responseJSON.data.length ;i++){
					var neighborhood = new Neighborhood(
						data.responseJSON.data[i][10],
						data.responseJSON.data[i][9],
						""
					);
					var numberB= BOROUGH.indexOf(data.responseJSON.data[i][16]);
					neighborhoodToCD(neighborhood,numberB);

				}
			})
			.fail(function(error){
				console.log(error);
			})
		}

		function getHousingData(){
			/*Como parametro podria tener la URL */
			var data = $.get(HOUSEDATA,function(){})
			.done(function(){

				var responseJSON = JSON.parse(data.responseText);

				for(var i = 0 ;i < 	responseJSON.data.length ;i++){
					let numberBoro = BOROUGH.indexOf(responseJSON.data[i][15]);
					let numberCD = Number(responseJSON.data[i][19].slice(-2)); /*Extract last 2 items*/
					var communityDistr = borough[numberBoro].filter(function( obj ) {
						if(obj.id == ((numberBoro+1)*100)+numberCD){
							return obj;
						}
					});
					communityDistr[0].incomeUnits[0].value += Number(responseJSON.data[i][31]);
					communityDistr[0].incomeUnits[1].value += Number(responseJSON.data[i][32]);
					communityDistr[0].incomeUnits[2].value += Number(responseJSON.data[i][33]);
					communityDistr[0].incomeUnits[3].value += Number(responseJSON.data[i][34]);
					communityDistr[0].incomeUnits[4].value += Number(responseJSON.data[i][35]);
					communityDistr[0].incomeUnits[5].value += Number(responseJSON.data[i][36]);

					communityDistr[0].bedroomUnits[0].value += Number(responseJSON.data[i][37]);
					communityDistr[0].bedroomUnits[1].value += Number(responseJSON.data[i][38]);
					communityDistr[0].bedroomUnits[2].value += Number(responseJSON.data[i][39]);
					communityDistr[0].bedroomUnits[3].value += Number(responseJSON.data[i][40]);
					communityDistr[0].bedroomUnits[4].value += Number(responseJSON.data[i][41]);
					communityDistr[0].bedroomUnits[5].value += Number(responseJSON.data[i][42]);
					communityDistr[0].bedroomUnits[6].value += Number(responseJSON.data[i][43]);
					communityDistr[0].bedroomUnits[7].value += Number(responseJSON.data[i][44]);

					communityDistr[0].affordableUnits += Number(responseJSON.data[i][45]);
					communityDistr[0].numberUnits += Number(responseJSON.data[i][47]);


				}
			})
			.fail(function(error){
				console.error(error);
			});
		}

		function calculateDistanceCar( communityD ){
			var distanceMatrixService = new google.maps.DistanceMatrixService;
			var neighborhoodsDis = communityD.neighborhoods.map(a => a.coorCenter);
			return new Promise(resolve => {
				setTimeout(() => {
					distanceMatrixService.getDistanceMatrix({
						origins: neighborhoodsDis,
						destinations: [coordUniversity],
						unitSystem: google.maps.UnitSystem.METRIC,
						travelMode: 'DRIVING'

					},function(response, status){
						if (status !== google.maps.DistanceMatrixStatus.OK) {
							window.alert('Error Distance was: ' + status);
						} else {
							var sumDistance = 0;
							var numberNeigh = communityD.neighborhoods.length;
							for (var i = 0 ; i < numberNeigh ; i++){
								communityD.neighborhoods[i].distanceCar.push(response.rows[i].elements[0].distance.value);
								sumDistance += response.rows[i].elements[0].distance.value;
							}
							/*Average cast to KM*/
							var averageDistance = sumDistance/(1000*numberNeigh);
							if(maxDistance < averageDistance){
								/*Save max distance for calculate Number of points*/
								maxDistance = averageDistance;
							}
							communityD.distanceCar = sumDistance/(1000*numberNeigh);
							resolve('resolved');
						}
					})
				}, 350);
			})
		}

		function getRoute(coorObjetive,callback){
		  var request = {
		    origin : coorObjetive, /*site to show destination*/
		    destination: coordUniversity,
		    travelMode:'DRIVING'
		  }
		  directionsRenderer.setMap(map);
		  directionsService.route(request,function(result,status){
		      if(status == 'OK'){
		        directionsRenderer.setDirections(result);
		      }
		  });
		}

		function compareById(a,b) {
			if (a.id < b.id)
			return -1;
			if (a.id > b.id)
			return 1;
			return 0;
		}

		/*When Page charge Load Basic data */
		$("document").ready(function(){
			borough = getDataShapeDistric(getDataNeighborhood);
			getCrimes(toggleHeatmap);
			$('#ModalWelcome').modal('show');
		});

		/*For bootstrap -Table*/
		function runningFormatter(value, row, index) {
			/*Change Text by Icons */
			if( index == 0 ){
				return '<span class="winner "></span>';
			}
			if( index == 1 ){
				return '<span class="second "></span>';
			}
			if( index == 2 ){
				return '<span class="third "></span>';
			}
			return '<div class="text-center"><strong align="center" style="margin:auto">'+ (index + 1)+'</strong></div>';
		}
		/*/Clean Code/Clean Code/Clean Code/Clean Code/Clean Code/Clean Code/Clean Code/Clean Code*/



		/*SORT BY ACTIVE PARAMETERS*/
		function updateTable(){
			$('#table').bootstrapTable({
				data:filteredCD,
				onClickRow: function (row,$element){
					if(typeof(shapeActive) == "object" && typeof(neigMarkActive) == "object"){
						shapeActive.setMap(null);
						for(var i = 0 ;i < neigMarkActive.length ; i++){
							neigMarkActive[i].setMap(null);
						}
					};
					console.log(row);
					$element.css({backgroundColor: row.color});
					shapeActive = row.draw(row.color);
					neigMarkActive = row.drawNB();
					$('#nameBoro').html(row.borough);
					$('#numberCD').html("Community District : "+row.numberCD);


					drawChart(row.incomeUnits);
					if(row.distanceCar != 'undefined'){
						//$('#distanceAverage').html("Average distance by car to NYU: "+row.distanceCar.toFixed(2) + "Km");
					}
					directionsRenderer.setMap(null)
					map.setCenter(row.neighborhoods[0].coorCenter);
					map.setZoom(13);
				},
				//pageList:false,

				clickToSelect:true,
				//onlyInfoPagination:true,
				//rememberOrder:true,
				//pagination:true,
				checkbox: true,
				onCheck: function(row,$element){

					alert("hi");
				}
			});
			$('#table').bootstrapTable('updateRow', {index:0});
		}
		/*FOR TEST
		*/
		async function calculateDistances(){
			for(var i = 0;i < borough.length ;i++ ){
				for (var j = 0;j <borough[i].length ;j++){
					if(borough[i][j].habitable){
						await calculateDistanceCar(borough[i][j]);
					}
				}
				controlCharge(i*25);
			}
		}
		function compareByDistances(a,b) {
			if (a.distanceCar < b.distanceCar)
			return -1;
			if (a.distanceCar > b.distanceCar)
			return 1;
			return 0;
		}

		/*Funtions To calculate The Best District*/
		function pointsPrice(communityD){
			var acumulate = 0;
			for(var i = 1;i < 8; i++){
				/*priorize number of bedroom per unit*/
				acumulate += (communityD.bedroomUnits[i].value*i);
				/*priorize by i more bredrom more points
				units without rooms do not have points
				more points is best*/
			}
			return acumulate/communityD.numberUnits;
		}
		function pointsIncome(communityD){
			var acumulate = 0;
			for(var i = 1, priorize = 5;i < 5; i++,priorize--){
				/*priorize number of bedroom per unit*/
				acumulate += (communityD.incomeUnits[i].value*priorize);
				/*priorize units by incomeUnits
				Units with unknown income values are not counted
				more points is best
				*/
			}
			return acumulate/communityD.numberUnits;
		}
		function percentageByPreferences(){
			var preferences = 0;
			if(preferenceDistance){
				preferences++;
			}
			if(preferencePrice){
				preferences++;
			}
			return 100/(100*preferences);
		}
		function calculatePoints(a,b) {
			var scoreA = 0;
			var scoreB = 0;
			if(preferencePrice){
				/*Function of points priorize
				*Number of bedroomUnits
				*/
				scoreA += (pointsIncome(a) + pointsPrice(a));
				scoreB += (pointsIncome(b) + pointsPrice(b));
				scoreA = scoreA*percentageByPreferences();
				scoreB = scoreB*percentageByPreferences();
			}
			if(preferenceDistance){
				scoreA += a.distanceCar*percentageByPreferences();
				scoreB += b.distanceCar*percentageByPreferences();
			}

			if (scoreA < scoreB)
			return -1;
			if (scoreA > scoreB)
			return 1;
			return 0;
		}
		/*Funtion to show user loading Data*/
		function controlCharge(status){
			$('.progress-bar').text( status+"% Loading" );
			$('.progress-bar').css( "width",status+"%" );
			if(status == 100){
				$('#Status').text("Loaded Data");
				$('.progress-bar').removeClass( "progress-bar-striped progress-bar-animated " );
				$('.progress-bar').addClass("bg-success");
			}else{
				$('#Status').text( status+"% Loading" );
				$('.progress-bar').addClass("progress-bar-striped progress-bar-animated ");
				$('.progress-bar').removeClass("bg-success");
			}
		}
		/*State of buttons*/
		function pressButton( button ){
			if( button.hasClass("btn-success") ){
				button.removeClass("btn-success");
				return false;
			}else{
				button.addClass("btn-success");
				return true;
			}
		}
		/*Start Sorting of best CD*/
		async function calculateDistance(){
			$('#ModalDistance').modal('toggle');
			$('#distance').addClass("btn-warning");
			$('#distance').prop('disabled', true);
			controlCharge(0);
			await calculateDistances();
			$('#distance').prop('disabled', false);
			$('#distance').removeClass("btn-warning");
			document.getElementById("distance").setAttribute('onclick','sortByDistance()')
			sortByDistance();
		}
		function sortByDistance(){
			preferenceDistance = pressButton($('#distance'));
			sortByPreferences();
		}
		async function calculatePricing(){
			$('#price').addClass("btn-warning");
			$('#price').prop('disabled', true);
			controlCharge(10);
			await getHousingData();
			controlCharge(100);
			$('#price').prop('disabled', false);
			$('#price').removeClass("btn-warning");
			document.getElementById("price").setAttribute('onclick','sortByPrice()');
			sortByPrice();
		}
		function sortByPrice(){
			preferencePrice = pressButton($('#price'));
			sortByPreferences();
		}

		function sortByPreferences(){
			filteredCD.sort(calculatePoints);
			updateTable();
		}


		/*Barchart init */
		var svg = d3.select("#barChart"),
		margin = { top: 30, right: 20, bottom: 30, left: 40 },
		x = d3.scaleBand().padding(0.3),
		y = d3.scaleLinear(),
		theData = undefined;

		var g = svg.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		/*make axis for chart*/
		g.append("g")
		.attr("class", "axis axis--x");

		g.append("g")
		.attr("class", "axis axis--y");

		g.append("text")
		.attr("transform", "translate(0,-10)")
		.text("Houses according to cost");

		  g.append("text")
				.attr("transform", "translate(200,0)")
				.attr("transform", "rotate(-90)")
		    .attr("y", 6)
		    .attr("dy", "0.71em")
		    .attr("text-anchor", "end")
		    .text("Number of Houses");
		/*Barchart responsive listener*/
		window.addEventListener("resize", paint);

		/*Function to update data display in barChart*/
		function drawChart(tsvFile) {
			theData = tsvFile;
			console.log(tsvFile)
			x.domain(tsvFile.map(function (d) { return d.text; }));
			y.domain([0, d3.max(theData, function (d) { return d.value; })]);
			paint();
		}
		/*Config Draw of Chart*/
		function paint() {
			var bounds = svg.node().getBoundingClientRect(),
			width = bounds.width - margin.left - margin.right,
			height = bounds.height - margin.top - margin.bottom ;
			/*When resize recalculate limits|*/
			x.rangeRound([0, width]);
			y.rangeRound([height, 0]);

			g.select(".axis--x")
			.attr("transform", "translate(0," + height + ")")
			.call(d3.axisBottom(x))
			.selectAll("text")
			.attr("transform", "rotate(-15)");

			g.select(".axis--y")
			.call(d3.axisLeft(y));

			var bars = g.selectAll(".bar")
			.data(theData);

			/*Draw bars with exact size*/
			bars.enter().append("rect")
			.attr("class", "bar")
			.attr("x", function (d) { return x(d.text); })
			.attr("y", function (d) { return y(d.value); })
			.attr("width", x.bandwidth())
			.attr("height", function (d) { return height - y(d.value); });
			/*Insert New Data*/
			bars.attr("x", function (d) { return x(d.text); })
			.attr("y", function (d) { return y(d.value); })
			.attr("width", x.bandwidth())
			.attr("height", function (d) { return height - y(d.value); });

			bars.exit().remove();
		}
		/*barChart end*/

		/*Control heatmap*/
		function toggleHeatmap() {
			heatmap.setMap(heatmap.getMap() ? null : map);
		}


		function CenterControl(controlDiv, map) {

			// Set CSS for the control border.
			var controlUI = document.createElement('div');
			controlUI.style.backgroundColor = 'rgb(102, 53, 143)';
			controlUI.style.border = '2px solid rgb(68, 1, 127)';
			controlUI.style.borderRadius = '10px';
			controlUI.style.boxShadow = '0 4px 12px rgba(200,0,0,.3)';
			controlUI.style.cursor = 'pointer';
			controlUI.style.marginBottom = '22px';
			controlUI.style.textAlign = 'center';
			controlUI.title = 'Click to center map in NYU';
			controlDiv.appendChild(controlUI);

			// Set CSS for the control interior.
			var controlText = document.createElement('div');
			controlText.style.color = 'rgb(255,255,255)';
			controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
			controlText.style.fontSize = '16px';
			controlText.style.lineHeight = '38px';
			controlText.style.paddingLeft = '5px';
			controlText.style.paddingRight = '5px';
			controlText.innerHTML = 'Go to New York University (NYU)';
			controlUI.appendChild(controlText);

			// Setup the click event listeners: simply set the map to Chicago.
			controlUI.addEventListener('click', function() {
				map.setCenter(coordUniversity);
				map.setZoom(15);
			});

		}
