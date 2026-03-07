import express from 'express'
import apiRoutes from './routes/api.js'

const app = express()
app.use(express.json())
app.use('/api', apiRoutes)

app.listen(8009, () => console.log('express running on > 8009'))