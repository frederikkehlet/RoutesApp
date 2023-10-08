let fromCoordinates = []
let toCoordinates = []
let fromAddress = ""
let toAddress = ""
let layerGroups = {}
let fromAddressInput = document.getElementById("from-address")
let toAddressInput = document.getElementById("to-address")
let cardContainer = document.getElementById("cardContainer")
let routeInformationCard = document.getElementById("routeInformationCard")
let root;

document.addEventListener('contextmenu', event => event.preventDefault());

let map = L.map('map', {
    center: [56.20693178979385, 11.259443541078806],
    zoom: 8,
    zoomControl: false,
    maxBounds: [[
        57.86220623482456,6.439095139962165
    ],[
        54.44486654830236,15.616092030236379
    ]]
})

L.control.zoom({
    position: 'bottomleft'
}).addTo(map);

map.on('click', (e) => {console.debug(e)})

let baseTileLayer = L.tileLayer('https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png', {
    attribution: 
    '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map)

let markerLayerGroup = L.layerGroup()
markerLayerGroup.addTo(map)

let layerControl = L.control.layers({"Kort": baseTileLayer})

dawaAutocomplete.dawaAutocomplete(fromAddressInput, {
    select: function(selected) {
        fromCoordinates[0] = selected.data.x
        fromCoordinates[1] = selected.data.y
        fromAddress = selected.tekst
    }
});

dawaAutocomplete.dawaAutocomplete(toAddressInput, {
    select: function(selected) {
        toCoordinates[0] = selected.data.x
        toCoordinates[1] = selected.data.y
        toAddress = selected.tekst
    }
});

async function navigate() {
    if (fromAddressInput.value == "" 
    || toAddressInput.value == "") {
        return
    }
    
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

function swap() {
    swapInputValues()
    swapCoordinateValues()
    navigate()
}

function swapInputValues() {
    let tempValue = fromAddressInput.value;
    fromAddressInput.value = toAddressInput.value;
    toAddressInput.value = tempValue;

}

function swapCoordinateValues() {
    let tempCoordinates = fromCoordinates
    fromCoordinates = toCoordinates
    toCoordinates = tempCoordinates
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

function drawRoutes(json) {
    root = json
    console.debug(root)
    clearRoutes()

    drawStartLocation(root)
    drawEndLocation(root)

    let i = 0;
    let isPrimaryRoute = true
    let colors = ["#036AC4", "#BF40BF", "#097969"]

    while (i < root.routes.length) {
        let layerGroup = drawRoute(root.routes[i], isPrimaryRoute, colors[i])
        layerGroups[`<span style="cursor:pointer;font-size:17px;" onclick="addRouteToCard(${i})">&#128337<b style="color:${colors[i]};">${secondsToHoursAndMinutes(root.routes[i].duration)}</b> <span style="font-size:15px">(${metersToKilometers(root.routes[i].distanceMeters)} km)</span> </span>`] = layerGroup
        isPrimaryRoute = false
        i++
    }

    layerControl = L.control.layers(layerGroups, {}, {
        collapsed: false,
        position: "topleft"
    })

    layerControl.addTo(map)
    addRouteToCard(0)
}

function drawStartLocation(root) {
    let startLocationMarker = 
        L.marker(
            [root.routes[0].legs[0].startLocation.latLng.latitude,
            root.routes[0].legs[0].startLocation.latLng.longitude],
            {
                icon: L.icon({
                    iconUrl: "../images/pin.png",
                    iconSize: [45,45],
                    iconAnchor: [22.5,45],
                    popupAnchor: [0,-50]
                })
            })

    startLocationMarker.bindPopup(fromAddressInput.value).openPopup();
    markerLayerGroup.addLayer(startLocationMarker)
}

function drawEndLocation(root) {
    let endLocationMarker = 
        L.marker(
            [root.routes[0].legs[0].endLocation.latLng.latitude,
            root.routes[0].legs[0].endLocation.latLng.longitude], 
            {
                icon: L.icon({
                    iconUrl: "../images/red-flag.png",
                    iconSize: [45,45],
                    iconAnchor: [10.5,45],
                    popupAnchor: [0,-50]
                })
            })

    endLocationMarker.bindPopup(toAddressInput.value).openPopup()
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

        if (step.navigationInstruction == undefined) return

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

function addRouteToCard(routeIndex) {
    clearCard()
    console.debug(`Adding route with index ${routeIndex} to card`)
    console.debug(root.routes[routeIndex])

    let selectedRoute = root.routes[routeIndex]
    selectedRoute.legs[0].steps.forEach(step => {
        if (step.navigationInstruction == undefined) return
        
        let instruction = document.createElement("div")
        instruction.setAttribute("style", "padding:15px 0 15px 0;cursor:pointer")
        let divider = document.createElement("fluent-divider")

        instruction.addEventListener("click", () => {
            let latLng = [step.startLocation.latLng.latitude,step.startLocation.latLng.longitude]      
            L.popup(latLng,{content: `<p>${step.navigationInstruction.instructions}</p>`}).openOn(map)
            map.setView(latLng, map.getZoom(), {animate:true, duration: 0.5})
        })

        instruction.innerHTML = `${step.navigationInstruction.instructions} <b>(${metersToKilometers(step.distanceMeters)} km)</b>`
        routeInformationCard.appendChild(instruction)
        routeInformationCard.appendChild(divider)
    })
    cardContainer.setAttribute("style", "display:block")
    cardContainer.scrollTop = 0
}

function clearRoutes() {
    map.closePopup()
    clearCard()
    layerControl.remove()
    markerLayerGroup.clearLayers()

    for (let group in layerGroups) {
        layerGroups[group].clearLayers()
    }

    layerGroups = {}
}

function clearCard() {
    map.closePopup()
    while (routeInformationCard.firstChild) {
        routeInformationCard.removeChild(routeInformationCard.lastChild)
    }
    cardContainer.setAttribute("style", "display:none")
}

function metersToKilometers(meters) {
    return (meters / 1000).toFixed(1)
}

function secondsToHoursAndMinutes(duration) {
    let d = parseInt(duration.split("s")[0])
    let hours = Math.floor(d / 3600)
    let minutes = Math.floor(d % 3600 / 60)

    if (hours == 0) return `${minutes} min`
    return `${hours} t. ${minutes} min`
}