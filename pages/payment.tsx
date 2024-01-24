import { CONEKTA_PUBLIC_KEY, trpc } from '../utils/config'
import { useEffect, useState } from 'react'
import facebook from '../public/facebook.svg'
import instagram from '../public/instagram.svg'
import Image from 'next/image'
import Head from 'next/head'
import { toast } from 'react-toastify'

export default function Payment() {
    const cart = trpc.getUserCartData.useQuery(undefined, {
        refetchOnWindowFocus: false,
    })
    const [cartId, setCartId] = useState('')
    const checkoutId = cart.data?.checkout_id
    const confirmationPhase = trpc.confirmationPhase.useMutation({
        onSuccess: () => {
            toast.success('Carritos pagado correctamente.')
        },
        onError: (e) => {
            toast.error(e.message)
        }
    })
    useEffect(() => {
        if (checkoutId) {
            const config = {
                checkoutRequestId: checkoutId,
                publicKey: CONEKTA_PUBLIC_KEY,
                targetIFrame: 'example',
            };
            const callbacks = {
                onFinalizePayment: async (info: any) => {
                    confirmationPhase.mutate({
                        type: info?.charge?.payment_method?.type
                    })
                },
                onErrorPayment: () => {
                    toast.error('Error')
                },
            };
            (window as any).ConektaCheckoutComponents.Integration({ config, callbacks });
        }
        return
    }, [checkoutId])
    useEffect(() => {
        const cart_id = localStorage.getItem('cart_id')
        if (cart_id) {
            setCartId(cart_id)
        }
    }, [])
    return <div>
        <Head>
            <title>Pago - FOURB</title>
        </Head>
        <h2 className="title">
            Pago
        </h2>
        {cart.isLoading
            ? <div className="loading" />
            : cart.data?.checkout_id
                ? (
                    <>
                        <form>
                            <div id="example" style={{ maxWidth: 500, width: '100%', margin: '0 auto' }} />
                        </form>
                    </>
                )
                : cartId
                    ? (
                        <div>
                            <div style={{ textAlign: 'center', margin: 30 }}>Por favor, envíanos un mensaje en nuestra página de <a href='https://www.facebook.com/fourbmx/' target='_blank'>Facebook</a> o página de <a href='https://www.instagram.com/fourb_mx/' target='_blank'>Instagram</a> con el siguiente código:</div>
                            <div className="payBox" style={{ display: "flex", justifyContent: 'center', margin: 'auto', background: '#e7ebee', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', padding: 20, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                    <div style={{ fontSize: 16, fontWeight: 500 }}>{cartId}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 40, alignItems: 'center', justifyContent: 'center', margin: 40 }}>
                                <a href='https://www.facebook.com/fourbmx/' target='_blank'><Image src={facebook} alt="" width={40} /></a>
                                <a href='https://www.instagram.com/fourb_mx/' target='_blank'><Image src={instagram} alt="" width={40} /></a>
                            </div>
                        </div>
                    )
                    : (
                        <div style={{ textAlign: 'center', margin: 30 }}>Error, tu carrito no puede ser pagado</div>
                    )
        }
    </div>
}