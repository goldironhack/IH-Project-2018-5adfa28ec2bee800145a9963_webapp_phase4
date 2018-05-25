# ASINY

ASINY is a recursive acronym that means **A**SINY is  **S**ite **I**n **N**ew **Y**ork. Its goal is to provide a ranking of the best district according to the metrics customized by the user. Mainly the distances e in different means of transport.
The interface tries to prioritize the Map, but at the same time give information about the best district determined by the application.

## KeyWords

* Interactive
* asdasd
* Tables
* Near
* Intuitive 

## Datasets Used

*  **Name NBH** [[NAMESNEIGHBORHOOD](https://data.cityofnewyork.us/api/views/xyye-rtrs/rows.json?accessType=DOWNLOAD)]
	* Column Used:
		* [10]Name
		* [9]CoorCenter
		* [16]district
*  **SHAPECD** [[SHAPECD](https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nycd/FeatureServer/0/query?where=1=1&outFields=*&outSR=4326&f=geojson)]
	* Column Used:
		* features.geometry.coordinates
		* features.properties.BoroCD
		
	* 800 data  for consult
	
* [N] The primary crime dataSets was not used.
* Interactive Map
## Description

The application will seek to provide information filtered from the districts and also generate a ranking according to the parameters prioritized by the user. The interface will seek to be as intuitive as possible by responding to movements and controls commonly used in web pages containing maps.
Introduction
 -   Map View:
		1. [Y] the map starts centered at NYC University
		2. [Y] Marker in NYC University
 - Data Visualization:
		1. [N] Highlight area of districts
		2. [N] Table with ranking of best districts
		3. [N] Chart transfer times from districts
 - Interaction Form:
		1. [Y]2 columns with filtered information regarding the districts
		2. [Y]Map interactive in the center
		3. [Y]Navigation bar on top to define metrics
		4. [N] Select means of transport
		5. [N] Tables with the ranking of the districts that stand out on the map
		6. [N] Exportable tables to restore the session
		7. [N] Exportable tables with  ranking
## Formulates district prioritization
To calculate the distance between Community District and NYU, the distance traveled by car from all the neighborhoods it contains to the NYU is calculated and averaged so that a more accurate measurement is obtained.
 
# Files
 - index.html
 - style.css
 - index.js
 - [this] README.md
