import { CSSProperties, DetailedHTMLProps, FC, InputHTMLAttributes } from "react"
import css from './ModalCheckbox.module.css'

interface Props extends DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> {
    label: string
    containerStyle?: CSSProperties
}

export const ModalCheckbox: FC<Props> = ({ label, containerStyle, ...props }) => {
    return <div className={css.container} style={containerStyle}>
        <input className={css.input} {...props} />
        <label htmlFor={props.id} className={css.label}>{label}</label>
    </div>
}