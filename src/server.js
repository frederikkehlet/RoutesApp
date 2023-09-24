const fetch = require("node-fetch")
const express = require("express")
require('dotenv').config()

const app = express();
const port = process.env.PORT;

app.use(express.static(__dirname + "/app"))
app.use(express.json())

app.get("/", (req,res) => {
    res.sendFile(__dirname + "/app/index.html")
})

app.post("/route",(req, res) => {
    console.log(req.body)
    fetch(
        `${process.env.ROUTES_API_ENDPOINT}?key=${process.env.API_KEY}`,
        {
            method: "POST",
            headers: {
                "X-Goog-FieldMask": "routes.duration,routes.legs,routes.distanceMeters,routes.polyline.encodedPolyline"
            },
            body: JSON.stringify(req.body)
        })
    .then(async (response) => {
        let json = await response.json()
        console.log(json)
        res.status(response.status).json(json)
    })
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
