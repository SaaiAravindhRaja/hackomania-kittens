import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { getClient, createTable } from './clickhouse_auth.js'
import apiRoutes from './routes/api.js'
import payments from './routes/payments/payments.js'
import epicentreRoutes from './routes/epicentre.js'

const app = express();

app.use(cors())
app.use(express.json());
app.use('/api', apiRoutes);
app.use('/payments', payments);
app.use('/epicentre', epicentreRoutes);
const client = getClient();
await createTable(client);

app.listen(8009, () => console.log('express running on > 8009'));