import { localSettings } from '@/utils/settings'

console.log('[CRXJS] Hello world from content script!')
const _settings = await localSettings.get()
console.log(_settings)
