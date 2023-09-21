import { Fragment, useState } from "react"
import { trpc } from "../utils/config"
import { ModalCheckbox } from "../components/ModalCheckbox";
import Head from "next/head";
import { ColumnCheckbox } from "../components/ColumnCheckbox";
import { UpdateCartButton } from "../components/UpdateCartButton";
import { format } from 'date-fns'
import { CartDetails } from "../components/CartDetails";

export default function Shippings() {
    const [search, setSearch] = useState('')
    const [delivery, setDelivery] = useState<'city' | 'national'>('city')
    const [delivered, setDelivered] = useState(false)
    const [sent, setSent] = useState(false)
    const carts = trpc.carts.useInfiniteQuery(
        { limit: 20, delivery, delivered, sent, search },
        { getNextPageParam: (lastPage) => lastPage.nextCursor, }
    );
    return <div>
        <Head>
            <title>Envios - FOURB</title>
        </Head>
        <ModalCheckbox
            id="city"
            label="Chetumal"
            name="city"
            type="checkbox"
            checked={delivery === "city"}
            onChange={() => {
                setDelivery("city")
            }}
        />
        <ModalCheckbox
            id="national"
            label="Nacional"
            name="national"
            type="checkbox"
            checked={delivery === "national"}
            onChange={() => {
                setDelivery("national")
            }}
        />
        <ModalCheckbox
            id="delivered"
            label="Entregado"
            name="delivered"
            type="checkbox"
            checked={delivered}
            onChange={(e) => {
                setDelivered(e.target.checked)
            }}
        />
        <ModalCheckbox
            id="sent"
            label="Enviado"
            name="sent"
            type="checkbox"
            checked={sent}
            onChange={(e) => {
                setSent(e.target.checked)
            }}
        />
        <input style={{ border: '1px solid black', width: 200, margin: 'auto', display: 'block', marginBottom: 10 }} size={1} className={"searchProduct"} name="search" placeholder="Buscar carrito..." value={search} onChange={e => {
            setSearch(e.target.value)
        }} />
        <div style={{ margin: '0px 30px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.2)', marginBottom: 10 }}>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>ID</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Order ID</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Expire Date</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Status</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}>Por pagar en Cash</th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}></th>
                        <th style={{ paddingBottom: 10, textAlign: 'left' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {carts.data?.pages.map((page, index) => (
                        <Fragment key={index}>
                            {page.items.map(cart => (
                                <Fragment key={cart._id}>
                                    <tr>
                                        <td>{cart._id}</td>
                                        <td>{cart.order_id}</td>
                                        <td>{cart.expire_date ? format(new Date(cart.expire_date), 'dd/MM/yyyy hh:mm a') : 'Ninguno'}</td>
                                        <td>{cart.status}</td>
                                        <td>
                                            <ColumnCheckbox
                                                checked={cart.pay_in_cash}
                                                readOnly
                                            />
                                        </td>
                                        <td>
                                            <UpdateCartButton
                                                cartId={cart._id}
                                                onSuccess={() => {
                                                    carts.refetch()
                                                }}
                                                status={null}
                                                delivered={null}
                                                sent={cart.sent}
                                                text={cart.sent ? "Marcar como NO enviado" : "Marcar como enviado"}
                                            />
                                        </td>
                                        <td>
                                            <UpdateCartButton
                                                cartId={cart._id}
                                                onSuccess={() => {
                                                    carts.refetch()
                                                }}
                                                status={null}
                                                delivered={cart.delivered}
                                                sent={null}
                                                text={cart.delivered ? "Marcar como NO entregado" : "Marcar como entregado"}
                                            />
                                        </td>
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