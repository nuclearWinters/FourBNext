import { FC } from "react"

export const HomeTitleHalf: FC<{ children: string }> = ({ children }) => {
    return <div
        style={{
            fontWeight: '400',
            color: 'rgb(255, 255, 255)',
            fontSize: '58px',
            textTransform: 'capitalize',
            marginTop: '80px',
            fontFamily: 'Kage',
        }}
    >
        {children}
    </div>
}