import { defaultLogger } from '@/utils/logger'
import { localSettings } from '@/utils/settings'

declare global {
  //  dataset attributes
  interface DOMStringMap {
    /** Whether the element is observed by the {@linkcode IntersectionObserver observer}. */
    observer: string
    /** The page number. 1-based. */
    page: string
  }
}

const SELECTORS = {
  // PAGINATION: 'table[role=presentation]',
  PAGINATION: '[id="botstuff"] [role="navigation"]',
  PAGE_CELL: 'td.NKTSme',
  PAGE_ANCHOR: 'a[aria-label*="Page"]',
  FOOTER: '#sfooter',
  HEADER: '[jscontroller="Zby8rf"]',
  APP_BAR: '[jscontroller="O63OXd"]',
}
const urls = new Map<number, string>()
const settings = await localSettings.get()
defaultLogger.mount(settings.debug) // enable debug logging
console.green('extension loaded 🎉')
/** Whether the document is first loaded. Use to {@linkcode extractUrls extract the initial page number}. */
let isFirstLoaded = true
/** The initial page number when the document first loads */
let initialPage = 1
/** The last time the iframe is loaded */
let lastIframeLoadedTime = Date.now()
let loadingEl: HTMLDivElement | null = null

/**
 * Extract the urls from the pagination
 * @returns The map of {@linkcode urls urls}
 */
const extractUrls = (doc: Document | null = document) => {
  const pagination = doc?.querySelector(SELECTORS.PAGINATION)
  if (!pagination) return urls

  // extract the initial page number
  if (isFirstLoaded) {
    const tds = [...pagination.querySelectorAll<HTMLTableCellElement>(SELECTORS.PAGE_CELL)]
    const index = tds.findIndex((td) => td.firstElementChild?.tagName === 'SPAN')
    if (index !== -1) {
      initialPage = index + 1
      document.documentElement.dataset.observer = 'true'
      document.documentElement.dataset.page = initialPage.toString()
    } else {
      console.red('initial page number not found')
    }
    isFirstLoaded = false
  }

  const _extract = (map: typeof urls, anchor: HTMLAnchorElement) => {
    const page = Number(anchor.ariaLabel?.split(' ')[1] || 0)
    const existing = map.has(page)
    if (!existing) {
      map.set(page, anchor.href)
    }
    return map
  }

  return [...pagination.querySelectorAll<HTMLAnchorElement>(SELECTORS.PAGE_ANCHOR)].reduce(_extract, urls)
}

const hidePagination = (root: Document) => {
  const pagination = root.querySelector<HTMLElement>(SELECTORS.PAGINATION)
  if (pagination) {
    pagination.style.display = 'none'
  }
}

const hideFooter = (root: Document) => {
  const footer = root.querySelector<HTMLElement>(SELECTORS.FOOTER)
  if (footer) {
    footer.style.display = 'none'
  }
}

/**
 * Transform the urls into iframes
 * @param page The page number. 1-based.
 * @param onLoaded The callback to be called when the iframe is loaded
 */
const iframify = async (page: number, onLoaded?: (ctx: { page: number; iframe: HTMLIFrameElement }) => void) => {
  const url = urls.get(page)
  const iframe = document.createElement('iframe') // create the unstyled iframe

  if (!url) return iframe
  const res = await fetch(url)

  if (!res.ok) {
    console.red(`page ${page} fetch failed`)
    return iframe
  }

  const html = await res.text()
  iframe.srcdoc = html
  iframe.dataset.observer = 'true'
  iframe.dataset.page = page.toString()
  iframe.style.width = '100%'
  iframe.style.height = '100%'
  iframe.style.border = 'none'
  iframe.scrolling = 'no'

  iframe.onload = () => {
    const doc = iframe.contentDocument
    if (!doc) return

    const height = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight)

    iframe.style.height = `${height - 200}px` // minus the height of the removed elements

    if (settings.autoUpdatePagination) {
      // update the URLS map
      extractUrls(iframe.contentDocument)
    }

    // remove the duplicate elements
    hidePagination(doc)
    // remove header
    const header = doc.querySelector<HTMLElement>(SELECTORS.HEADER)
    if (header) {
      header.style.display = 'none'
    }

    // remove footer
    hideFooter(doc)

    const bar = doc.querySelector<HTMLElement>(SELECTORS.APP_BAR)
    if (bar) {
      // const extra =
      //   pageLocated !== 1 && page === pageLocated + 1
      //     ? '<span>( Click the pagination above to navigate to the previous page. )</span>'
      //     : ''
      bar.innerHTML = `
        <div style="font-size: 18px; color: #888; font-weight: 700; width: fit-content;display: flex; align-items: center; gap: 8px">
          Page ${page}
        </div>
      `
    }

    onLoaded?.({
      page,
      iframe,
    })
  }

  return iframe
}

