import { useEffect } from 'react'

const SECTION_SELECTOR = '.hero, .about-section, .media-panel'
const WHEEL_THRESHOLD = 26
const LOCK_MS = 620

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function sectionTops() {
  return Array.from(document.querySelectorAll<HTMLElement>(SECTION_SELECTOR))
    .map((element) => ({ element, top: element.getBoundingClientRect().top + window.scrollY }))
    .sort((a, b) => a.top - b.top)
}

// A section can outgrow the viewport (long bio). Then it scrolls natively instead of paging.
function sectionOverflows(element: HTMLElement) {
  return element.getBoundingClientRect().height > window.innerHeight + 4
}

function activeIndex(list: { top: number }[]) {
  const y = window.scrollY + 8
  let index = 0

  for (let i = 0; i < list.length; i += 1) {
    if (list[i].top <= y) index = i
  }

  return index
}

// True when the pointer is over something that scrolls on its own (admin panel, long lists).
function ownsScroll(target: EventTarget | null, deltaY: number) {
  let element = target instanceof Element ? (target as HTMLElement) : null

  while (element && element !== document.body && element !== document.documentElement) {
    const overflowY = getComputedStyle(element).overflowY
    const scrollable =
      /(auto|scroll|overlay)/.test(overflowY) && element.scrollHeight > element.clientHeight + 1

    if (scrollable) {
      const atTop = element.scrollTop <= 0
      const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1
      if (deltaY > 0 ? !atBottom : !atTop) return true
    }

    element = element.parentElement
  }

  return false
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable || target.closest('[data-no-paging]')) return true
  return /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
}

function modalOpen() {
  return Boolean(document.querySelector('.admin-overlay'))
}

export default function useSectionPaging(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    let lockedUntil = 0
    let pending = 0
    let resetTimer = 0

    const goTo = (index: number, list: { element: HTMLElement; top: number }[]) => {
      const target = list[Math.min(list.length - 1, Math.max(0, index))]
      if (!target) return

      const start = window.scrollY
      lockedUntil = performance.now() + LOCK_MS

      if (prefersReducedMotion()) {
        window.scrollTo({ top: target.top, behavior: 'instant' })
        return
      }

      window.scrollTo({ top: target.top, behavior: 'smooth' })

      // Some browsers drop the smooth animation (throttled tabs, reduced-motion overrides).
      // If nothing moved, land on the section instead of leaving the page stuck.
      window.setTimeout(() => {
        if (Math.abs(window.scrollY - start) < 4 && Math.abs(window.scrollY - target.top) > 4) {
          window.scrollTo({ top: target.top, behavior: 'instant' })
        }
      }, 500)
    }

    const step = (direction: number) => {
      const list = sectionTops()
      if (list.length < 2) return
      goTo(activeIndex(list) + direction, list)
    }

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || modalOpen()) return

      const now = performance.now()
      if (now < lockedUntil) {
        event.preventDefault()
        return
      }

      if (ownsScroll(event.target, event.deltaY)) return

      const list = sectionTops()
      const current = list[activeIndex(list)]?.element

      if (current && sectionOverflows(current)) {
        const rect = current.getBoundingClientRect()
        const canScrollInside = event.deltaY > 0 ? rect.bottom > window.innerHeight + 8 : rect.top < -8
        if (canScrollInside) return
      }

      event.preventDefault()

      pending += event.deltaY
      window.clearTimeout(resetTimer)
      resetTimer = window.setTimeout(() => {
        pending = 0
      }, 220)

      if (Math.abs(pending) < WHEEL_THRESHOLD) return

      const direction = pending > 0 ? 1 : -1
      pending = 0
      step(direction)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target) || modalOpen()) return

      const list = sectionTops()
      if (list.length < 2) return

      if (event.key === 'Home') {
        event.preventDefault()
        goTo(0, list)
        return
      }

      if (event.key === 'End') {
        event.preventDefault()
        goTo(list.length - 1, list)
        return
      }

      const direction =
        event.key === 'ArrowDown' || event.key === 'PageDown'
          ? 1
          : event.key === 'ArrowUp' || event.key === 'PageUp'
            ? -1
            : 0

      if (!direction) return

      event.preventDefault()
      goTo(activeIndex(list) + direction, list)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(resetTimer)
    }
  }, [enabled])
}
