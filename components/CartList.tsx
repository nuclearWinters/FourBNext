import Link from "next/link";
import { FC, useRef, useState } from "react"
import { trpc } from "../utils/config";
import css from './CartList.module.css'
import trash from '../public/trash-can.svg'
import Image from "next/image";
import { InputNumberCart } from "./InputNumberCart";
import { toast } from "react-toastify";
import { ItemsByCartMongo } from "../server/types";

type Modify<T, R> = Omit<T, keyof R> & R;

export type ItemsByCartTRPC = Modify<ItemsByCartMongo, {
    _id: string
    product_variant_id: string,
    cart_id: string,
    product_id: string
}>

export const CartList: FC<{
    refetch: () => void;
    product: ItemsByCartTRPC
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
    const addOneToCart = trpc.addOneToCart.useMutation({
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
    const isLoading = removeOneCart.isLoading || addOneToCart.isLoading || updateOneCart.isLoading
    const inputRef = useRef(String(product.qty))
    const [input, setInput] = useState(String(product.qty))
    const variantName = product.combination.map(combination => combination.name).join(" / ")
    return <tr className={css.productCard}>
        <td className={css.imageColumn} style={{ verticalAlign: 'top' }}>
            <Link href={`/product/${product.product_variant_id}`}>
                <img className={css.imgProduct} src={product.imgs[0]} />
            </Link>
        </td>
        <td className={css.columnResponsive}>
            <Link href={`/product/${product.product_variant_id}`} className={css.infoBox}>
                <div className={css.name}>{product.name}{variantName === "default" ? "" : ` (${variantName})`}</div>
                <div className={css.price}>
                    <span className={product.use_discount ? css.priceDiscounted : ""}>${(product.price / 100).toFixed(2)} MXN</span>
                    {product.use_discount ? <span>${(product.discount_price / 100).toFixed(2)} MXN</span> : null}
                </div>
                <div className={css.price}>{`(${product.qty}) en el carrito`}</div>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center' }} className={css.inputBox}>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: 10 }}>
                    <InputNumberCart
                        disabled={isLoading}
                        label={"Cantidad"}
                        required
                        type="number"
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value)
                        }}
                        onBlur={() => {
                            if (Number(input) < 1) {
                                updateOneCart.mutate(
                                    {
                                        item_by_cart_id: product._id,
                                        product_variant_id: product.product_variant_id,
                                        qty: product.qty ? 1 : 0,
                                    },
                                    {
                                        onSuccess: () => {
                                            setInput("1")
                                            inputRef.current = "1"
                                        }
                                    }
                                )
                            } else {
                                updateOneCart.mutate(
                                    {
                                        item_by_cart_id: product._id,
                                        product_variant_id: product.product_variant_id,
                                        qty: product.qty ? Number(input) : 0,
                                    },
                                    {
                                        onError: () => {
                                            setInput(inputRef.current)
                                        }
                                    }
                                )
                            }
                        }}
                        onMinus={() => {
                            if (Number(input) < 2) {
                                return
                            }
                            updateOneCart.mutate(
                                {
                                    item_by_cart_id: product._id,
                                    product_variant_id: product.product_variant_id,
                                    qty: product.qty ? Number(input) - 1 : 0,
                                },
                                {
                                    onSuccess: () => {
                                        setInput(state => {
                                            inputRef.current = String(Number(state) - 1)
                                            return String(Number(state) - 1)
                                        })
                                    }
                                }
                            )
                        }}
                        onPlus={() => {
                            addOneToCart.mutate(
                                {
                                    product_variant_id: product.product_variant_id,
                                    qty: 1,
                                },
                                {
                                    onSuccess: () => {
                                        setInput(state => {
                                            inputRef.current = String(Number(state) + 1)
                                            return String(Number(state) + 1)
                                        })
                                    },
                                }
                            )
                        }}
                    />
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
            <div style={{ paddingTop: 10 }} className="price">${(((product.use_discount ? product.discount_price : product.price) * product.qty) / 100).toFixed(2)} MXN</div>
        </td>
    </tr>
}