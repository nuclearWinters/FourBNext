import { FC } from "react"

export const HomeTitle: FC<{ children: string }> = ({ children }) => {
    return <div
    style={{
      fontWeight: '700',
      fontStyle: 'italic',
      color: 'rgb(49, 36, 30)',
      textDecoration: 'none',
      fontSize: '46px',
      textAlign: 'center',
      paddingTop: '80px',
    }}
  >
    {children}
  </div>
}