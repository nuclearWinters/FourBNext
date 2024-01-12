import { FC } from "react"

export const InformationText: FC<{ children: string }> = ({ children }) => {
  return <div
    style={{
      fontWeight: '400',
      color: 'rgb(49, 36, 30)',
      textDecoration: 'none',
      fontSize: '12px',
      textTransform: 'uppercase',
      lineHeight: '23px',
    }}
  >
    {children}
  </div>
}