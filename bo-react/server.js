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
      // forward minimal headers to improve compatibility
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*'
      },
      body: JSON.stringify(req.body)
    })
    const text = await r.text()
    console.log(`[proxy] ${req.body?.method} -> ${r.status} ${text ? text.length + 'B' : '0B'}`)
    if (!r.ok) {
      return res.status(r.status).json({ fault: true, faultString: `upstream ${r.status}`, body: text })
    }
    res.status(200).send(text)
  } catch (e) {
    console.error('[proxy] error', e)
    res.status(502).json({ fault: true, faultString: String(e) })
  }
})

const port = process.env.PORT || 7070
app.listen(port, () => console.log(`RPC proxy on :${port} -> ${TARGET}`))