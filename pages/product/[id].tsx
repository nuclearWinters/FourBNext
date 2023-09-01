import { ObjectId } from "mongodb";
import { FC, useState } from "react"
import css from "./product.module.css"
import { inventory } from "../api/trpc/[trpc]";
import { InventoryMongo } from "../../server/types";

export const Product: FC<{ product: InventoryMongo }> = ({ product }) => {
    const [checked, setChecked] = useState<"big" | "small">(product.available_big ? "big" : "small")
    const disabled = product.use_small_and_big ? ((product.available_big === 0 && checked === "big") || (product.available_small === 0 && checked === "small")) : product.available === 0
    return <div style={{ display: "flex" }}>
        <div style={{ flex: 1 }}>
            {product.use_small_and_big
                ? (
                    <>
                        <img style={{ display: checked === "big" ? "flex" : "none" }} className={css.mainImage} src={product.img_big[0]} />
                        <img style={{ display: checked === "big" ? "none" : "flex" }} className={css.mainImage} src={product.img_small[0]} />
                    </>
                )
                : <img className={css.mainImage} src={product.img[0]} />
            }
        </div>
        <div style={{ flex: 1 }}>
            <h1 className={css.name}>
                {product.name}{product.use_small_and_big ? checked === "big" ? " (Tamaño Grande)" : " (Tamaño Pequeño)" : ""}
            </h1>
            <div className={css.code}>Codigo: {product.code}</div>
            <div className={css.price}>
                <span className={product.use_discount ? css.discount : ""}>${(product.price / 100).toFixed(2)}</span>
                {product.use_discount ? <span className="price">${(product.discount_price / 100).toFixed(2)}</span> : null}
            </div>
            <div style={{ marginBottom: 10 }}>
                <div>Tamaño</div>
                <button
                    className={checked === "big" ? css.selected : css.unselected}
                    onClick={() => {
                        setChecked("big")
                    }}
                >
                    Grande
                </button>
                <button
                    className={checked === "small" ? css.selected : css.unselected}
                    onClick={() => {
                        setChecked("small")
                    }}
                >
                    Pequeño
                </button>
            </div>
            {null}
            <button
                className={css.fourbButton}
                disabled={disabled}
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

export const getStaticProps = async ({ params }: { params: { id: string }}) => {
    const product = await inventory.findOne({ _id: new ObjectId(params.id) })
    return { props: { product: { ...product, _id: product?._id.toHexString() } } }
}