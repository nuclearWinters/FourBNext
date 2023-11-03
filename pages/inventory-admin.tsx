import { CSSProperties, Fragment, useState } from "react"
import { toCurrency, trpc } from "../utils/config"
import { EditProduct, reorderOptions } from "../components/EditProduct";
import Image from "next/image";
import { Modal } from "../components/Modal";
import { ModalClose } from "../components/ModalClose";
import { ModalField } from "../components/ModalField";
import { ModalCheckbox } from "../components/ModalCheckbox";
import cross from '../public/cross.svg'
import Link from "next/link";
import { DragDropContext, Droppable, Draggable, DraggingStyle, NotDraggingStyle, DropResult } from 'react-beautiful-dnd';
import Head from "next/head";
import { toast } from "react-toastify";
import { nanoid } from "nanoid";
import { Combination } from "../server/types";
import TagsInput from 'react-tagsinput'
import drag from '../public/drag.svg'

export interface VariantCreate {
    imgs: string[]
    qty: string
    price: string
    sku: string
    use_discount: boolean
    discount_price: string
    combination: Combination[]
}

export interface ProductCreate {
    name: string
    description: string
    use_variants: false
    tags: string[]
    variants: VariantCreate[]
}

export const reorder = (list: string[], startIndex: number, endIndex: number) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
};

