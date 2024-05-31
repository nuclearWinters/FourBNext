import Image from "next/image"
import { FC, ReactNode } from "react"
import cross from '../public/cross.svg'
import css from './ModalClose.module.css'

export const ModalClose: FC<{
    children: ReactNode
    onClose: () => void
    title: string
}> = ({ children, onClose, title }) => {
    return <div className={css.container}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
            <button onClick={onClose} className={css.closeButton}>
                <Image src={cross} alt="" height={40} width={40} />
            </button>
        </div>
        <div className={css.title}>{title}</div>
        {children}
    </div>
}