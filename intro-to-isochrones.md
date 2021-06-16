# The Top 3 Things to do with Travel Time Isochrones <!-- omit in toc --> 

- [Intro](#intro)
- [Setup](#setup)
  - [Tools](#tools)
  - [HTML dependencies](#html-dependencies)
  - [Setting up your workspace](#setting-up-your-workspace)
- [Requests and Responses.](#requests-and-responses)
  - [Requests](#requests)
  - [Responses](#responses)
- [Simple Polygon Reachability](#simple-polygon-reachability)
- [Multi-Source Polygons and Polygon Intersections](#multi-source-polygons-and-polygon-intersections)
- [Filtering using Polygons](#filtering-using-polygons)
- [Advanced Isochrone usage](#advanced-isochrone-usage)
  - [Beyond Isochrones](#beyond-isochrones)
- [Conclusion](#conclusion)

## Intro

Targomo offers a large suite of geospatial tools that can be used to perform powerful location-based analysis, provide detailed statistics visualizations, and solve complex logistical problems. Today, however, we will be focusing on one of the simplest yet most useful APIs; The Isochrone API. The Isochrone API is used to visualize reachable areas from a source or group of sources as GeoJSON polygons. This can be used in a variety of useful applications but I will focus on 3 areas in this article to get you started.

1. Simple Polygon Reachability
2. Multi-Source Polygons and Polygon Intersections 
3. Filtering targets using Polygons

All Isochrone examples in this article were produced using a 'Pay per use' [Targomo API key with](https://www.targomo.com/developers/pricing/) requests sent to publicly accessible endpoints. While this is a "paid" key that requires a valid credit card to register, you are allocated €300 worth of free operations per month (which is around 200,000 operations for the Isochrone API for requests up to 1h max range bands). The background maps shown were made using a free [MapTiler](https://www.maptiler.com/) account API key as well.

This article will use the core [JavaScript Library](https://app.targomo.com/tsdocs/core/latest) to handle requests and responses from the Targomo Isochrone API but there are several alternatives available if needed. These include the JavaScript [Leaflet](https://app.targomo.com/tsdocs/leaflet/latest) and [Google Maps](https://app.targomo.com/tsdocs/googlemaps/latest) extensions, the Targomo [Java Client Library](https://github.com/targomo/targomo-java), or via direct [REST request](https://docs.targomo.com/). The complete code for all examples here plus a few extras can be found in this [GitHub Repository](https://github.com/targomo/intro-to-isochrones). For other similar examples and many many more check out the Targomo Developers [Code Examples](https://www.targomo.com/developers/documentation/javascript/code_example/) page.

So what is an Isochrone? You can find an in depth explanation [here](https://traveltime.com/blog/what-is-an-isochrone), but they are defined as "An isoline on a map or chart connecting points that have the same value for some time-related variable". The shapes returned by the Isochrone API represent this by joining all the furthest reachable points on the routing network from the given sources to form a polygon. We refer to these as 'reachability polygons' or 'Isochrones'. The definition is stretched slightly on our end though since we can visualize on both time and travel distance and also offer the capability to define multiple sources and aggregate the resulting isochrones. Throughout the article I will mostly be referring to the returned objects as 'polygon's as we will be working with them as we would almost any GeoJSON polygon.

## Setup

### Tools

Using the Targomo API doesn't require the use of any complex tools or libraries. Nothing beyond acquiring [Targomo](https://www.targomo.com/developers/pricing/) and [MapTiler](https://www.maptiler.com/) API keys is necessary. Everything in this article relies on  HTML, CSS and JavaScript so should run fine on almost any browser with any operating system. Nothing special needs to be installed on your computer to run any of the code examples here although I did use [Visual Studio Code](https://code.visualstudio.com/) and the [Debugger for Firefox](https://marketplace.visualstudio.com/items?itemName=firefox-devtools.vscode-firefox-debug) when creating these examples for convenience, but this could just as easily be done in you editor of choice (or even in a basic text editor).

### HTML dependencies

We use a small selection of HTML dependencies for our maps, the targomo core library, and some visual improvements. All major dependencies can also be installed via NPM, only the button icons and micro progress bar (both just used for visual improvements) are specifically just HTML dependencies.

```html
    <!--  Include mapboxgl javascript and css for the background map and visualization of geojson-->
    <script src='https://api.tiles.mapbox.com/mapbox-gl-js/v1.6.0/mapbox-gl.js'></script>
    <link href='https://api.tiles.mapbox.com/mapbox-gl-js/v1.6.0/mapbox-gl.css' rel='stylesheet'>
    <!-- Include turf geo-awesomeness -->
    <script src="https://npmcdn.com/@turf/turf@6.3.0/turf.min.js"></script>
    <!--  Include D3.js for Geojson Filtering  -->
    <script src="https://d3js.org/d3-geo.v2.min.js"></script>
    <!-- Button Icons -->
    <link rel="stylesheet" href="https://releases.targomo.com/tgm-icons/webfont/tgm-icon.css">
    <!--  Include micro progress bar  -->
    <script src="https://www.targomo.com/developers/scripts/mipb.min.js"></script>
    <!--  Include targomo core -->
    <script src='https://releases.targomo.com/core/0.4.3.js'></script>
```

`mapbox-gl` Is used to display both our map itself and the resulting polygons. `turf` provides some simple fitting functionality so we automatically focus on the area of the map we are interested in while `d3js` gives us an easy way to check which targets are contained within an polygon when filtering. Finally the `targomo/core` library provides a simple interface with the Targomo REST API which will be used to retrieve the polygons we will work with.

### Setting up your workspace

First let us set up an index page that will act as the hub to connect to our map examples. Create the following files at the root of your workspace

```
index.html
polygon.html
polygon-filtering.html
polygon-intersection.html
```

Now we need to create links to each of those pages from our index. Add the following to `index.html`

```html
<!DOCTYPE html>
<html>
    <head>
        <title>TGM Maps</title>
        <link rel="stylesheet" href="style/index.css" />
    </head>
    <body>
        <a href="polygon.html">
            <div class="card">
                <div class="text">Single-Point Isochrone</div>
                <div class="image" id="polygon"></div>
            </div>
            
        </a>
        <a href="polygon-intersection.html">
            <div class="card">
                <div class="text">Multi-Point Isochrone</div>
                <div class="image" id="intersection"></div>
            </div>
        </a>
        <a href="polygon-filtering.html">
            <div class="card">
                <div class="text">Polygon Filtering</div>
                <div class="image" id="polygon-filtering"></div>
            </div>
        </a>
    </body>
</html>  
```

Next we want to create a folder called `map-cards` and download all the images found [here](https://github.com/targomo/intro-to-isochrones/blob/main/map-cards) into that folder. Now we want to add these to our index and add some styles. Create a folder called `style` and inside that folder a file called `index.css` and add the following.

```css
:root {
    --light: #f2f4f4;
    --dark: #4c656a;
    --medium: #b2bdbf;
    --contrast: #ff8319;
    --radius: 8px;
}

body, html {
    background-color: var(--dark);
    margin: 5px;
    width: 100%;
    height: 100%;
}

.card {
    float:left;
    width: 40%;
    border-radius: var(--radius);
    box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2);
    padding: 0;
    margin-left: 5%;
    margin-top: 32px;
    text-align: center;
    color: var(--light);
    background-color: var(--contrast);
}

.text {
    padding-top: 8px;
    padding-bottom: 8px;
    font-weight: bold;
    transition-duration: 0.4s;
}

.card:hover {
    background-color: var(--medium);
    color: black;
}


.image {
    padding: 84px;
    background-color: black;
    background-size: 100% 400px;
    background-position: center;
    border-bottom-left-radius: var(--radius);
    border-bottom-right-radius: var(--radius);
}

#polygon {
    background-image: url("../map-cards/targomo-polygon.png");
}

#intersection {
    background-image: url("../map-cards/targomo-polygon-intersection.png");
}

#polygon-filtering {
    background-image: url("../map-cards/targomo-polygon-filtering.png");
}
```

If you open `index.html` in a browser you should now have an easily expandable card menu that looks something like this:

<img src="https://www.targomo.com/wp-content/uploads/2021/06/index.png" alt="drawing" width="80%"/>

Now we have a nice hub page from which to work. Before moving on to creating the actual maps we should talk briefly about the request and response formats we will be using in this article.

## Requests and Responses.

### Requests
As mentioned above I will be using the Targomo JavaScript client library to make requests for all of the following examples. Making requests with this library is very simple. First we need to create a client. The client only needs two parameters, the name of an 'endpoint' and your Targomo API Key.

```javascript
const client = new tgm.TargomoClient('westcentraleurope', '__Your_Targomo_API_Key__');
```

An 'endpoint' simply defines the geographical region you are working in. A full list of available endpoints and their coverage areas can be found [here](https://www.targomo.com/developers/resources/coverage/) but we will be using the `westcentraleurope` endpoint for all examples here. Once your client is created making the request requires two inputs.

**Sources**

The sources are an array of JSON objects that define the ID, Latitude and Longitude of coordinates to route from.

```javascript
let sources = [
  {
    "id" : "source-0",
    "lat": 52.5161,
    "lng": 13.3778
  },
  {
    "id" : "source-1",
    "lat": 52.5093,
    "lng": 13.3756, 
  },
];
```

**Options**

The options parameter acts as the body of the request containing the parameters that will define the result. Here is a basic set of options.

```javascript
let options = {
    "travelType"       : 'bike',
    "edgeWeight"       : 'time',
    "travelEdgeWeights": [300, 600, 900, 1200, 1500, 1800],
    "srid"             : 4326,
    "serializer"       : 'geojson',
    "simplify"         : 200,
    "quadrantSegments" : 6,
    "buffer"           : 0.002
};
```

More details about these parameters and more can be found in the [documentation](https://app.targomo.com/tsdocs/core/latest) but I will give a brief overview of the options presented here.

- `travelType` : This is the mode of transportation used. It can be one of `walk`, `car`, `bike` or `transit`.
- `edgeWeight` : This defines the travel measurements. It can be either `time` or `distance` which will cause travel to be calculated in seconds or meters respectively.
- `travelEdgeWeights` : This defines the size and number of polygons to calculate. Each number in the array represents an individual polygon that will be returned. For `time` these are in seconds while for `distance` these are in meters. In this case we are creating a polygon at 5 minute intervals.
- `srid`: The 'spatial reference identifier' system for the returned polygons. Currently `4326` and `3857` are supported.
- `serializer` : This is the format of the response data. We also offer a custom compact `json` serializer for use with our leaflet and Google Maps client libraries but will be focusing on the GeoJSON serializer in this article.
- `simplify` : This is used to smooth the edges of polygons by reducing the number of points based on the input number (in meters). Points closer than the given number will be removed.
- `quadrantSegments` : The vertices of the polygons are buffered in a semi-circular fashion, this determines how many segments a 90 degree angle would be translated into. The higher the number, the smoother/more rounded the edges of the polygon. Ranges between from 2 to 8.
- `buffer` : This defines and amount in the given `srid` to widen each polygon by. `buffer`, `quadrantSegments`, and `simplify` can be used in conjunction to make returned polygons both nicer to look at and and easier to comprehend. 

These parameters, alongside many others, allow for extensive customizability in the requests enabling polygons to be created for highly specific use cases. Once you have these two parameters defined you only need to call the `polgons.fetch` request function.

```javascript
client.polygons.fetch(sources, options).then((polygons) => {
  // do something
});
```

### Responses

The response data is always returned as a JSON object and in the case of the GeoJSON `serializer` specifically, as a `FeatureCollection`. Below is a compacted example for only two range bands (300 and 600) with most of the coordinates removed, a full example can be found [here](https://github.com/targomo/intro-to-isochrones/blob/main/example-responses/polygon.json). 

```json
{
    "type": "FeatureCollection",
    "crs": {
      "type": "name",
      "properties": {
        "name": "urn:ogc:def:crs:EPSG::4326"
      }
    },
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "MultiPolygon",
          "coordinates": [
            [
              [
                [
                  13.35836048,
                  52.50675793
                ],
                "...",
                [
                  13.35836048,
                  52.50675793
                ]
              ]
            ]
          ]
        },
        "properties": {
          "time": 300,
          "area": 269049.49259195756
        },
        "id": "fid-2f223ea2_1792930e64e_3b2d"
      },
      {
        "type": "Feature",
        "geometry": {
          "type": "MultiPolygon",
          "coordinates": [
            [
              [
                13.34263707,
                52.50679244
              ],
              "...",
              [
                13.34263707,
                52.50679244
              ]
            ]
          ]
        },
        "properties": {
          "time": 600,
          "area": 3235488.276913828
        },
        "id": "fid-2f223ea2_1792930e64e_3b2e"
      }
    ]
  }
```

The response will return a `FeatureCollection` containing a `MultiPolygon` for each range band defined in the `travelEdgeWeights` parameter of the options. This data can be passed directly to other libraries that accept GeoJSON for visualization, such as MapBox GL which we will be using here.

## Simple Polygon Reachability

Whether checking areas within a reachable time/distance of a new home by car or analyzing the accessibility of a potential school via public transport, the Isochrone API offers what I hope to demonstrate as a quick, easy and relatively simple solution. For this example we will be using a single source to explore the effects of the different `options` parameters. Fist let us make an HTML page with all the dependencies we need. Add the following to the `polygon.html` file.

```html
<!DOCTYPE html>
<html>
    <head>
        <!--  Include mapboxgl javascript and css -->
        <script src='https://api.tiles.mapbox.com/mapbox-gl-js/v1.6.0/mapbox-gl.js'></script>
        <link href='https://api.tiles.mapbox.com/mapbox-gl-js/v1.6.0/mapbox-gl.css' rel='stylesheet'>
        <!-- Include turf geo-awesomeness -->
        <script src="https://npmcdn.com/@turf/turf@6.3.0/turf.min.js"></script>
        <!-- Button Icons -->
        <link rel="stylesheet" href="https://releases.targomo.com/tgm-icons/webfont/tgm-icon.css">
        <!--  Include targomo core -->
        <script src='https://releases.targomo.com/core/0.4.3.js'></script>
        <link rel="stylesheet" href="style/maps.css" />
        <title>Simple Polygon Reachability</title>
    </head>
        <body>
        <!--  where the map will live  -->
        <div id='map'></div>
        <script src="javascript/polygon.js"></script>
    </body>
</html> 
```

Not much needed here, just a basic html page with a `div` to house the map and some dependencies. Now we need to add some simple css to control the map. Create a file in the `style` folder called `maps.css`. This will hold the css for all of our map pages going forwards.

```css
body, html {
    margin: 0;
    width: 100%;
    height: 100%;
}

#map {
    width: 100%;
    height: 100%;
}
```

We don't need to add much as the actual visualization will be mostly by MapBox so w simply fit the map to the entire screen. Finally we can get started on the JavaScript. Create a folder called `javascript` at the root of your workspace and add a file called `polygon.js`. First let's start by defining everything we need to call the targomo API.

```javascript
// create targomo client
const client = new tgm.TargomoClient('westcentraleurope', '__Your_Targomo_API_Key__')

// Create the source point and polygon range bands
const lnglat = [13.37, 52.51];
const travelTimes = [300, 600, 900, 1200, 1500, 1800];

// Define the options for the polygon service
const options = {
    travelType: 'bike',
    travelEdgeWeights: travelTimes,
    edgeWeight: 'time',
    srid: 4326,
    serializer: 'geojson',
    simplify: 200,
    quadrantSegments : 6,
    buffer: 0.002
};
```

That's it, The client, a source point, the polygon range bands, and some options. We keep the range bands as a separate variable as we will use them again later to help when visualizing the polygons. Next up we need to create the map itself and define what our polygons will look like.

```javascript
// Mapbox Parameters
const timeColors = ['#006837', '#39B54A', '#8CC63F', '#F7931E', '#F15A24', '#C1272D'];
const emptyData = { 'type': 'FeatureCollection', 'features': [] };
const marker = new mapboxgl.Marker({ draggable: true }).setLngLat(lnglat);

// Add the map
const map = new mapboxgl.Map({
    container: 'map',
    style: 'https://api.maptiler.com/maps/streets/style.json?key=__Your_MapTiler_API_Key__',
    zoom: 12,
    center: lnglat
}).addControl(new mapboxgl.NavigationControl());
```

The empty data will be used to initialize the map while the color array is used to define the colors of the different polygon range bands. The Marker will represent our source point which we want to be 'draggable' so we can investigate change the source location. Now we need to actually retrieve the polygons and fill in the map. To do so we will create 3 Utility methods.

```javascript
// Perform the polygon request and update the map using the result
async function getPolygons() {
    let source = { 
        id : "source", 
        lng: marker.getLngLat().lng, 
        lat: marker.getLngLat().lat
    }
    client.polygons.fetch([source], options).then((geojsonPolygons) => {
        map.getSource('polygon').setData(geojsonPolygons);
        map.fitBounds(turf.bbox(geojsonPolygons), { padding: 20 });
    });
}

// height stops function
function getHeightPolygons(travelTimes, heightFactor) {
    return [
        [travelTimes[0], travelTimes.length * (10 * heightFactor)],
        [travelTimes[travelTimes.length - 1], travelTimes.length * heightFactor]
    ]
}

// color stop function
function getColorPolygons(times, colors) {
    const colorsConfig = times.map((time, idx) => {
        return [times[idx], colors[idx]];
    });
    return colorsConfig;
}
```

`getPolygons()` is the most important here and will do the bulk of the work, retrieving the polygon and updating the map. It will also recreate the source from the marker each time which is required to update the location of the polygon. `getHeightPolygons()` and `getColorStops()` are used by the MapBox layers to extrude and then color the different polygon bands allowing us to differentiate them visually. Polygon heights can be useful visualization tools for 3d maps and can be especially useful when you have enough range bands that separating by color alone becomes cumbersome. Finally it is time to load the map and actually see what this looks like. Don't forget to replace the placeholder API keys with your own.

```javascript
// Update the map when the marker is dragged and add to map
marker.on('dragend', getPolygons).addTo(map);

map.on('load', () => {
    // call the Targomo service
    map.addSource('polygon', {
        'type': 'geojson',
        'data': emptyData
    })
    map.addLayer({
        'id': 'polygons',
        'type': 'fill-extrusion',
        'layout': {},
        'source' : 'polygon',
        'paint': {
            'fill-extrusion-base': 0,
            'fill-extrusion-height': {
                'property': 'time',
                'stops': getHeightPolygons(travelTimes, 2)
            },
            'fill-extrusion-color': {
                'property': 'time',
                'stops': getColorPolygons(travelTimes, timeColors)
            },
            'fill-extrusion-opacity': .5
        }
    });
    getPolygons();
})
```

That's it, load the HTML up in any browser and you should have a simple biking polygon that look like this.

<img src="https://www.targomo.com/wp-content/uploads/2021/06/simple-polygon.png" alt="drawing" width="80%"/>

Now we want to be able to look at polygons for different travel types. To update the travel type we will need to update the `options.travelType` parameter to one of `bike`, `walk`, `car` or `transit` and send a new request. Lets add some travel type buttons. First add the following to the HTML before the `script` is loaded.

```html
<!-- Buttons to change the travel type -->
<div class="markers travel-type">
    <div data-type="walk" class="marker-container type active">
        <span class="tgm-icon tgm-ux-mode-walk"></span>
        <span class="tooltiptext">Walk</span>
    </div>
    <div data-type="bike" class="marker-container type">
        <span class="tgm-icon tgm-ux-mode-bike"></span>
        <span class="tooltiptext">Bike</span>
    </div>
    <div data-type="car" class="marker-container type">
        <span class="tgm-icon tgm-ux-mode-car"></span>
        <span class="tooltiptext">Car</span>
    </div>
    <div data-type="transit" class="marker-container type">
        <span class="tgm-icon tgm-ux-mode-transit"></span>
        <span class="tooltiptext">Transit</span>
    </div>
</div>
```
These buttons will use some of the Targomo UX icons and include a tool-tip but the actual contents don't matter. Now we should add some CSS to help style these buttons.

```css
.markers {
    display: flex;
    width: 300px;
    justify-content: space-between;
    margin: 10px;
}

.travel-type {
    position: absolute;
    top: 10px;
    left: 10px;
}
  
.tgm-icon {
    font-size: 45px;
}
  
.marker-container {
    box-shadow: 0 0 0 2px rgba(0,0,0,.1);
    padding: 2px;
    background: #fff;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    width: 60px;
    height: 60px;
}
  
.marker-container .material-icons {
    font-size: 18px;
}
  
.marker-container.active {
    background: yellow;
}

.marker-container .tooltiptext {
    visibility: hidden;
    background-color: #FF8319;
    color: white;
    text-align: center;
    border-radius: 6px;
    padding: 5px 5px;
    opacity: 0;
    z-index: 1;
}

.travel-type .marker-container .tooltiptext {
    position: absolute;
    top: 70px;
}

.marker-container:hover .tooltiptext {
    visibility: visible;
    opacity: 1;
    transition: .25s;
    transition-delay: 1s;
}
```

Finally, we need to add the requisite JavaScript to properly update the buttons when clicked.

```javascript
// Add update on click for travel type buttons
const travelTypes = document.querySelectorAll(".marker-container.type");
for (let type of travelTypes) {
    type.onclick = function () {
        updateButton(type, travelTypes, updateTravelType);
    };
}

// Update on click
function updateButton(button, buttons, updateFunction) {
    for (let tp of buttons) {
        tp.classList.remove("active");
    }
    button.classList.add("active");
    updateFunction(button);
};

// Update the travel type
function updateTravelType(type) {
    options.travelType = type.dataset.type;
    console.log(`TravelType updated to ${options.travelType}`)
    getPolygons();
}
```

We use some extra code for `TravelType` elements since we will add another set of buttons later to update `IntersectionMode`. This will be covered more in the next section but for now let's see what our buttons look like and how travel type can affect the polygons.

<img src="https://www.targomo.com/wp-content/uploads/2021/06/polygon-walk.png" alt="drawing" width="40%"/>
<img src="https://www.targomo.com/wp-content/uploads/2021/06/polygon-bike.png" alt="drawing" width="40%"/>
<img src="https://www.targomo.com/wp-content/uploads/2021/06/polygon-car.png" alt="drawing" width="40%"/>
<img src="https://www.targomo.com/wp-content/uploads/2021/06/polygon-transit.png" alt="drawing" width="40%"/>

In the first row we can see that bike and walk look very similar. Generally all polygons are quite circular with some distortion around the edges as the network radiates outwards at different rates depending on physical factors such as the number of other roads to cross or elevation changes. There are very few places where one can bike but not walk, however a bike is generally faster so we simply see a larger area covered.

Car and transit, on the other hand, are completely different stories. The car polygon bands are, aside from being significantly larger, much more distorted as the cars move on and off highways or into smaller side streets and this creates long stretched reachable lines along major roads. We are also more likely to see holes in the polygons or sudden cutoffs in reachability as we interact with places a car cannot go (such as parks) or infrastructure with limited entrances (for example large stadiums or airports).

Transit polygons create shapes unlike any other travel mode. A mixture of trains, buses, or even simply walking creates pockets of disconnected or overlapping polygons for each band based on the position of transit stops. The separation and distortion of the polygons gets progressively more pronounced the further away from the source. This is also the most time sensitive of the travel types as a difference of only a few minutes can determine whether one can get to a specific bus or train in time to use a specific route. All of these factors and more can be adjusted in the options of the request. This will be covered in more detail further on, but first lets look at requests with more than one source.

## Multi-Source Polygons and Polygon Intersections

Multi-source polygons allow for a much detailed investigation of reachability. Maybe you are looking for amenities reachable from both your home and an office, analyzing the coverage area of location networks (shops, transit stops, public parks, etc) or maybe just finding the easiest place for groups from several locations to meet. We can easily create polygons with more than one source, but how these sources interact with each other depends on the `intersectionMode`. If not set this defaults to `union`. I will explain each of the intersection modes later, for now create a new file in the `javascript` folder called `polygon-intersection.js` and copy all the code from `polygon.js` into it. Do the same with `polygon.html` to create `polygon-instersection.html` and update it to point towards the correct JavaScript file. Now let's start changing this to deal with multiple sources. For this example I will use 2 sources. First we want to define 2 sets of coordinates and add the `intersectionMode` parameter to the options

```javascript
// Create the source points and polygon range bands
const lnglat1 = [13.4016, 52.5116];
const lnglat2 = [13.3756, 52.5093];
const coordinates = [lnglat1, lnglat2]
const travelTimes = [300, 600, 900, 1200, 1500, 1800];

// Define the options for the polygon service
const options = {
    travelType: 'bike',
    travelEdgeWeights: travelTimes,
    edgeWeight: 'time',
    srid: 4326,
    intersectionMode: "union",
    serializer: 'geojson',
    simplify: 200,
    quadrantSegments : 6,
    buffer: 0.002
};
```

Next we need to create an arrays of both markers and sources from these coordinate pairs. First for the markers we simply need to derive the makers from the coordinates list and add all of them to the map. Replace the assignment of `marker` with the following.
```javascript
//Create the map markers using our source coordinates and make them draggable
const marker1 = new mapboxgl.Marker({ draggable: true }).setLngLat(lnglat1);
const marker2 = new mapboxgl.Marker({ draggable: true }).setLngLat(lnglat2);
const markers = [marker1, marker2]
```

Now, like before we will use the markers to derive the sources so they update on drag. This time we will create an array of sources to pass to the polygon method but this otherwise the same as before.

```javascript
// Build the source array
function getSources(markers) {
    let sourceArray = []
    let i = 0
    for (let marker of markers) {
        sourceArray.push({
            // All sources should have unique ids
            id : `source-${i++}`,
            lng: marker.getLngLat().lng, 
            lat: marker.getLngLat().lat
        })
    }
    return sourceArray;
}

// Perform the polygon request and update the map using the result
async function getPolygons() {
    let sources = getSources(markers);
    client.polygons.fetch(sources, options).then((geojsonPolygons) => {
        map.getSource('polygon').setData(geojsonPolygons);
        map.fitBounds(turf.bbox(geojsonPolygons), { padding: 20 });
    });
}
```

Finally add the array of markers to the map where before you added just one.

```javascript
// Update the map
for (let marker of markers) {
    marker.on('dragend', getPolygons).addTo(map);
}
```

There you have it, a multi-source polygon that should look something like this.

<img src="https://www.targomo.com/wp-content/uploads/2021/06/walk-union-no-buttons.png" alt="drawing" width="80%"/>


Here we are using the default intersection mode, `union`. In this mode all polygons generated will be combined, with the source with the closed range bands having highest priority. This is used to define the `closest reachable area from any source`, and is useful for figuring what areas are reachable from any of a number of locations such as the coverage area for a collection of store. There are two other intersection modes; `average` and `intersection`. As you would image `average` provides the average reachability from all sources, this is most useful for calculating the "most reachable" area from all your source. This could be used to simply find a convenient meet-up space or to pinpoint the best place for a supply warehouse from a group of retailers. `intersection`, on the other hand, only shows the area that is reachable from **all** sources with the longest distance taking precedence over all other values. This could be used, for example, to define an area reachable from both your house and workplace. For both these modes we need to be careful as if any two sources are too far away from each other we could very easily get no polygon returned. We want to be able to switch between these intersection modes so we need to add buttons as we did for travel types. Luckily we can replicate and re-use most of what we did before. First add the HTML and CSS.

```html 
<!-- Buttons to change the intersection mode -->
<div class="markers intersection">
    <div data-mode="union" class="marker-container mode active">
        <span class="tgm-icon tgm-ux-union"></span>
        <span class="tooltiptext">Union</span>
    </div>
    <div data-mode="average" class="marker-container mode">
        <span class="tgm-icon tgm-ux-average"></span>
        <span class="tooltiptext">Average</span>
    </div>
    <div data-mode="intersection" class="marker-container mode">
        <span class="tgm-icon tgm-ux-intersect"></span>
        <span class="tooltiptext">Intersection</span>
    </div>
</div>
```

```css
.intersection {
    position: absolute;
    bottom: 10px;
    left: 10px;
}

.intersection .marker-container .tooltiptext {
    position: absolute;
    bottom: 70px;
}
```

To avoid on part of the map being overcrowded with UI elements I placed the intersection mode buttons in the bottom left of the screen so the only CSS we need to add is a few lines to control positioning. For the HTML we have switched to using `data-mode` instead of `data-type` and added a new class `mode`. This will help us differentiate the two button sets in the JavaScript. Now we just need to add the new update methods.

```javascript
// Add update on click for intersection mode buttons
const intersectionModes = document.querySelectorAll(".marker-container.mode");
for (let mode of intersectionModes) {
    mode.onclick = function () {
        updateButton(mode, intersectionModes, updateIntersectionMode);
    };
}

// Update the intersection mode
function updateIntersectionMode(mode) {
    options.intersectionMode = mode.dataset.mode;
    console.log(`IntersectionMode updated to ${options.intersectionMode}`)
    getPolygons();
}
```

Now you should have another set of buttons to configure the polygons that looks like this.

<img src="https://www.targomo.com/wp-content/uploads/2021/06/walk-union.png" alt="drawing" width="80%"/>

Okay so now lets look at what `intersection` and `average` would look like with these same points.

<img src="https://www.targomo.com/wp-content/uploads/2021/06/walk-intersection.png" alt="drawing" width="40%"/>
<img src="https://www.targomo.com/wp-content/uploads/2021/06/walk-average.png" alt="drawing" width="40%"/>

As shown here `intersection` provides useful insights into the areas reachable (both most reachable as will as reachable at all) from **all** points. `average` on the other hand gives us a view of the "most reachable" areas from our given source points. For users looking to perform more advanced aggregations on the reachable areas of a number of points you can also look into using Targomo's [Multigraph API](https://docs.targomo.com/#/Multigraph%20API).

## Filtering using Polygons

When displaying a group of locations to a viewer (maybe a customer, a business associate or just as part of a larger presentation) you may want to filter your target locations based on their reachability to one or more sources. Targomo's APIs offer several methods that can achieve this, each with their own contextual advantages and disadvantages. The most [Travel Time API](https://www.targomo.com/developers/apis/travel_time/) would probable provide the most precise results for filtering targets as you can filter on and check precise timing, but for this example we will look at how to use polygons to filter target locations. In this example we will be trying to find all houses reachable from a selection of beaches on the Italian cost. This may be useful for those seeking property in the area or maybe just holiday makers finding a place to stay. The same principles used here could also just as easily be applied to, for example, seeing how many outlet stores are in the catchment area of a selection or warehouses.

We will be using some publicly available data for sources and targets and then filter them using one polygon range band. Highly complex filtering can be achieved such as changing display depending on which of a number of range bands the target lands in or dynamically filter targets as they enter or leave a location, but in this case we will be simply be generating a single polygon from a selection of sources and filtering out all targets not contained within the polygon. We will be using `d3js` to filter the targets as well as a a custom targomo progress bar so our dependencies will look a little different for this file. Like before you will need to create two files `polygon-filtering.html` and `javascript/polygon-filtering.js`. The `polygon-filtering.html` is a bit different from the rest and should look something like this.

```html
<!DOCTYPE html>
<html>
    <head>
        <!--  Include mapboxgl javascript and css -->
        <script src='https://api.tiles.mapbox.com/mapbox-gl-js/v1.6.0/mapbox-gl.js'></script>
        <link href='https://api.tiles.mapbox.com/mapbox-gl-js/v1.6.0/mapbox-gl.css' rel='stylesheet'>
        <!--  Include Geojson Filtering  -->
        <script src="https://d3js.org/d3.v5.min.js"></script>
        <!--  Include micro progress bar  -->
        <script src="https://www.targomo.com/developers/scripts/mipb.min.js"></script>
        <!--  Include targomo core -->
        <script src='https://releases.targomo.com/core/0.4.3.js'></script>
        <link rel="stylesheet" href="style/maps.css" />
        <title>TGM Maps - Travel Times</title>
    </head>
    <body>
        <!--  where the map will live  -->
        <div id='map'></div>
        <!-- Time filter bar -->
        <div id="filter">
            <div>Time (m)</div>
            <input id="travel-time-bar" type="range" min="0" max="60" value="30" name="time" step="1"
                onchange="rangevalue.value=value; filterPoints(value)" />
            <output id="rangevalue">30</output>
        </div>

        <script src="javascript/polygon-filtering.js"></script>
    </body>
</html>  
```

The display is very simple here and all the 'filtering' will be handled by MapBox so we only need to add some small CSS for our range bar.

```CSS
#filter {
    position: absolute;
    margin: 10px;
    font-family: 'Open Sans', sans-serif;
    bottom: 0;
    display: flex;
    align-items: center;
    padding: 5px 8px;
    background: white;
}
```

The range bar will be used so we can adjust the time range of the filtering polygon. We will use a range of 0-1 hour with 1 minute steps. The JavaScript will also be quite different as we will want to dynamically adjust the size of the polygons and recover the sources and targets from a public source. First we want to set up all the variables we will need very just as we did last time.

```javascript
// create targomo client
const client = new tgm.TargomoClient('westcentraleurope', '__Your_Targomo_API_Key__');

// OSM public beaches dataset
const beachurl = 'https://raw.githubusercontent.com/targomo/data-exports/master/overpass/beach_public_lerici.geojson';
// OSM building=house dataset
const houseurl = 'https://raw.githubusercontent.com/targomo/data-exports/master/overpass/building_house_lerici.geojson';

// Fill the data  arrays
// The data as recieved
let beaches = []
let houses = []
// Beaches transformed into sources for the polygon request
let sources = []
// Houses transformed into targets for the map
let targets = []
let travelTimes = [30 * 60];
retrieveData();

// Define the options for the polygon service
const options = {
    travelType: 'walk',
    edgeWeight: 'time',
    intersectionMode: "union",
    travelEdgeWeights: travelTimes,
    srid: 4326,
    serializer: 'geojson',
    simplify: 200,
    quadrantSegments : 6,
    buffer: 0.002
};

// Mapbox Parameters and the micro progress bar
const attributionText = `<a href="https://www.targomo.com/developers/resources/attribution/" target="_blank">&copy; Targomo</a>`;
const emptyData = { 'type': 'FeatureCollection', 'features': [] };
const pBar = new mipb({ fg: "#FF8319" });

// Add the map
const map = new mapboxgl.Map({
    container: 'map',
    style: 'https://api.maptiler.com/maps/streets/style.json?key=__Your_MapTiler_API_Key__',
    zoom: 13.5, 
    center: [9.918, 44.08], 
    attributionControl: false
})
    .addControl(new mapboxgl.NavigationControl())
    .addControl(new mapboxgl.AttributionControl({ compact: true, customAttribution: attributionText }));
```

Much of this is identical to what we have defined before with only a few changes and new additions. The map is made in pretty much the same way before with the center set directly instead of using a source coordinate. Of the two data URLs present we will use the beaches for the sources and the houses as the targets. Lastly the progress bar will be used to show when data is being loaded. Now lets create the methods we will need to retrieve and process this data. Firstly the source and target data needs to be retrieved.

```javascript
// Retrieve the OSM data and update the sources/targets
async function retrieveData() {
    beaches = await fetch(beachurl).then(async (data) => {
        return await data.json();
    })
    houses = await fetch(houseurl).then(async (data) => {
        return await data.json();
    })
    // create formatted 'sources' for analysis
    sources = beaches.features.map((beach) => {
        return {
            id: beach.properties['@id'],
            lng: beach.geometry.coordinates[0],
            lat: beach.geometry.coordinates[1]
        }
    });

    // Create formatted 'targets' for analysis
    targets = {
        type: 'FeatureCollection',
        features: houses.features.map((house) => {
            return {
                type: 'Feature',
                properties: {
                    id: house.properties['@id'],
                    contained: true,
                },
                geometry: {
                    type: 'Point',
                    coordinates: [house.geometry.coordinates[0], house.geometry.coordinates[1]]
                }
            }
        })
    }
}

// Perform the polygon request and update the map using the result
async function getPolygons() {
    return client.polygons.fetch(sources, options).then((geojsonPolygons) => {
        map.getSource('polygon').setData(geojsonPolygons);
        return geojsonPolygons;
    });
}
```

Here we create the sources and targets differently since we need sources for the polygon request while the targets will be used by the map. We add a property `contained` for the targets which will be used to flag those that are within the generated polygons. The polygon request itself remains mostly unchanged from the multi-source requests. In this case we make the source list beforehand and we expect them to be both static in position and number so we don't need to dynamically create or update them like in previous examples. Finally we actually want to perform the filtering.

```javascript
// Retrieve the polygon and use it to filter the target houses
async function filterTargets(houses) {
    let polygons = await getPolygons();

    // Update the point if contained
    for (let point of targets.features) {
        if (!d3.geoContains(polygons, point.geometry.coordinates)) {
            point.properties.contained = false;
        } else {
            point.properties.contained = true;
        }
    }
    
    // Move the sources to the top for easier viewing
    map.moveLayer('beaches')

    // Update map-source with updated filter parameters for targets
    map.getSource('targets').setData(targets);
    pBar.hide();
}

// Update the polygon size and re-filter
function filterPoints(minutes) {
    pBar.show();
    travelTimes = [minutes * 60];
    options.travelEdgeWeights = travelTimes;
    filterTargets(houses);
}
```

As shown here we used the polygon from the response alongside the `geoConatins` method from `d3js` to check for contained coordinates and update the value of the `contained` property accordingly. Once done all we need to do is update the sources (to keep them above the polygon when displayed on the map) and targets, then hide the progress bar to indicate we're done. Similar to the buttons from the other examples, the filter can be used to update the display except this time we update the `travelTimes` of the polygon rather than the `travelType`. Finally we just need to create the map. This will be a bit more complicated as we have a few more layers to handle this time.


```javascript
// Update the map and start the progress bar
map.scrollZoom.disable();
pBar.show();

// Retrieve and process the data
retrieveData();

map.on('load', () => {
// find the first symbol layer
const firstSymbolLayer = map.getStyle().layers.find(l => l.type === 'symbol');

// Polygon layer
map.addSource('polygon', {
    'type': 'geojson',
    'data': emptyData
})
map.addLayer({
    'id': 'polygons',
    'type': 'fill-extrusion',
    'layout': {},
    'source' : 'polygon',
    'paint': {
        'fill-extrusion-base': 0,
        'fill-extrusion-height': {
            'property': 'time',
            'stops': [[travelTimes[0], 10]]
        },
        'fill-extrusion-color': {
            'property': 'time',
            'stops': [[travelTimes[0], "#006837"]]
        },
        'fill-extrusion-opacity': .5
    }
});

// Source Points layer for the beaches
map.addSource('sources', {
    "type": "geojson",
    "data": { type: 'FeatureCollection', features: [] }
});
map.addLayer({
    "id": "beaches",
    "type": "circle",
    "source": 'sources',
    'paint': {
        'circle-radius': 7,
        'circle-color': '#DAA520',
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#fff'
    }
}, firstSymbolLayer.id);

// Two layers for targets, one reachable one not. Shared source with different filters
map.addSource('targets', {
    "type": "geojson",
    "data": { type: 'FeatureCollection', features: [] }
});
// Reachable houses - blue
map.addLayer({
    'id': 'houses-reachable',
    'type': 'circle',
    'source': 'targets',
    'filter': ['==', 'contained', true],
    'paint': {
        'circle-radius': {
            'base': 1.75,
            'stops': [[12, 2], [22, 180]]
        },
        'circle-color': '#0000FF',
        'circle-opacity' : 0.7
    }
}, 'beaches');
// Unreachable houses - red and more transparent
map.addLayer({
    'id': 'houses-unreachable',
    'type': 'circle',
    'source': 'targets',
    'filter': ['==', 'contained', false],
    'paint': {
        'circle-radius': {
            'base': 1.75,
            'stops': [[12, 2], [22, 180]]
        },
        'circle-color': '#FF0000',
        'circle-opacity' : 0.2
    }
}, 'houses-reachable');

map.getSource('sources').setData(beaches);
map.getSource('targets').setData(houses);

filterTargets(houses);
})
```

Here the map has 4 layers. One each for the polygons and sources while two layers for targets so we can differentiate reachable and unreachable targets. In actual use cases (such as housing/office searches) you may want to simple exclude polygons and unreachable locations from the map to present a more clean and understandable view. Here I have kept each layer to better represent what is actually happening. Now that it's done let's take a look at the filtering our filter map for 15, 30 and 45 minutes.

<img src="https://www.targomo.com/wp-content/uploads/2021/06/filtering-15.png" alt="drawing" width="80%"/>
<img src="https://www.targomo.com/wp-content/uploads/2021/06/filtering-30.png" alt="drawing" width="40%"/>
<img src="https://www.targomo.com/wp-content/uploads/2021/06/filtering-45.png" alt="drawing" width="40%"/>


## Advanced Isochrone usage

With the three examples above I hope to have given a good starting point to begin using Targomo's Isochrone API to visualize and investigate location reachability. Before we conclude I wanted to take a moment to briefly talk about some of the more advanced control offered when analyzing reachability that didn't quite fit in any of the above sections.

For each travel type (car, walk, bike and transit) there are a number of factors that can dramatically alter the travel time and can be used to fine tune your requests when examining very specific scenarios. The most in depth explanations and documentation can all be found in the [REST documentation](https://docs.targomo.com/). Direct requests can be used instead of the JavaScript library and, although they lacks some of the conveniences, are useful if you need more precise or in-depth control than the library allows.

When traveling by car, the presence of traffic lights or intersections can make a significant different to a journey. when traveling by car 4 options (`trafficJunctionPenalty`, `trafficSignalPenalty`, `trafficLeftTurnPenalty` and `trafficRightTurnPenalty`) can each be specified and tweaked to your own specifications allowing for more contextually accurate analysis for drivers inside and outside cities or across countries. These can be combined with `travelTimeFactors`, a list of adjustment factors that can be used to modify speeds listed edge types (e.g. a 50% reduction in time for highways, penalties for small side roads, etc), to give extremely granular control over road movement speeds.

For bike and car, which also allow the above penalties to be specified, users may find that their own travel speed (and thus time to location) is vastly different from that used by default in the API. While these are assumed by default as 15km/h for bike and 5km/h for walk, you can adjust these values to match personal travel speeds. You can also add 'penalty' modifiers to affect moving up/downhill. The Uphill penalty specifies how much a distance is increase per one meter increase in elevation thus, an uphill penalty of 20 means that per one meter increase in elevation the distance is increased by 20 meters. Downhill is the same so if you wish to reduce the distance you can use a negative modifier.

Transit probably offers the most in depth control, including transfer limits, max distance from source/target, and frame duration. Probably the most obvious control required for public transit of any kind is time and date. For the Targomo APIs this is handled by `transitFrameDate` and `transitFrameTime` respectively. Both take in integers with date using a `YYYYMMDD` format (so the 1st of June 2021 would be 20210601) while time can be specified as number of seconds past midnight (3am would be 10800, 10am is 36000, 14:30 is 52200 and so on).

### Beyond Isochrones

The examples I have provided above are by no means a comprehensive list of everything the Isochrone API, let alone the entire Targomo API suite, is capable of. We offer several other APIs each of which, as mentioned briefly in the filtering section, has its own advantages and disadvantages. Probably the most obvious is the lack of detail. Yes a target may be within the polygon but exact details on how to get there or precise travel times/distances are missing. For a further look at these I encourage you to check out the Targomo [Travel Time](https://www.targomo.com/developers/apis/travel_time/) or [Route](https://www.targomo.com/developers/apis/routing/) APIs. You can also look at how reachability can be used in Targomo's more powerful APIs. Qualitative location evaluation from the [Statistics](https://www.targomo.com/developers/apis/statistics_context/) or [Point of Interest](https://www.targomo.com/developers/apis/places_context/) APIs, precise network aggregation and analysis via the [Multigraph API](https://www.targomo.com/developers/apis/multigraph/) or advanced logistical constraint solving using the [Fleet API](https://www.targomo.com/developers/apis/fleet/).

For a look at a much more advanced version of the examples displayed here and much more I encourage you to check out this [Demo App](https://app.targomo.com/demo/#!/) as it can provide examples for single and multi-source polygons as well as sources to targets routing.


## Conclusion

Targomo Offers a powerful and flexible GeoSpatial tool with the Isochrone API. The generated polygons can be easily integrated into map displays create an easy to understand visualizations for end users. This can help with a number of use-cases such as analyzing the reachable area of a new home, finding the most reachable location for a new office, or determining if the catchment area of a single warehouse covers all target locations. Hopefully the example I have provided allow you to start creating your own mapping tools. You can grab your own Targomo API key and start trying out these examples for yourself. I hope you adapt and expand on the examples here to explore more potential use cases and create visualization tools, search filters and more.

