import { FC } from "react"

export const InformationStreet: FC<{ children: string }> = ({ children }) => {
    return <div
        style={{
            fontWeight: '600',
            color: 'rgb(0, 0, 0)',
            textDecoration: 'none',
            fontSize: '12px',
            textTransform: 'uppercase',
            lineHeight: '16px',
            textAlign :'center',
        }}
    >
        {children}
    </div>
}