import Link from "next/link";
import { FC } from "react"
import { ItemsByCartMongo } from "../server/types";
import Image from "next/image";

type Modify<T, R> = Omit<T, keyof R> & R;

export type ItemsByCartTRPC = Modify<ItemsByCartMongo, {
    _id: string
    product_variant_id: string,
    cart_id: string,
    product_id: string
}>

export const CheckoutList: FC<{
    product: ItemsByCartTRPC
}> = ({ product }) => {
    const variantName = product.combination.map(combination => combination.name).join(" / ")
    return <Link href={`/product/${product.product_id}`} id={`${product._id}-product`} className="product-card" style={{ flexDirection: 'row', display: 'flex' }}>
        <div style={{ position: 'relative', color: 'black' }}>
            <Image alt="" style={{ width: 80, objectFit: 'cover', height: 80, minWidth: 80 }} width={100} height={100} src={product.imgs[0]} />
            <div style={{ position: 'absolute', top: -10, left: -10, background: 'white', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid black', borderRadius: '100px', fontWeight: 'bold' }}>{product.qty}</div>
        </div>
        <div style={{ marginLeft: 16, color: 'black' }}>
            <div className="name">{product.name}{variantName === "default" ? "" : ` (${variantName})`}</div>
            <div className="price" style={{ paddingTop: 4 }}>
                <span className={product.use_discount ? "price-discounted" : ""}>${(product.price / 100).toFixed(2)}</span>
                {product.use_discount ? <span> ${(product.discount_price / 100).toFixed(2)}</span> : null}
            </div>
            <div className="price" style={{ paddingTop: 4 }}>Total: <strong>${(((product.use_discount ? product.discount_price : product.price) * product.qty) / 100).toFixed(2)}</strong></div>
        </div>
    </Link>
}