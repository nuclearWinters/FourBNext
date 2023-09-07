import { DetailedHTMLProps, FC, InputHTMLAttributes } from "react"
import css from './ModalCheckbox.module.css'

interface Props extends DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> {
    label: string
}

export const ModalCheckbox: FC<Props> = ({ label, ...props }) => {
    return <div className={css.container}>
        <input className={css.input} {...props} />
        <label htmlFor={props.id} className={css.label}>{label}</label>
    </div>
}