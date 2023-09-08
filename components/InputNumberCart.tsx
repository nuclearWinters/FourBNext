import { DetailedHTMLProps, FC, InputHTMLAttributes } from "react"
import css from './InputNumberCart.module.css'

interface Props extends DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> {
    label: string
    onMinus: () => void
    onPlus: () => void
}

export const InputNumberCart: FC<Props> = ({ label, onMinus, onPlus, ...props }) => {
    return <div className={css.container}>
        <label htmlFor={props.id} className={css.label}>{label}</label>
        <div className={css.inputGroup}>
            <input type="button" value="-" className={css.buttonMinus} onClick={onMinus} />
            <input type="number" step="1" max="" value="1" name="quantity" className={css.quantityField} onWheel={(e) => e.currentTarget.blur()}  {...props} />
            <input type="button" value="+" className={css.buttonPlus} onClick={onPlus} />
        </div>
    </div>
}