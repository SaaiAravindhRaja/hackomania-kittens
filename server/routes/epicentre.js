import { Router } from 'express'
const router = Router()

import { createClient } from '@clickhouse/client'


const client = createClient({
    url: 'https://p81nkgv2g0.ap-southeast-1.aws.clickhouse.cloud:8443',
    username: 'cHY50BFRpIMYHrirXvbC',
    password: '4b1dhDb3LW0hQCGEx0pF3R69VxrLi0NPCe2nNNZZMC',
    database: 'default',
});

console.log(client);

const result = await client.query({
    query: 'SELECT 1',
    format: 'JSONEachRow',
});


console.log(result);


import haversine from 'haversine'

function getDistance(a, b) { // geojson positions are (lon, lat)
    const point_a = {latitude: a[1], longitude: a[0]};
    const point_b = {latitude: b[1], longitude: b[0]};
    return haversine(point_a, point_b, {unit: 'meter'})
}

// EONET event categories:
//  - drought
//  - dustHaze
//  - earthquakes
//  - floods
//  - landslides
//  - manmade
//  - seaLakeIce
//  - severStorms
//  - snow
//  - tempExtremes
//  - volcanoes
//  - waterColor
//  - wildfires



async function getEvents() {
    const url = "https://eonet.gsfc.nasa.gov/api/v3/events?limit=1";

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw Error('http error: ', response.status);
        }
        const data = await response.json();
        
        return data.events
    } catch (error) {
        console.error('unable to get events: ', error)
    }
}


router.get('/', async (req, res) => {
    const data = await getEvents();
    const test_event = data[0];
    const points = test_event.geometry;
    console.log(test_event);
    console.log(points);

    for (let c = 0; c < points.length; c++) {
        if (points[c].type == 'Point') {
            console.log(points[c].coordinates);
        }
    }
    
    
    console.log(getDistance(points[0].coordinates, points[1].coordinates));
    
});

export default router