// Uses only the installed Edge and Node built-ins. No browser packages or downloads.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const output = new URL('../../output/', import.meta.url)
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless', '--disable-gpu', '--no-first-run', '--disable-background-networking', '--disable-sync',
  '--remote-debugging-port=9449', `--user-data-dir=${fileURLToPath(new URL('edge-operations-cdp', output))}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' })
let ws
try {
  let tab
  for (let attempt = 0; attempt < 50; attempt++) {
    try { tab = (await (await fetch('http://127.0.0.1:9449/json')).json()).find(t => t.type === 'page'); if (tab) break } catch { /* startup */ }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  if (!tab) throw new Error('Headless browser did not start.')
  ws = new WebSocket(tab.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let counter = 0
  const pending = new Map()
  ws.onmessage = event => { const data = JSON.parse(event.data); if (pending.has(data.id)) { const { resolve, reject } = pending.get(data.id); pending.delete(data.id); data.error ? reject(new Error(data.error.message)) : resolve(data.result) } }
  function call(method, params = {}) { return new Promise((resolve, reject) => { const id = ++counter; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) }) }
  await call('Page.enable')
  for (const [name, width, height] of [['operations-gpo-dark', 1280, 1600], ['operations-gpo-light', 390, 1600], ['license-perpetual-light', 1280, 1100], ['license-perpetual-dark', 1280, 1100], ['license-subscription-light', 1280, 1100]]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 })
    await call('Page.navigate', { url: new URL(name + '.html', output).href })
    await new Promise(resolve => setTimeout(resolve, 500))
    const metrics = await call('Runtime.evaluate', { expression: 'JSON.stringify({ viewport: innerWidth, scroll: document.documentElement.scrollWidth })', returnByValue: true })
    const dimensions = JSON.parse(metrics.result.value)
    if (dimensions.scroll > dimensions.viewport) throw new Error(`${name}: horizontal overflow ${JSON.stringify(dimensions)}`)
    const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    fs.writeFileSync(new URL(name + '.png', output), Buffer.from(shot.data, 'base64'))
    console.log(name, JSON.stringify(dimensions))
  }
  await call('Browser.close')
} finally { ws?.close(); if (browser.exitCode === null) browser.kill() }
