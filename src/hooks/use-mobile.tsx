
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT
      setIsMobile(mobile)
      console.log('Mobile detection updated:', mobile, 'Screen width:', window.innerWidth)
    }
    
    mql.addEventListener("change", onChange)
    onChange() // Call immediately to set initial state
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
