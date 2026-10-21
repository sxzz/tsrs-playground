import { tokenizeArgs } from 'args-tokenizer'
import { createBirpc } from 'birpc'
import { importCompiler } from './tsrs'

const workerFunctions = { load, compile }
export type WorkerFunctions = typeof workerFunctions

createBirpc<{}, WorkerFunctions>(workerFunctions, {
  post: (data) => postMessage(data),
  on: (fn) => addEventListener('message', ({ data }) => fn(data)),
})

async function load(version: string) {
  const compiler = await importCompiler(version)
  await compiler.loadModule()
}

async function compile(
  version: string,
  cmd: string,
  files: Record<string, string>,
) {
  const compiler = await importCompiler(version)
  const args = tokenizeArgs(cmd)
  const startTime = performance.now()
  const result = await compiler.tsc(args, {
    cwd: '/app',
    files: Object.fromEntries(
      Object.entries(files).map(([name, code]) => [
        name.startsWith('/') ? name : `/app/${name}`,
        code,
      ]),
    ),
  })
  const time = performance.now() - startTime
  const output: Record<string, string> = {}
  if (result.stdout.trim()) output['<stdout>'] = result.stdout.trim()
  if (result.stderr.trim() || result.exitCode !== 0) {
    output['<stderr>'] = [
      result.exitCode === 0 ? '' : `Exit code: ${result.exitCode}`,
      result.stderr.trim(),
    ]
      .filter(Boolean)
      .join('\n\n')
  }
  for (const [name, code] of Object.entries(result.files ?? {})) {
    output[name.replace(/^\/app\/(?:dist\/)?/, '')] = code
  }
  return { output, time }
}
