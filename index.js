// module to support REST APIs developement.
const express = require('express');
const bodyParser = require('body-parser');
// module to support JSON files parsing and formate confirmation. Used in the POST  request.
const Joi = require('joi');
const axios = require('axios');
const PEDESTRIAN_SERVICE_ADDR = "http://localhost:3002/"
const VEHICLE_SERVICE_ADDR = "http://localhost:3003/"
const CROSSWALK_SERVICE_ADDR = "http://localhost:3004/"
const PROXIMITY_SERVICE_ADDR = "http://localhost:3005/"

process.title = "API Layer"

const app = express();
// Circumvent CORS
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
}

app.use(allowCrossDomain);
app.use(
    bodyParser.urlencoded({
        extended: true
    })
)
    
app.use(bodyParser.json())
 


// Pedestrian Service Proxy
app.get('/pedestrians', (req, res) => {
    console.log("[API LAYER] GET pedestrians ");
    axios.get(PEDESTRIAN_SERVICE_ADDR + "pedestrians/")
    .then(response => {
        res.status(response.status).send(response.data);
    })
    .catch(err => {
        console.log("Error accessing Pedestrian Service for pedestrians GET")
        console.log(err.message)
        res.status(400).send({"success": false, "error": err.message})
    })
})

app.get('/pedestrian/:id', (req, res) => {
    console.log("[API LAYER] GET pedestrian " + req.params.id);
    axios.get(PEDESTRIAN_SERVICE_ADDR + "pedestrian/" + req.params.id)
    .then(response => {
        res.status(response.status).send(response.data);
    })
});

updateCrosswalkNearbyPedestrian = (crosswalk_id, pedestrian_id) => {
    return axios.post(CROSSWALK_SERVICE_ADDR + "crosswalk/" + crosswalk_id + "/nearby_pedestrian", {
        pedestrian_id: pedestrian_id
    })
}

deleteCrosswalkNearbyPedestrian = (crosswalk_id, pedestrian_id) => {
    return axios.delete(CROSSWALK_SERVICE_ADDR + "crosswalk/" + crosswalk_id + "/nearby_pedestrian/" + pedestrian_id)
}

getNearbyVehicles = (crosswalk_id) => {
    return axios.get(CROSSWALK_SERVICE_ADDR + "crosswalk/" + crosswalk_id + "/nearby_vehicles/")
}

app.post('/pedestrian/', (req, res) => {
    console.log("[API LAYER] POST pedestrian, body: ");
    console.dir(req.body);
    const body = req.body;
    const result = validateCreateInput(body);
    if(result.error)
    {
        return res.status(400).send(result.error.details[0].message);
    }
    axios.post(PEDESTRIAN_SERVICE_ADDR + "pedestrian/", req.body)
    .then(response => {
        res.status(response.status).send(response.data);
    })
    .catch(err =>{
        console.log("Error posting a pedestrian")
        res.status(400).send({error: err.message});
    })
})

app.put('/pedestrian/', (req, res) => {
    console.log("[API LAYER] PUT pedestrian, body: ");
    console.dir(req.body);
    var body = req.body;
    const result = validateUpdateInput(body);
    if(result.error)
    {
        return res.status(400).send(result.error.details[0].message);
    }
    axios.put(PEDESTRIAN_SERVICE_ADDR + "pedestrian/", req.body)
    .then(response => {
        checkIfNearby(req.body.latitude, req.body.longitude).then(([crosswalk_ids, promise]) => {
            promise.then(responses => {
                var crosswalks_nearby = []
                responses.forEach((response, i) => {
                    if(response.nearby === true)
                    {
                        crosswalks_nearby.push(crosswalk_ids[i])
                        console.log("Crosswalk: " + crosswalk_ids[i] + " is nearby pedestrian!");
                        updateCrosswalkNearbyPedestrian(crosswalk_ids[i], req.body.id);
                    }
                    else 
                    {
                        console.log("Crosswalk: " + crosswalks[i].id + " is NOT nearby pedestrian!");
                        deleteCrosswalkNearbyPedestrian(crosswalks[i].id, req.body.id);
                    }
                })
                var nearby_vehicles_promises = crosswalks_nearby.map(id => getNearbyVehicles(id));
                var nearby_vehicles = {}
                Promise.all(nearby_vehicles_promises)
                .then(responses => {
                    responses.forEach((response, i) => {
                        response_data = response.data
                        if(Array.isArray(response_data.vehicles) && response_data.vehicles.length > 0)
                        {
                            nearby_vehicles[response_data.crosswalk] = response_data.vehicles;
                            console.log("Crosswalk: " + response_data.crosswalk + " has nearby vehicles!");
                        }
                        else 
                        {
                            if(!(response_data.crosswalk in nearby_vehicles))
                            {
                                nearby_vehicles[response_data.crosswalk] = []
                            }
                            console.log("Crosswalk: " + response_data.crosswalk + " does not have nearby vehicles!");
                        }
                    })
                    res.status(200).send({"success": true, "nearby": nearby_vehicles});
                })
            })
        })
    })
})

