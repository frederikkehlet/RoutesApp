let fromCoordinates = [];
let toCoordinates = []

let map = L.map('map').setView([56.2702914, 10.1681083], 8);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

let layerGroup = L.layerGroup()
layerGroup.addTo(map)

dawaAutocomplete.dawaAutocomplete(document.getElementById("from-address"), {
    select: function(selected) {
        console.log(selected)
        fromCoordinates[0] = selected.data.x;
        fromCoordinates[1] = selected.data.y;
    }
});

dawaAutocomplete.dawaAutocomplete(document.getElementById("to-address"), {
    select: function(selected) {
        console.log(selected)
        toCoordinates[0] = selected.data.x;
        toCoordinates[1] = selected.data.y;
    }
});

async function navigate() {
    console.log(`Navigating from (${fromCoordinates[0]},${fromCoordinates[1]}) to (${toCoordinates[0]},${toCoordinates[1]})`);
    let response = await fetch("/route", {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(constructBody())
    })
    let route = await response.json()
    console.log(route)
    drawRoute(route)
}

function constructBody() {
    return {
        "origin":  {
            "location": {
                "latLng": {
                    "latitude": fromCoordinates[1],
                    "longitude": fromCoordinates[0]
                }
            }
        },
        "destination": {
            "location": {
                "latLng": {
                    "latitude": toCoordinates[1],
                    "longitude": toCoordinates[0]
                }
            }
        },
        "polylineEncoding": "GEO_JSON_LINESTRING"
    }
}

function drawRoute(route) {
    clearRoute()
    // Add marker for start location to map

    let startLocationMarker = 
        L.marker(
            [route.routes[0].legs[0].startLocation.latLng.latitude,
            route.routes[0].legs[0].startLocation.latLng.longitude])

    layerGroup.addLayer(startLocationMarker)

    // Add marker for end location to map
    let endLocationMarker = 
        L.marker(
            [route.routes[0].legs[0].endLocation.latLng.latitude,
            route.routes[0].legs[0].endLocation.latLng.longitude])
    
    layerGroup.addLayer(endLocationMarker)

    let latLngs = []

    // For each step in the route leg, draw a polyline
    route.routes[0].legs[0].steps.forEach(step => {
        console.log(step.polyline.geoJsonLinestring.coordinates)

        step.polyline.geoJsonLinestring.coordinates.forEach(coordinate => {
            latLngs.push([coordinate[1], coordinate[0]])
        }) 
    })

    let polyline = L.polyline(latLngs)
    layerGroup.addLayer(polyline)
    map.fitBounds(polyline.getBounds());
}

function clearRoute() {
    layerGroup.clearLayers();
}