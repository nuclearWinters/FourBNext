import { DetailedHTMLProps, FC, InputHTMLAttributes, useEffect, useRef } from "react"
import css from './ModalTextArea.module.css'

interface Props extends DetailedHTMLProps<InputHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement> {
    label: string
    focusOnMount?: boolean
}

export const ModalTextArea: FC<Props> = ({ label, focusOnMount, ...props }) => {
    const ref = useRef<HTMLTextAreaElement | null>(null)
    useEffect(() => {
        if (focusOnMount) {
            ref.current?.focus()
        }
    }, [])
    return <div className={css.container}>
        <label htmlFor={props.id} className={css.label}>{label}</label>
        <textarea ref={ref} className={css.input} {...props} />
    </div>
}