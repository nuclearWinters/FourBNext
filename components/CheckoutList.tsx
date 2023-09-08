import Link from "next/link";
import { FC } from "react"

export const CheckoutList: FC<{
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
    return <div id={`${product._id}-product`} className="product-card">
        <div className="name">{product.name}{product.use_small_and_big ? product.qty_big ? " (Tamaño Grande)" : " (Tamaño Pequeño)" : ""}</div>
        <div className="price">
            <span>Precio: </span>
            <span className={product.use_discount ? "price-discounted" : ""}>${(product.price / 100).toFixed(2)}</span>
            {product.use_discount ? <span> ${(product.discount_price / 100).toFixed(2)}</span> : null}
        </div>
        <img className="img-product" src={product.use_small_and_big ? product.qty_big ? product.img_big[0] : product.img_small[0] : product.img[0]} />
        <div className="price">Cantidad: {product.qty || product.qty_big || product.qty_small}</div>
        <div className="price">Total: ${(((product.use_discount ? product.discount_price : product.price) * (product.qty || product.qty_big || product.qty_small)) / 100).toFixed(2)}</div>
        <Link href={`/product/${product.product_id}`} className="fourb-button">VER</Link>
    </div>
}