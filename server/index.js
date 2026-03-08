import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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
try {
  await createTable(client);
} catch (err) {
  console.error('⚠ ClickHouse setup failed (server will still start):', err.message);
}

if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const distPath = path.join(__dirname, '../dist/public')
  app.use(express.static(distPath))
  app.use((req, res) => res.sendFile(path.join(distPath, 'index.html')))
}

const PORT = process.env.PORT ?? 8009
app.listen(PORT, () => console.log(`express running on > ${PORT}`));