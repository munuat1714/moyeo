import { copyFile, mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises'

// Keep local design iterations in the workspace without shipping them with every production build.
const socialDirectory = 'dist/client/social'
const shippedSocialAssets = new Set(['moyeo-cover.png', 'moyeo-profile.png'])
try {
  for (const file of await readdir(socialDirectory)) {
    if (!shippedSocialAssets.has(file)) await rm(`${socialDirectory}/${file}`, { force: true })
  }
} catch {
  // The directory is optional.
}

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
