import Link from 'next/link';
import { trpc } from '../utils/config';
import { FC } from 'react';
import { toast } from 'react-toastify';
import { InventoryTRPC } from '../pages/product/[id]';

export const ProductList: FC<{
    product: InventoryTRPC
}> = ({ product }) => {
    const selectedOption = product.use_variants
        ? product.options.filter(
            option => !option.values.every(value => value.name === "default")
        ).map(
            option => option.values[0].id
        )
        : []
    const variantIndex = product.use_variants && product.variants.length > 1
        ? product.variants.findIndex(variant => variant.combination.every(combination => {
            return selectedOption.includes(combination.id)
        }))
        : product.variants.findIndex(variant => variant.combination.every(combination => combination.name.includes('default')))
    const variant = product.variants[variantIndex]
    const variantName = variant.combination.map(combination => combination.name).join(" / ")
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
            <div className="name">{product.name}{product.use_variants ? ` (${variantName})` : ""}</div>
            <div className="price">
                <span className={variant.use_discount ? "price-discounted" : ""}>${(variant.price / 100).toFixed(2)}</span>
                {variant.use_discount ? <span> ${(variant.discount_price / 100).toFixed(2)}</span> : null}
            </div>
        </Link>
        {product.use_variants ? (
            product.options.filter(option => option.type === "color").map(option => (
                <div></div>
            ))
        ) : null}
        <Link
            href={"/product/" + product._id}
            style={{
                background: '#d0c9c3',
                fontSize: '13px',
                color: 'black',
                fontWeight: '700',
                lineHeight: '18px',
                letterSpacing: '1px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'ArimoBold',
                padding: '6px 30px',
                margin: 'auto',
            }}
        >
            LO QUIERO
        </Link>
    </div>
}