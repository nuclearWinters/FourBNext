import Link from 'next/link';
import { trpc } from '../utils/config';
import { FC, useState } from 'react';
import { toast } from 'react-toastify';
import { InventoryTRPC } from '../pages/product/[id]';

export const ProductList: FC<{
    product: InventoryTRPC
}> = ({ product }) => {
    const [selectedOption] = useState(product.use_variants ? product.options.map(option => option.values[0].id) : ['default'])
    const variant = product.variants[selectedOption.join("")]
    const addOneToCart = trpc.addOneToCart.useMutation({
        onSuccess: () => {
            toast.success("Añadido al carrito")
        },
        onError: (err) => {
            toast.error(err.message)
        }
    })
    return <div className="product-card">
        <Link href={`/product/${product._id}`}>    
            <img style={{ display: "flex" }} className="img-product" src={variant.imgs[0]} />
            <div className="name">{product.name}</div>
            <div className="price">
                <span className={variant.use_discount ? "price-discounted" : ""}>${(variant.price / 100).toFixed(2)}</span>
                {variant.use_discount ? <span> ${(variant.discount_price / 100).toFixed(2)}</span> : null}
            </div>
        </Link>
        {product.use_variants ? (
            product.options.filter(option => option.type === "color").map(option => (
                <div></div>
            ))
        ): null}
        <button className="fourb-button" onClick={async () => {
            addOneToCart.mutate({
                product_variant_id: product._id,
                qty: 1,
            })
        }}>
            AÑADIR AL CARRITO
        </button>
    </div>
}