import Link from 'next/link';
import { trpc } from '../utils/config';
import { FC, useState } from 'react';
import { toast } from 'react-toastify';

export const ProductList: FC<{
    product: {
        _id: string;
        use_small_and_big: boolean;
        code: string;
        img: string[];
        available_big: number;
        img_big: string[];
        img_small: string[];
        name: string;
        use_discount: boolean;
        price: number;
        discount_price: number;
    }
}> = ({ product }) => {
    const [checked, setChecked] = useState<"big" | "small">(product.available_big ? 'big' : 'small')
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
            {product.use_small_and_big
                ? (
                    <>
                        <img style={{ display: checked === "big" ? "flex" : "none" }} className="img-product" src={product.img_big[0]} />
                        <img style={{ display: checked === "big" ? "none" : "flex" }} className="img-product" src={product.img_small[0]} />
                    </>
                )
                : <img className="img-product" src={product.img[0]} />
            }
            <div className="name">{product.name}</div>
            <div className="price">
                <span className={product.use_discount ? "price-discounted" : ""}>${(product.price / 100).toFixed(2)}</span>
                {product.use_discount ? <span> ${(product.discount_price / 100).toFixed(2)}</span> : null}
            </div>
        </Link>
        {product.use_small_and_big ? (
            <div style={{ marginBottom: 10 }}>
                <input id={`checkbox-big-${product._id}`} name="big" checked={checked === 'big'} type="checkbox" onChange={() => {
                    setChecked('big')
                }} />
                <label style={{ marginLeft: 4 }} className='productLabel' htmlFor={`checkbox-big-${product._id}`}>Grande</label>
                <input style={{ marginLeft: 6 }} id={`checkbox-small-${product._id}`} name="small" checked={checked === 'small'} type="checkbox" onChange={() => {
                    setChecked('small')
                }} />
                <label style={{ marginLeft: 4 }} className='productLabel' htmlFor={`checkbox-small-${product._id}`}>Pequeño</label>
            </div>
        ) : null}
        <button className="fourb-button" onClick={async () => {
            addOneToCart.mutate({
                product_id: product._id,
                qty: !product.use_small_and_big ? 1 : 0,
                qtyBig: product.use_small_and_big && checked === "big" ? 1 : 0,
                qtySmall: product.use_small_and_big && checked === "small" ? 1 : 0,
            })
        }}>
            AÑADIR AL CARRITO
        </button>
    </div>
}