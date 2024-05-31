import { FC } from "react"
import { InventoryTRPC } from "../server/trpc"
import Link from "next/link";
import Image from "next/image";

export const CarouselItem: FC<{
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
    return <div
        style={{
            background: 'white',
            padding: '8px',
            alignItems: 'center',
            justifyContent: 'center',
            display: 'flex',
            flexDirection: 'column'
        }}
    >
        <Image
            height={263}
            width={280}
            style={{
                height: '263px',
                width: '280px',
                objectFit: 'cover',
            }}
            alt=""
            src={variant.imgs[0]}
        />
        <div
            style={{
                fontSize: '21px',
                lineHeight: '29px',
                fontWeight: '700',
                color: 'rgb(49, 36, 30)',
                marginTop: '6px',
                marginBottom: '2px'
            }}
        >
            {product.name}{product.use_variants ? ` (${variantName})` : ""}
        </div>
        <div
            style={{
                fontWeight: '600',
                color: 'rgb(49, 36, 30)',
                fontSize: '17px',
                lineHeight: '24px',
                marginBottom: '6px',
            }}
        >
            <span style={variant.use_discount ? { textDecorationLine: 'line-through' } : undefined}>${(variant.price / 100).toFixed(2)}</span>
            {variant.use_discount ? <span> ${(variant.discount_price / 100).toFixed(2)}</span> : null}
        </div>
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
                padding: '6px 30px'
            }}
        >
            LO QUIERO
        </Link>
    </div>
}