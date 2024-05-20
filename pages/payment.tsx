import { CONEKTA_PUBLIC_KEY, trpc } from '../utils/config'
import { useEffect } from 'react'
import Head from 'next/head'
import { toast } from 'react-toastify'

export default function Payment() {
    const cart = trpc.getUserCartData.useQuery(undefined, {
        refetchOnWindowFocus: false,
    })
    const checkoutId = cart.data?.checkout_id
    const isFetching = cart.isFetching
    const confirmationPhase = trpc.confirmationPhase.useMutation({
        onError: (e) => {
            toast.error(e.message)
        }
    })
    useEffect(() => {
        if (checkoutId && !isFetching) {
            const config = {
                checkoutRequestId: checkoutId,
                publicKey: CONEKTA_PUBLIC_KEY,
                targetIFrame: 'example',
            };
            const callbacks = {
                onFinalizePayment: async (info: any) => {
                    const type = info?.charge?.payment_method?.type
                    await confirmationPhase.mutateAsync({
                        type,
                    })
                    toast.success('Carrito pagado correctamente.')
                },
                onErrorPayment: () => {
                    toast.error('Error')
                },
            };
            (window as any).ConektaCheckoutComponents.Integration({ config, callbacks });
        }
        return
    }, [checkoutId, isFetching])
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
                : (
                    <div style={{ textAlign: 'center', margin: 30 }}>Error, tu carrito no puede ser pagado</div>
                )
        }
    </div>
}