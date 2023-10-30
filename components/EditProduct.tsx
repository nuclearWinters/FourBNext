import Link from "next/link";
import { FC, useState } from "react"
import { toCurrency, trpc } from "../utils/config";
import { Modal } from "./Modal";
import { ModalClose } from "./ModalClose";
import { ModalField } from "./ModalField";
import { ModalCheckbox } from "./ModalCheckbox";
import cross from '../public/cross.svg'
import Image from "next/image";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import { getItemStyle, reorder } from "../pages/inventory-admin";
import { toast } from "react-toastify";
import { InventoryTRPC } from "../pages/product/[id]";

export const EditProduct: FC<{
    product: InventoryTRPC
    onSuccessEdit: () => void
}> = ({
    product,
    onSuccessEdit,
}) => {
        const signedUrl = trpc.signedUrl.useMutation()
        const [showModal, setShowModal] = useState(false)
        const onCloseCallback = () => {
            setShowModal(false)
        }
        const [form, setForm] = useState({
            ...product,
            discount_price: toCurrency(String(product.discount_price), '.'),
            price: toCurrency(String(product.price), '.'),
            increment: '0',
            tags: product.tags,
        })
        const editProduct = trpc.editProduct.useMutation({
            onSuccess: () => {
                toast.success("Producto actualizado con exito.")
            },
            onError: (e) => {
                toast.error(e.message)
            }
        })
        const onDragEnd = (result: any, value: any, key: string) => {
            if (!result.destination) {
                return;
            }
            const items = reorder(
                form.img,
                result.source.index,
                result.destination.index
            );
            setForm(state => ({
                ...state,
                img: items,
            }))
        }
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
                                sku: form.sku,
                                increment: Number(form.increment),
                                imgs: form.img,
                                useDiscount: form.use_discount,
                                useSmallAndBig: form.use,
                                discountPrice: Number(form.discount_price) * 100,
                                price: Number(form.price) * 100,
                                tags: 
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
                                id="use_variants"
                                label="Opciones de compra"
                                name="use_variants"
                                type="checkbox"
                                checked={form.use_variants}
                                onChange={(e) => {
                                    setForm(state => ({ ...state, [e.target.name]: e.target.checked }))
                                }}
                            />
                            {form.use_small_and_big
                                ? null
                                : (
                                    <>
                                        <div className="img-title">
                                            Imagenes
                                        </div>

                                        <div style={{ marginLeft: 20 }}>
                                            <div className="input-container images-container">
                                                <input name="image" multiple type="file" accept="png,jpg,jpeg" onChange={async (event) => {
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
                                                                    setForm(state => ({ ...state, img: [...state.img, url.origin + url.pathname] }))
                                                                } catch (e) {
                                                                    toast.error('Error while uploading')
                                                                }
                                                            }
                                                        }
                                                    }
                                                }} />
                                            </div>
                                            <div className="input-container images-container">
                                                <DragDropContext onDragEnd={onDragEnd}>
                                                    <Droppable droppableId="droppable" direction="horizontal">
                                                        {(provided) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                style={{
                                                                    display: 'flex',
                                                                    padding: 8,
                                                                    overflow: 'auto',
                                                                }}
                                                                {...provided.droppableProps}
                                                            >
                                                                {form.img.map((item, index) => (
                                                                    <Draggable key={item} draggableId={item} index={index}>
                                                                        {(provided, snapshot) => (
                                                                            <div
                                                                                ref={provided.innerRef}
                                                                                {...provided.draggableProps}
                                                                                {...provided.dragHandleProps}
                                                                                style={getItemStyle(
                                                                                    snapshot.isDragging,
                                                                                    provided.draggableProps.style
                                                                                )}
                                                                            >
                                                                                <div style={{ position: 'relative' }} key={index}>
                                                                                    <button className="closeImgButton"><Image src={cross} alt="" height={10} /></button>
                                                                                    <img className="img-uploaded" alt="" width="100%" src={item} />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </Draggable>
                                                                ))}
                                                                {provided.placeholder}
                                                            </div>
                                                        )}
                                                    </Droppable>
                                                </DragDropContext>
                                            </div>
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
                                <div className="checkboxes" style={{ display: 'flex', flexWrap: 'wrap', }}>

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