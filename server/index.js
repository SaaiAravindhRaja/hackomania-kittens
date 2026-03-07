import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { getClient, createTable } from './clickhouse_auth.js'
import apiRoutes from './routes/api.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api', apiRoutes)

// Connect to ClickHouse and ensure table exists
const client = getClient()
await createTable(client)

app.listen(8009, () => console.log('Server running on port 8009'))