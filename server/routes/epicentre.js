import { Router } from 'express'
const router = Router()



async function getEpicentre() {
    const url = "https://eonet.gsfc.nasa.gov/api/v3/events?limit=10";

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw Error('http error: ', response.status);
        }
        const data = await response.json();
        
        return data.events
    } catch (error) {
        console.error('unable to get epicentre: ', error)
    }
}

router.get('/', async (req, res) => {
    const data = await getEpicentre();
    //console.log('fetched events: ', data);
    console.log(data[4]); // randomly grabbing an event lol
    
});

export default router