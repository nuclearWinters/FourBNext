import { FC } from "react"
import { useMediaQuery } from "../hooks/mediaQuery"

export const DescriptionMaterial: FC<{ children: string }> = ({ children }) => {
  const isMobile = useMediaQuery('(max-width: 800px)')
  return <div
    style={{
      fontFamily: 'Montserrat',
      fontSize: '14.6667px',
      lineHeight: '20px',
      fontWeight: '600',
      width: isMobile ? undefined : '450px',
      textAlign: 'center',
      marginBottom: '20px',
      padding: isMobile ? '20px' : undefined
    }}
  >
    {children}
  </div>
}