app.delete('/pedestrian/:id', (req, res) => {
    console.log("[API LAYER] DELETE pedestrian, id: " + req.params.id);
    axios.delete(PEDESTRIAN_SERVICE_ADDR + "pedestrian/" + req.params.id)
    .then(response => {
        res.status(response.status).send(response.data);
    })
})

// Vehicle Service Proxy
app.get('/vehicles', (req, res) => {
    console.log("[API LAYER] GET vehicles ");
    axios.get(VEHICLE_SERVICE_ADDR + "vehicles/")
    .then(response => {
        res.status(response.status).send(response.data);
    })
    .catch(err => {
        console.log("Error accessing Vehicle Service for vehicles GET")
        console.log(err.message)
        res.status(400).send({"success": false, "error": err.message})
    })
})

app.get('/vehicle/:id', (req, res) => {
    console.log("[API LAYER] GET vehicle " + req.params.id);
    axios.get(VEHICLE_SERVICE_ADDR + "vehicle/" + req.params.id)
    .then(response => {
        res.status(response.status).send(response.data);
    })
});

updateCrosswalkNearbyVehicle = (crosswalk_id, vehicle_id) => {
    return axios.post(CROSSWALK_SERVICE_ADDR + "crosswalk/" + crosswalk_id + "/nearby_vehicle", {
        vehicle_id: vehicle_id
    })
}

deleteCrosswalkNearbyVehicle = (crosswalk_id, vehicle_id) => {
    return axios.delete(CROSSWALK_SERVICE_ADDR + "crosswalk/" + crosswalk_id + "/nearby_vehicle/" + vehicle_id)
}

getNearbyPedestrians = (crosswalk_id) => {
    return axios.get(CROSSWALK_SERVICE_ADDR + "crosswalk/" + crosswalk_id + "/nearby_pedestrians/")
}

app.post('/vehicle/', (req, res) => {
    console.log("[API LAYER] POST vehicle, body: ");
    console.dir(req.body);
    const body = req.body;
    const result = validateVehicleCreateInput(body);
    if(result.error)
    {
        return res.status(400).send(result.error.details[0].message);
    }
    axios.post(VEHICLE_SERVICE_ADDR + "vehicle/", req.body)
    .then(response => {
        res.status(response.status).send(response.data);
    }).catch(err =>{
        console.log("Error posting a vehicle: ")
        console.log(err.message);
        res.status(400).send({"success": false, "error": err.message});
    })

})

app.put('/vehicle/', (req, res) => {
    console.log("[API LAYER] PUT vehicle, body: ");
    console.dir(req.body);
    var body = req.body;
    const result = validateVehicleUpdateInput(body);
    if(result.error)
    {
        return res.status(400).send(result.error.details[0].message);
    }
    axios.put(VEHICLE_SERVICE_ADDR + "vehicle/", req.body)
    .then(response => {
        checkIfNearby(req.body.latitude, req.body.longitude).then(([crosswalk_ids, promise]) => {
            promise.then(responses => {
                var crosswalks_nearby = []
                responses.forEach((response, i) => {
                    if(response.nearby === true)
                    {
                        crosswalks_nearby.push(crosswalk_ids[i])
                        console.log("Crosswalk: " + crosswalk_ids[i] + " is nearby vehicle!");
                        updateCrosswalkNearbyVehicle(crosswalk_ids[i], req.body.id);
                    }
                    else 
                    {
                        console.log("Crosswalk: " + crosswalks[i].id + " is NOT nearby vehicle!");
                        deleteCrosswalkNearbyVehicle(crosswalks[i].id, req.body.id);
                    }
                })
                var nearby_pedestrians_promises = crosswalks_nearby.map(id => getNearbyPedestrians(id));
                var nearby_pedestrians = {}
                Promise.all(nearby_pedestrians_promises)
                .then(responses => {
                    responses.forEach((response, i) => {
                        response_data = response.data
                        console.log("Nearby Pedestrians Response:")
                        console.dir(response_data)
                        if(response_data.pedestrians !== undefined && Object.keys(response_data.pedestrians).length > 0)
                        {
                            nearby_pedestrians[response_data.crosswalk] = response_data.pedestrians;
                            console.log("Crosswalk: " + response_data.crosswalk + " has nearby pedestrians!");
                        }
                        else 
                        {
                            if(!(response_data.crosswalk in nearby_pedestrians))
                            {
                                nearby_pedestrians[response_data.crosswalk] = []
                            }
                            console.log("Crosswalk: " + response_data.crosswalk + " does not have nearby pedestrians!");
                        }
                    })
                    res.status(200).send({"success": true, "nearby": nearby_pedestrians});
                })
            })
        })
    })
})

app.delete('/vehicle/:id', (req, res) => {
    console.log("[API LAYER] DELETE vehicle, id: " + req.params.id);
    axios.delete(VEHICLE_SERVICE_ADDR + "vehicle/" + req.params.id)
    .then(response => {
        res.status(response.status).send(response.data);
    })
})

