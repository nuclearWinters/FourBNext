import { useState } from "react";
import { CheckoutList } from "../components/CheckoutList";
import { trpc } from "../utils/config";
import { useRouter } from "next/router";

export default function Checkout() {
    const router = useRouter()
    const [form, setForm] = useState({
        name: '',
        apellidos: '',
        street: '',
        country: '',
        colonia: '',
        zip: '',
        city: '',
        state: '',
        phonePrefix: '+52' as const,
        phone: '',
        email: '',
        address_id: '',
    })
    const products = trpc.getCart.useQuery();
    const checkout = trpc.checkoutPhase.useMutation();
    const user = trpc.getUser.useQuery(undefined, {
        onSuccess: (values) => {
            const isLogged = !!values._id
            if (isLogged) {
                const index = values.addresses.findIndex(address => address._id === values.default_address)
                const defaultAddress = values.addresses[index]
                setForm({
                    name: values.name,
                    apellidos: values.apellidos,
                    street: defaultAddress.street,
                    country: defaultAddress.country,
                    colonia: defaultAddress.colonia,
                    zip: defaultAddress.zip,
                    city: defaultAddress.city,
                    state: defaultAddress.state,
                    phonePrefix: "+52",
                    phone: defaultAddress.phone,
                    email: '',
                    address_id: values.default_address,
                })
            } else {
                setForm({
                    name: values.name,
                    apellidos: values.apellidos,
                    street: values.addresses[0].street,
                    country: values.addresses[0].country,
                    colonia: values.addresses[0].colonia,
                    zip: values.addresses[0].zip,
                    city: values.addresses[0].city,
                    state: values.addresses[0].state,
                    phonePrefix: "+52",
                    phone: values.addresses[0].phone,
                    email: values.email,
                    address_id: '',
                })
            }
        }
    });
    const addresses = user.data?.addresses || []
    const selectedAddress = addresses.find(address => address._id === form.address_id)
    const setFormByName = (name: string, value: string) => {
        setForm(state => ({ ...state, [name]: value }))
    }
    return <div>
        <h2 className="title">
            Revisión
        </h2>
        {products.isLoading ? <div className="loading" /> : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
            {products.data?.map((product) => {
                return <CheckoutList product={product} key={product._id} />
            })}
        </div>
        <form onSubmit={(e) => {
            e.preventDefault()
        }} id="checkout">
            {!user.data?._id
                ? <div className="input-container">
                    <label htmlFor="email">Email</label>
                    <input id="email" name="email" type="text" required value={form.email} onChange={(e) => {
                        setFormByName(e.target.name, e.target.value)
                    }} />
                </div>
                : null}
            {user.data?._id
                ? <div className="input-container">
                    <label htmlFor="address_id">Addresses</label>
                    <select style={{ fontSize: 20 }} name="address_id" id="address_id" required value={selectedAddress?._id} onChange={(e) => {
                        setFormByName(e.target.name, e.target.value)
                    }}>
                        {addresses.map(address => (
                            <option value={address._id}>{address.full_address}</option>
                        ))}
                    </select>
                </div>
                : null
            }
            <div className="input-container">
                <label htmlFor="name">Nombre</label>
                <input id="name" name="name" type="text" required value={form.name} onChange={(e) => {
                    setFormByName(e.target.name, e.target.value)
                }} />
            </div>
            <div className="input-container">
                <label htmlFor="apellidos">Apellidos</label>
                <input id="apellidos" name="apellidos" type="text" required value={form.apellidos} onChange={(e) => {
                    setFormByName(e.target.name, e.target.value)
                }} />
            </div>
            <div className="input-container">
                <label htmlFor="street">Dirección</label>
                <input id="street" name="street" type="text" required value={form.street} onChange={(e) => {
                    setFormByName(e.target.name, e.target.value)
                }} />
            </div>
            <div className="input-container">
                <label htmlFor="country">País</label>
                <select style={{ fontSize: 20 }} id="country" name="country" required value={form.country} onChange={(e) => {
                    setFormByName(e.target.name, e.target.value)
                }}>
                    <option value="">Select</option>
                    <option value="MX">🇲🇽 Mexico</option>
                </select>
            </div>
            <div className="input-container">
                <label htmlFor="colonia">Colonia</label>
                <input id="colonia" name="colonia" type="text" required value={form.colonia} onChange={(e) => {
                    setFormByName(e.target.name, e.target.value)
                }} />
            </div>
            <div className="input-container">
                <label htmlFor="zip">Código Postal</label>
                <input id="zip" name="zip" type="text" required value={form.zip} onChange={(e) => {
                    setFormByName(e.target.name, e.target.value)
                }} />
            </div>
            <div className="input-container">
                <label htmlFor="city">Ciudad</label>
                <input id="city" name="city" type="text" required value={form.city} onChange={(e) => {
                    setFormByName(e.target.name, e.target.value)
                }} />
            </div>
            <div className="input-container">
                <label htmlFor="state">Estado</label>
                <input id="state" name="state" type="text" required value={form.state} onChange={(e) => {
                    setFormByName(e.target.name, e.target.value)
                }} />
            </div>
            <div className="input-container">
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
            <button className="fourb-button" type="submit" onClick={() => {
                checkout.mutate({
                    name: form.name,
                    apellidos: form.apellidos,
                    street: form.street,
                    country: form.country,
                    colonia: form.colonia,
                    zip: form.zip,
                    city: form.city,
                    state: form.state,
                    phone: form.phone,
                    phone_prefix: form.phonePrefix,
                    email: form.email,
                    address_id: form.address_id,
                }, {
                    onSuccess(data) {
                        if (data) {
                            localStorage.setItem("checkout_id", data)
                            router.push('/payment')
                        }
                    },
                })
            }}>Pagar</button>
        </form>
    </div>
}