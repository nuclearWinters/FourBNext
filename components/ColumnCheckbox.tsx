import { CSSProperties, DetailedHTMLProps, FC, InputHTMLAttributes } from "react"
import css from './ColumnCheckbox.module.css'

interface Props extends DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> {
    containerStyle?: CSSProperties
}

export const ColumnCheckbox: FC<Props> = ({ containerStyle, ...props }) => {
    return <div className={css.container} style={containerStyle}>
        <input className={css.input} {...props} type="checkbox" />
    </div>
}