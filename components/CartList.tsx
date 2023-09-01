import Link from "next/link";
import { FC, useState } from "react"
import { trpc } from "../utils/config";

export const CartList: FC<{
    product: {
        code: string;
        name: string;
        product_id: string;
        qty: number;
        _id: string;
        cart_id: string;
        price: number;
        img: string[];
        discount_price: number;
        use_discount: boolean;
        img_small: string[];
        img_big: string[];
        use_small_and_big: boolean;
        qty_big: number;
        qty_small: number;
    }
}> = ({ product }) => {
    const updateOneCart = trpc.updateOneCart.useMutation({
        onSuccess: () => {
            alert("Producto actualizado en el carrito")
        }
    });
    const removeOneCart = trpc.removeOneCart.useMutation({
        onSuccess: () => {
            alert("Producto eliminado en el carrito")
        }
    });
    const [input, setInput] = useState(product.qty || product.qty_big || product.qty_small)
    return <div className="product-card">
        <div className="name">{product.name}{product.use_small_and_big ? product.qty_big ? " (Tamaño Grande)" : " (Tamaño Pequeño)" : ""}</div>
        <div className="price">
            <span>Precio: </span>
            <span className={product.use_discount ? "price-discounted" : ""}>${(product.price / 100).toFixed(2)}</span>
            {product.use_discount ? <span>${(product.discount_price / 100).toFixed(2)}</span> : null}
        </div>
        <img className="img-product" src={product.use_small_and_big ? product.qty_big ? product.img_big[0] : product.img_small[0] : product.img[0]} />
        <div className="input-container">
            <label htmlFor={`${product._id}-quantity`}>Cantidad</label>
            <input type="number" id={`${product._id}-quantity`} value={input} min="1" onChange={(e) => {
                setInput(Number(e.target.value))
            }} />
        </div>
        <div className="price">Total: ${(((product.use_discount ? product.discount_price : product.price) * (product.qty || product.qty_big || product.qty_small)) / 100).toFixed(2)}</div>
        <Link href={`/product/${product.product_id}`} className="fourb-button">VER</Link>
        <button className="fourb-button" onClick={() => {
            updateOneCart.mutate({
                item_by_cart_id: product._id,
                product_id: product.product_id,
                qty: product.qty ? input : 0,
                qtyBig: product.qty_big ? input : 0,
                qtySmall: product.qty_small ? input : 0,
            })
        }}>
            Actualizar cantidad
        </button>
        <button className="fourb-button" onClick={() => {
            removeOneCart.mutate({ item_by_cart_id: product._id })
        }}>
            Eliminar producto
        </button>
    </div>
}