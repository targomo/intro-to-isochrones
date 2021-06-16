// create targomo client
const client = new tgm.TargomoClient('westcentraleurope', 'iWJUcDfMWTzVDL69EWCG');

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
let travelTimes = [30 * 60];

// Define the options for the polygon service
const options = {
    travelType: 'walk',
    edgeWeight: 'time',
    intersectionMode: "union",
    travelEdgeWeights: travelTimes,
    srid: 4326,
    serializer: 'geojson',
    simplify: 200,
    quadrantSegments: 6,
    buffer: 0.002
};

// Mapbox Parameters and the micro progress bar
const attributionText = `<a href="https://www.targomo.com/developers/resources/attribution/" target="_blank">&copy; Targomo</a>`;
const emptyData = { 'type': 'FeatureCollection', 'features': [] };
const pBar = new mipb({ fg: "#FF8319" });

// Add the map
const map = new mapboxgl.Map({
    container: 'map',
    style: 'https://api.maptiler.com/maps/streets/style.json?key=FQs2dRvhbXvLsmvDRxxJ',
    zoom: 13.5, 
    center: [9.918, 44.08], 
    attributionControl: false
})
    .addControl(new mapboxgl.NavigationControl())
    .addControl(new mapboxgl.AttributionControl({ compact: true, customAttribution: attributionText }));


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

// Retrieve the polygon and use it to filter the target houses
async function filterTargets(houses) {
    let polygons = await getPolygons();

    // // Update the point if contained
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
