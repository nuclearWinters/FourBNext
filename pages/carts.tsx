import { Fragment, useState } from "react"
import { trpc } from "../utils/config"
import Head from "next/head";
import { format } from 'date-fns'
import { CartDetails } from "../components/CartDetails";

export default function Carts() {
    const [search, setSearch] = useState('')
    const carts = trpc.carts.useInfiniteQuery(
        { limit: 20, search },
        { getNextPageParam: (lastPage) => lastPage.nextCursor, }
    );
    return <div>
        <Head>
            <title>Pagos en efectivo - FOURB</title>
        </Head>
        <input style={{ border: '1px solid black', width: 200, margin: 'auto', display: 'block', marginBottom: 10 }} size={1} className={"searchProduct"} name="search" placeholder="Buscar carrito..." value={search} onChange={e => {
            setSearch(e.target.value)
        }} />
        <div style={{ margin: '0px 30px', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.2)', marginBottom: 10 }}>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>ID</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Order ID</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Fecha expiración</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Estatus</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {carts.data?.pages.map((page, index) => (
                        <Fragment key={index}>
                            {page.items.map(cart => (
                                <Fragment key={cart._id}>
                                    <tr>
                                        <td style={{ padding: '10px' }}>{cart._id}</td>
                                        <td style={{ padding: '10px' }}>{cart.order_id}</td>
                                        <td style={{ padding: '10px' }}>{cart.expire_date ? format(new Date(cart.expire_date), 'dd/MM/yyyy hh:mm a') : 'Ninguno'}</td>
                                        <td style={{ padding: '10px' }}>{cart.status}</td>
                                    </tr>
                                   <CartDetails cart={cart} />
                                </Fragment>
                            ))}
                        </Fragment>
                    ))}
                </tbody>
            </table>
        </div>
        {carts.hasNextPage ? (
            <button
                className="fourb-button"
                onClick={() => {
                    carts.fetchNextPage()
                }}
            >
                Cargar mas
            </button>
        ) : null}
        {carts.isLoading ? <div className="loading" /> : null}
    </div>
}