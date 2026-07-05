import { localSettings } from '@/utils/settings'

const interval = document.querySelector<HTMLInputElement>('#interval')
const autoUpdatePagination = document.querySelector<HTMLInputElement>('#auto-update-pagination')
const debug = document.querySelector<HTMLInputElement>('#debug')
const saveBtn = document.querySelector<HTMLButtonElement>('#save-btn')

if (!interval || !autoUpdatePagination || !debug) {
  throw new Error('Whoops, something is wrong')
}

const settings = await localSettings.get()
let states = settings

interval.value = states.interval.toString()
autoUpdatePagination.checked = states.autoUpdatePagination
debug.checked = states.debug

const isChanged = () => {
  return Object.entries(states).some(([key, value]) => value !== settings[key as keyof typeof settings])
}

const reload = async () => {
  const tabs = await chrome.tabs.query({})

  for (const tab of tabs) {
    if (tab.id && tab.url?.includes('google.com/search')) {
      chrome.tabs.reload(tab.id)
    }
  }
}

saveBtn?.addEventListener('click', () => {
  const intervalValue = Number(interval.value.trim())

  states = {
    interval: Number.isNaN(intervalValue) ? settings.interval : Math.max(1000, intervalValue),
    autoUpdatePagination: autoUpdatePagination.checked,
    debug: debug.checked,
  }

  interval.value = states.interval.toString()

  if (isChanged()) {
    localSettings.set(states).then(reload)
  }
})
