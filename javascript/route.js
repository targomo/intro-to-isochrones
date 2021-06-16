// create targomo client
const client = new tgm.TargomoClient('westcentraleurope', '__Your_Targomo_API_Key__');

// Coordinates to center the map
const source = { lng: 4.335678, lat: 50.841535, id: 'source' };
const target = { lng: 4.392892, lat: 50.840536, id: 'target' };

//Coordinate Markers
const sourceMarker = new mapboxgl.Marker({ draggable: true }).setLngLat(source);
const targetMarker = new mapboxgl.Marker({ draggable: true, color: '#FF8319' }).setLngLat(target);

//Empty Dataset
const emptyData = { 'type': 'FeatureCollection', 'features': [] };

// The travel options used to determine which routes should be searched for
const options = {
    travelType: 'bike',
    maxEdgeWeight: 7200,
    edgeWeight: 'time',
    pathSerializer: 'geojson',
    polygon: {
        srid: 4326
    }
};
const attributionText = `<a href="https://www.targomo.com/developers/resources/attribution/" target="_blank">&copy; Targomo</a>`;;
 
// Add the map and set the initial center to berlin
const map = new mapboxgl.Map({
    container: 'map',
    style: 'https://api.maptiler.com/maps/positron/style.json?key=__Your_MapTiler_API_Key__',
    zoom: 13,
    center: target,
    attributionControl: false
})

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
    getRoute();
}

//Rest Functions
async function getRoute() {
    document.getElementById("message").classList.remove('visible');
    // Requesting routes from the Targomo API.
    const route = await client.routes.fetch(
        [{ ...sourceMarker.getLngLat(), ...{ id: source.id } }],
        [{ ...targetMarker.getLngLat(), ...{ id: target.id } }],
        options);
    if (route && route.length > 0) {
        // only one source-target supplied, so only one route returned
        map.getSource('route').setData(route[0]);
        map.fitBounds(turf.bbox(route[0]), { padding: 20 });
    } else {
        // no routes found
        map.getSource('route').setData(emptyData);
        document.getElementById("message").classList.add('visible');
    }
}

//Setup the map
map.addControl(new mapboxgl.NavigationControl())
   .addControl(new mapboxgl.AttributionControl({ compact: true, customAttribution: attributionText }));

// disable scroll zoom
map.scrollZoom.disable();

//calculate new routes when either source or target moves
sourceMarker.on('dragend', getRoute).addTo(map);
targetMarker.on('dragend', getRoute).addTo(map);

map.on('load', () => {
    // add empty source
    map.addSource('route', {
        'type': 'geojson',
        'data': emptyData
    });
    map.addLayer({
        'id': 'route',
        'type': 'line',
        'source': 'route',
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': [
                'match',
                ['get', 'travelType'],
                'TRANSIT', 'red',
                'WALK', 'green',
                'BIKE', 'blue',
                'gray'
            ],
            'line-width': 4
        },
        'filter': ['==', ['geometry-type'], 'LineString']
    });
    getRoute();
})