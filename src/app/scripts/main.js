let fromCoordinates = []
let toCoordinates = []
let fromAddress = ""
let toAddress = ""
let layerGroups = {}

let map = L.map('map', {
    center: [56.2702914, 10.1681083],
    zoom: 8,
})

let baseTileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map)

let markerLayerGroup = L.layerGroup()
markerLayerGroup.addTo(map)

let layerControl = L.control.layers({"Kort": baseTileLayer})

dawaAutocomplete.dawaAutocomplete(document.getElementById("from-address"), {
    select: function(selected) {
        fromCoordinates[0] = selected.data.x
        fromCoordinates[1] = selected.data.y
        fromAddress = selected.tekst
    }
});

dawaAutocomplete.dawaAutocomplete(document.getElementById("to-address"), {
    select: function(selected) {
        toCoordinates[0] = selected.data.x
        toCoordinates[1] = selected.data.y
        toAddress = selected.tekst
    }
});

async function navigate() {
    if (fromCoordinates[0] == undefined || fromCoordinates[1] == undefined||
        toCoordinates[0] == undefined || toCoordinates[1] == undefined) {
            console.debug("Not all coordinates are present. Returning.")
            return
        }

    let response = await fetch("/route", {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(constructBody())
    })

    let json = await response.json()
    drawRoutes(json)
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
        "travelMode": "DRIVE",
        "polylineEncoding": "GEO_JSON_LINESTRING",
        "polylineQuality": "OVERVIEW",
        "computeAlternativeRoutes": true
    }
}

function drawRoutes(root) {
    clearRoutes()

    drawStartLocation(root)
    drawEndLocation(root)

    let i = 0;
    let isPrimaryRoute = true
    let colors = ["#036AC4", "#BF40BF", "#097969"]

    while (i < root.routes.length) {
        let layerGroup = drawRoute(root.routes[i], isPrimaryRoute, colors[i])
        layerGroups[`<span style="color:${colors[i]};font-weight:bold">${metersToKilometers(root.routes[i].distanceMeters)} km (${secondsToHoursAndMinutes(root.routes[i].duration)})</span>`] = layerGroup
        isPrimaryRoute = false
        i++
    }

    layerControl = L.control.layers(layerGroups, {}, {
        collapsed: false,
        position: "bottomleft"
    })

    layerControl.addTo(map)
}

function drawStartLocation(root) {
    let startLocationMarker = 
        L.marker(
            [root.routes[0].legs[0].startLocation.latLng.latitude,
            root.routes[0].legs[0].startLocation.latLng.longitude])

    startLocationMarker.bindPopup(fromAddress).openPopup();
    markerLayerGroup.addLayer(startLocationMarker)
}

function drawEndLocation(root) {
    let endLocationMarker = 
        L.marker(
            [root.routes[0].legs[0].endLocation.latLng.latitude,
            root.routes[0].legs[0].endLocation.latLng.longitude])

    endLocationMarker.bindPopup(toAddress).openPopup()
    markerLayerGroup.addLayer(endLocationMarker)
}

function drawRoute(route, isPrimaryRoute, color) {
    let polyLineLatLngs = []
    let stepStarts = []

    let routeLayerGroup = L.layerGroup()
    if (isPrimaryRoute) routeLayerGroup.addTo(map)

    route.legs[0].steps.forEach(step => {
        step.polyline.geoJsonLinestring.coordinates.forEach(coordinate => {
            polyLineLatLngs.push([coordinate[1], coordinate[0]])
        }) 

        stepStarts.push(
            [
                step.polyline.geoJsonLinestring.coordinates[0][1],
                step.polyline.geoJsonLinestring.coordinates[0][0],
                step.navigationInstruction.instructions
            ]
        )
    })

    let polyline = L.polyline(polyLineLatLngs, {
        color: color
    })
    
    routeLayerGroup.addLayer(polyline)

    stepStarts.forEach(start => {
        let circle = L.circle([start[0],start[1]],
            {
                radius: 5,
                color: color,
                fillColor: "#FFFFFF",
                fillOpacity: 1
            }
        )

        circle.bindPopup(start[2])
        routeLayerGroup.addLayer(circle)
    })

    if (isPrimaryRoute) map.fitBounds(polyline.getBounds())
    return routeLayerGroup
}

function clearRoutes() {
    layerControl.remove()
    markerLayerGroup.clearLayers()

    for (let group in layerGroups) {
        layerGroups[group].clearLayers()
    }

    layerGroups = {}
}

function metersToKilometers(meters) {
    return (meters / 1000).toFixed(2)
}

function secondsToHoursAndMinutes(duration) {
    let d = parseInt(duration.split("s")[0])
    let hours = Math.floor(d / 3600)
    let minutes = Math.floor(d % 3600 / 60)
    let seconds = Math.floor(d % 3600 % 60)

    return `${hours}h${minutes}m${seconds}s`
}