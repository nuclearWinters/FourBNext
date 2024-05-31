import { ObjectId } from "mongodb";
import { FC, useState } from "react"
import css from "./product.module.css"
import { inventory } from "../api/trpc/[trpc]";
import { InventoryMongo, VariantMongo } from "../../server/types";
import { trpc } from "../../utils/config";
import { useRouter } from "next/router";
import { InputNumberCart } from "../../components/InputNumberCart";
import Head from "next/head";
import Script from "next/script";
import { toast } from "react-toastify";
import { Modal } from "../../components/Modal";
import { ModalClose } from "../../components/ModalClose";
import Image from "next/image";

export type Modify<T, R> = Omit<T, keyof R> & R;

export type VariantTRPC = Modify<VariantMongo, {
    inventory_variant_oid: string
}>

export type InventoryTRPC = Modify<InventoryMongo, {
    _id: string
    variants: VariantTRPC[]
}>

export const Product: FC<{ product: InventoryTRPC }> = ({ product }) => {
    const router = useRouter()
    const [qty, setQty] = useState('1')
    const addOneToCart = trpc.addOneToCart.useMutation({
        onSuccess: () => {
            toast.success('Carrito actualizado.')
            router.push('/cart')
        },
        onError: (e) => {
            toast.error(e.message)
        }
    })
    const qtyParsed = Number(qty) < 1 ? 1 : Number(qty)
    const title = `${product.name} - FOURB`
    const [selectedOption, setSelectedOption] = useState(
        product.use_variants
            ? product.options.filter(
                option => !option.values.every(value => value.name === "default")
            ).map(
                option => option.values[0].id
            )
            : []
    )
    const variantIndex = product.use_variants && product.variants.length > 1
        ? product.variants.findIndex(variant => variant.combination.every(combination => {
            return selectedOption.includes(combination.id)
        }))
        : product.variants.findIndex(variant => variant.combination.every(combination => combination.name.includes('default')))
    const variant = product.variants[variantIndex]
    const disabled = variant.available === 0
    const variantName = variant.combination.map(combination => combination.name).join(" / ")
    const [showTallaModal, setShowTallaModal] = useState(false)
    const defaultProduct = product.variants.find(variant => variant.combination.every(combination => combination.name.includes('default')))
    return <div className={css.productContainer} style={{ flex: 1, flexDirection: 'column' }}>
        <Head>
            <title>{title}</title>
        </Head>
        <Script
            type="application/ld+json"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                    "@context": "https://schema.org/",
                    "@type": "Product",
                    "name": product.name,
                    "description": product.description,
                    "image": variant.imgs,
                    "sku": variant.sku,
                    "offers": {
                        "@type": "AggregateOffer",
                        "offerCount": variant.available,
                        "lowPrice": variant.use_discount ? variant.discount_price : variant.price,
                        "highPrice": variant.price,
                        "priceCurrency": "MXN"
                    }
                })
            }}
        >
        </Script>
        {showTallaModal ? <Modal onClose={() => {
            setShowTallaModal(false)
        }}>
            <ModalClose
                onClose={() => {
                    setShowTallaModal(false)
                }}
                title={"¿Cuál es mi talla?"}
            >
                <form className={css["auth-form"]}>
                    <div style={{ marginLeft: 20, display: 'flex', flexDirection: 'column' }}>
                        <ul style={{ marginTop: 20, marginBottom: 20, fontSize: 22, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <li style={{ listStyleType: 'decimal' }}>Selecciona el anillo que te quede bien en el dedo que deseas.</li>
                            <li style={{ listStyleType: 'decimal' }}>Mide el diametro interno del anillo (solamente la parte de adentro del anillo)</li>
                            <li style={{ listStyleType: 'decimal' }}>Usa la tabla de abajo para comparar las medidas</li>
                        </ul>
                        <table className="tallas">
                            <tr>
                                <th>DIÁMETRO</th>
                                <th>CIRCUNFERENCIA</th>
                                <th>TALLA FOURB</th>
                            </tr>
                            <tr>
                                <td>1.56 cm</td>
                                <td></td>
                                <td>5</td>
                            </tr>
                            <tr>
                                <td>1.65 cm</td>
                                <td>5.5 cm</td>
                                <td>6</td>
                            </tr>
                            <tr>
                                <td>1.79 cm</td>
                                <td>6 cm</td>
                                <td>7</td>
                            </tr>
                            <tr>
                                <td>1.82 cm</td>
                                <td>6.2 cm</td>
                                <td>8</td>
                            </tr>
                            <tr>
                                <td>1.89 cm</td>
                                <td></td>
                                <td>9</td>
                            </tr>
                            <tr>
                                <td>1.92 cm</td>
                                <td></td>
                                <td>10</td>
                            </tr>
                            <tr>
                                <td></td>
                                <td></td>
                                <td>11</td>
                            </tr>
                        </table>
                    </div>
                </form>
            </ModalClose>
        </Modal> : null}
        <div className={css.productBox} style={{ flex: 1, display: 'flex' }}>
            <div style={{ flex: 4 }}>
                <Image alt="" style={{ width: '100%' }} className={css.mainImage} width={400} height={400} src={variant.imgs?.[0] ?? defaultProduct?.imgs?.[0]} />
            </div>
            <div className={css.infoBox}>
                <h1 className={css.name}>
                    {product.name}{product.use_variants ? ` (${variantName})` : ""}
                </h1>
                {product.use_variants && variant.available < 10 ? <div className={css.qtyWarning}>{variant.available === 0 ? "AGOTADOS" : "POCOS DISPONIBLES"}</div> : null}
                <div className={css.code}>SKU: {variant.sku}</div>
                <div className={css.code}>Descripción: {product.description}</div>
                <div className={css.price}>
                    <span className={variant.use_discount ? css.originalPrice : ""}>${(variant.price / 100).toFixed(2)} MXN</span>
                    {variant.use_discount ? <><span className={css.discount}>${(variant.discount_price / 100).toFixed(2)} MXN</span><span className={css.oferta}>OFERTA</span></> : null}
                </div>
                <button
                    className="link-button"
                    style={{ background: 'transparent', border: '1px solid black', cursor: 'pointer', marginBottom: 10 }}
                    onClick={() => {
                        setShowTallaModal(true)
                    }}
                >
                    ¿Cuál es mi talla de anillo?
                </button>
                <div className={css.paymentInfo}>
                    Paga personalmente en efectivo, por transferencia, en tiendas OXXO o con tarjeta de debito/credito en linea
                </div>
                {product.use_variants ? product.options.map((option, idxOption) => {
                    return <div key={option.id}>
                        <div>{option.name}</div>
                        <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap' }}>
                            {option.values.map(value => {
                                return option.type === "color" ? (
                                    <>
                                        <button
                                            style={{
                                                background: value.name === "Dorado" ? "#FFD700" : value.name === "Plateado" ? "#C0C0C0" : value.name,
                                            }}
                                            className={value.id === selectedOption[idxOption] ? css.selectedColor : css.unselectedColor}
                                            onClick={() => {
                                                selectedOption[idxOption] = value.id
                                                setSelectedOption([...selectedOption])
                                            }}
                                        />
                                    </>
                                ) : (
                                    <button
                                        className={value.id === selectedOption[idxOption] ? css.selected : css.unselected}
                                        onClick={() => {
                                            selectedOption[idxOption] = value.id
                                            setSelectedOption([...selectedOption])
                                        }}
                                    >
                                        {value.name}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                }) : null}
                <InputNumberCart
                    label={"Cantidad"}
                    required
                    type="number"
                    value={qty}
                    onChange={(e) => {
                        setQty(e.target.value)
                    }}
                    onBlur={() => {
                        if (Number(qty) < 1) {
                            setQty("1")
                        }
                    }}
                    onMinus={() => {
                        if (Number(qty) < 2) {
                            return
                        }
                        setQty(state => String(Number(state) - 1))
                    }}
                    onPlus={() => {
                        setQty(state => String(Number(state) + 1))
                    }}
                />
                <button
                    className={css.fourbButton}
                    disabled={disabled}
                    type="button"
                    onClick={() => {
                        addOneToCart.mutate({
                            product_variant_id: variant.inventory_variant_oid,
                            qty: qtyParsed || 0,
                        })
                    }}
                >
                    {disabled ? "Agotado" : "AÑADIR AL CARRITO"}
                </button>
            </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {!product.use_variants ? product.variants.filter(
                variant => variant.combination.every(value => value.name === "default")
            ).map(variant => {
                return variant.imgs.map(img => (
                    <Image alt="" height={300} width={300} style={{ maxHeight: 300, padding: 6, }} className={css.mainImage} src={img} key={img} />
                ))
            }) : null}
            {product.use_variants ? product.variants.filter(
                variant => !variant.combination.every(value => value.name === "default")
            ).map(variant => {
                return variant.imgs.map(img => (
                    <Image alt="" height={300} width={300} style={{ maxHeight: 300, padding: 6, }} className={css.mainImage} src={img} key={img} />
                ))
            }) : null}
        </div>
    </div>
}

export default Product

export async function getStaticPaths() {
    const products = await inventory.find({
        disabled: {
            $ne: true
        }
    }).toArray()
    const paths = products.map((product) => ({
        params: { id: product._id.toHexString() },
    }))
    return { paths, fallback: 'blocking' }
}

export const getStaticProps = async ({ params }: { params: { id: string } }) => {
    const product = await inventory.findOne({ _id: new ObjectId(params.id) })
    return {
        props: {
            product: {
                ...product,
                _id: product?._id.toHexString(),
                variants: product?.variants.map(variant => ({
                    ...variant,
                    inventory_variant_oid: variant.inventory_variant_oid.toHexString(),
                }))
            }
        }
    }
}