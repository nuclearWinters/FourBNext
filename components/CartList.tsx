import Link from "next/link";
import { FC, useState } from "react"
import { trpc } from "../utils/config";
import css from './CartList.module.css'
import trash from '../public/trash-can.svg'
import Image from "next/image";
import { InputNumberCart } from "./InputNumberCart";
import { toast } from "react-toastify";

export const CartList: FC<{
    refetch: () => void;
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
}> = ({ product, refetch }) => {
    const updateOneCart = trpc.updateOneCart.useMutation({
        onSuccess: () => {
            toast.success("Producto actualizado en el carrito")
            refetch()
        },
        onError: (e) => {
            toast.error(e.message)
        }
    });
    const removeOneCart = trpc.removeOneCart.useMutation({
        onSuccess: () => {
            toast.success("Producto eliminado en el carrito")
            refetch()
        },
        onError: (e) => {
            toast.error(e.message)
        }
    });
    const [input, setInput] = useState(String(product.qty || product.qty_big || product.qty_small))
    return <tr className={css.productCard}>
        <td className={css.imageColumn} style={{ verticalAlign: 'top' }}>
            <Link href={`/product/${product.product_id}`}>
                <img className={css.imgProduct} src={product.use_small_and_big ? product.qty_big ? product.img_big[0] : product.img_small[0] : product.img[0]} />
            </Link>
        </td>
        <td className={css.columnResponsive}>
            <Link href={`/product/${product.product_id}`} className={css.infoBox}>
                <div className={css.name}>{product.name}{product.use_small_and_big ? product.qty_big ? " (Tamaño Grande)" : " (Tamaño Pequeño)" : ""}</div>
                <div className={css.price}>
                    <span className={product.use_discount ? css.priceDiscounted : ""}>${(product.price / 100).toFixed(2)} MXN</span>
                    {product.use_discount ? <span>${(product.discount_price / 100).toFixed(2)} MXN</span> : null}
                </div>
                <div className={css.price}>{`(${product.qty || product.qty_big || product.qty_small }) en el carrito`}</div>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center' }} className={css.inputBox}>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: 10 }}>
                    <InputNumberCart
                        label={"Cantidad"}
                        required
                        type="number"
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value)
                        }}
                        onBlur={() => {
                            if (Number(input) < 1) {
                                setInput("1")
                            }
                        }}
                        onMinus={() => {
                            if (Number(input) < 2) {
                                return
                            }
                            setInput(state => String(Number(state) - 1))
                        }}
                        onPlus={() => {
                            setInput(state => String(Number(state) + 1))
                        }}
                    />
                    <button className="fourb-button" onClick={() => {
                        updateOneCart.mutate({
                            item_by_cart_id: product._id,
                            product_id: product.product_id,
                            qty: product.qty ? Number(input) : 0,
                            qtyBig: product.qty_big ? Number(input) : 0,
                            qtySmall: product.qty_small ? Number(input) : 0,
                        })
                    }}>
                        Actualizar
                    </button>
                </div>
                <button
                    style={{ width: 20, height: 30, display: 'flex', padding: 0, alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onClick={() => {
                        removeOneCart.mutate({ item_by_cart_id: product._id })
                    }}
                >
                    <Image src={trash} alt="" width={20} height={30} />
                </button>
            </div>
        </td>
        <td className={css.columnFlex} style={{ verticalAlign: 'top' }}>
            <div style={{ paddingTop: 10 }} className="price">${(((product.use_discount ? product.discount_price : product.price) * (product.qty || product.qty_big || product.qty_small)) / 100).toFixed(2)} MXN</div>
        </td>
    </tr>
}