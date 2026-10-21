<template>
  <footer class="footer">
    <span>
      Made with
      <div i-ri:heart-3-fill mx-0.5 inline-block translate-y-0.5 text-heart />
      by
      <a
        class="footer-link"
        href="https://github.com/sxzz"
        target="_blank"
        rel="noopener"
      >
        Kevin Deng
      </a>
    </span>
    <span class="footer-sep">·</span>
    <a
      class="footer-link"
      href="https://npmx.dev/package/@tsrs/wasm"
      target="_blank"
      rel="noopener"
    >
      @tsrs/wasm
    </a>
  </footer>
</template>

<style scoped>
.footer {
  --at-apply: 'flex shrink-0 items-center justify-center gap-2 px-4 pb-2.5 text-3 text-ink-3';
}

.footer-link {
  --at-apply: 'text-ink-2 underline-offset-3 hover:text-ink hover:underline';
}

.footer-sep {
  --at-apply: 'op50';
}
</style>
