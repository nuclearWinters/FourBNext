import { useRouter } from 'next/router'
import css from './Layout.module.css'
import { Dispatch, FC, SetStateAction, useState } from 'react'
import cross from '../public/cross.svg'
import Image from 'next/image'

export const SearchModal: FC<{
    setShowSearchModal: Dispatch<SetStateAction<boolean>>
}> = ({ setShowSearchModal }) => {
    const router = useRouter()
    const [input, setInput] = useState('')
    return <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        left: 0,
        bottom: 0,
        background: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    }}>
        <form
            style={{
                width: '100%',
                display: 'flex',
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
            }}
            className={css.formSearch}
            onSubmit={(e) => {
                e.preventDefault()
                setShowSearchModal(false)
                if (input.toLowerCase() === "descuento" || input.toLowerCase() === "descuentos") {
                    router.push('/search?discounts=true')
                } else {
                    router.push('/search?search=' + input)
                }
            }}
        >
            <input
                style={{
                    height: '50px',
                    width: '50%'
                }}
                className="searchProduct"
                name="search"
                placeholder="Busqueda..."
                value={input}
                onChange={e => {
                    setInput(e.target.value)
                }}
            />
            <button
                className="closeImgButtonSearch"
                type="button"
                onClick={() => {
                    setShowSearchModal(false)
                }}
            >
                <Image src={cross} alt="" height={20} width={20} />
            </button>
        </form>
    </div>
}