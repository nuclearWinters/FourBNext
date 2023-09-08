import { ObjectId } from "mongodb";
import { FC, useState } from "react"
import css from "./product.module.css"
import { inventory } from "../api/trpc/[trpc]";
import { InventoryMongo } from "../../server/types";
import { trpc } from "../../utils/config";
import { useRouter } from "next/router";
import { InputNumberCart } from "../../components/InputNumberCart";

type Modify<T, R> = Omit<T, keyof R> & R;

export type InventoryTRPC = Modify<InventoryMongo, {
    _id: string
}>

export const Product: FC<{ product: InventoryTRPC }> = ({ product }) => {
    const router = useRouter()
    const [checked, setChecked] = useState<"big" | "small">(product.available_big ? "big" : "small")
    const checkedBig = checked === "big"
    const checkedSmall = checked === "small"
    const disabled = product.use_small_and_big ? ((product.available_big === 0 && checkedBig) || (product.available_small === 0 && checkedBig)) : product.available === 0
    const [qty, setQty] = useState('1')
    const addOneToCart = trpc.addOneToCart.useMutation({ onSuccess: () => {
        router.push('/cart')
    } })
    const qtyParsed = Number(qty) < 1 ? 1 : Number(qty)
    return <div className={css.productContainer} style={{ flex: 1}}>
        <div style={{ flex: 4 }}>
            {product.use_small_and_big
                ? (
                    <>
                        <img style={{ display: checkedBig ? "flex" : "none" }} className={css.mainImage} src={product.img_big[0]} />
                        <img style={{ display: checkedBig ? "none" : "flex" }} className={css.mainImage} src={product.img_small[0]} />
                    </>
                )
                : <img className={css.mainImage} src={product.img[0]} />
            }
        </div>
        <div className={css.infoBox}>
            <h1 className={css.name}>
                {product.name}{product.use_small_and_big ? checkedBig ? " (Tamaño Grande)" : " (Tamaño Pequeño)" : ""}
            </h1>
            {checkedBig && product.use_small_and_big && product.available_big < 10 ? <div className={css.qtyWarning}>{product.available_big === 0 ? "AGOTADOS" : "POCOS DISPONIBLES"}</div> : null}
            {checkedSmall && product.use_small_and_big && product.available_small < 10 ? <div className={css.qtyWarning}>{product.available_small === 0 ? "AGOTADOS" : "POCOS DISPONIBLES"}</div> : null}
            {!product.use_small_and_big && product.available < 10 ? <div className={css.qtyWarning}>{product.available === 0 ? "AGOTADOS" : "POCOS DISPONIBLES"}</div> : null}
            <div className={css.code}>SKU: {product.code}</div>
            <div className={css.price}>
                <span className={product.use_discount ? css.originalPrice : ""}>${(product.price / 100).toFixed(2)} MXN</span>
                {product.use_discount ? <><span className={css.discount}>${(product.discount_price / 100).toFixed(2)} MXN</span><span className={css.oferta}>OFERTA</span></> : null}
            </div>
            <div className={css.paymentInfo}>
                Paga personalmente en efectivo, por transferencia, en tiendas OXXO o tarjeta de debito/credito en linea
            </div>
            {product.use_small_and_big ? <div style={{ marginBottom: 10 }}>
                <div>Tamaño</div>
                <button
                    className={checkedBig ? css.selected : css.unselected}
                    onClick={() => {
                        setChecked("big")
                    }}
                >
                    Grande
                </button>
                <button
                    className={checkedSmall ? css.selected : css.unselected}
                    onClick={() => {
                        setChecked("small")
                    }}
                >
                    Pequeño
                </button>
            </div> : null}
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
                        product_id: product._id,
                        qty: !product.use_small_and_big ? qtyParsed : 0,
                        qtyBig: product.use_small_and_big && checkedBig ? qtyParsed : 0,
                        qtySmall: product.use_small_and_big && checkedSmall ? qtyParsed : 0,
                    })
                }}
            >
                {disabled ? "Agotado" : "AÑADIR AL CARRITO"}
            </button>
        </div>
    </div>
}

export default Product

export async function getStaticPaths() {
    const products = await inventory.find().toArray()
    const paths = products.map((product) => ({
        params: { id: product._id.toHexString() },
    }))
    return { paths, fallback: false }
}

export const getStaticProps = async ({ params }: { params: { id: string } }) => {
    const product = await inventory.findOne({ _id: new ObjectId(params.id) })
    return { props: { product: { ...product, _id: product?._id.toHexString() } } }
}