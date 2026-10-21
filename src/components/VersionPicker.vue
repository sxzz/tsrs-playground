<script setup lang="ts">
import { useFetch } from '@vueuse/core'
import { computed } from 'vue'
import { currentManifest, currentVersion } from '../composables/state'

const { data: pkgMeta } = useFetch(
  'https://data.jsdelivr.com/v1/package/npm/@tsrs/wasm',
).json<{ tags: Record<string, string>; versions: string[] }>()

const versions = computed(() => pkgMeta.value?.versions ?? [])
const tags = computed(() => Object.keys(pkgMeta.value?.tags ?? { latest: '' }))
const resolved = computed(
  () => currentManifest.value?.version || currentVersion.value,
)
</script>

<template>
  <div class="version">
    <div class="version-select">
      <span class="version-channel">tsrs</span>
      <span class="version-number">{{ resolved }}</span>
      <div i-ri:expand-up-down-line shrink-0 text-3.5 text-ink-3 />
      <select
        v-model="currentVersion"
        aria-label="Compiler version"
        class="version-native"
      >
        <option
          v-if="
            !tags.includes(currentVersion) && !versions.includes(currentVersion)
          "
          :value="currentVersion"
        >
          {{ currentVersion }}
        </option>
        <optgroup label="Tags">
          <option v-for="tag of tags" :key="tag" :value="tag">{{ tag }}</option>
        </optgroup>
        <optgroup v-if="versions.length" label="Versions">
          <option v-for="version of versions" :key="version" :value="version">
            {{ version }}
          </option>
        </optgroup>
      </select>
    </div>
  </div>
</template>

<style scoped>
.version {
  --at-apply: 'inline-flex max-w-full items-center gap-2 border border-line rounded-full bg-panel py-1 pl-3 pr-1 text-xs';
}

.version-select {
  --at-apply: 'relative flex min-w-0 items-center gap-2';
}

.version-channel {
  --at-apply: 'shrink-0 text-ink-3 tracking-wide';
}

.version-number {
  --at-apply: 'truncate text-ink font-500';
}

/* A real <select> on top of the styled label: native menu, custom shell. */
.version-native {
  --at-apply: 'absolute inset-0 h-full w-full cursor-pointer op0';
}
</style>
