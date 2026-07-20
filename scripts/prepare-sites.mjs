import { copyFile, mkdir, rename, writeFile } from 'node:fs/promises'

await mkdir('dist/.openai', { recursive: true })
await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json')

await rename('dist/server/index.js', 'dist/server/vinext-handler.js')
await writeFile(
  'dist/server/index.js',
  `import handler from './vinext-handler.js'

export default {
  fetch(request, env, context) {
    return typeof handler === 'function'
      ? handler(request, env, context)
      : handler.fetch(request, env, context)
  },
}
`,
)

console.log('Sites hosting metadata and Worker fetch wrapper prepared')
