import Link from "next/link"
import { FC, ReactNode } from "react"

export const HomeHalf: FC<{
    src: string;
    moreButtonLink?: string
    title?: ReactNode
}> = ({ src, moreButtonLink, title }) => {
    return <div style={{
        flex: 1,
        backgroundImage: `url(${src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexDirection: 'column',
    }}>
        {title}
        {moreButtonLink ? <Link
            href={moreButtonLink}
            style={{
                background: "rgb(253, 240, 224)",
                border: "none",
                color: "black",
                fontSize: '24px',
                lineHeight: '33px',
                padding: '8px 60px',
                cursor: "pointer",
                textAlign: 'center',
                borderRadius: '100px',
                marginBottom: '66px',
            }}
        >
            VER MÁS
        </Link> : null}
    </div>
}