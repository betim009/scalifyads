import { spawn } from 'node:child_process'
import fsp from 'node:fs/promises'

let ffmpegPath = null
try {
  // Optional dependency (preferred): avoids requiring ffmpeg installed in host/container.
  const mod = await import('ffmpeg-static')
  ffmpegPath = mod?.default ?? mod
} catch {
  ffmpegPath = null
}

function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function run(cmd, args, { timeoutMs = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''

    const timeout = setTimeout(() => {
      child.kill('SIGKILL')
      const err = new Error('ffmpeg thumbnail generation timed out')
      err.code = 'THUMB_TIMEOUT'
      reject(err)
    }, timeoutMs)

    child.stdout.on('data', (d) => {
      stdout += d.toString()
    })
    child.stderr.on('data', (d) => {
      stderr += d.toString()
    })

    child.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })

    child.on('close', (code) => {
      clearTimeout(timeout)
      if (code === 0) return resolve({ stdout, stderr })
      const err = new Error('ffmpeg thumbnail generation failed')
      err.code = 'THUMB_FFMPEG_FAILED'
      err.details = { code, stdout: stdout.slice(0, 1000), stderr: stderr.slice(0, 4000) }
      reject(err)
    })
  })
}

export function canGenerateVideoThumbnail() {
  return Boolean(normalizeNonEmptyString(ffmpegPath))
}

export async function generateVideoThumbnailJpeg({ inputPath, outputPath, seekSeconds = 1 } = {}) {
  const inp = normalizeNonEmptyString(inputPath)
  const out = normalizeNonEmptyString(outputPath)
  if (!inp) throw new Error('inputPath is required')
  if (!out) throw new Error('outputPath is required')
  if (!canGenerateVideoThumbnail()) {
    const err = new Error('ffmpeg is not available (install ffmpeg-static)')
    err.code = 'THUMB_NO_FFMPEG'
    throw err
  }

  // Ensure output is overwritten if exists.
  const args = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-ss',
    String(Math.max(0, Number(seekSeconds) || 0)),
    '-i',
    inp,
    '-frames:v',
    '1',
    '-q:v',
    '2',
    out
  ]

  await run(ffmpegPath, args, { timeoutMs: 30000 })
  const stat = await fsp.stat(out)
  return { sizeBytes: stat.size }
}

