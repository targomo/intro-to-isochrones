// Create targomo client and coordinates
const client = new tgm.TargomoClient('westcentraleurope', '__Your_Targomo_API_Key__')

// Create the source points and polygon range bands
const lnglat1 = [13.4016, 52.5116];
const lnglat2 = [13.3756, 52.5093];
const coordinates = [lnglat1, lnglat2, lnglat2]
const travelTimes = [300, 600, 900, 1200, 1500, 1800];

// Define the options for the polygon service
const options = {
    travelType: 'walk',
    travelEdgeWeights: travelTimes,
    edgeWeight: 'time',
    srid: 4326,
    intersectionMode: "union",
    serializer: 'geojson',
    simplify: 200,
    quadrantSegments: 6,
    buffer: 0.002
};

// Mapbox Parameters 
const timeColors = ['#006837', '#39B54A', '#8CC63F', '#F7931E', '#F15A24', '#C1272D'];
const emptyData = { 'type': 'FeatureCollection', 'features': [] };
const attributionText = `<a href="https://www.targomo.com/developers/resources/attribution/" target="_blank">&copy; Targomo</a>`;

//Create the map markers using our source coordinates and make them draggable
const markers = []
for (let coordinate of coordinates) {
    markers.push(new mapboxgl.Marker({ draggable: true }).setLngLat(coordinate));
}

const map = new mapboxgl.Map({
    container: 'map',
    style: 'https://api.maptiler.com/maps/streets/style.json?key=__Your_MapTiler_API_Key__',
    zoom: 12,
    center: lnglat1,
    attributionControl: false
})
    .addControl(new mapboxgl.NavigationControl())
    .addControl(new mapboxgl.AttributionControl({ compact: true, customAttribution: attributionText }));

// Add update on click for travel type buttons
const travelTypes = document.querySelectorAll(".marker-container.type");
for (let type of travelTypes) {
    type.onclick = function () {
        updateButton(type, travelTypes, updateTravelType);
    };
}

// Add update on click for intersection mode buttons
const intersectionModes = document.querySelectorAll(".marker-container.mode");
for (let mode of intersectionModes) {
    mode.onclick = function () {
        updateButton(mode, intersectionModes, updateIntersectionMode);
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

// Update the intersection mode
function updateIntersectionMode(mode) {
    options.intersectionMode = mode.dataset.mode;
    console.log(`IntersectionMode updated to ${options.intersectionMode}`)
    getPolygons();
}

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

// Height stops function
function getHeightPolygons(travelTimes, heightFactor) {
    return [
        [travelTimes[0], travelTimes.length * (10 * heightFactor)],
        [travelTimes[travelTimes.length - 1], travelTimes.length * heightFactor]
    ]
}

// Color stop function
function getColorPolygons(times, colors) {
    const colorsConfig = times.map((time, idx) => {
        return [times[idx], colors[idx]];
    });
    return colorsConfig;
}

// Update the map
for (let marker of markers) {
    marker.on('dragend', getPolygons).addTo(map);
}
map.scrollZoom.disable();

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
    // Get the intial polygons and mark the default buttons as selected
    getPolygons();
})