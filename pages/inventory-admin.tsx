import { Fragment, useState } from "react"
import { toCurrency, trpc } from "../utils/config"
import { EditProduct } from "../components/EditProduct";
import Image from "next/image";
import { Modal } from "../components/Modal";
import { ModalClose } from "../components/ModalClose";
import { ModalField } from "../components/ModalField";
import { ModalCheckbox } from "../components/ModalCheckbox";
import cross from '../public/cross.svg'

export default function InventoryAdmin() {
    const [search, setSearch] = useState('')
    const searchProducts = trpc.inventory.useInfiniteQuery(
        { limit: 20, search },
        { getNextPageParam: (lastPage) => lastPage.nextCursor, }
    );
    const [showCreate, setShowCreate] = useState(false)
    const onCloseCallback = () => {
        setShowCreate(false)
    }
    const [form, setForm] = useState({
        name: '',
        code: '',
        price: '0.00',
        use_discount: false,
        discount_price: '0.00',
        use_small_and_big: false,
        incrementBig: '0',
        incrementSmall: '0',
        increment: '0',
        img: [] as string[],
        img_small: [] as string[],
        img_big: [] as string[],
        checkboxArete: false,
        checkboxCollar: false,
        checkboxAnillo: false,
        checkboxPulsera: false,
        checkboxPiercing: false,
        checkboxTobillera: false,
        checkboxOro10K: false,
        checkboxAjustable: false,
        checkboxTalla5: false,
        checkboxTalla6: false,
        checkboxTalla7: false,
        checkboxTalla8: false,
        checkboxTalla9: false,
        checkboxTalla10: false,
    })
    const signedUrl = trpc.signedUrl.useMutation()
    const addProduct = trpc.addProduct.useMutation({
        onSuccess: () => {
            setForm({
                name: '',
                code: '',
                price: '0.00',
                use_discount: false,
                discount_price: '0.00',
                use_small_and_big: false,
                incrementBig: '0',
                incrementSmall: '0',
                increment: '0',
                img: [] as string[],
                img_small: [] as string[],
                img_big: [] as string[],
                checkboxArete: false,
                checkboxCollar: false,
                checkboxAnillo: false,
                checkboxPulsera: false,
                checkboxPiercing: false,
                checkboxTobillera: false,
                checkboxOro10K: false,
                checkboxAjustable: false,
                checkboxTalla5: false,
                checkboxTalla6: false,
                checkboxTalla7: false,
                checkboxTalla8: false,
                checkboxTalla9: false,
                checkboxTalla10: false,
            })
            setShowCreate(false)
            searchProducts.refetch()
        }
    })
    return <div>
        <button type="button" className="fourb-button" onClick={() => {
            setShowCreate(true)
        }}>Crear</button>
        {showCreate ? <Modal onClose={onCloseCallback}>
            <ModalClose onClose={onCloseCallback} title={"Crear producto"}>
                <div className="product-card">
                    <form onSubmit={(e) => {
                        e.preventDefault()
                        addProduct.mutate({
                            name: form.name,
                            code: form.code,
                            qty: Number(form.increment),
                            qtyBig: Number(form.incrementBig),
                            qtySmall: Number(form.incrementSmall),
                            price: Number(form.price) * 100,
                            useSmallAndBig: form.use_small_and_big,
                            img: form.img,
                            imgBig: form.img_big,
                            imgSmall: form.img_small,
                            discountPrice: Number(form.discount_price) * 100,
                            useDiscount: form.use_discount,
                            checkboxArete: form.checkboxArete,
                            checkboxCollar: form.checkboxCollar,
                            checkboxAnillo: form.checkboxAnillo,
                            checkboxPulsera: form.checkboxPulsera,
                            checkboxPiercing: form.checkboxPiercing,
                            checkboxTobillera: form.checkboxOro10K,
                            checkboxOro10K: form.checkboxOro10K,
                            checkboxAjustable: form.checkboxAjustable,
                            checkboxTalla5: form.checkboxTalla5,
                            checkboxTalla6: form.checkboxTalla6,
                            checkboxTalla7: form.checkboxTalla7,
                            checkboxTalla8: form.checkboxTalla8,
                            checkboxTalla9: form.checkboxTalla9,
                            checkboxTalla10: form.checkboxTalla10,
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
                                        <input title="Subir fotos" name="image-big" multiple type="file" accept="png,jpg,jpeg" onChange={async (event) => {
                                            const files = event.target.files
                                            if (files) {
                                                for (const file of files) {
                                                    if (file.type) {
                                                        try {
                                                            const data = await signedUrl.mutateAsync({ fileType: file.type })
                                                            const url = new URL(data.uploadUrl);
                                                            await fetch(data.uploadUrl, {
                                                                method: "PUT",
                                                                body: file,
                                                            })
                                                            setForm(state => ({ ...state, img_big: [...state.img, url.origin + url.pathname] }))
                                                        } catch (e) {
                                                            alert('Error while uploading')
                                                        }
                                                    }
                                                }
                                            }
                                        }} />
                                        <div className="input-container images-container">
                                            {form.img_big.map((img) => {
                                                return <div style={{ position: 'relative', marginTop: 20 }} key={img}>
                                                    <button
                                                        className="closeImgButton"
                                                        type="button"
                                                        onClick={() => {
                                                            setForm(state => ({ ...state, img: state.img_big.filter(currImg => img !== currImg) }))
                                                        }}
                                                    >
                                                        <Image src={cross} alt="" height={10} />
                                                    </button>
                                                    <img className="img-uploaded" alt="" width={"100%"} src={img} />
                                                </div>
                                            })}
                                        </div>
                                        <ModalField
                                            id="incrementBig"
                                            label={`Cantidad en el inventario`}
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
                                        <input title="Subir fotos" name="image-small" multiple type="file" accept="png,jpg,jpeg" onChange={async (event) => {
                                            const files = event.target.files
                                            if (files) {
                                                for (const file of files) {
                                                    if (file.type) {
                                                        try {
                                                            const data = await signedUrl.mutateAsync({ fileType: file.type })
                                                            const url = new URL(data.uploadUrl);
                                                            await fetch(data.uploadUrl, {
                                                                method: "PUT",
                                                                body: file,
                                                            })
                                                            setForm(state => ({ ...state, img_small: [...state.img, url.origin + url.pathname] }))
                                                        } catch (e) {
                                                            alert('Error while uploading')
                                                        }
                                                    }
                                                }
                                            }
                                        }} />
                                        <div className="input-container images-container">
                                            {form.img_small.map((img) => {
                                                return <div style={{ position: 'relative', marginTop: 20 }} key={img}>
                                                    <button
                                                        className="closeImgButton"
                                                        type="button"
                                                        onClick={() => {
                                                            setForm(state => ({ ...state, img: state.img_small.filter(currImg => img !== currImg) }))
                                                        }}
                                                    >
                                                        <Image src={cross} alt="" height={10} />
                                                    </button>
                                                    <img className="img-uploaded" alt="" width="100%" src={img} />
                                                </div>
                                            })}
                                        </div>
                                        <ModalField
                                            id="incrementSmall"
                                            label={`Cantidad en el inventario`}
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
                                    <div style={{ marginLeft: 20 }}>
                                        <div className="input-container images-container">
                                            <input title="Subir fotos" name="image" multiple type="file" accept="png,jpg,jpeg" onChange={async (event) => {
                                                const files = event.target.files
                                                if (files) {
                                                    for (const file of files) {
                                                        if (file.type) {
                                                            try {
                                                                const response = await signedUrl.mutateAsync({ fileType: file.type })
                                                                const url = new URL(response.uploadUrl);
                                                                await fetch(response.uploadUrl, {
                                                                    method: "PUT",
                                                                    body: file,
                                                                })
                                                                setForm(state => ({ ...state, img: [...state.img, url.origin + url.pathname] }))
                                                            } catch (e) {
                                                                alert('Error while uploading')
                                                            }
                                                        }
                                                    }
                                                }
                                            }} />
                                        </div>
                                        <div className="input-container images-container">
                                            {form.img.map((img) => {
                                                return <div style={{ position: 'relative', marginTop: 20 }} key={img}>
                                                    <button
                                                        className="closeImgButton"
                                                        type="button"
                                                        onClick={() => {
                                                            setForm(state => ({ ...state, img: state.img.filter(currImg => img !== currImg) }))
                                                        }}
                                                    >
                                                        <Image src={cross} alt="" height={10} />
                                                    </button>
                                                    <img className="img-uploaded" alt="" width="100%" src={img} />
                                                </div>
                                            })}
                                        </div>
                                        <ModalField
                                            id="increment"
                                            label={`Cantidad en el inventario`}
                                            required
                                            name="increment"
                                            type="number"
                                            value={form.increment}
                                            onChange={(e) => {
                                                setForm(state => ({ ...state, [e.target.name]: e.target.value }))
                                            }}
                                            pattern="\d*"
                                            step="any"
                                        />
                                    </div>
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
                        <button type="submit" className="fourb-button">Crear</button>
                    </form>
                </div>
            </ModalClose>
        </Modal> : null}
        <div style={{ margin: '0px 30px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.2)', marginBottom: 10 }}>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Imagen</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Nombre</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Codigo</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Precio</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Con descuento</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Precio descuento</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Opcion Grande/Chica</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Disponible</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Total</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Tags</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {searchProducts.data?.pages.map((page, index) => (
                        <Fragment key={index}>
                            {page.items.map(product => (
                                <Fragment key={product._id}>
                                    <tr>
                                        <td>
                                            {product.use_small_and_big
                                                ? null
                                                : <img className="img-table" alt="" width="100%" src={product.img[0]} />
                                            }
                                        </td>
                                        <td>{product.name}</td>
                                        <td>{product.code}</td>
                                        <td>${toCurrency(String(product.price), '.')}</td>
                                        <td>
                                            <input type="checkbox" checked={product.use_discount} readOnly />
                                        </td>
                                        <td>${toCurrency(String(product.discount_price), '.')}</td>
                                        <td>
                                            <input type="checkbox" checked={product.use_small_and_big} readOnly />
                                        </td>
                                        <td>{product.available}</td>
                                        <td>{product.total}</td>
                                        <td>{product.tags.join(',')}</td>
                                        <td><EditProduct product={product} onSuccessEdit={() => {
                                            searchProducts.refetch()
                                        }} /></td>
                                    </tr>
                                    {product.use_small_and_big ? <tr>
                                        <td colSpan={12}>
                                            <table style={{ marginLeft: 40,  borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.2)', marginBottom: 10 }}>
                                                        <th style={{ paddingRight: 20, paddingBottom: 10, textAlign: 'left' }}>Version</th>
                                                        <th style={{ paddingRight: 20, paddingBottom: 10, textAlign: 'left' }}>Imagen</th>
                                                        <th style={{ paddingRight: 20, paddingBottom: 10, textAlign: 'left' }}>Disponible</th>
                                                        <th style={{ paddingRight: 20, paddingBottom: 10, textAlign: 'left' }}>Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td>Grande</td>
                                                        <td>
                                                            <img className="img-table" alt="" width="100%" src={product.img_big[0]} />
                                                        </td>
                                                        <td>{product.available_big}</td>
                                                        <td>{product.total_big}</td>
                                                    </tr>
                                                    <tr>
                                                        <td>Chica</td>
                                                        <td>
                                                            <img className="img-table" alt="" width="100%" src={product.img_small[0]} />
                                                        </td>
                                                        <td>{product.available_small}</td>
                                                        <td>{product.total_small}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr> : null}
                                </Fragment>
                            ))}
                        </Fragment>
                    ))}
                </tbody>
            </table>
        </div>
        {searchProducts.isLoading ? <div className="loading" /> : null}
    </div>
}