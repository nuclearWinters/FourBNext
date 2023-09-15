import { trpc } from '../utils/config'
import { useEffect, useState } from 'react'
import { CheckoutList } from '../components/CheckoutList'
import facebook from '../public/facebook.svg'
import instagram from '../public/instagram.svg'
import Image from 'next/image'
import Head from 'next/head'

export default function Payment() {
    const cart = trpc.getCart.useQuery()
    const confirmationPhase = trpc.confirmationPhase.useMutation()
    const [checkoutId, setCheckoutId] = useState("")
    useEffect(() => {
        const checkout_id = localStorage.getItem("checkout_id") || ""
        setCheckoutId(checkout_id)
        const interval = setInterval(() => {
            if ((window as any)?.ConektaCheckoutComponents) {
                if (checkout_id) {
                    const config = {
                        checkoutRequestId: checkout_id,
                        publicKey: 'key_FSmk9b0tZ8KedYKgLqOgerF',
                        targetIFrame: 'example',
                    };
                    const callbacks = {
                        onFinalizePayment: async () => {
                            localStorage.removeItem("checkout_id")
                            confirmationPhase.mutate()
                        },
                        onErrorPayment: () => {
                            alert("Error")
                        },
                    };
                    (window as any).ConektaCheckoutComponents.Integration({ config, callbacks });
                    clearInterval(interval)
                }
            }
        }, 1000)
        return () => {
            clearInterval(interval)
        }
    }, [])
    const total = cart.data?.reduce((curr, product) => {
        return curr + (product.use_discount ? product.discount_price : product.price) * (product.qty || product.qty_big || product.qty_small)
    }, 0)
    return <div>
        <Head>
            <title>Pago - FourB</title>
        </Head>
        <h2 className="title">
            Pago
        </h2>
        {cart.isLoading ? <div className="loading" /> : null}
        {checkoutId
            ? (
                <>
                    <div id="total" style={{ textAlign: 'center', marginTop: 20, fontWeight: 'bold', fontSize: 20 }}>Total: ${(Number(total) / 100).toFixed(2)}</div>
                    <form>
                        <div id="example" style={{ maxWidth: 500, width: '100%', margin: '0 auto' }} />
                    </form>
                    <div id="total" style={{ textAlign: 'center', marginTop: 20, fontWeight: 'bold', fontSize: 20 }}>Productos</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', flexDirection: 'column', maxWidth: '600px', margin: 'auto' }} id="products">
                        {cart.data?.map(product => <CheckoutList product={product} key={product._id} />)}
                    </div>
                </>
            ) : (
                <div>
                    <div style={{ textAlign: 'center', margin: 30 }}>Por favor, envíanos un mensaje en nuestra página de <a href='https://www.facebook.com/fourbmx/' target='_blank'>Facebook</a> o página de <a href='https://www.instagram.com/fourb_mx/' target='_blank'>Instagram</a> con el siguiente código:</div>
                    <div className="payBox" style={{ display: "flex", justifyContent: 'center', margin: 'auto', background: '#e7ebee', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', padding: 20, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 500 }}>{cart?.data?.[0]?.cart_id || ""}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 40, alignItems: 'center', justifyContent: 'center', margin: 40 }}>
                        <a href='https://www.facebook.com/fourbmx/' target='_blank'><Image src={facebook} alt="" width={40} /></a>
                        <a href='https://www.instagram.com/fourb_mx/' target='_blank'><Image src={instagram} alt="" width={40} /></a>
                    </div>
                </div>
            )
        }
    </div>
}