import Link from "next/link";
import { trpc } from "../utils/config";
import { CartList } from "../components/CartList";


export default function Cart() {
    const products = trpc.getCart.useQuery();
    return <div>
        <h2 className="title">
            Carro de compras
        </h2>
        {products.isLoading ? <div className="loading" /> : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
            {products.data?.length ? products.data?.map((product) => {
                return <CartList product={product} key={product._id} />
            }) : <Link href={"/"} className="fourb-button">Añadir productos al carrito</Link>}
        </div>
        <Link href={'/checkout'} className="fourb-button">Pagar</Link>
    </div>
}
