import { DetailedHTMLProps, FC, InputHTMLAttributes } from "react"
import css from './ModalField.module.css'

interface Props extends DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> {
    label: string
}

export const ModalField: FC<Props> = ({ label, ...props }) => {
    return <div className={css.container}>
        <label htmlFor={props.id} className={css.label}>{label}</label>
        <input className={css.input} onWheel={(e) => e.currentTarget.blur()} {...props} />
    </div>
}