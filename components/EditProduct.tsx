import Link from "next/link";
import { FC, useState } from "react"
import { toCurrency, trpc } from "../utils/config";
import { Modal } from "./Modal";
import { ModalClose } from "./ModalClose";
import { ModalField } from "./ModalField";
import { ModalCheckbox } from "./ModalCheckbox";
import cross from '../public/cross.svg'
import Image from "next/image";
import { DragDropContext, Draggable, DropResult, Droppable } from "react-beautiful-dnd";
import { CombinationEdit, getItemStyle, reorder } from "../pages/inventory-admin";
import { toast } from "react-toastify";
import { InventoryTRPC } from "../pages/product/[id]";
import { nanoid } from "nanoid";
import TagsInput from 'react-tagsinput'
import { Combination, Options } from "../server/types";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DropZoneOptionsEdit } from "./DropZoneOptionsEdit";

export interface OptionsEdit {
    id: string
    name: string
    values: CombinationEdit[]
    type: 'string' | 'color'
}

export const reorderOptions = (list: Options[], startIndex: number, endIndex: number) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
};

export const reorderNewOptions = (list: OptionsEdit[], startIndex: number, endIndex: number) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
};

export interface VariantEdit {
    inventory_variant_oid: string;
    imgs: string[]
    increment: string
    price: string
    sku: string
    use_discount: boolean
    discount_price: string
    combination: Combination[]
    total: string
    available: string
}

