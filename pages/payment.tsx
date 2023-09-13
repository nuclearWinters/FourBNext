import { trpc } from '../utils/config'
import { useEffect } from 'react'
import { CheckoutList } from '../components/CheckoutList'

export default function Payment() {
    const cart = trpc.getCart.useQuery()
    const confirmationPhase = trpc.confirmationPhase.useMutation()
    useEffect(() => {
        const checkout_id = localStorage.getItem("checkout_id")
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
        }
    }, [])
    const total = cart.data?.reduce((curr, product) => {
        return curr + (product.use_discount ? product.discount_price : product.price) * (product.qty || product.qty_big || product.qty_small)
    }, 0)
    return <div>
        <h2 className="title">
            Pago
        </h2>
        {cart.isLoading ? <div className="loading" /> : null}
        <div id="total" style={{ textAlign: 'center', marginTop: 20, fontWeight: 'bold', fontSize: 20 }}>Total: ${(Number(total) / 100).toFixed(2)}</div>
        <form>
            <div id="example" style={{ maxWidth: 500, width: '100%', margin: '0 auto' }} />
        </form>
        <div id="total" style={{ textAlign: 'center', marginTop: 20, fontWeight: 'bold', fontSize: 20 }}>Productos</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', flexDirection: 'column', maxWidth: '600px', margin: 'auto' }} id="products">
            {cart.data?.map(product => <CheckoutList product={product} key={product._id} />)}
        </div>
    </div>
}