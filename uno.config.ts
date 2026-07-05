import { defineConfig, presetAttributify, presetWind4 } from 'unocss'

export default defineConfig({
  presets: [presetAttributify(), presetWind4()],
  shortcuts: {
    input: 'h-8 leading-6 px-3 border border-gray-300 rounded-md outline-0 focus-visible:outline-none',
  },
})