// Crosswalk Service Proxy
app.get('/crosswalks', (req, res) => {
    console.log("[API LAYER] GET crosswalks ");
    axios.get(CROSSWALK_SERVICE_ADDR + "crosswalks/")
    .then(response => {
        res.status(response.status).send(response.data);
    })
    .catch(err => {
        console.log("Error accessing Crosswalk Service for crosswalks GET")
        console.log(err.message)
        res.status(400).send({"success": false, "error": err.message})
    })
})

app.get('/crosswalk/:id', (req, res) => {
    console.log("[API LAYER] GET crosswalk: " + req.params.id);
    axios.get(CROSSWALK_SERVICE_ADDR + "crosswalk/" + req.params.id)
    .then(response => {
        res.status(response.status).send({"success": true, ...response.data});
    })
    .catch(err => {
        console.log("Error accessing Crosswalk Service for crosswalks GET")
        console.log(err.message)
        res.status(400).send({"success": false, "error": err.message})
    })
})

checkIfNearby = (pedestrian_lat, pedestrian_lon) => {
    return axios.get(CROSSWALK_SERVICE_ADDR + "crosswalks/")
    .then(response => {
        crosswalks = response.data;
        crosswalk_ids = crosswalks.map(crosswalk => crosswalk.id)
        crosswalks_promises = crosswalks.map((crosswalk) => {
            data = {
                lat1: pedestrian_lat,
                lon1: pedestrian_lon,
                lat2: crosswalk.latitude,
                lon2: crosswalk.longitude
            }
            return axios.get(PROXIMITY_SERVICE_ADDR + "proximity/nearby", {
                data: data 
            })
        })
        return [crosswalk_ids , Promise.all(crosswalks_promises).then(responses => responses.map(response => response.data))]
    })

    /*
    .then(([ids, promise]) => {
        return promise.then(responses => console.dir(responses))
        /*
        .then(responses => {
            console.dir(responses)
            responses.forEach((response, i) => {
                if(response.nearby === true)
                {
                    console.log("Crosswalk: " + crosswalks[i] + " is nearby pedestrian!");
                }
            })
        })
        
    })
    */

    /*
    ([crosswalk_ids, promise]) => {
        promise.then(responses => responses.json())
        .then(responses => {
            console.dir(responses)
            responses.forEach((response, i) => {
                if(response.nearby === true)
                {
                    console.log("Crosswalk: " + crosswalks[i] + " is nearby pedestrian!");
                }
            })
        })
    })
    */
}

app.post('/crosswalk', (req,res) => {
    console.log("[API LAYER] POST crosswalk, body: ");
    console.dir(req.body);
    const body = req.body;
    const result = validateCrosswalkCreateInput(body);
    if(result.error)
    {
        return res.status(400).send({"success": false, "error": result.error.details[0].message});
    }

    axios.post(CROSSWALK_SERVICE_ADDR + "crosswalk/", req.body)
    .then(response => {
        res.status(response.status).send(response.data);
    })
    .catch(err =>{
        console.log("Error posting a crosswalk")
        res.status(400).send({"success": false, "error": err.message});
    })
})

// Setting PORT to listen to incoming requests or by default use port 3000
// Take not that the string in the argument of log is a "back tick" to embedded variable.

const port = process.env.PORT || 3001;

app.listen(port, (req, res) => { 
    console.log(`Listen on port ...${port}`);
});

// function to validate create input parameters 
function validateCreateInput(input)
{
    const schema = {
        latitude: Joi.number().precision(8).required(),
        longitude: Joi.number().precision(8).required(),
    };
    return Joi.validate(input, schema);
}

function validateVehicleCreateInput(input)
{
    const schema = {
        latitude: Joi.number().precision(8).required(),
        longitude: Joi.number().precision(8).required(),
    };
    return Joi.validate(input, schema);
}

function validateVehicleUpdateInput(input){
    const schema = {
        id: Joi.number().min(1).max(8).required(),
        latitude: Joi.number().precision(8).required(),
        longitude: Joi.number().precision(8).required(),
    };
    return Joi.validate(input, schema);
}

// function to validate update input parameters 
function validateUpdateInput(input){
    const schema = {
        id: Joi.number().min(1).max(8).required(),
        latitude: Joi.number().precision(8).required(),
        longitude: Joi.number().precision(8).required(),
    };
    return Joi.validate(input, schema);
}

function validateCrosswalkCreateInput(input) {
    const schema = {
        state: Joi.string().min(2).max(3).required(),
        latitude: Joi.number().precision(8).required(),
        longitude: Joi.number().precision(8).required(),
    };
    return Joi.validate(input, schema);
}

function validateCrosswalkUpdateInput(input) {
    const schema = {
        id: Joi.number().min(1).max(8).required(),
        state: Joi.string().min(2).max(3).required(),
        latitude: Joi.number().precision(8).required(),
        longitude: Joi.number().precision(8).required(),
    };
    return Joi.validate(input, schema);
}