import Link from "next/link";
import { FC, useState } from "react"
import { toCurrency, trpc } from "../utils/config";
import { Modal } from "./Modal";
import { ModalClose } from "./ModalClose";
import { ModalField } from "./ModalField";
import { ModalCheckbox } from "./ModalCheckbox";
import cross from '../public/cross.svg'
import Image from "next/image";

export const EditProduct: FC<{
    product: {
        code: string;
        name: string;
        price: number;
        img: string[];
        _id: string;
        available: number;
        total: number;
        discount_price: number;
        use_discount: boolean;
        tags: string[];
        img_small: string[];
        img_big: string[];
        available_small: number;
        total_small: number;
        available_big: number;
        total_big: number;
        use_small_and_big: boolean;
    }
    onSuccessEdit: () => void
}> = ({
    product,
    onSuccessEdit,
}) => {
        const [showModal, setShowModal] = useState(false)
        const onCloseCallback = () => {
            setShowModal(false)
        }
        const [form, setForm] = useState({
            ...product,
            discount_price: toCurrency(String(product.discount_price), '.'),
            price: toCurrency(String(product.price), '.'),
            increment: '0',
            incrementSmall: '0',
            incrementBig: '0',
            checkboxArete: product.tags.includes('arete'),
            checkboxCollar: product.tags.includes('collar'),
            checkboxAnillo: product.tags.includes('anillo'),
            checkboxPulsera: product.tags.includes('pulser'),
            checkboxPiercing: product.tags.includes('piercing'),
            checkboxTobillera: product.tags.includes('tobillera'),
            checkboxOro10K: product.tags.includes('oro10k'),
            checkboxAjustable: product.tags.includes('ajustable'),
            checkboxTalla5: product.tags.includes('talla5'),
            checkboxTalla6: product.tags.includes('talla6'),
            checkboxTalla7: product.tags.includes('talla7'),
            checkboxTalla8: product.tags.includes('talla8'),
            checkboxTalla9: product.tags.includes('talla9'),
            checkboxTalla10: product.tags.includes('talla10'),
        })
        const editProduct = trpc.editProduct.useMutation()
        return <div>
            <button className="fourb-button" onClick={() => {
                setShowModal(true)
            }}>
                Editar
            </button>
            {showModal ? <Modal onClose={onCloseCallback}>
                <ModalClose onClose={onCloseCallback} title={"Editar producto"}>
                    <div className="product-card">
                        <form onSubmit={(e) => {
                            e.preventDefault()
                            editProduct.mutate({
                                id: product._id,
                                name: form.name,
                                code: form.code,
                                increment: Number(form.increment),
                                incrementBig: Number(form.incrementBig),
                                incrementSmall: Number(form.incrementSmall),
                                img: form.img,
                                imgSmall: form.img_small,
                                imgBig: form.img_big,
                                useDiscount: form.use_discount,
                                useSmallAndBig: form.use_small_and_big,
                                discountPrice: Number(form.discount_price) * 100,
                                price: Number(form.price) * 100,
                                checkboxArete: form.tags.includes('arete'),
                                checkboxCollar: form.tags.includes('collar'),
                                checkboxAnillo: form.tags.includes('anillo'),
                                checkboxPulsera: form.tags.includes('pulsera'),
                                checkboxPiercing: form.tags.includes('piercing'),
                                checkboxTobillera: form.tags.includes('tobillera'),
                                checkboxOro10K: form.tags.includes('oro10k'),
                                checkboxAjustable: form.tags.includes('ajustable'),
                                checkboxTalla5: form.tags.includes('talla5'),
                                checkboxTalla6: form.tags.includes('talla6'),
                                checkboxTalla7: form.tags.includes('talla7'),
                                checkboxTalla8: form.tags.includes('talla8'),
                                checkboxTalla9: form.tags.includes('talla9'),
                                checkboxTalla10: form.tags.includes('talla10'),
                            }, {
                                onSuccess: () => {
                                    setShowModal(false)
                                    onSuccessEdit()
                                }
                            })
                        }}>
                            <ModalField
                                id="name"
                                label="Nombre"
                                required
                                name="name"
                                type="text"
                                value={form.name}
                                onChange={(e) => {
                                    setForm(state => ({ ...state, [e.target.name]: e.target.value }))
                                }}
                            />
                            <ModalField
                                id="code"
                                label="Código"
                                required
                                name="code"
                                type="text"
                                value={form.code}
                                onChange={(e) => {
                                    setForm(state => ({ ...state, [e.target.name]: e.target.value }))
                                }}
                            />
                            <ModalField
                                id="price"
                                label="Precio"
                                required
                                name="price"
                                type="number"
                                value={form.price}
                                onChange={(e) => {
                                    setForm(state => ({ ...state, [e.target.name]: toCurrency(e.target.value, '.') }))
                                }}
                                pattern="\d*"
                                step="any"
                            />
                            <ModalCheckbox
                                id="use_discount"
                                label="Usar descuento"
                                name="use_discount"
                                type="checkbox"
                                checked={form.use_discount}
                                onChange={(e) => {
                                    setForm(state => ({ ...state, [e.target.name]: e.target.checked }))
                                }}
                            />
                            <div style={{ opacity: form.use_discount ? '1' : '0.4', pointerEvents: form.use_discount ? 'auto' : 'none' }}>
                                <ModalField
                                    id="discount_price"
                                    label="Precio de descuento"
                                    required
                                    name="discount_price"
                                    type="number"
                                    value={form.discount_price}
                                    onChange={(e) => {
                                        setForm(state => ({ ...state, [e.target.name]: toCurrency(e.target.value, '.') }))
                                    }}
                                    pattern="\d*"
                                    step="any"
                                />
                            </div>
                            <ModalCheckbox
                                id="use_small_and_big"
                                label="Usar opcion pequeña y grande"
                                name="use_small_and_big"
                                type="checkbox"
                                checked={form.use_small_and_big}
                                onChange={(e) => {
                                    setForm(state => ({ ...state, [e.target.name]: e.target.checked }))
                                }}
                            />
                            {form.use_small_and_big
                                ? (
                                    <>
                                        <div className="img-title">
                                            Version grande
                                        </div>
                                        <div style={{ marginLeft: 20 }}>
                                            <input name="image-big" multiple type="file" accept="png,jpg,jpeg" />
                                            <div className="input-container images-container">
                                                {product.img_big.map((img, index) => {
                                                    return <div style={{ position: 'relative', marginTop: 20 }} key={index}>
                                                        <button className="closeImgButton"><Image src={cross} alt="" height={10} /></button>
                                                        <img className="img-uploaded" alt="" width={"100%"} src={img} />
                                                    </div>
                                                })}
                                            </div>
                                            <ModalField
                                                id="incrementBig"
                                                label={`Añadir al inventario (Disponible: ${product.available_big} de ${product.total_big})`}
                                                required
                                                name="incrementBig"
                                                type="number"
                                                value={form.incrementBig}
                                                onChange={(e) => {
                                                    setForm(state => ({ ...state, [e.target.name]: e.target.value }))
                                                }}
                                            />
                                        </div>
                                        <div className="img-title">
                                            Version chica
                                        </div>
                                        <div style={{ marginLeft: 20 }}>
                                            <input name="image-small" multiple type="file" accept="png,jpg,jpeg" />
                                            <div className="input-container images-container">
                                                {product.img_small.map((img, index) => {
                                                    return <div style={{ position: 'relative', marginTop: 20 }} key={index}>
                                                        <button className="closeImgButton"><Image src={cross} alt="" height={10} /></button>
                                                        <img className="img-uploaded" alt="" width="100%" src={img} />
                                                    </div>
                                                })}
                                            </div>
                                            <ModalField
                                                id="incrementSmall"
                                                label={`Añadir al inventario (Disponible: ${product.available_small} de ${product.total_small})`}
                                                required
                                                name="incrementSmall"
                                                type="number"
                                                value={form.incrementSmall}
                                                onChange={(e) => {
                                                    setForm(state => ({ ...state, [e.target.name]: e.target.value }))
                                                }}
                                            />
                                        </div>
                                    </>
                                )
                                : null
                            }
                            {form.use_small_and_big
                                ? null
                                : (
                                    <>
                                        <div className="img-title">
                                            Imagenes
                                        </div>
                                        <div className="input-container images-container">
                                            <input name="image" multiple type="file" accept="png,jpg,jpeg" />
                                            {product.img.map((img, index) => {
                                                return <div style={{ position: 'relative' }} key={index}>
                                                    <button className="closeImgButton"><Image src={cross} alt="" height={10} /></button>
                                                    <img className="img-uploaded" alt="" width="100%" src={img} />
                                                </div>
                                            })}
                                        </div>
                                        <ModalField
                                            id="increment"
                                            label={`Añadir al inventario (Disponible: ${product.available} de ${product.total})`}
                                            required
                                            name="increment"
                                            type="number"
                                            value={toCurrency(String(form.increment), '.')}
                                            onChange={(e) => {
                                                setForm(state => ({ ...state, [e.target.name]: e.target.value }))
                                            }}
                                            pattern="\d*"
                                            step="any"
                                        />
                                    </>
                                )
                            }
                            <div className="input-container">
                                <label htmlFor="discount">Tags</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', }}>
                                    <div style={{ width: '25%' }}>
                                        <input type="checkbox" id={`checkboxArete`} name="checkboxArete" checked={form.checkboxArete} onChange={(e) => {
                                            setForm(state => ({ ...state, [e.target.name]: e.target.checked }))
                                        }} />
                                        <label htmlFor={`checkboxArete`}>Arete</label>
                                    </div>
                                    <div style={{ width: '25%' }}>
                                        <input type="checkbox" id={`checkboxCollar`} name="checkboxCollar" checked={form.checkboxCollar} onChange={(e) => {
                                            setForm(state => ({ ...state, [e.target.name]: e.target.checked }))
                                        }} />
                                        <label htmlFor={`checkboxCollar`}>Collar</label>
                                    </div>
                                    <div style={{ width: '25%' }}>
                                        <input type="checkbox" id={`checkboxAnillo`} name="checkboxAnillo" checked={form.checkboxAnillo} onChange={(e) => {
                                            setForm(state => ({ ...state, [e.target.name]: e.target.checked }))
                                        }} />
                                        <label htmlFor={`checkboxAnillo`}>Anillo</label>
                                    </div>
                                    <div style={{ width: '25%' }}>
                                        <input type="checkbox" id={`checkboxPulsera`} name="checkboxPulsera" checked={form.checkboxPulsera} onChange={(e) => {
                                            setForm(state => ({ ...state, [e.target.name]: e.target.checked }))
                                        }} />
                                        <label htmlFor={`checkboxPulsera`}>Pulsera</label>
                                    </div>
                                    <div style={{ width: '25%' }}>
                                        <input type="checkbox" id={`checkboxPiercing`} name="checkboxPiercing" checked={form.checkboxPiercing} onChange={(e) => {
                                            setForm(state => ({ ...state, [e.target.name]: e.target.checked }))
                                        }} />
                                        <label htmlFor={`checkboxPiercing`}>Piercing</label>
                                    </div>
                                    <div style={{ width: '25%' }}>
                                        <input type="checkbox" id={`checkboxTobillera`} name="checkboxTobillera" checked={form.checkboxTobillera} onChange={(e) => {
                                            setForm(state => ({ ...state, [e.target.name]: e.target.checked }))
                                        }} />
                                        <label htmlFor={`checkboxTobillera`}>Tobillera</label>
                                    </div>
                                    <div style={{ width: '25%' }}>
                                        <input type="checkbox" id={`checkboxOro10K`} name="checkboxOro10K" checked={form.checkboxOro10K} onChange={(e) => {
                                            setForm(state => ({ ...state, [e.target.name]: e.target.checked }))
                                        }} />
                                        <label htmlFor={`checkboxOro10K`}>ORO 10 K</label>
                                    </div>
                                    <div style={{ width: '25%' }}>
                                        <input type="checkbox" id={`checkboxAjustable`} name="checkboxAjustable" checked={form.checkboxAjustable} onChange={(e) => {
                                            setForm(state => ({ ...state, [e.target.name]: e.target.checked }))
                                        }} />
                                        <label htmlFor={`checkboxAjustable`}>Ajustable</label>
                                    </div>
                                    <div style={{ width: '25%' }}>
                                        <input type="checkbox" id={`checkboxTalla5`} name="checkboxTalla5" checked={form.checkboxTalla5} onChange={(e) => {
                                            setForm(state => ({ ...state, [e.target.name]: e.target.checked }))
                                        }} />
                                        <label htmlFor={`checkboxTalla5`}>Talla 5</label>
                                    </div>
                                    <div style={{ width: '25%' }}>
                                        <input type="checkbox" id="checkboxTalla6" name="checkboxTalla6" checked={form.checkboxTalla6} onChange={(e) => {
                                            setForm(state => ({ ...state, [e.target.name]: e.target.checked }))
                                        }} />
                                        <label htmlFor={`checkboxTalla6`}>Talla 6</label>
                                    </div>
                                    <div style={{ width: '25%' }}>
                                        <input type="checkbox" id="checkboxTalla7" name="checkboxTalla7" checked={form.checkboxTalla7} onChange={(e) => {
                                            setForm(state => ({ ...state, [e.target.name]: e.target.checked }))
                                        }} />
                                        <label htmlFor={`checkboxTalla7`}>Talla 7</label>
                                    </div>
                                    <div style={{ width: '25%' }}>
                                        <input type="checkbox" id={`checkboxTalla8`} name="checkboxTalla8" checked={form.checkboxTalla8} onChange={(e) => {
                                            setForm(state => ({ ...state, [e.target.name]: e.target.checked }))
                                        }} />
                                        <label htmlFor={`checkboxTalla8`}>Talla 8</label>
                                    </div>
                                    <div style={{ width: '25%' }}>
                                        <input type="checkbox" id={`checkboxTalla9`} name="checkboxTalla9" checked={form.checkboxTalla9} onChange={(e) => {
                                            setForm(state => ({ ...state, [e.target.name]: e.target.checked }))
                                        }} />
                                        <label htmlFor={`checkboxTalla9`}>Talla 9</label>
                                    </div>
                                    <div style={{ width: '25%' }}>
                                        <input type="checkbox" id={`checkboxTalla10`} name="checkboxTalla10" checked={form.checkboxTalla10} onChange={(e) => {
                                            setForm(state => ({ ...state, [e.target.name]: e.target.checked }))
                                        }} />
                                        <label htmlFor={`checkboxTalla10`}>Talla 10</label>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" className="fourb-button">Actualizar</button>
                            <Link href={`/product/${product._id}`} type="button" className="fourb-button">VER</Link>
                        </form>
                    </div>
                </ModalClose>
            </Modal> : null}
        </div>
    }