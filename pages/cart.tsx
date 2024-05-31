import Link from "next/link";
import { trpc } from "../utils/config";
import { CartList } from "../components/CartList";
import Head from "next/head";
import { useEffect, useState } from "react";
import { intervalToDuration } from "date-fns";

export default function Cart() {
    const [expireDate, setExpireDate] = useState<null | Date>(null)
    const [now, setNow] = useState(new Date())
    const products = trpc.getCart.useQuery();
    trpc.getUserCartData.useQuery(
        undefined,
        {
            onSuccess: (data) => {
                if (data?.expire_date) {
                    const expirationTime = new Date(data.expire_date)
                    expirationTime.setDate(expirationTime.getDate()+1)
                    const expirationTimeUTC = new Date(
                        Date.UTC(
                            expirationTime.getUTCFullYear(),
                            expirationTime.getUTCMonth(),
                            expirationTime.getUTCDate(),
                            8,
                            0,
                            0,
                        )
                    )
                    setExpireDate(expirationTimeUTC)
                }
            }
        }
    );
    useEffect(() => {
        let interval = setInterval(() => {
            setNow(new Date())
        }, 1000)
        return () => {
            clearInterval(interval)
        }
    }, [])
    const total = products.data?.reduce((curr, product) => {
        const total = ((product.use_discount ? product.discount_price : product.price) * product.qty) / 100
        return curr + total
    }, 0)
    const expireTime = expireDate ? intervalToDuration({
        start: now,
        end: expireDate,
    }) : null
    return <div>
        <Head>
            <title>Carrito - FOURB</title>
        </Head>
        <h2 className="title">
            Mi carrito
        </h2>
        <div style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 10,
        }}>
            {expireTime && products.data?.length
                ? (
                    <div>
                        Expira en: {" "}
                        <strong>
                            {expireTime.days ? `${expireTime.days} Día,` : ''} {expireTime.hours} Horas, {expireTime.minutes} Minutos, {expireTime.seconds} Segundos
                        </strong>
                    </div>
                )
                : null
            }
        </div>
        {products.isFetching
            ? <div className="loading" />
            : products.data?.length
                ? (
                    <>
                        <div className="table">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ marginBottom: 10 }}>
                                        <th style={{ paddingBottom: 10, textAlign: 'left' }}></th>
                                        <th style={{ paddingBottom: 10, textAlign: 'center' }}></th>
                                        <th style={{ paddingBottom: 10, textAlign: 'left' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.data?.map((product) => {
                                        return <CartList product={product} key={product._id} refetch={() => { products.refetch() }} />
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="payBox" style={{ display: "flex", justifyContent: 'center', margin: 'auto', background: '#e7ebee', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', padding: 20, flex: 1, justifyContent: 'space-between' }}>
                                <div style={{ fontSize: 16, fontWeight: 500 }}>Total</div>
                                <div style={{ fontSize: 16, fontWeight: 500 }}>$ {total?.toFixed(2)}</div>
                            </div>
                            <Link href={'/checkout'} className="fourb-button" style={{ width: '100%' }}>Pagar</Link>
                        </div>
                    </>
                )
                : (
                    <div style={{ display: 'flex', marginTop: 20 }}>
                        <Link href={"/"} className="fourb-button page-button">Añadir productos al carrito</Link>
                    </div>
                )}
    </div>
}
