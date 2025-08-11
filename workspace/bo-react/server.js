const express = require('express')
const axios = require('axios')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 5174

app.use(cors())
app.use(express.json({ limit: '1mb' }))

const DEFAULT_SERVICE_URL = process.env.BO_SERVICE_URL || 'http://bo-service.tryb.de/'

app.post('/rpc/:method', async (req, res) => {
  const { method } = req.params
  try {
    const response = await axios.post(DEFAULT_SERVICE_URL, {
      id: 0,
      method,
      params: Array.isArray(req.body?.params) ? req.body.params : [],
    }, { timeout: 40000 })
    res.json(response.data)
  } catch (err) {
    res.status(500).json({ error: 'proxy_error', detail: err?.message || String(err) })
  }
})

app.listen(PORT, () => {
  console.log(`Proxy listening on http://localhost:${PORT}`)
})