/**
 * Set up the intersection observer
 */
const setupIntersectionObserver = (callback?: (entry: IntersectionObserverEntry, page: number) => void) => {
  let currentTarget: HTMLElement | null = null

  const intersectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue

      const target = entry.target as HTMLElement
      const page = Number(target.dataset.page || 0)

      intersectionObserver.unobserve(target)

      if (currentTarget === target) {
        currentTarget = null
      }

      callback?.(entry, page)
    }
  })

  const observeLast = () => {
    const targets = document.querySelectorAll<HTMLElement>('[data-observer="true"]')
    const latest = targets[targets.length - 1]

    if (!latest || latest === currentTarget) return

    if (currentTarget) {
      intersectionObserver.unobserve(currentTarget)
    }

    currentTarget = latest
    intersectionObserver.observe(latest)
  }

  observeLast()

  return {
    observeLast,
    cleanup() {
      if (currentTarget) {
        intersectionObserver.unobserve(currentTarget)
      }

      intersectionObserver.disconnect()
    },
  }
}

/**
 * Get the number of milliseconds left until the next page can be loaded
 * @returns The number of milliseconds left, or 0 if the next page can be loaded immediately
 */
const timeLeft = () => Math.max(settings.interval - (Date.now() - lastIframeLoadedTime), 0)

/**
 * Create the loading element
 */
const createLoadingEl = () => {
  if (!loadingEl) {
    loadingEl = document.createElement('div')
    loadingEl.id = 'infinite-search-loading'
    loadingEl.textContent = 'Loading next page...'
    loadingEl.style.cssText = `
      display: none;
      justify-content: center;
      align-items: center;
      gap: 8px;
      padding: 32px;
      color: #888;
      font-size: 14px;
      font-weight: 500;
    `
    document.body.appendChild(loadingEl)
  }

  const showLoading = () => {
    if (loadingEl) {
      loadingEl.style.display = 'flex'
    }
  }

  const hideLoading = () => {
    if (loadingEl) {
      loadingEl.style.display = 'none'
    }
  }

  return {
    showLoading,
    hideLoading,
  }
}

// #region Process
extractUrls()

const { showLoading, hideLoading } = createLoadingEl()
hidePagination(document)
hideFooter(document)

const ob = setupIntersectionObserver(async (_, page) => {
  console.gray(`observe page ${page}, start loading page ${page + 1}`)
  if (page > urls.size) {
    ob.cleanup()
    console.gray('all pages loaded')
    return
  }

  const newPage = await iframify(page + 1, ({ page, iframe }) => {
    lastIframeLoadedTime = Date.now()
    console.gray(`page ${page} loaded time is ${lastIframeLoadedTime}`)

    if (settings.autoUpdatePagination) {
      extractUrls(iframe.contentDocument)
    }

    const delay = timeLeft()
    if (delay) {
      showLoading()
      console.gray(`show loading spinner when starting page ${page}`)
    }
    setTimeout(() => {
      ob.observeLast()
      hideLoading()
      console.gray(`hide loading spinner`)
    }, delay)
  })

  // insert the new page before the loading element
  document.body.insertBefore(newPage, loadingEl)

  console.green(`page ${page + 1} insert completed`)
})
// #endregion Process
