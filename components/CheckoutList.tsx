import Link from "next/link";
import { FC } from "react"

export const CheckoutList: FC<{
    product: {
        code: string;
        name: string;
        product_id: string;
        qty: number;
        _id: string;
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
    return <Link href={`/product/${product.product_id}`} id={`${product._id}-product`} className="product-card" style={{ flexDirection: 'row', display: 'flex' }}>
        <div style={{ position: 'relative', color: 'black' }}>
            <img style={{ width: 80, objectFit: 'cover', height: 80, minWidth: 80 }} src={product.use_small_and_big ? product.qty_big ? product.img_big[0] : product.img_small[0] : product.img[0]} />
            <div style={{ position: 'absolute', top: -10, left: -10, background: 'white', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid black', borderRadius: '100px', fontWeight: 'bold' }}>{product.qty || product.qty_big || product.qty_small}</div>
        </div>
        <div style={{ marginLeft: 16, color: 'black' }}>
            <div className="name">{product.name}{product.use_small_and_big ? product.qty_big ? " (Tamaño Grande)" : " (Tamaño Pequeño)" : ""}</div>
            <div className="price" style={{ paddingTop: 4 }}>
                <span className={product.use_discount ? "price-discounted" : ""}>${(product.price / 100).toFixed(2)}</span>
                {product.use_discount ? <span> ${(product.discount_price / 100).toFixed(2)}</span> : null}
            </div>
            <div className="price" style={{ paddingTop: 4 }}>Total: <strong>${(((product.use_discount ? product.discount_price : product.price) * (product.qty || product.qty_big || product.qty_small)) / 100).toFixed(2)}</strong></div>
        </div>
    </Link>
}