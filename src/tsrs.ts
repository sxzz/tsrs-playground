/** The browser API exposed by @tsrs/wasm; loaded at runtime from the CDN. */
export interface TsrsModule {
  loadModule: (url?: string) => Promise<WebAssembly.Module>
  tsc: (
    args: string[],
    options: {
      cwd: string
      files: Record<string, string>
    },
  ) => Promise<{
    exitCode: number
    stdout: string
    stderr: string
    files?: Record<string, string>
  }>
}

function compilerUrl(version: string) {
  return `https://cdn.jsdelivr.net/npm/@tsrs/wasm@${encodeURIComponent(version)}/browser.js`
}

export function importCompiler(version: string): Promise<TsrsModule> {
  return import(/* @vite-ignore */ compilerUrl(version))
}
