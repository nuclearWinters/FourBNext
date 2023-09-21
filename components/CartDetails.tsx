import { FC, useState } from "react"
import { CartsByUserTRPC } from "../server/trpc"
import { trpc } from "../utils/config"

export const CartDetails: FC<{ cart: CartsByUserTRPC }> = ({ cart }) => {
    const [show, setShow] = useState(false)
    const getItemsByCart = trpc.getItemsByCart.useQuery({ cart_id: cart._id }, { enabled: show })
    return show ? <tr>
        <td colSpan={12}>
            <table style={{ marginLeft: 40, borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.2)', marginBottom: 10 }}>
                        <th style={{ paddingRight: 20, paddingBottom: 10, textAlign: 'left' }}>Nombre</th>
                        <th style={{ paddingRight: 20, paddingBottom: 10, textAlign: 'left' }}>Direccion</th>
                        <th style={{ paddingRight: 20, paddingBottom: 10, textAlign: 'left' }}>Email</th>
                        <th style={{ paddingRight: 20, paddingBottom: 10, textAlign: 'left' }}>Telefono</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="table-item">{cart.name}</td>
                        <td className="table-item">{cart.address}</td>
                        <td className="table-item">{cart.email}</td>
                        <td className="table-item">{cart.phone}</td>
                    </tr>
                </tbody>
            </table>
            {getItemsByCart.data?.length ? <table style={{ marginLeft: 40, borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.2)', marginBottom: 10 }}>
                        <th style={{ paddingRight: 20, paddingBottom: 10, textAlign: 'left' }}>ID</th>
                        <th style={{ paddingRight: 20, paddingBottom: 10, textAlign: 'left' }}>Imagen</th>
                        <th style={{ paddingRight: 20, paddingBottom: 10, textAlign: 'left' }}>Nombre</th>
                        <th style={{ paddingRight: 20, paddingBottom: 10, textAlign: 'left' }}>SKU</th>
                        <th style={{ paddingRight: 20, paddingBottom: 10, textAlign: 'left' }}>Cantidad</th>
                        <th style={{ paddingRight: 20, paddingBottom: 10, textAlign: 'left' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {getItemsByCart.data.map(item => (
                        <tr key={item._id}>
                            <td className="table-item">{item._id}</td>
                            <td className="table-item">
                                {item.use_small_and_big
                                    ? <img className="img-table" alt="" width="100%" src={item.qty_big ? item.img_big[0] : item.img_small[0]} />
                                    : <img className="img-table" alt="" width="100%" src={item.img[0]} />
                                }
                            </td>
                            <td className="table-item">{item.name}{item.use_small_and_big ? item.qty_big ? " (Tamaño Grande)" : " (Tamaño Pequeño)" : ""}</td>
                            <td className="table-item">{item.code}</td>
                            <td className="table-item">{item.qty || item.qty_big || item.qty_small}</td>
                            <td className="table-item">${(((item.use_discount ? item.discount_price : item.price) * (item.qty || item.qty_big || item.qty_small)) / 100).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table> : <div>No items</div>}
        </td>
    </tr> : <tr><td colSpan={12}>
        <button onClick={() => {
            setShow(true)
        }}>Mostrar detalles</button>
    </td></tr>
}