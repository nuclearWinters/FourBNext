import { CSSProperties, Fragment, useState } from "react"
import { toCurrency, trpc } from "../utils/config"
import { EditProduct } from "../components/EditProduct";
import Link from "next/link";
import { DraggingStyle, NotDraggingStyle } from 'react-beautiful-dnd';
import Head from "next/head";
import { Combination } from "../server/types";
import { useRouter } from "next/router";

export interface CombinationEdit {
    id: string
    name: string
    focus: boolean
}

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
    options: CombinationEdit[]
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
    const router = useRouter()
    const [search, setSearch] = useState('')
    const searchProducts = trpc.inventory.useInfiniteQuery(
        { limit: 20, search },
        { getNextPageParam: (lastPage) => lastPage.nextCursor, }
    );
    return <div>
        <Head>
            <title>Inventario - FOURB</title>
        </Head>
        <button
            type="button"
            className="fourb-button"
            onClick={() => {
                router.push('product/new')
            }}
        >
            Crear
        </button>
        <input
            style={{ border: '1px solid black', width: 200, margin: 'auto', display: 'block', marginBottom: 10 }}
            size={1}
            className={"searchProduct"}
            name="search"
            placeholder="Buscar en el inventario..."
            value={search}
            onChange={e => {
                setSearch(e.target.value)
            }}
        />
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
                Cargar más
            </button>
        ) : null}
        {searchProducts.isLoading ? <div className="loading" /> : null}
    </div>
}