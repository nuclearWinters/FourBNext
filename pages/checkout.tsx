import { useRef, useState } from "react";
import { CheckoutList } from "../components/CheckoutList";
import { trpc } from "../utils/config";
import { useRouter } from "next/router";
import { ModalCheckbox } from "../components/ModalCheckbox";
import Head from "next/head";
import { toast } from "react-toastify";

export default function Checkout() {
    const router = useRouter()
    const [paymentMethod, setPaymentMethod] = useState<'conekta' | 'cash'>('conekta')
    const [delivery, setDelivery] = useState<"store" | "city" | "national">('city')
    const [form, setForm] = useState({
        name: '',
        apellidos: '',
        street: '',
        country: '',
        neighborhood: '',
        zip: '',
        city: '',
        state: '',
        phonePrefix: '+52' as const,
        phone: '',
        email: '',
        address_id: '',
    })
    const mounted = useRef(false)
    const products = trpc.getCart.useQuery();
    const checkout = trpc.checkoutPhase.useMutation({
        onSuccess(value) {
            toast.success('Carrito revisado correctamente.')
            if (value.cart_id) {
                localStorage?.setItem("cart_id", value.cart_id)
            }
            router.push('/payment')
        },
        onError: (e) => {
            toast.error(e.message)
        }
    });
    const user = trpc.getUser.useQuery(undefined, {
        onSuccess: (values) => {
            if (!mounted.current) {
                const isLogged = !!values._id
                if (isLogged) {
                    const defaultAddress = values.addresses.find(address => address._id === values.default_address)
                    if (defaultAddress) {
                        setForm({
                            name: values.name,
                            apellidos: values.apellidos,
                            street: defaultAddress.street,
                            country: defaultAddress.country,
                            neighborhood: defaultAddress.neighborhood,
                            zip: defaultAddress.zip,
                            city: defaultAddress.city,
                            state: defaultAddress.state,
                            phonePrefix: "+52",
                            phone: defaultAddress.phone,
                            email: values.email,
                            address_id: values.default_address,
                        })
                    } else {
                        setForm({
                            name: values.name,
                            apellidos: values.apellidos,
                            street: '',
                            country: '',
                            neighborhood: '',
                            zip: '',
                            city: '',
                            state: '',
                            phonePrefix: "+52",
                            phone: '',
                            email: values.email,
                            address_id: '',
                        })
                    }
                } else {
                    setForm({
                        name: values.name,
                        apellidos: values.apellidos,
                        street: values.addresses[0].street,
                        country: values.addresses[0].country,
                        neighborhood: values.addresses[0].neighborhood,
                        zip: values.addresses[0].zip,
                        city: values.addresses[0].city,
                        state: values.addresses[0].state,
                        phonePrefix: "+52",
                        phone: values.addresses[0].phone,
                        email: values.email,
                        address_id: '',
                    })
                }
                mounted.current = true
            }
        },
    });
    const addresses = user.data?.addresses || []
    const selectedAddress = addresses.find(address => address._id === form.address_id)
    const setFormByName = (name: string, value: string) => {
        setForm(state => ({ ...state, [name]: value }))
    }
    const total = products.data?.reduce((curr, product) => {
        const total = ((product.use_discount ? product.discount_price : product.price) * product.qty) / 100
        return curr + total
    }, 0)
    const deliveryCost = delivery === "city" ? 35 : delivery === "national" ? 119 : 0
    const totalWithDelivery = (total || 0) + deliveryCost
    return <div>
        <Head>
            <title>Revision - FOURB</title>
        </Head>
        <h2 className="title">
            Revisión
        </h2>
        {products.isLoading ? <div className="loading" /> : null}
        <div className={"checkoutList"} style={{ display: "flex" }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', flex: 1, flexDirection: 'column' }}>
                {products.data?.map((product) => {
                    return <CheckoutList product={product} key={product._id} />
                })}
                <div className="payBox" style={{ display: "flex", background: '#e7ebee', flexDirection: 'column', marginBottom: 30 }}>
                    <div style={{ display: 'flex', padding: 20, flex: 1, justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 16, fontWeight: 500 }}>Total</div>
                        <div style={{ fontSize: 16, fontWeight: 500 }}>$ {totalWithDelivery?.toFixed(2)} {deliveryCost ? `(incluyendo envio)` : ''}</div>
                    </div>
                </div>
            </div>
            <form
                style={{ flex: 1, display: "flex", flexDirection: 'column', alignItems: 'flex-end' }}
                onSubmit={(e) => {
                    e.preventDefault()
                }}
                className="checkout"
                id="checkout"
            >
                <div className="input-container-checkout" >
                    <label htmlFor="name">Escoge método de pago</label>
                    <div style={{ flexDirection: 'row', display: 'flex' }}>
                        <ModalCheckbox
                            containerStyle={{ width: 'unset' }}
                            id="conekta"
                            label="Pagar en linea (deposito en oxxo, transferencia, tarjeta)"
                            type="checkbox"
                            checked={paymentMethod === "conekta"}
                            onChange={() => {
                                setPaymentMethod("conekta")
                            }}
                        />
                        <ModalCheckbox
                            containerStyle={{ width: 'unset' }}
                            id="cash"
                            label="Pago personal en efectivo"
                            type="checkbox"
                            checked={paymentMethod === "cash"}
                            onChange={() => {
                                setPaymentMethod("cash")
                            }}
                        />
                    </div>
                </div>
                <div className="input-container-checkout" >
                    <label htmlFor="name">Escoge método de entrega</label>
                    <div style={{ flexDirection: 'row', display: 'flex' }}>
                        <ModalCheckbox
                            containerStyle={{ width: 'unset' }}
                            id="city"
                            label="Entrega en Chetumal"
                            type="checkbox"
                            checked={delivery === "city"}
                            onChange={() => {
                                setDelivery("city")
                            }}
                        />
                        <ModalCheckbox
                            containerStyle={{ width: 'unset' }}
                            id="store"
                            label="Recoger en tienda"
                            type="checkbox"
                            checked={delivery === "store"}
                            onChange={() => {
                                setDelivery("store")
                            }}
                        />
                        <ModalCheckbox
                            containerStyle={{ width: 'unset' }}
                            id="national"
                            label="Entrega nacional"
                            type="checkbox"
                            checked={delivery === "national"}
                            onChange={() => {
                                setDelivery("national")
                            }}
                        />
                    </div>
                </div>
                {delivery === "city" || delivery === "national" ? <div className="input-container-checkout">
                    El costo de entrega seran: {delivery === "city" ? '$35' : '$119' }
                </div> : null}
                {!user.data?._id
                    ? <div className="input-container-checkout">
                        <label htmlFor="email">Email</label>
                        <input id="email" name="email" type="text" required value={form.email} onChange={(e) => {
                            setFormByName(e.target.name, e.target.value)
                        }} />
                    </div>
                    : null}
                {user.data?.default_address
                    ? <div className="input-container-checkout">
                        <label htmlFor="address_id">Addresses</label>
                        <select style={{ fontSize: 20 }} name="address_id" id="address_id" required value={selectedAddress?._id} onChange={(e) => {
                            setFormByName(e.target.name, e.target.value)
                        }}>
                            {addresses.map(address => (
                                <option value={address._id} key={address._id}>{address.full_address}</option>
                            ))}
                        </select>
                    </div>
                    : null
                }
                <div className="input-container-checkout">
                    <label htmlFor="name">Nombre</label>
                    <input id="name" name="name" type="text" required value={form.name} onChange={(e) => {
                        setFormByName(e.target.name, e.target.value)
                    }} />
                </div>
                <div className="input-container-checkout">
                    <label htmlFor="apellidos">Apellidos</label>
                    <input id="apellidos" name="apellidos" type="text" required value={form.apellidos} onChange={(e) => {
                        setFormByName(e.target.name, e.target.value)
                    }} />
                </div>
                {delivery === "store" ? null : (
                    <>
                        <div className="input-container-checkout">
                            <label htmlFor="street">Dirección</label>
                            <input id="street" name="street" type="text" required value={form.street} onChange={(e) => {
                                setFormByName(e.target.name, e.target.value)
                            }} />
                        </div>
                        <div className="input-container-checkout">
                            <label htmlFor="country">País</label>
                            <select style={{ fontSize: 20 }} id="country" name="country" required value={form.country} onChange={(e) => {
                                setFormByName(e.target.name, e.target.value)
                            }}>
                                <option value="">Select</option>
                                <option value="MX">🇲🇽 Mexico</option>
                            </select>
                        </div>
                        <div className="input-container-checkout">
                            <label htmlFor="neighborhood">Colonia</label>
                            <input id="neighborhood" name="neighborhood" type="text" required value={form.neighborhood} onChange={(e) => {
                                setFormByName(e.target.name, e.target.value)
                            }} />
                        </div>
                        <div className="input-container-checkout">
                            <label htmlFor="zip">Código Postal</label>
                            <input id="zip" name="zip" type="text" required value={form.zip} onChange={(e) => {
                                setFormByName(e.target.name, e.target.value)
                            }} />
                        </div>
                        <div className="input-container-checkout">
                            <label htmlFor="city">Ciudad</label>
                            <input id="city" name="city" type="text" required value={form.city} onChange={(e) => {
                                setFormByName(e.target.name, e.target.value)
                            }} />
                        </div>
                        <div className="input-container-checkout">
                            <label htmlFor="state">Estado</label>
                            <input id="state" name="state" type="text" required value={form.state} onChange={(e) => {
                                setFormByName(e.target.name, e.target.value)
                            }} />
                        </div>
                    </>
                )}
                <div className="input-container-checkout">
                    <label htmlFor="text">Telefono</label>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        <select id="phonePrefix" name="phonePrefix" required value={form.phonePrefix} onChange={(e) => {
                            setFormByName(e.target.name, e.target.value)
                        }}>
                            <option value="+52">🇲🇽 Mexico (+52)</option>
                        </select>
                        <input id="phone" type="text" name="phone" required style={{ flex: 1 }} value={form.phone} onChange={(e) => {
                            setFormByName(e.target.name, e.target.value)
                        }} />
                    </div>
                </div>
            </form>
        </div>
        <button style={{ padding: '10px 80px' }} className="fourb-button" type="submit" onClick={() => {
            checkout.mutate({
                name: form.name,
                apellidos: form.apellidos,
                street: form.street,
                country: form.country,
                neighborhood: form.neighborhood,
                zip: form.zip,
                city: form.city,
                state: form.state,
                phone: form.phone,
                phone_prefix: form.phonePrefix,
                email: form.email,
                address_id: form.address_id,
                payment_method: paymentMethod,
                delivery,
            })
        }}>Pagar</button>
    </div>
}