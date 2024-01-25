import { FC } from "react"
import { useMediaQuery } from "../hooks/mediaQuery";

export const HomeFullBig: FC<{ src: string; children: string }> = ({ src, children }) => {
    const isMobile = useMediaQuery('(max-width: 800px)')
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
                fontSize: isMobile ? '60px' : '180px',
                textTransform: 'capitalize',
                fontFamily: 'Kage',
            }}
        >
            {children}
        </div>
    </div>
}