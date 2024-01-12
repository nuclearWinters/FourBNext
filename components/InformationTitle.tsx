import { FC } from "react"

export const InformationTitle: FC<{ children: string }> = ({ children }) => {
    return <div
        style={{
            fontWeight: '700',
            fontStyle: 'italic',
            color: 'rgb(49, 36, 30)',
            textDecoration: 'none',
            fontSize: '18px',
            lineHeight: '25px',
            paddingBottom: '5px',
        }}
    >
        {children}
    </div>
}