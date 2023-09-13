import Link from "next/link";
import { trpc } from "../utils/config";
import { CartList } from "../components/CartList";


export default function Cart() {
    const products = trpc.getCart.useQuery();
    const total = products.data?.reduce((curr, product) => {
        const total = ((product.use_discount ? product.discount_price : product.price) * (product.qty || product.qty_big || product.qty_small)) / 100
        return curr + total
    }, 0)
    return <div>
        <h2 className="title">
            Mi carrito
        </h2>
        {products.isLoading ? <div className="loading" /> : null}
        {products.data?.length ? (
            <>
                <div className="table">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ marginBottom: 10 }}>
                                <th style={{ paddingBottom: 10, textAlign: 'left' }}></th>
                                <th style={{ paddingBottom: 10, textAlign: 'center' }}></th>
                                <th style={{ paddingBottom: 10, textAlign: 'left' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.data?.map((product) => {
                                return <CartList product={product} key={product._id} refetch={() => { products.refetch() }} />
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="payBox" style={{ display: "flex", justifyContent: 'center', margin: 'auto', background: '#e7ebee', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', padding: 20, flex: 1, justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 16, fontWeight: 500 }}>Total</div>
                        <div style={{ fontSize: 16, fontWeight: 500 }}>$ {total?.toFixed(2)}</div>
                    </div>
                    <Link href={'/checkout'} className="fourb-button" style={{ width: '100%' }}>Pagar</Link>
                </div>
            </>
        ) : <div style={{ display: 'flex', marginTop: 20 }}>
            <Link href={"/"} className="fourb-button page-button">Añadir productos al carrito</Link>
        </div>}
    </div>
}
