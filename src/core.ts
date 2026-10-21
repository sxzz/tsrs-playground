import { createBirpc, type BirpcReturn } from 'birpc'
import TsrsCliWorker from './tsrs-cli.worker?worker'
import type { WorkerFunctions } from './tsrs-cli.worker'

export function createCompiler() {
  let worker: Worker | undefined
  let cli: BirpcReturn<WorkerFunctions> | undefined

  function dispose(error?: Error) {
    cli?.$close(error)
    worker?.terminate()
    cli = undefined
    worker = undefined
  }

  function connect() {
    const worker = new TsrsCliWorker()
    let listener: (event: MessageEvent) => void
    const onError = (event: ErrorEvent) => {
      event.preventDefault()
      dispose(new Error(event.message || 'Compiler worker failed'))
    }
    const cli = createBirpc<WorkerFunctions>(
      {},
      {
        post: (data) => worker.postMessage(data),
        on: (fn) => {
          listener = ({ data }) => fn(data)
          worker.addEventListener('message', listener)
          worker.addEventListener('error', onError)
        },
        off: () => {
          worker.removeEventListener('message', listener)
          worker.removeEventListener('error', onError)
        },
      },
    )
    return { worker, cli }
  }

  async function run<T>(
    fn: (client: BirpcReturn<WorkerFunctions>) => Promise<T>,
  ) {
    if (!cli) ({ worker, cli } = connect())
    try {
      return await fn(cli)
    } catch (error) {
      // A failed or timed-out worker must not be reused on retry.
      dispose()
      throw error
    }
  }

  return {
    load: (version: string) => run((client) => client.load(version)),
    compile: (...args: Parameters<WorkerFunctions['compile']>) =>
      run((client) => client.compile(...args)),
    dispose,
  }
}
