# tsrs Playground

[Open the playground](https://tsrs.sxzz.dev/)

A browser playground for [tsrs](https://github.com/oxc-project/tsrs), the Rust port of the TypeScript compiler, inspired by its [official playground](https://github.com/oxc-project/tsrs/tree/main/playground).

Edit multiple files, pass compiler CLI flags, and inspect diagnostics, JavaScript, and declaration output. The playground supports compiler version selection, light/dark themes, and compressed share links. Your last session is saved locally.

## Development

```sh
pnpm install
pnpm dev
```

Run `pnpm lint`, `pnpm typecheck`, and `pnpm build` to validate changes. `pnpm preview` serves the production build.

## Deployment

The playground deploys to Cloudflare Workers with Static Assets. Wrangler serves the Vite build in `dist` with a single-page application fallback; no server-side Worker code is needed.

```sh
pnpm exec wrangler login
pnpm deploy
```

To preview the Cloudflare deployment locally, run `pnpm build && pnpm exec wrangler dev`. Deployment settings are in [`wrangler.jsonc`](./wrangler.jsonc).

## WebAssembly

[`@tsrs/wasm`](https://npmx.dev/package/@tsrs/wasm) loads from jsDelivr and compiles your code locally in a Web Worker. No local Rust or WASM build is required.

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/sxzz/sponsors/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/sxzz/sponsors/sponsors.svg'/>
  </a>
</p>

## License

[MIT](./LICENSE) License © 2025–2026 [Kevin Deng](https://github.com/sxzz)
