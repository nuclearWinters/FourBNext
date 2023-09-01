import { FC, ReactNode, useEffect, useRef } from "react"

import css from "./Modal.module.css"

export const Modal: FC<{
  children: ReactNode
  onClose: () => void
  className?: string
  innerClassName?: string
}> = ({ children, onClose, className, innerClassName }) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [wrapperRef, onClose])

  return (
    <div className={className ?? css.modalContainer}>
      <div className={innerClassName ?? css.innerDivResponsive} ref={wrapperRef}>
        {children}
      </div>
    </div>
  )
}