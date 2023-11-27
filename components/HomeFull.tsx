import Link from "next/link"
import { FC } from "react"

export const HomeFull: FC<{
    src: string
    moreButtonLink?: string
}> = ({ src, moreButtonLink }) => {
    return <div
      style={{
        backgroundImage: `url(${src})`,
        height: 518,
        backgroundSize: 'cover',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexDirection: 'column',
        backgroundPosition: 'center',
      }}
    >
      {moreButtonLink ? <Link
        href={moreButtonLink}
        style={{
          background: "rgb(253, 240, 224)",
          border: "none",
          color: "black",
          fontSize: '24px',
          lineHeight: '33px',
          padding: '4px 10px',
          cursor: "pointer",
          textAlign: 'center',
          borderRadius: '100px',
          marginBottom: '66px'
        }}
      >
        VER TODO LO NUEVO
      </Link> : null}
    </div>
}