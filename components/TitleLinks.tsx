import { FC } from "react"

export const TitleLinks: FC<{ children: string }> = ({ children }) => {
    return <div
        style={{
            fontWeight: '400',
            color: 'black',
            fontSize: '58px',
            textTransform: 'capitalize',
            marginTop: '0px',
            fontFamily: 'Kage',
            marginBottom: '40px',
        }}
    >
        {children}
    </div>
}