import Link from "next/link"
import { trpc } from "../utils/config"

export default function History() {
    const purchases = trpc.purchases.useQuery()
    const addOneCart = trpc.addOneToCart.useMutation()
    return <div>
        <h2 className="title">Compras recientes</h2>
        {purchases.isLoading ? <div className="loading" id="loading" /> : null}
        <div id="purchases" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
            {purchases.data?.map(product => (
                <div key={product._id}>
                    <div className="product-card">
                        <div className="name">{product.name}{product.use_small_and_big ? product.qty_big ? " (Tamaño Grande)" : " (Tamaño Pequeño)" : ""}</div>
                        <div className="price">
                            Precio unitario: ${((product.use_discount ? product.discount_price : product.price) / 100).toFixed(2)}
                        </div>
                        <img className="img-product" src={product.use_small_and_big ? product.qty_big ? product.img_big[0] : product.img_small[0] : product.img[0]} />
                        <div className="price">
                            Cantidad: {product.qty || product.qty_big || product.qty_small}
                        </div>
                        <div className="price">
                            Total: ${(((product.use_discount ? product.discount_price : product.price) * (product.qty || product.qty_big || product.qty_small)) / 100).toFixed(2)}
                        </div>
                        <Link href={`/product/${product.product_id}`} className="fourb-button">VER</Link>
                        <button className="fourb-button" onClick={() => {
                            addOneCart.mutate({ 
                                product_id: product.product_id,
                                qty: product.qty ? 1 : 0,
                                qtyBig: product.qty_big ? 1 : 0,
                                qtySmall: product.qty_small ? 1 : 0,
                             })
                        }}>
                            AÑADIR AL CARRITO
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div >
}