export interface ProductEdit {
    name: string
    description: string
    use_variants: false
    tags: string[]
    variants: VariantEdit[]
    options: CombinationEdit[]
}

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
        const [createNewOptions, setCreateNewOptions] = useState(false)
        const [form, setForm] = useState({
            ...product,
            variants: product.variants.map(variant => ({
                inventory_variant_oid: variant.inventory_variant_oid,
                imgs: variant.imgs,
                sku: variant.sku,
                use_discount: variant.use_discount,
                combination: variant.combination,
                increment: '0',
                price: toCurrency(String(variant.price), '.'),
                discount_price: toCurrency(String(variant.discount_price), '.'),
                available: String(variant.available),
                total: String(variant.total),
            }))
        })
        const defaultVariantIndex = form.variants.findIndex(variant => variant.combination.map(combination => combination.name).every(name => name === 'default'))
        const [newOptions, setNewOptions] = useState({
            options: [
                {
                    id: nanoid(5),
                    name: '',
                    values: [] as CombinationEdit[],
                    type: 'string' as 'string' | 'color',
                }
            ],
            variants: [
                {
                    imgs: form.variants[defaultVariantIndex].imgs,
                    available: String(form.variants[defaultVariantIndex].available),
                    total: String(form.variants[defaultVariantIndex].total),
                    price: toCurrency(String(form.variants[defaultVariantIndex].price), '.'),
                    sku: form.variants[defaultVariantIndex].sku,
                    use_discount: form.variants[defaultVariantIndex].use_discount,
                    discount_price: toCurrency(String(form.variants[defaultVariantIndex].discount_price), '.'),
                    combination: form.variants[defaultVariantIndex].combination,
                }
            ]
        })
        const editProduct = trpc.editProduct.useMutation({
            onSuccess: () => {
                toast.success("Producto actualizado con exito.")
            },
            onError: (e) => {
                toast.error(e.message)
            }
        })
        const onDragEnd = (result: any, value: VariantEdit, idx: number) => {
            if (!result.destination) {
                return;
            }
            const items = reorder(
                value.imgs,
                result.source.index,
                result.destination.index
            );
            form.variants[idx] = {
                ...value,
                imgs: items
            }
            setForm(state => ({
                ...state,
                img: items,
            }))
        }
        const onDragEndNewOptionsImgs = (result: any, value: VariantEdit, idx: number) => {
            if (!result.destination) {
                return;
            }
            const items = reorder(
                value.imgs,
                result.source.index,
                result.destination.index
            );
            newOptions.variants[idx] = {
                ...value,
                imgs: items
            }
            setNewOptions(state => ({
                ...state,
                img: items,
            }))
        }
        const onDragEndOptions = (result: DropResult) => {
            if (!result.destination) {
                return;
            }
            const items = reorderOptions(
                form.options,
                result.source.index,
                result.destination.index
            );
            setForm(state => ({
                ...state,
                options: items,
            }))
        }
        const onDragEndNewOptions = (result: DropResult) => {
            if (!result.destination) {
                return;
            }
            const items = reorderOptions(
                form.options,
                result.source.index,
                result.destination.index
            );
            setForm(state => ({
                ...state,
                options: items,
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
                                description: form.description,
                                tags: form.tags,
                                use_variants: form.use_variants,
                                options: form.options,
                                variants: form.variants.map(variant => ({
                                    ...variant,
                                    increment: Number(variant.increment),
                                    price: Number(variant.price) * 100,
                                    discount_price: Number(variant.discount_price) * 100,
                                    total: Number(variant.total),
                                    available: Number(variant.available)
                                })),
                                create_new_variants: createNewOptions,
                                new_variants: newOptions.variants.map(variant => ({
                                    ...variant,
                                    total: Number(variant.total),
                                    available: Number(variant.available),
                                    price: Number(variant.price) * 100,
                                    discount_price: Number(variant.discount_price) * 100,
                                })),
                                new_options: createNewOptions ? newOptions.options : [],
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
                                id="description"
                                label="Descripcion"
                                required
                                name="description"
                                type="text"
                                value={form.description}
                                onChange={(e) => {
                                    setForm(state => ({ ...state, [e.target.name]: e.target.value }))
                                }}
                            />
                            {form.use_variants ? null : <ModalField
                                id="sku"
                                label="Código"
                                required
                                name="sku"
                                type="text"
                                value={form.variants[defaultVariantIndex].sku}
                                onChange={(e) => {
                                    form.variants[defaultVariantIndex] = {
                                        ...form.variants[defaultVariantIndex],
                                        [e.target.name]: e.target.value,
                                    }
                                    setForm(state => ({
                                        ...state,
                                    }))
                                }}
                            />}
                            {form.use_variants ? null : <ModalField
                                id="price"
                                label="Precio"
                                required
                                name="price"
                                type="number"
                                value={form.variants[defaultVariantIndex].price}
                                onChange={(e) => {
                                    form.variants[defaultVariantIndex] = {
                                        ...form.variants[defaultVariantIndex],
                                        [e.target.name]: toCurrency(e.target.value, '.'),
                                    }
                                    setForm(state => ({
                                        ...state,
                                    }))
                                }}
                                pattern="\d*"
                                step="any"
                            />}
                            {form.use_variants ? null : <ModalCheckbox
                                id="use_discount"
                                label="Usar descuento"
                                name="use_discount"
                                type="checkbox"
                                checked={form.variants[defaultVariantIndex].use_discount}
                                onChange={(e) => {
                                    form.variants[defaultVariantIndex] = {
                                        ...form.variants[defaultVariantIndex],
                                        [e.target.name]: e.target.checked,
                                    }
                                    setForm(state => ({
                                        ...state,
                                    }))
                                }}
                            />}
                            {form.use_variants ? null : <div style={{ opacity: form.variants[defaultVariantIndex].use_discount ? '1' : '0.4', pointerEvents: form.variants[defaultVariantIndex].use_discount ? 'auto' : 'none' }}>
                                <ModalField
                                    id="discount_price"
                                    label="Precio de descuento"
                                    required
                                    name="discount_price"
                                    type="number"
                                    value={form.variants[defaultVariantIndex].discount_price}
                                    onChange={(e) => {
                                        form.variants[defaultVariantIndex] = {
                                            ...form.variants[defaultVariantIndex],
                                            [e.target.name]: toCurrency(e.target.value, '.'),
                                        }
                                        setForm(state => ({
                                            ...state,
                                        }))
                                    }}
                                    pattern="\d*"
                                    step="any"
                                />
                            </div>}
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
                            {form.use_variants && !createNewOptions ? (
                                <div style={{ margin: 'auto', width: '50%' }}>
                                    <strong>Opciones</strong>
                                    <div>
                                        <DragDropContext onDragEnd={onDragEndOptions}>
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
                                                        <div style={{ display: 'flex', flexDirection: "column" }}>
                                                            {form.options.map((item, index) => (
                                                                <Draggable key={item.id} draggableId={item.id} index={index}>
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
                                                                            <div style={{ position: 'relative' }} key={item.id}>
                                                                                <div>{item.name}</div>
                                                                                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                                                                    {item.values.map(option => (
                                                                                        <div
                                                                                            key={option.id}
                                                                                            style={{
                                                                                                backgroundColor: 'lightgray',
                                                                                                borderRadius: '20px',
                                                                                                margin: '4px',
                                                                                                padding: '4px 12px',
                                                                                            }}
                                                                                        >
                                                                                            {option.name}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            ))}
                                                            {provided.placeholder}
                                                        </div>
                                                    </div>
                                                )}
                                            </Droppable>
                                        </DragDropContext>
                                    </div>
                                </div>
                            ) : null}
                            {form.use_variants ? (
                                <button
                                    className="fourb-button"
                                    type="button"
                                    onClick={() => {
                                        setCreateNewOptions(true)
                                    }}>
                                    Crear nuevas opciones
                                </button>
                            ) : null}
                            {createNewOptions ? (
                                <DndProvider backend={HTML5Backend}>
                                    <div style={{ display: 'flex', flexDirection: "column" }}>
                                        <DropZoneOptionsEdit
                                            options={newOptions.options}
                                            setForm={setNewOptions}
                                        />
                                        <button
                                            className="fourb-button"
                                            type="button"
                                            onClick={() => {
                                                setNewOptions(form => (
                                                    {
                                                        ...form,
                                                        options: [
                                                            ...form.options,
                                                            {
                                                                id: nanoid(5),
                                                                name: '',
                                                                values: [],
                                                                type: 'string',
                                                            },
                                                        ],
                                                    }
                                                ))
                                            }}
                                        >
                                            Añadir otra opción
                                        </button>
                                        <button
                                            className="fourb-button"
                                            type="button"
                                            onClick={() => {
                                                setNewOptions(form => (
                                                    {
                                                        ...form,
                                                        options: [
                                                            ...form.options,
                                                            {
                                                                id: nanoid(5),
                                                                name: 'Color',
                                                                values: [
                                                                    {
                                                                        id: nanoid(5),
                                                                        name: "Dorado",
                                                                        focus: false,
                                                                    },
                                                                    {
                                                                        id: nanoid(5),
                                                                        name: "Plateado",
                                                                        focus: false,
                                                                    },
                                                                ],
                                                                type: 'color'
                                                            },
                                                        ],
                                                    }
                                                ))
                                            }}
                                        >
                                            Añadir otra opción de color
                                        </button>
                                        <button
                                            className="fourb-button"
                                            type="button" onClick={() => {
                                                const variants = [
                                                    newOptions.variants[0],
                                                ]

                                                let result = newOptions.options[0].values.map(value => ([value]));

                                                for (var k = 1; k < newOptions.options.length; k++) {
                                                    const next: CombinationEdit[][] = [];
                                                    result.forEach(item => {
                                                        newOptions.options[k].values.forEach(word => {
                                                            var line = item.slice(0);
                                                            line.push(word);
                                                            next.push(line);
                                                        })
                                                    });
                                                    result = next;
                                                }

                                                for (const combination of result) {
                                                    variants.push({
                                                        imgs: [],
                                                        price: '0.00',
                                                        sku: '',
                                                        use_discount: false,
                                                        discount_price: '0.00',
                                                        combination: combination.map(combination => ({
                                                            id: combination.id,
                                                            name: combination.name,
                                                        })),
                                                        total: '0',
                                                        available: '0',
                                                    })
                                                }

                                                setNewOptions({ ...newOptions, variants })
                                            }}
                                        >
                                            Generar variantes
                                        </button>
                                    </div>
                                </DndProvider>
                            ) : null}
                            {!createNewOptions && form.use_variants && form.variants.length > 1 ? (
                                <div>{form.variants.map((value, idx) => {
                                    const variantName = value.combination.map(combination => combination.name).join(" / ")
                                    if (variantName === 'default') {
                                        return null
                                    }
                                    return <div key={idx}>
                                        <div className="img-title">
                                            {variantName}
                                        </div>
                                        <ModalField
                                            id={`${idx}-sku`}
                                            label="Código"
                                            required
                                            name="sku"
                                            type="text"
                                            value={value.sku}
                                            onChange={(e) => {
                                                form.variants[idx] = {
                                                    ...value,
                                                    [e.target.name]: e.target.value,
                                                }
                                                setForm(state => ({
                                                    ...state,
                                                }))
                                            }}
                                        />
                                        <ModalField
                                            id={`${idx}-price`}
                                            label="Precio"
                                            required
                                            name="price"
                                            type="number"
                                            value={value.price}
                                            onChange={(e) => {
                                                form.variants[idx] = {
                                                    ...value,
                                                    [e.target.name]: toCurrency(e.target.value, '.'),
                                                }
                                                setForm(state => ({
                                                    ...state,
                                                }))
                                            }}
                                            pattern="\d*"
                                            step="any"
                                        />
                                        <ModalCheckbox
                                            id={`${idx}-use_discount`}
                                            label="Usar descuento"
                                            name="use_discount"
                                            type="checkbox"
                                            checked={value.use_discount}
                                            onChange={(e) => {
                                                form.variants[idx] = {
                                                    ...value,
                                                    [e.target.name]: e.target.checked,
                                                }
                                                setForm(state => ({
                                                    ...state,
                                                }))
                                            }}
                                        />
                                        <div style={{ opacity: value.use_discount ? '1' : '0.4', pointerEvents: value.use_discount ? 'auto' : 'none' }}>
                                            <ModalField
                                                id={`${idx}-discount_price`}
                                                label="Precio de descuento"
                                                required
                                                name="discount_price"
                                                type="number"
                                                value={value.discount_price}
                                                onChange={(e) => {
                                                    form.variants[idx] = {
                                                        ...value,
                                                        [e.target.name]: toCurrency(e.target.value, '.'),
                                                    }
                                                    setForm(state => ({
                                                        ...state,
                                                    }))
                                                }}
                                                pattern="\d*"
                                                step="any"
                                            />
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
                                                                form.variants[idx] = {
                                                                    ...value,
                                                                    imgs: [...form.variants[idx].imgs, url.origin + url.pathname],
                                                                }
                                                                setForm(state => ({
                                                                    ...state,
                                                                }))
                                                            } catch (e) {
                                                                toast.error('Error while uploading')
                                                            }
                                                        }
                                                    }
                                                }
                                            }} />
                                            <div className="input-container images-container">
                                                <DragDropContext onDragEnd={(result) => onDragEnd(result, form.variants[idx], idx)}>
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
                                                                {value.imgs.map((item, index) => (
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
                                                                                <div style={{ position: 'relative' }} key={item}>
                                                                                    <button
                                                                                        className="closeImgButton"
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            form.variants[idx] = {
                                                                                                ...value,
                                                                                                imgs: form.variants[idx].imgs.filter(currImg => item !== currImg)
                                                                                            }
                                                                                            setForm(state => ({
                                                                                                ...state,
                                                                                            }))
                                                                                        }}
                                                                                    >
                                                                                        <Image src={cross} alt="" height={10} />
                                                                                    </button>
                                                                                    <img className="img-uploaded" alt="" width={"100%"} src={item} />
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
                                            <ModalField
                                                id={`${idx}-qty`}
                                                label={`Añadir al inventario (Disponible: ${value.available} de ${value.total})`}
                                                required
                                                name="increment"
                                                type="number"
                                                value={value.increment}
                                                onChange={(e) => {
                                                    form.variants[idx] = {
                                                        ...value,
                                                        [e.target.name]: e.target.value,
                                                    }
                                                    setForm(state => ({
                                                        ...state,
                                                    }))
                                                }}
                                            />
                                        </div>
                                    </div>
                                })}</div>
                            ) : null}
                            {createNewOptions && form.use_variants && newOptions.variants.length > 1 ? (
                                <div>{newOptions.variants.map((value, idx) => {
                                    const variantName = value.combination.map(combination => combination.name).join(" / ")
                                    if (variantName === 'default') {
                                        return null
                                    }
                                    return <div key={idx}>
                                        <div className="img-title">
                                            {variantName}
                                        </div>
                                        <ModalField
                                            id={`${idx}-sku`}
                                            label="Código"
                                            required
                                            name="sku"
                                            type="text"
                                            value={value.sku}
                                            onChange={(e) => {
                                                newOptions.variants[idx] = {
                                                    ...value,
                                                    [e.target.name]: e.target.value,
                                                }
                                                setNewOptions(state => ({
                                                    ...state,
                                                }))
                                            }}
                                        />
                                        <ModalField
                                            id={`${idx}-price`}
                                            label="Precio"
                                            required
                                            name="price"
                                            type="number"
                                            value={value.price}
                                            onChange={(e) => {
                                                newOptions.variants[idx] = {
                                                    ...value,
                                                    [e.target.name]: toCurrency(e.target.value, '.'),
                                                }
                                                setNewOptions(state => ({
                                                    ...state,
                                                }))
                                            }}
                                            pattern="\d*"
                                            step="any"
                                        />
                                        <ModalCheckbox
                                            id={`${idx}-use_discount`}
                                            label="Usar descuento"
                                            name="use_discount"
                                            type="checkbox"
                                            checked={value.use_discount}
                                            onChange={(e) => {
                                                newOptions.variants[idx] = {
                                                    ...value,
                                                    [e.target.name]: e.target.checked,
                                                }
                                                setNewOptions(state => ({
                                                    ...state,
                                                }))
                                            }}
                                        />
                                        <div style={{ opacity: value.use_discount ? '1' : '0.4', pointerEvents: value.use_discount ? 'auto' : 'none' }}>
                                            <ModalField
                                                id={`${idx}-discount_price`}
                                                label="Precio de descuento"
                                                required
                                                name="discount_price"
                                                type="number"
                                                value={value.discount_price}
                                                onChange={(e) => {
                                                    newOptions.variants[idx] = {
                                                        ...value,
                                                        [e.target.name]: toCurrency(e.target.value, '.'),
                                                    }
                                                    setNewOptions(state => ({
                                                        ...state,
                                                    }))
                                                }}
                                                pattern="\d*"
                                                step="any"
                                            />
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
                                                                newOptions.variants[idx] = {
                                                                    ...value,
                                                                    imgs: [...form.variants[idx].imgs, url.origin + url.pathname],
                                                                }
                                                                setNewOptions(state => ({
                                                                    ...state,
                                                                }))
                                                            } catch (e) {
                                                                toast.error('Error while uploading')
                                                            }
                                                        }
                                                    }
                                                }
                                            }} />
                                            <div className="input-container images-container">
                                                <DragDropContext onDragEnd={(result) => onDragEndNewOptionsImgs(result, form.variants[idx], idx)}>
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
                                                                {value.imgs.map((item, index) => (
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
                                                                                <div style={{ position: 'relative' }} key={item}>
                                                                                    <button
                                                                                        className="closeImgButton"
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            newOptions.variants[idx] = {
                                                                                                ...value,
                                                                                                imgs: newOptions.variants[idx].imgs.filter(currImg => item !== currImg)
                                                                                            }
                                                                                            setNewOptions(state => ({
                                                                                                ...state,
                                                                                            }))
                                                                                        }}
                                                                                    >
                                                                                        <Image src={cross} alt="" height={10} />
                                                                                    </button>
                                                                                    <img className="img-uploaded" alt="" width={"100%"} src={item} />
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
                                            <ModalField
                                                id={`${idx}-qty`}
                                                label={`Cantidad en el inventario`}
                                                required
                                                name="qty"
                                                type="number"
                                                value={value.available}
                                                onChange={(e) => {
                                                    newOptions.variants[idx] = {
                                                        ...value,
                                                        available: e.target.value,
                                                        total: e.target.value,
                                                    }
                                                    setNewOptions(state => ({
                                                        ...state,
                                                    }))
                                                }}
                                            />
                                        </div>
                                    </div>
                                })}</div>
                            ) : null}
                            {form.use_variants
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
                                                                    form.variants[defaultVariantIndex] = {
                                                                        ...form.variants[defaultVariantIndex],
                                                                        imgs: [...form.variants[defaultVariantIndex].imgs, url.origin + url.pathname],
                                                                    }
                                                                    setForm(state => ({
                                                                        ...state,
                                                                    }))
                                                                } catch (e) {
                                                                    toast.error('Error while uploading')
                                                                }
                                                            }
                                                        }
                                                    }
                                                }} />
                                            </div>
                                            <div className="input-container images-container">
                                                <DragDropContext onDragEnd={(result) => onDragEnd(result, form.variants[defaultVariantIndex], defaultVariantIndex)}>
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
                                                                {form.variants[defaultVariantIndex].imgs.map((item, index) => (
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
                                                                                <div style={{ position: 'relative' }} key={item}>
                                                                                    <button
                                                                                        className="closeImgButton"
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            form.variants[defaultVariantIndex] = {
                                                                                                ...form.variants[defaultVariantIndex],
                                                                                                imgs: form.variants[defaultVariantIndex].imgs.filter(currImg => item !== currImg),
                                                                                            }
                                                                                            setForm(state => ({
                                                                                                ...state,
                                                                                            }))
                                                                                        }}
                                                                                    >
                                                                                        <Image src={cross} alt="" height={10} />
                                                                                    </button>
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
                                        {form.use_variants ? null : <ModalField
                                            id="increment"
                                            label={`Añadir al inventario (Disponible: ${form.variants[defaultVariantIndex].available} de ${form.variants[defaultVariantIndex].total})`}
                                            name="increment"
                                            type="number"
                                            value={form.variants[defaultVariantIndex].increment}
                                            onChange={(e) => {
                                                form.variants[defaultVariantIndex] = {
                                                    ...form.variants[defaultVariantIndex],
                                                    [e.target.name]: e.target.value,
                                                }
                                                setForm(state => ({
                                                    ...state,
                                                }))
                                            }}
                                        />}
                                    </>
                                )
                            }
                            <div className="input-container">
                                <label htmlFor="discount">Etiquetas</label>
                                <TagsInput
                                    inputProps={{
                                        placeholder: ''
                                    }}
                                    onlyUnique
                                    value={form.tags}
                                    onChange={(tags) => {
                                        setForm(state => ({
                                            ...state,
                                            tags,
                                        }))
                                    }}
                                />
                            </div>
                            <button type="submit" className="fourb-button">Actualizar</button>
                            <Link href={`/product/${product._id}`} type="button" className="fourb-button">VER</Link>
                        </form>
                    </div>
                </ModalClose>
            </Modal> : null}
        </div>
    }