export const getItemStyle = (isDragging: boolean, draggableStyle: DraggingStyle | NotDraggingStyle | undefined): CSSProperties => ({
    userSelect: 'none',
    padding: 8,
    margin: `0 8px 0 0`,
    ...draggableStyle,
});

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
        description: '',
        use_variants: false,
        tags: [] as string[],
        variants: [
            {
                imgs: [] as string[],
                qty: '0',
                price: '0.00',
                sku: '',
                use_discount: false,
                discount_price: '0.00',
                combination: [{
                    id: nanoid(5),
                    name: 'default'
                }]
            }
        ],
        options: [{
            id: nanoid(5),
            name: '',
            values: [] as Combination[],
            type: 'string' as 'string' | 'color',
        }]
    })
    const signedUrl = trpc.signedUrl.useMutation()
    const addProduct = trpc.addProduct.useMutation({
        onSuccess: () => {
            setForm({
                name: '',
                description: '',
                use_variants: false,
                tags: [],
                variants: [
                    {
                        imgs: [],
                        qty: '0',
                        price: '0.00',
                        sku: '',
                        use_discount: false,
                        discount_price: '0.00',
                        combination: [{
                            id: nanoid(5),
                            name: 'default',
                        }]
                    }
                ],
                options: [{
                    id: nanoid(5),
                    name: '',
                    values: [],
                    type: 'string'
                }]
            })
            setShowCreate(false)
            searchProducts.refetch()
            toast.success('Producto creado correctamente.')
        },
        onError: (e) => {
            toast.error(e.message)
        }
    })
    const onDragEnd = (result: DropResult, value: VariantCreate, idx: number) => {
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
    const defaultVariantIndex = form.variants.findIndex(variant => variant.combination.map(combination => combination.name).every(name => name === 'default'))
    return <div>
        <Head>
            <title>Inventario - FOURB</title>
        </Head>
        <button type="button" className="fourb-button" onClick={() => {
            setShowCreate(true)
        }}>Crear</button>
        <input style={{ border: '1px solid black', width: 200, margin: 'auto', display: 'block', marginBottom: 10 }} size={1} className={"searchProduct"} name="search" placeholder="Buscar en el inventario..." value={search} onChange={e => {
            setSearch(e.target.value)
        }} />
        {showCreate ? <Modal onClose={onCloseCallback}>
            <ModalClose onClose={onCloseCallback} title={"Crear producto"}>
                <div className="product-card">
                    <form onSubmit={(e) => {
                        e.preventDefault()
                        addProduct.mutate({
                            name: form.name,
                            description: form.description,
                            options: form.use_variants ? form.options : [],
                            use_variants: form.use_variants,
                            variants: form.variants.map(variant => ({
                                ...variant,
                                qty: Number(variant.qty),
                                price: Number(variant.price) * 100,
                                discount_price: Number(variant.discount_price) * 100,
                            })),
                            tags: form.tags,
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
                        {form.use_variants ? (
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
                                                    {form.options.map((option, idxOption) => (
                                                        <Draggable key={option.id} draggableId={option.id} index={idxOption}>
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
                                                                    <div key={idxOption} style={{ display: 'flex', flexDirection: 'row' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30 }}>
                                                                            <Image src={drag} alt="" />
                                                                        </div>
                                                                        <div style={{ display: 'flex', flexDirection: "column" }}>
                                                                            <ModalField
                                                                                id={`${idxOption}-option-name`}
                                                                                label="Nombre de la opcion"
                                                                                required
                                                                                name="name"
                                                                                type="text"
                                                                                value={option.name}
                                                                                onChange={(e) => {
                                                                                    form.options[idxOption].name = e.target.value
                                                                                    setForm(state => ({
                                                                                        ...state,
                                                                                    }))
                                                                                }}
                                                                            />
                                                                            <div>Valor de la opcion</div>
                                                                            {option.values.map((value, idxValue) => (
                                                                                <ModalField
                                                                                    label=""
                                                                                    id={`${idxOption}-${idxValue}-option-value`}
                                                                                    key={value.id}
                                                                                    value={value.name}
                                                                                    onChange={(event) => {
                                                                                        if (event.target.value === "") {
                                                                                            const newOptions = [...form.options]
                                                                                            newOptions[idxOption].values.splice(idxValue)
                                                                                            setForm({ ...form, options: newOptions })
                                                                                        } else {
                                                                                            const newOptions = [...form.options]
                                                                                            newOptions[idxOption].values[idxValue].name = event.target.value
                                                                                            setForm({ ...form, options: newOptions })
                                                                                        }
                                                                                    }}
                                                                                    placeholder="Añadir otro valor"
                                                                                />
                                                                            ))}
                                                                            <input
                                                                                value=""
                                                                                onChange={(event) => {
                                                                                    const newOptions = [...form.options]
                                                                                    newOptions[idxOption].values.push({
                                                                                        id: nanoid(5),
                                                                                        name: event.target.value
                                                                                    })
                                                                                    setForm({ ...form, options: newOptions })
                                                                                }}
                                                                                placeholder="Añadir otro valor"
                                                                            />
                                                                        </div>
                                                                        <button
                                                                            onClick={() => {
                                                                                form.options.splice(idxOption, 1)
                                                                                setForm({ ...form, options: [...form.options] })
                                                                            }}
                                                                        >
                                                                            Delete
                                                                        </button>
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
                                <button
                                    type="button"
                                    onClick={() => {
                                        setForm({
                                            ...form,
                                            options: [...form.options, { id: nanoid(5), name: '', values: [], type: 'string' }]
                                        })
                                    }}
                                >
                                    Añadir otra opcion
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const variants = [
                                            form.variants[defaultVariantIndex],
                                        ]

                                        let result = form.options[0].values.map(value => ([value.name]));

                                        for (var k = 1; k < form.options.length; k++) {
                                            const next: string[][] = [];
                                            result.forEach(item => {
                                                form.options[k].values.forEach(word => {
                                                    var line = item.slice(0);
                                                    line.push(word.name);
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
                                                qty: '0',
                                                use_discount: false,
                                                discount_price: '0.00',
                                                combination: combination.map(combination => ({
                                                    id: nanoid(5),
                                                    name: combination,
                                                })),
                                            })
                                        }

                                        setForm({ ...form, variants })
                                    }}
                                >
                                    Done
                                </button>
                            </div>
                        ) : null}
                        {form.use_variants && form.variants.length > 1 ? (
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
                                            label={`Cantidad en el inventario`}
                                            required
                                            name="qty"
                                            type="number"
                                            value={value.qty}
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
                                        <ModalField
                                            id="qty"
                                            label={`Cantidad en el inventario`}
                                            required
                                            name="qty"
                                            type="number"
                                            value={form.variants[defaultVariantIndex].qty}
                                            onChange={(e) => {
                                                form.variants[defaultVariantIndex] = {
                                                    ...form.variants[defaultVariantIndex],
                                                    [e.target.name]: e.target.value,
                                                }
                                                setForm(state => ({
                                                    ...state,
                                                }))
                                            }}
                                            pattern="\d*"
                                            step="any"
                                        />
                                    </div>
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
                        <button type="submit" className="fourb-button">Crear</button>
                    </form>
                </div>
            </ModalClose>
        </Modal> : null}
        <div style={{ margin: '0px 30px', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.2)', marginBottom: 10 }}>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Imagen</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Nombre</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Descripcion</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Codigo</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Precio</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Con descuento</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Precio descuento</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Opciones</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Disponible</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Total</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Tags</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}></th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {searchProducts.data?.pages.map((page, index) => (
                        <Fragment key={index}>
                            {page.items.map(product => {
                                const defaultVariantIndex = product.variants.findIndex(variant => variant.combination.map(combination => combination.name).every(name => name === 'default'))
                                const defaultVariant = product.variants[defaultVariantIndex]
                                return (
                                    <Fragment key={product._id}>
                                        <tr>
                                            <td>
                                                {product.use_variants
                                                    ? null
                                                    : <img className="img-table" alt="" width="100%" src={defaultVariant.imgs[0]} />
                                                }
                                            </td>
                                            <td>{product.name}</td>
                                            <td>{product.description}</td>
                                            <td>{product.use_variants ? null : defaultVariant.sku}</td>
                                            <td>{product.use_variants ? null : `$${toCurrency(String(defaultVariant.price), '.')}`}</td>
                                            <td>
                                                {product.use_variants ? null : <input type="checkbox" checked={defaultVariant.use_discount} readOnly />}
                                            </td>
                                            <td>{product.use_variants ? null : `$${toCurrency(String(defaultVariant.discount_price), '.')}`}</td>
                                            <td>
                                                <input type="checkbox" checked={product.use_variants} readOnly />
                                            </td>
                                            <td>{product.use_variants ? null : defaultVariant.available}</td>
                                            <td>{product.use_variants ? null : defaultVariant.total}</td>
                                            <td>{product.tags.join(', ')}</td>
                                            <td><EditProduct product={product} onSuccessEdit={() => {
                                                searchProducts.refetch()
                                            }} /></td>
                                            <td><Link href={`/product/${product._id}`} className="fourb-button">VER</Link></td>
                                        </tr>
                                        {product.use_variants ? <tr>
                                            <td colSpan={12}>
                                                <table style={{ marginLeft: 40, borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.2)', marginBottom: 10 }}>
                                                            <th style={{ paddingRight: 20, paddingBottom: 10, textAlign: 'left' }}>Variante</th>
                                                            <th style={{ paddingRight: 20, paddingBottom: 10, textAlign: 'left' }}>Imagen</th>
                                                            <th style={{ paddingRight: 20, paddingBottom: 10, textAlign: 'left' }}>Disponible</th>
                                                            <th style={{ paddingRight: 20, paddingBottom: 10, textAlign: 'left' }}>Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {product.variants.map((value) => {
                                                            const variantName = value.combination.map(combination => combination.name).join(" / ")
                                                            if (variantName === "default") {
                                                                return null
                                                            }
                                                            return <tr key={value.inventory_variant_oid}>
                                                                <td>{variantName}</td>
                                                                <td>
                                                                    <img className="img-table" alt="" width="100%" src={value.imgs[0]} />
                                                                </td>
                                                                <td>{value.available}</td>
                                                                <td>{value.total}</td>
                                                            </tr>
                                                        })}
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr> : null}
                                    </Fragment>
                                )
                            })}
                        </Fragment>
                    ))}
                </tbody>
            </table>
        </div>
        {searchProducts.hasNextPage ? (
            <button
                className="fourb-button"
                onClick={() => {
                    searchProducts.fetchNextPage()
                }}
            >
                Cargar mas
            </button>
        ) : null}
        {searchProducts.isLoading ? <div className="loading" /> : null}
    </div>
}