import { FC } from "react"

export const HomeFullBig: FC<{ src: string; children: string }> = ({ src, children }) => {
    return <div
        style={{
            backgroundImage: `url(${src})`,
            height: 685,
            backgroundSize: 'cover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            backgroundPosition: '50% 56%',
        }}
    >
        <div
            style={{
                fontWeight: '400',
                color: 'rgb(255, 255, 255)',
                fontSize: '180px',
                textTransform: 'capitalize',
                fontFamily: 'Kage',
            }}
        >
            {children}
        </div>
    </div>
}