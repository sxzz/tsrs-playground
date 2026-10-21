<script setup lang="ts">
import { useClipboard, watchDebounced } from '@vueuse/core'
import AnsiRegex from 'ansi-regex'
import { computed, onBeforeUnmount, watch } from 'vue'
import AppBar from './components/AppBar.vue'
import CodeEditor from './components/CodeEditor.vue'
import CommandBar from './components/CommandBar.vue'
import PageFooter from './components/PageFooter.vue'
import Tabs from './components/Tabs.vue'
import { dark } from './composables/dark'
import { shiki, themeDark, themeLight } from './composables/shiki'
import { useSourceFile } from './composables/source-file'
import {
  activeFile,
  cmd,
  compileError,
  compiling,
  currentManifest,
  error,
  fetchManifest,
  files,
  filesToObject,
  isFetchingManifest,
  loadingDebounced,
  loadingWasm,
  outputActive,
  outputFiles,
  serialized,
  tabs,
  timeCost,
} from './composables/state'
import { createCompiler } from './core'

const ansiRegex = AnsiRegex()
const compiler = createCompiler()
let running = false
let pending = false
let disposed = false

watchDebounced([files, cmd], () => compile(), { debounce: 50, deep: true })
watch(currentManifest, () => compile(), { immediate: true })

onBeforeUnmount(() => {
  disposed = true
  compiler.dispose()
})

async function compile() {
  if (disposed) return
  pending = true
  if (running) return
  running = true
  try {
    // Read the latest editor state only when the worker is ready for it.
    while (pending && !disposed) {
      pending = false
      await compileLatest()
    }
  } finally {
    running = false
  }
}

async function compileLatest() {
  compileError.value = ''
  timeCost.value = 0
  const manifest = currentManifest.value
  if (!manifest || isFetchingManifest.value) return

  const current = serialized.value
  const isCurrent = () =>
    !disposed &&
    current === serialized.value &&
    manifest === currentManifest.value
  loadingWasm.value = true
  try {
    await compiler.load(manifest.version)
    if (!isCurrent()) return
    loadingWasm.value = false
    compiling.value = true
    const result = await compiler.compile(
      manifest.version,
      cmd.value,
      Object.fromEntries(filesToObject()),
    )
    if (!isCurrent()) return
    outputFiles.value = result.output
    timeCost.value = result.time
    if (!outputActive.value || !(outputActive.value in result.output)) {
      outputActive.value = Object.keys(result.output)[0]
    }
  } catch (error) {
    if (isCurrent()) {
      compileError.value =
        error instanceof Error ? error.message : String(error)
      outputFiles.value = {}
    }
  } finally {
    loadingWasm.value = false
    compiling.value = false
  }
}

function retry() {
  if (!currentManifest.value) return fetchManifest()
  return compile()
}

const outputTabs = computed(() => Object.keys(outputFiles.value))
const hasOutput = computed(() => outputTabs.value.length > 0)

function highlight(code?: string) {
  if (!code) return ''
  return shiki.codeToHtml(code.replace(ansiRegex, ''), {
    lang: 'js',
    theme: dark.value ? themeDark.name! : themeLight.name!,
  })
}

const { copy, copied } = useClipboard()
function handleCopy() {
  if (!outputActive.value) return
  copy(outputFiles.value[outputActive.value] || '')
}

function addTab(name: string) {
  files.value.set(name, useSourceFile(name, ''))
}

function renameTab(oldName: string, newName: string) {
  files.value = new Map(
    Array.from(files.value.values()).map((file) => {
      if (file.filename === oldName) {
        file.rename(newName)
        return [newName, file]
      }
      return [file.filename, file]
    }),
  )
}

function reorderTab(from: number, to: number) {
  const entries = [...files.value]
  const [moved] = entries.splice(from, 1)
  if (!moved) return
  entries.splice(to, 0, moved)
  // Map iteration order is the tab order, and filesToObject() serializes it,
  // so the new order persists to the URL and localStorage for free.
  files.value = new Map(entries)
}

function removeTab(name: string) {
  files.value.get(name)?.dispose()
  files.value.delete(name)
}

function updateCode(name: string, code: string) {
  files.value.get(name)!.code = code
}
</script>

