import Head from "next/head"
import { CSSProperties, useState } from "react"
import { toCurrency, trpc } from "../../utils/config"
import Image from "next/image";
import { ModalField } from "../../components/ModalField";
import { ModalCheckbox } from "../../components/ModalCheckbox";
import { DragDropContext, Droppable, Draggable, DraggingStyle, NotDraggingStyle, DropResult } from 'react-beautiful-dnd';
import { toast } from "react-toastify";
import { nanoid } from "nanoid";
import TagsInput from 'react-tagsinput'
import { CombinationEdit, VariantCreate } from "../inventory-admin";
import { useRouter } from "next/router";
import { DndProvider } from "react-dnd";
import { DropZoneOptions } from "../../components/DropZoneOptions";
import { HTML5Backend } from "react-dnd-html5-backend";

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

const NewProduct = () => {
    const router = useRouter()
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
                    name: 'default',
                }]
            }
        ],
        options: [{
            id: nanoid(5),
            name: '',
            values: [] as CombinationEdit[],
            type: 'string' as 'string' | 'color',
        }]
    })
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
            router.push('/inventory-admin')
            toast.success('Producto creado correctamente.')
        },
        onError: (e) => {
            toast.error(e.message)
        }
    })
    const defaultVariantIndex = form.variants.findIndex(variant => variant.combination.map(combination => combination.name).every(name => name === 'default'))

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
    const signedUrl = trpc.signedUrl.useMutation()
    return <div>
        <Head>
            <title>New Product</title>
        </Head>
        <div className="product-card" style={{ background: 'rgb(240,240,240)', width: 'unset' }}>
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
                <div
                    style={{
                        borderRadius: '8px',
                        paddingBottom: '20px',
                        boxShadow: 'rgba(149, 157, 165, 0.2) 0px 8px 24px',
                        background: 'white',
                        margin: 'auto',
                        paddingTop: '20px',
                    }}
                >
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
                </div>
                <div
                    style={{
                        borderRadius: '8px',
                        paddingBottom: '20px',
                        boxShadow: 'rgba(149, 157, 165, 0.2) 0px 8px 24px',
                        background: 'white',
                        margin: 'auto',
                        paddingTop: '20px',
                        marginTop: '20px',
                    }}
                >
                    <div style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold' }}>Imagenes</div>
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
                                                                    <Image src={'/cross.svg'} alt="" height={16} width={16} />
                                                                </button>
                                                                <Image className="img-uploaded" alt="" style={{ width: '100%' }} width={100} height={100} src={item} />
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
                </div>
                <div
                    style={{
                        borderRadius: '8px',
                        paddingBottom: '20px',
                        boxShadow: 'rgba(149, 157, 165, 0.2) 0px 8px 24px',
                        background: 'white',
                        margin: 'auto',
                        paddingTop: '20px',
                        marginTop: '20px',
                    }}
                >
                    <div style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold' }}>Precio</div>
                    <ModalField
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
                    />
                    <ModalCheckbox
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
                    />
                    <div style={{ opacity: form.variants[defaultVariantIndex].use_discount ? '1' : '0.4', pointerEvents: form.variants[defaultVariantIndex].use_discount ? 'auto' : 'none' }}>
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
                    </div>
                </div>
                <div
                    style={{
                        borderRadius: '8px',
                        paddingBottom: '20px',
                        boxShadow: 'rgba(149, 157, 165, 0.2) 0px 8px 24px',
                        background: 'white',
                        margin: 'auto',
                        paddingTop: '20px',
                        marginTop: '20px',
                    }}
                >
                    <div style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold' }}>Inventario</div>
                    <ModalField
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
                    />
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
                </div>
                <div
                    style={{
                        borderRadius: '8px',
                        paddingBottom: '20px',
                        boxShadow: 'rgba(149, 157, 165, 0.2) 0px 8px 24px',
                        background: 'white',
                        margin: 'auto',
                        paddingTop: '20px',
                        marginTop: '20px',
                    }}
                >
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
                        <DndProvider backend={HTML5Backend}>
                            <div style={{ display: 'flex', flexDirection: "column" }}>
                                <DropZoneOptions
                                    options={form.options}
                                    setForm={setForm}
                                />
                                <button
                                    className="fourb-button"
                                    type="button"
                                    onClick={() => {
                                        setForm({
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
                                        })
                                    }}
                                >
                                    Añadir otra opción
                                </button>
                                <button
                                    className="fourb-button"
                                    type="button"
                                    onClick={() => {
                                        setForm({
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
                                        })
                                    }}
                                >
                                    Añadir otra opción de color
                                </button>
                                <button
                                    className="fourb-button"
                                    type="button"
                                    onClick={() => {
                                        const variants = [
                                            form.variants[defaultVariantIndex],
                                        ]

                                        let result = form.options[0].values.map(value => ([value]));

                                        for (var k = 1; k < form.options.length; k++) {
                                            const next: CombinationEdit[][] = [];
                                            result.forEach(item => {
                                                form.options[k].values.forEach(word => {
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
                                                qty: '0',
                                                use_discount: false,
                                                discount_price: '0.00',
                                                combination: combination.map(combination => ({
                                                    id: combination.id,
                                                    name: combination.name,
                                                })),
                                            })
                                        }
                                        setForm({ ...form, variants })
                                    }}
                                >
                                    Generar variantes
                                </button>
                            </div>
                        </DndProvider>
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
                                                                                <Image src={'/cross.svg'} alt="" height={16} width={16} />
                                                                            </button>
                                                                            <Image className="img-uploaded" alt="" width={100} height={100} src={item} />
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
                            </div>
                        })}</div>
                    ) : null}
                </div>
                <button type="submit" className="fourb-button">Crear</button>
            </form>
        </div>
    </div>
}

export default NewProduct