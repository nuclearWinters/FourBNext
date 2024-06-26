import Link from "next/link"
import { trpc } from "../utils/config"
import { useRouter } from "next/router"
import { Fragment, MutableRefObject } from "react"
import { InfiniteScroll } from "../components/InfiniteScroll"
import Head from "next/head"
import { toast } from "react-toastify"
import Image from "next/image"

export default function History(props: {
    footerRef: MutableRefObject<HTMLDivElement | null>
}) {
    const router = useRouter()
    const purchases = trpc.purchases.useInfiniteQuery(
        { limit: 8 },
        { getNextPageParam: (lastPage) => lastPage.nextCursor, }
    )
    const addOneCart = trpc.addOneToCart.useMutation({
        onSuccess: () => {
            toast.success('Carrito actualizado.')
            router.push('/cart')
        },
        onError: (e) => {
            toast.error(e.message)
        }
    })
    return <div>
        <Head>
            <title>Historial - FOURB</title>
        </Head>
        <h2 className="title" style={{ marginBottom: 10 }}>Compras recientes</h2>
        {purchases.isLoading ? <div className="loading" id="loading" /> : null}
        <div id="purchases" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', flexDirection: "column", maxWidth: 800, margin: 'auto' }}>
            <InfiniteScroll
                loading={purchases.isFetchingNextPage}
                next={purchases.fetchNextPage}
                hasMore={!!purchases.hasNextPage}
                refContainer={props.footerRef}
            >
                {purchases.data?.pages.map((page, index) => {
                    return (
                        <Fragment key={index}>
                            {page.items.map(product => {
                                const variantName = product.combination.map(combination => combination.name).join(" / ")
                                return (
                                    <div key={product._id} style={{ borderTop: '1px solid rgba(0,0,0,0.2)' }}>
                                        <div className="product-card" style={{ flexDirection: 'row', display: 'flex' }}>
                                            <Link href={`/product/${product.product_id}`}><Image alt="" className="img-product" src={product.imgs[0]} width={100} height={100} /></Link>
                                            <div>
                                                <div style={{ fontWeight: 'bold' }} className="name">{product.name}{variantName === "default" ? "" : ` (${variantName})`}</div>
                                                <div className="price">
                                                    Precio unitario: <strong>${((product.use_discount ? product.discount_price : product.price) / 100).toFixed(2)}</strong>
                                                </div>
                                                <div className="price">
                                                    Cantidad: <strong>{product.qty}</strong>
                                                </div>
                                                <div className="price">
                                                    Total: <strong>${(((product.use_discount ? product.discount_price : product.price) * (product.qty)) / 100).toFixed(2)}</strong>
                                                </div>
                                                <div className="price">
                                                    {product.status === "cancelled"
                                                        ? "Cancelado"
                                                        : product.status === "paid"
                                                            ? "Pagado con exito"
                                                            : product.status == "waiting_payment"
                                                                ? "Pago pendiente de cobro"
                                                                : ""
                                                    }
                                                </div>
                                                <button
                                                    style={{ marginLeft: 20 }}
                                                    className="fourb-button"
                                                    onClick={() => {
                                                        addOneCart.mutate({
                                                            product_variant_id: product.product_variant_id,
                                                            qty: product.qty ? 1 : 0,
                                                        })
                                                    }}
                                                >
                                                    Comprar otra vez
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </Fragment>
                    )
                })}
            </InfiniteScroll>
        </div>
        {purchases.hasNextPage ? (
            <strong
                style={{
                    margin: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                ¡Baja para ver más!
            </strong>
        ) : (
            <strong
                style={{
                    margin: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                ¡Se han mostrado todos los productos de la busqueda!
            </strong>
        )}        {purchases.isLoading ? <div className="loading" /> : null}
    </div >
}