import { refDebounced } from '@vueuse/core'
import { computed, ref, shallowRef, watch, watchEffect } from 'vue'
import { useSourceFile, type SourceFileMap } from './source-file'
import { atou, utoa } from './url'

const DEFAULT_TSCONFIG = {
  compilerOptions: {
    target: 'esnext',
    module: 'esnext',
    strict: true,
    esModuleInterop: true,
    outDir: 'dist',
    declaration: true,
    resolveJsonModule: true,
  },
}
export const defaultFiles = (): SourceFileMap =>
  new Map([
    ['main.ts', useSourceFile('main.ts', `const x: number = 1`)],
    [
      'tsconfig.json',
      useSourceFile(
        'tsconfig.json',
        JSON.stringify(DEFAULT_TSCONFIG, undefined, 2),
      ),
    ],
  ])

export const cmd = ref('')
export const files = ref<SourceFileMap>(defaultFiles())
export const tabs = computed(() => Array.from(files.value.keys()))
export const activeFile = ref<string>('main.ts')

export const outputFiles = ref<Record<string, string>>({})
export const outputActive = ref<string>()

export const currentVersion = ref('latest')
export interface PackageManifest {
  version: string
}

export const currentManifest = shallowRef<PackageManifest>()
export const isFetchingManifest = ref(false)
export const manifestError = ref('')
export const compileError = ref('')
export const error = computed(() => manifestError.value || compileError.value)

let manifestController: AbortController | undefined
export async function fetchManifest() {
  manifestController?.abort()
  const controller = new AbortController()
  manifestController = controller
  currentManifest.value = undefined
  manifestError.value = ''
  isFetchingManifest.value = true
  try {
    const response = await fetch(
      `https://registry.npmjs.org/@tsrs/wasm/${encodeURIComponent(currentVersion.value)}`,
      { signal: controller.signal },
    )
    if (!response.ok)
      throw new Error(`Package request failed (${response.status})`)
    const manifest = (await response.json()) as PackageManifest
    if (!manifest.version) throw new Error('The package has no version')
    if (!controller.signal.aborted) currentManifest.value = manifest
  } catch (error) {
    if (!controller.signal.aborted) {
      manifestError.value =
        error instanceof Error ? error.message : String(error)
    }
  } finally {
    if (!controller.signal.aborted) isFetchingManifest.value = false
  }
}

export const compiling = ref(false)
export const timeCost = ref(0)
export const loadingWasm = ref(false)

export const loading = computed(
  () => isFetchingManifest.value || loadingWasm.value,
)
export const loadingDebounced = refDebounced(loading, 100)

export function filesToObject() {
  return Array.from(files.value.values(), (file) => [file.filename, file.code])
}

const LAST_STATE_KEY = 'tsrs:state'
try {
  const saved = location.hash.slice(1)
    ? atou(location.hash.slice(1))
    : localStorage.getItem(LAST_STATE_KEY)
  const state = saved && JSON.parse(saved)
  if (state) {
    cmd.value = typeof state.c === 'string' ? state.c : ''
    if (
      Array.isArray(state.f) &&
      state.f.length &&
      state.f.every(
        (entry: unknown) =>
          Array.isArray(entry) &&
          entry.length === 2 &&
          entry.every((value: unknown) => typeof value === 'string'),
      )
    ) {
      for (const file of files.value.values()) file.dispose()
      files.value = new Map(
        (state.f as [string, string][]).map(([filename, code]) => [
          filename,
          useSourceFile(filename, code),
        ]),
      )
    }
    activeFile.value = files.value.keys().next().value!
    currentVersion.value =
      typeof state.v === 'string' && state.v ? state.v : 'latest'
  }
} catch {
  // Invalid share links or unavailable storage must not prevent startup.
}

// eslint-disable-next-line unicorn/no-top-level-side-effects
watch(currentVersion, fetchManifest, { immediate: true })

export const serialized = computed(() =>
  JSON.stringify({
    f: filesToObject(),
    c: cmd.value,
    v: currentVersion.value,
  }),
)

// serialize state to url
// eslint-disable-next-line unicorn/no-top-level-side-effects
watchEffect(() => {
  location.hash = utoa(serialized.value)
  try {
    localStorage.setItem(LAST_STATE_KEY, serialized.value)
  } catch {
    // Sharing still works when browser storage is unavailable.
  }
})
