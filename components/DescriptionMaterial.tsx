import { FC } from "react"

export const DescriptionMaterial: FC<{ children: string }> = ({ children }) => {
    return <div
      style={{
        fontFamily: 'Montserrat',
        fontSize: '14.6667px',
        lineHeight: '20px',
        fontWeight: '600',
        width: '450px',
        textAlign: 'center',
        marginBottom: '20px'
      }}
    >
      {children}
    </div>
}