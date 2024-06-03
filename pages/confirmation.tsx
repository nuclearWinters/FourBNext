import { trpc } from '../utils/config'
import { useState } from 'react'
import facebook from '../public/facebook.svg'
import instagram from '../public/instagram.svg'
import Image from 'next/image'
import Head from 'next/head'
import { format } from 'date-fns'

const check = typeof window !== "undefined"

export default function Payment() {
    const [cart_id] = useState(check ? new URLSearchParams(document.location.search).get('cart_id') : "")
    const cart = trpc.getUserCartDataById.useQuery({
        cart_id: cart_id || ''
    })
    const bank_info = cart?.data?.bank_info
    const oxxo_info = cart?.data?.oxxo_info
    return <div>
        <Head>
            <title>Pago - FOURB</title>
        </Head>
        <h2 className="title">
            Pago
        </h2>
        {cart.isLoading
            ? <div className="loading" />
            : bank_info ? (
                <div>
                    <div style={{ textAlign: 'center', margin: 30 }}>Por favor, realiza la transferencia a la siguiente CLABE:</div>
                    <div className="payBox" style={{ display: "flex", justifyContent: 'center', margin: 'auto', background: '#e7ebee', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', padding: 20, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 500 }}>{bank_info.clabe}</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', margin: 30 }}>La cantidad es:</div>
                    <div className="payBox" style={{ display: "flex", justifyContent: 'center', margin: 'auto', background: '#e7ebee', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', padding: 20, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 500 }}>{bank_info.amount}</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', margin: 30 }}>El Banco receptor es:</div>
                    <div className="payBox" style={{ display: "flex", justifyContent: 'center', margin: 'auto', background: '#e7ebee', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', padding: 20, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 500 }}>{bank_info.bank}</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', margin: 30 }}>La fecha de expiracion es:</div>
                    <div className="payBox" style={{ display: "flex", justifyContent: 'center', margin: 'auto', background: '#e7ebee', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', padding: 20, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 500 }}>{format(new Date(bank_info.expire_at), 'dd/MM/yyyy hh:mm a')}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 40, alignItems: 'center', justifyContent: 'center', margin: 40 }}>
                        <a href='https://www.facebook.com/fourbmx/' target='_blank'><Image src={facebook} alt="" width={40} height={40} /></a>
                        <a href='https://www.instagram.com/fourb_mx/' target='_blank'><Image src={instagram} alt="" width={40} height={40} /></a>
                    </div>
                </div>
            ) : oxxo_info ? (
                <div>
                    <div style={{ textAlign: 'center', margin: 30 }}>Por favor, realiza el pago en una tienda OXXO cercana:</div>
                    <div className="payBox" style={{ display: "flex", justifyContent: 'center', margin: 'auto', background: '#e7ebee', flexDirection: 'column' }}>
                        <Image alt="" src={oxxo_info.barcode_url} width={100} height={100} style={{ width: '100%', height: '100%' }} />
                        <div style={{ display: 'flex', padding: 20, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 500 }}>{oxxo_info.reference}</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', margin: 30 }}>La cantidad es:</div>
                    <div className="payBox" style={{ display: "flex", justifyContent: 'center', margin: 'auto', background: '#e7ebee', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', padding: 20, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 500 }}>{oxxo_info.amount}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 40, alignItems: 'center', justifyContent: 'center', margin: 40 }}>
                        <a href='https://www.facebook.com/fourbmx/' target='_blank'><Image src={facebook} alt="" width={40} height={40} /></a>
                        <a href='https://www.instagram.com/fourb_mx/' target='_blank'><Image src={instagram} alt="" width={40} height={40} /></a>
                    </div>
                </div>
            ) : cart.data?.pay_in_cash ? (
                <div>
                    <div style={{ textAlign: 'center', margin: 30 }}>Por favor, envíanos un mensaje en nuestra página de <a href='https://www.facebook.com/fourbmx/' target='_blank'>Facebook</a> o página de <a href='https://www.instagram.com/fourb_mx/' target='_blank'>Instagram</a> con el siguiente código:</div>
                    <div className="payBox" style={{ display: "flex", justifyContent: 'center', margin: 'auto', background: '#e7ebee', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', padding: 20, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 500 }}>{cart.data._id}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 40, alignItems: 'center', justifyContent: 'center', margin: 40 }}>
                        <a href='https://www.facebook.com/fourbmx/' target='_blank'><Image src={facebook} alt="" width={40} height={40} /></a>
                        <a href='https://www.instagram.com/fourb_mx/' target='_blank'><Image src={instagram} alt="" width={40} height={40} /></a>
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', margin: 30 }}>Error, tu carrito no puede ser pagado</div>
            )
        }
    </div>
}