export type Settings = {
  /**
   * Loading interval in milliseconds
   * @default 1000
   */
  interval: number
  /**
   * Update pagination automatically when scroll down
   * @default false
   */
  autoUpdatePagination: boolean
  /**
   * Enable logging
   * @default false
   */
  debug: boolean
}

const DEFAULT_SETTINGS = {
  interval: 1000,
  autoUpdatePagination: false,
  debug: false,
} satisfies Settings

const get = async () => {
  const settings = await chrome.storage.local.get<Settings>()
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
  }
}

const set = async (settings: Partial<Settings>) => {
  const current = await get()
  await chrome.storage.local.set({
    ...current,
    ...settings,
  })
}

const reset = async (key?: keyof Settings) => {
  if (key) {
    await chrome.storage.local.remove<Settings>(key)
    await set({ [key]: DEFAULT_SETTINGS[key] })
  } else {
    await chrome.storage.local.set(DEFAULT_SETTINGS)
  }
}

export const localSettings = {
  set,
  get,
  reset,
}
