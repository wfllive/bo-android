import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'

const app = express()
app.use(cors())
app.use(express.json())

const TARGET = process.env.SERVICE_URL || 'http://bo-service.tryb.de/'

app.post('/rpc', async (req, res) => {
  try {
    const r = await fetch(TARGET, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    })
    const text = await r.text()
    res.status(r.status).send(text)
  } catch (e) {
    res.status(502).json({ fault: true, faultString: String(e) })
  }
})

const port = process.env.PORT || 7070
app.listen(port, () => console.log(`RPC proxy on :${port} -> ${TARGET}`))