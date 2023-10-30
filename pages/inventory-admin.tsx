import { CSSProperties, Fragment, useState } from "react"
import { toCurrency, trpc } from "../utils/config"
import { EditProduct } from "../components/EditProduct";
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

interface Variant {
    imgs: string[],
    qty: string,
    price: string,
    sku: string,
    use_discount: boolean,
    discount_price: string,
    combination: string[],
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
        variants: {
            'default': {
                imgs: [] as string[],
                qty: '0',
                price: '0.00',
                sku: '',
                use_discount: false,
                discount_price: '0.00',
                combination: []
            }
        } as Record<string, Variant>,
        options: [{
            id: '',
            name: '',
            values: [] as {
                id: string
                name: string
            }[],
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
                variants: {
                    'default': {
                        imgs: [],
                        qty: '0',
                        price: '0.00',
                        sku: '',
                        use_discount: false,
                        discount_price: '0.00',
                        combination: []
                    }
                },
                options: [{
                    id: '',
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
    const onDragEnd = (result: DropResult, value: Variant, key: string) => {
        if (!result.destination) {
            return;
        }
        const items = reorder(
            value.imgs,
            result.source.index,
            result.destination.index
        );
        setForm(state => ({
            ...state,
            variants: {
                ...state.variants,
                [key]: {
                    ...value,
                    imgs: items
                }
            }
        }))
    }
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
                            options: form.options,
                            use_variants: form.use_variants,
                            variants: (() => {
                                const variants: Record<string, {
                                    imgs: string[],
                                    qty: number,
                                    price: number,
                                    sku: string,
                                    use_discount: boolean,
                                    discount_price: number,
                                    combination: string[]
                                }> = {}
                                for (const variant in form.variants) {
                                    variants[variant] = {
                                        ...form.variants[variant],
                                        qty: Number(form.variants[variant].qty),
                                        price: Number(form.variants[variant].price) * 100,
                                        discount_price: Number(form.variants[variant].discount_price) * 100,
                                    }
                                }
                                return variants
                            })(),
                            tags: [],
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
                            value={form.variants['default']?.sku}
                            onChange={(e) => {
                                setForm(state => ({
                                    ...state,
                                    variants: {
                                        ...state.variants,
                                        'default': {
                                            ...form.variants['default'],
                                            [e.target.name]: e.target.value,
                                        }
                                    }
                                }))
                            }}
                        />}
                        {form.use_variants ? null : <ModalField
                            id="price"
                            label="Precio"
                            required
                            name="price"
                            type="number"
                            value={form.variants['default'].price}
                            onChange={(e) => {
                                setForm(state => ({
                                    ...state,
                                    variants: {
                                        ...state.variants,
                                        'default': {
                                            ...form.variants['default'],
                                            [e.target.name]: toCurrency(e.target.value, '.')
                                        }
                                    }
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
                            checked={form.variants['default']?.use_discount}
                            onChange={(e) => {
                                setForm(state => ({
                                    ...state,
                                    variants: {
                                        ...state.variants,
                                        'default': {
                                            ...form.variants['default'],
                                            [e.target.name]: e.target.checked
                                        }
                                    }
                                }))
                            }}
                        />}
                        {form.use_variants ? null : <div style={{ opacity: form.variants['default'].use_discount ? '1' : '0.4', pointerEvents: form.variants['default'].use_discount ? 'auto' : 'none' }}>
                            <ModalField
                                id="discount_price"
                                label="Precio de descuento"
                                required
                                name="discount_price"
                                type="number"
                                value={form.variants['default']?.discount_price}
                                onChange={(e) => {
                                    setForm(state => ({
                                        ...state,
                                        variants: {
                                            ...state.variants,
                                            'default': {
                                                ...form.variants['default'],
                                                [e.target.name]: toCurrency(e.target.value, '.')
                                            }
                                        }
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
                                <div style={{ display: 'flex', flexDirection: "column" }}>
                                    {form.options.map((option, idxOption) => (
                                        <div key={idxOption} style={{ display: 'flex', flexDirection: 'row' }}>
                                            <div>Move</div>
                                            <div style={{ display: 'flex', flexDirection: "column" }}>
                                                <div>Option Name</div>
                                                <input></input>
                                                <div>Option Values</div>
                                                {option.values.map((value, idxValue) => (
                                                    <input
                                                        key={idxValue}
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
                                                        placeholder="Add another value"
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
                                                    placeholder="Add another value"
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
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setForm({
                                            ...form,
                                            options: [...form.options, { id: '', name: '', values: [], type: 'string' }]
                                        })
                                    }}
                                >
                                    Add another option
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const variants = {
                                            'default': form.variants['default']
                                        } as Record<string, {
                                            imgs: string[],
                                            qty: string,
                                            price: string,
                                            sku: string,
                                            use_discount: boolean,
                                            discount_price: string,
                                            combination: string[],
                                        }>

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
                                            variants[combination.join("")] = {
                                                imgs: [],
                                                price: '0.00',
                                                sku: '',
                                                qty: '0',
                                                use_discount: false,
                                                discount_price: '0.00',
                                                combination,
                                            }
                                        }

                                        setForm({ ...form, variants })
                                    }}
                                >
                                    Done
                                </button>
                            </div>
                        ) : null}
                        {
                            form.use_variants && Object.keys(form.variants).length > 1 ? (
                                <div>{Object.entries(form.variants).map(([key, value]) => {
                                    if (key === "default") {
                                        return null
                                    }
                                    return <div key={key}>
                                        <div className="img-title">
                                            {value.combination.join(" / ")}
                                        </div>
                                        <ModalField
                                            id={`${key}-sku`}
                                            label="Código"
                                            required
                                            name="sku"
                                            type="text"
                                            value={value.sku}
                                            onChange={(e) => {
                                                setForm(state => ({
                                                    ...state,
                                                    variants: {
                                                        ...state.variants,
                                                        [key]: {
                                                            ...value,
                                                            [e.target.name]: e.target.value,
                                                        }
                                                    }
                                                }))
                                            }}
                                        />
                                        <ModalField
                                            id={`${key}-price`}
                                            label="Precio"
                                            required
                                            name="price"
                                            type="number"
                                            value={value.price}
                                            onChange={(e) => {
                                                setForm(state => ({
                                                    ...state,
                                                    variants: {
                                                        ...state.variants,
                                                        [key]: {
                                                            ...value,
                                                            [e.target.name]: toCurrency(e.target.value, '.')
                                                        }
                                                    },
                                                }))
                                            }}
                                            pattern="\d*"
                                            step="any"
                                        />
                                        <ModalCheckbox
                                            id={`${key}-use_discount`}
                                            label="Usar descuento"
                                            name="use_discount"
                                            type="checkbox"
                                            checked={value.use_discount}
                                            onChange={(e) => {
                                                setForm(state => ({
                                                    ...state,
                                                    variants: {
                                                        ...state.variants,
                                                        [key]: {
                                                            ...value,
                                                            [e.target.name]: e.target.checked,
                                                        }
                                                    },
                                                }))
                                            }}
                                        />
                                        <div style={{ opacity: value.use_discount ? '1' : '0.4', pointerEvents: value.use_discount ? 'auto' : 'none' }}>
                                            <ModalField
                                                id={`${key}-discount_price`}
                                                label="Precio de descuento"
                                                required
                                                name="discount_price"
                                                type="number"
                                                value={value.discount_price}
                                                onChange={(e) => {
                                                    setForm(state => ({
                                                        ...state,
                                                        variants: {
                                                            ...state.variants,
                                                            [key]: {
                                                                ...value,
                                                                [e.target.name]: toCurrency(e.target.value, '.')
                                                            }
                                                        },
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
                                                                setForm(state => ({
                                                                    ...state,
                                                                    variants: {
                                                                        ...state.variants,
                                                                        [key]: {
                                                                            ...state.variants[key],
                                                                            imgs: [...state.variants[key].imgs, url.origin + url.pathname],
                                                                        }
                                                                    }
                                                                }))
                                                            } catch (e) {
                                                                toast.error('Error while uploading')
                                                            }
                                                        }
                                                    }
                                                }
                                            }} />
                                            <div className="input-container images-container">
                                                <DragDropContext onDragEnd={(result) => onDragEnd(result, form.variants[key], key)}>
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
                                                                            ><div style={{ position: 'relative' }} key={item}>
                                                                                    <button
                                                                                        className="closeImgButton"
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setForm(state => ({
                                                                                                ...state,
                                                                                                variants: {
                                                                                                    ...state.variants,
                                                                                                    [key]: {
                                                                                                        ...state.variants[key],
                                                                                                        imgs: state.variants[key].imgs.filter(currImg => item !== currImg)
                                                                                                    }
                                                                                                }
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
                                                id={`${key}-qty`}
                                                label={`Cantidad en el inventario`}
                                                required
                                                name="qty"
                                                type="number"
                                                value={value.qty}
                                                onChange={(e) => {
                                                    setForm(state => ({
                                                        ...state,
                                                        variants: {
                                                            ...state.variants,
                                                            [key]: {
                                                                ...state.variants[key],
                                                                [e.target.name]: e.target.value
                                                            }
                                                        }
                                                    }))
                                                }}
                                            />
                                        </div>
                                    </div>
                                })}</div>
                            ) : null
                        }
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
                                                                setForm(state => ({
                                                                    ...state,
                                                                    variants: {
                                                                        ...state.variants,
                                                                        'default': {
                                                                            ...state.variants['default'],
                                                                            imgs: [...state.variants['default'].imgs, url.origin + url.pathname],
                                                                        }
                                                                    }
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
                                            <DragDropContext onDragEnd={(result) => onDragEnd(result, form.variants['default'], 'default')}>
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
                                                            {form.variants['default'].imgs.map((item, index) => (
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
                                                                                        setForm(state => ({
                                                                                            ...state,
                                                                                            variants: {
                                                                                                ...state.variants,
                                                                                                'default': {
                                                                                                    ...state.variants['default'],
                                                                                                    imgs: state.variants['default'].imgs.filter(currImg => item !== currImg)
                                                                                                }
                                                                                            }
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
                                            value={form.variants['default'].qty}
                                            onChange={(e) => {
                                                setForm(state => ({
                                                    ...state,
                                                    variants: {
                                                        ...state.variants,
                                                        'default': {
                                                            ...state.variants['default'],
                                                            [e.target.name]: e.target.value
                                                        }
                                                    }
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
                            <label htmlFor="discount">Tags</label>
                            <div className="checkboxes" style={{ display: 'flex', flexWrap: 'wrap', }}>

                            </div>
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
                            {page.items.map(product => (
                                <Fragment key={product._id}>
                                    <tr>
                                        <td>
                                            {product.use_variants
                                                ? null
                                                : <img className="img-table" alt="" width="100%" src={product.variants['default'].imgs[0]} />
                                            }
                                        </td>
                                        <td>{product.name}</td>
                                        <td>{product.description}</td>
                                        <td>{product.use_variants ? null : product.variants['default'].sku }</td>
                                        <td>{product.use_variants ? null : `$${toCurrency(String(product.variants['default'].price), '.')}`}</td>
                                        <td>
                                            {product.use_variants ? null : <input type="checkbox" checked={product.variants['default'].use_discount} readOnly />}
                                        </td>
                                        <td>{product.use_variants ? null : `$${toCurrency(String(product.variants['default'].discount_price), '.')}`}</td>
                                        <td>
                                            <input type="checkbox" checked={product.use_variants} readOnly />
                                        </td>
                                        <td>{product.use_variants ? null : product.variants['default'].available}</td>
                                        <td>{product.use_variants ? null : product.variants['default'].total}</td>
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
                                                    {Object.values(product.variants).map((value) => {
                                                        return <tr>
                                                            <td>{value.combination.join(' / ')}</td>
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
                            ))}
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