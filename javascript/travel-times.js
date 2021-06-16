// create targomo client
const client = new tgm.TargomoClient('westcentraleurope', '__Your_Targomo_API_Key__');
// define map center and search source
const lnglat = [9.918, 44.08];
const travelTimes = [300, 600, 900, 1200, 1500, 1800];

// define some options for the reachability service
const options = {
    travelType: 'walk',
    maxEdgeWeight: 30 * 60,
    edgeWeight: 'time'
};

const attributionText = `<a href="https://www.targomo.com/developers/resources/attribution/" target="_blank">&copy; Targomo</a>`;

// set the progress bar
const pBar = new mipb({ fg: "#FF8319" });
pBar.show();

// add the map and set the center
const map = new mapboxgl.Map({
    container: 'map',
    style: 'https://api.maptiler.com/maps/streets/style.json?key=__Your_MapTiler_API_Key__',
    zoom: 13.5, 
    center: lnglat, 
    attributionControl: false,
}).addControl(
    new mapboxgl.NavigationControl()
).addControl(
    new mapboxgl.AttributionControl({ compact: true, customAttribution: attributionText })
);

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
    dataInit();
}

// disable scroll zoom
map.scrollZoom.disable();

map.on('load', () => {
    // find the first symbol layer
    const firstSymbolLayer = map.getStyle().layers.find(l => l.type === 'symbol');
    // add empty source
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

    // add empty source
    map.addSource('targets', {
        "type": "geojson",
        "data": { type: 'FeatureCollection', features: [] }
    });
    // reachable houses
    map.addLayer({
        'id': 'houses-reachable',
        'type': 'circle',
        'source': 'targets',
        'filter': ['<', 'travelTime', 30 * 60],
        'paint': {
            'circle-radius': {
                'base': 1.75,
                'stops': [[12, 2], [22, 180]]
            },
            'circle-color': {
                'property': 'travelTime',
                'stops': [
                    [360, '#1a9641'],
                    [720, '#a6d96a'],
                    [1080, '#ffffbf'],
                    [1440, '#fdae61'],
                    [1800, '#d7191c']
                ]
            },
        }
    }, 'beaches');
    // unreachable houses, symbolized gray
    map.addLayer({
        'id': 'houses-unreachable',
        'type': 'circle',
        'source': 'targets',
        'filter': ['>=', 'travelTime', 30 * 60],
        'paint': {
            'circle-radius': {
                'base': 1.75,
                'stops': [[12, 2], [22, 180]]
            },
            'circle-color': '#aaa'
        }
    }, 'houses-reachable');

    // go get the actual data
    dataInit();
})

async function dataInit() {
    const beachurl = 'https://raw.githubusercontent.com/targomo/data-exports/master/overpass/beach_public_lerici.geojson';
    const houseurl = 'https://raw.githubusercontent.com/targomo/data-exports/master/overpass/building_house_lerici.geojson';

    // get OSM public beaches dataset
    const beaches = await fetch(beachurl).then(async (data) => {
        return await data.json();
    })

    // update map
    map.getSource('sources').setData(beaches);

    // get OSM building=house dataset
    const houses = await fetch(houseurl).then(async (data) => {
        return await data.json();
    })

    // update map
    map.getSource('targets').setData(houses);

    // calculate reachability of houses from beaches
    getReachability(beaches, houses);
}

function getReachability(beaches, houses) {
    // create formatted 'sources' for analysis
    const sources = beaches.features.map((beach) => {
        return {
            id: beach.properties['@id'],
            lat: beach.geometry.coordinates[1],
            lng: beach.geometry.coordinates[0]
        }
    });

    // create formatted 'targets' for analysis
    const targets = houses.features.map((house) => {
        return {
            id: house.properties['@id'],
            lat: house.geometry.coordinates[1],
            lng: house.geometry.coordinates[0]
        }
    });

    // calculate reachability of houses from beaches
    client.reachability.combined(sources, targets, options).then((reachability) => {
        // only consider the minimum travel time
        const combinedReach = {};
        targets.forEach(place => combinedReach[String(place.id)] = -1);
        reachability.forEach(target => {
            const id = String(target.id)
            if (!combinedReach[id]) {
                console.warn('NOT FOUND', String(target.id))
            } else {
                if (target.travelTime > -1) {
                if (combinedReach[id] > -1) {
                    combinedReach[id] = Math.min(combinedReach[id], target.travelTime)
                } else {
                    combinedReach[id] = target.travelTime
                }
                }
            }
        })
        // map targets to travel times
        const reach = { 
            type: 'FeatureCollection', 
            features: targets.map(place => {
                let location = {
                    type: "Feature",
                    properties: {
                        travelTime: combinedReach[String(place.id)] > -1 ? 
                            combinedReach[String(place.id)] : 
                            30 * 60 + 1
                    },
                    geometry: {
                        type: "Point",
                        coordinates: [place.lng, place.lat]
                    }
                }
                return location
            })
        }

        // update source with travel-time augmented data
        map.getSource('targets').setData(reach);
        pBar.hide();
    })
}

function filterPoints(minutes) {
    // update the map filter to update symbolization based on range value
    map.setFilter('houses-reachable', ['<', 'travelTime', minutes * 60]);
    map.setFilter('houses-unreachable', ['>=', 'travelTime', minutes * 60 + 1]);
}