declare global {
  interface Console {
    green: (...args: any[]) => void
    red: (...args: any[]) => void
    gray: (...args: any[]) => void
  }
}

export const createLogger = (label: string, background: string, enabled: boolean = true) => {
  if (!enabled) return () => {}
  return (...args: any[]) => {
    console.log(
      `%c${label}`,
      `
        background:${background};
        color:#fff;
        font-weight:600;
        padding:2px 6px;
        border-radius:4px;
        `,
      ...args,
    )
  }
}

export const defaultLogger = {
  mount: (enabled: boolean = true) => {
    console.green = createLogger('[Infinite Search]', '#22c55e', enabled)
    console.red = createLogger('[Infinite Search]', '#ef4444', enabled)
    console.gray = createLogger('[Infinite Search]', '#6b7280', enabled)
  },
}
