import { FC } from "react"

export const HomeSubtitle: FC<{ children: string }> = ({ children }) => {
    return <div
    style={{
        fontSize: '15px',
        lineHeight: '20px',
        textAlign: 'center',
        fontWeight: '400',
        color: 'rgb(49, 36, 30)',
        paddingTop: '12px',
        fontFamily: 'PoppinsNormal',
        marginBottom: '36px',
    }}
  >
    {children}
  </div>
}