import { DetailedHTMLProps, FC, InputHTMLAttributes, useEffect, useRef } from "react"
import css from './ModalField.module.css'

interface Props extends DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> {
    label: string
    focusOnMount?: boolean
}

export const ModalField: FC<Props> = ({ label, focusOnMount, ...props }) => {
    const ref = useRef<HTMLInputElement | null>(null)
    useEffect(() => {
        if (focusOnMount) {
            ref.current?.focus()
        }
    }, [])
    return <div className={css.container}>
        <label htmlFor={props.id} className={css.label}>{label}</label>
        <input ref={ref} className={css.input} onWheel={(e) => e.currentTarget.blur()} {...props} />
    </div>
}