<template>
  <div class="shell">
    <AppBar />
    <CommandBar />

    <main class="workbench thin-scroll">
      <Tabs
        v-model="activeFile"
        :tabs
        accent="ts"
        @add-tab="addTab"
        @rename-tab="renameTab"
        @remove-tab="removeTab"
        @reorder-tab="reorderTab"
      >
        <template #default="{ value }">
          <div min-h-0 min-w-0 flex-1>
            <CodeEditor
              :model-value="files.get(value)!.code"
              :model="files.get(value)!.model"
              h-full
              min-h-0
              w-full
              @update:model-value="updateCode(value, $event)"
            />
          </div>
        </template>
      </Tabs>

      <Tabs v-model="outputActive" :tabs="outputTabs" readonly accent="rs">
        <template #head-end>
          <button
            v-if="hasOutput"
            type="button"
            class="copy"
            :title="copied ? 'Copied' : 'Copy output'"
            @click="handleCopy"
          >
            <div
              :class="
                copied ? 'i-ri:check-line text-ok' : 'i-ri:file-copy-line'
              "
            />
          </button>
        </template>

        <div class="pane">
          <div v-if="error" class="pane-state" role="alert">
            <p class="pane-state-title">Unable to run tsrs</p>
            <p class="pane-state-note">{{ error }}</p>
            <button type="button" class="retry" @click="retry">Retry</button>
          </div>

          <div v-else-if="loadingDebounced" class="pane-state">
            <div i-ri:download-cloud-2-line animate-pulse text-2xl text-rs />
            <p class="pane-state-title">Downloading the tsrs compiler</p>
            <p class="pane-state-note">
              The WebAssembly build is loaded from the CDN and cached. You can
              start writing already.
            </p>
          </div>

          <div v-else-if="compiling && !hasOutput" class="pane-state">
            <div i-ri:loader-4-line animate-spin text-2xl text-rs />
            <p class="pane-state-title">Compiling</p>
          </div>

          <div v-else-if="!hasOutput" class="pane-state">
            <p class="pane-state-title">No output</p>
            <p class="pane-state-note">
              tsrs produced no files or diagnostics. With --noEmit, this means
              the check completed successfully.
            </p>
          </div>

          <template v-else-if="outputActive">
            <div
              v-if="outputActive.startsWith('<')"
              class="output thin-scroll"
              :class="[
                outputActive === '<stderr>' && 'text-alert',
                compiling && 'is-stale',
              ]"
              v-text="outputFiles[outputActive]?.replace(ansiRegex, '')"
            />
            <div
              v-else
              class="output thin-scroll"
              :class="compiling && 'is-stale'"
              v-html="highlight(outputFiles[outputActive])"
            />
          </template>
        </div>
      </Tabs>
    </main>

    <PageFooter />
  </div>
</template>

<style scoped>
.shell {
  --at-apply: 'h-100dvh flex flex-col overflow-hidden bg-field';
}

.workbench {
  --at-apply: 'min-h-0 flex-1 grid gap-3 overflow-y-auto p-3 md:p-4';
  grid-template-columns: minmax(0, 1fr);
}

/* Panels get their own height on narrow screens so the workbench scrolls. */
.workbench > :first-child {
  min-height: 46dvh;
}
.workbench > :last-child {
  min-height: 40dvh;
}

@media (min-width: 768px) {
  .workbench {
    --at-apply: 'overflow-hidden';
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  .workbench > :first-child,
  .workbench > :last-child {
    min-height: 0;
  }
}

.pane {
  --at-apply: 'relative min-h-0 min-w-0 flex-1';
}

.pane-state {
  --at-apply: 'h-full flex flex-col items-center justify-center gap-2 px-8 text-center';
}

.pane-state-title {
  --at-apply: 'm-0 text-sm text-ink font-500';
}

.pane-state-note {
  --at-apply: 'm-0 max-w-70 text-xs text-ink-3 leading-relaxed';
}

.retry {
  --at-apply: 'rounded-md border border-line px-3 py-1.5 text-xs text-ink hover:bg-fill';
}

.copy {
  --at-apply: 'shrink-0 rounded-md p-1.5 text-ink-3 transition-colors duration-150 hover:bg-fill hover:text-ink disabled:op30 disabled:hover:bg-transparent';
}
</style>

<style>
.output {
  --at-apply: 'h-full w-full overflow-auto whitespace-pre p-3 text-xs leading-relaxed transition-opacity duration-200';
}

.output.is-stale {
  --at-apply: 'op40';
}

/* Shiki inlines its theme background; the panel already provides one. */
.output pre.shiki {
  margin: 0;
  background-color: transparent !important;
}
</style>
