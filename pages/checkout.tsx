import { useRef } from "react";
import { CheckoutList } from "../components/CheckoutList";
import { trpc } from "../utils/config";
import { useRouter } from "next/router";
import Head from "next/head";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import css from '../components/ModalCheckbox.module.css'

const formSchemaStore = z.object({
    delivery: z.literal('store'),
    phone_prefix: z.literal('+52'),
    phone: z.string().min(1, { message: "El teléfono es requerido" }),
    name: z.string().min(1, { message: "El nombre es requerido" }),
    apellidos: z.string().min(1, { message: "El apellido es requerido" }),
    payment_method: z.enum(["cash", "card", "oxxo", "bank_transfer"]),
    email: z.string().min(1, { message: 'El email es requerido' }).email({ message: "El email no es valido" }),
})

const formSchemaCityNational = z.object({
    name: z.string().min(1, { message: "El nombre es requerido" }),
    apellidos: z.string().min(1, { message: "El apellido es requerido" }),
    street: z.string().min(1, { message: "La dirección es requerida" }),
    email: z.string().min(1, { message: 'El email es requerido' }).email({ message: "El email no es valido" }),
    country: z.string().min(1, { message: "El país es requerido" }),
    neighborhood: z.string().min(1, { message: "La colonia es requerida" }),
    zip: z.string().min(1, { message: "El código postal es requerido" }),
    city: z.string().min(1, { message: "La ciudad es requerida" }),
    state: z.string().min(1, { message: "El estado es requerido" }),
    phone: z.string().min(1, { message: "El teléfono es requerido" }),
    address_id: z.string().optional(),
    phone_prefix: z.literal('+52'),
    payment_method: z.enum(["cash", "card", "oxxo", "bank_transfer"]),
    delivery: z.enum(["city", "national"]),
})

const formSchema = z.union([formSchemaStore, formSchemaCityNational])

export default function Checkout() {
    const router = useRouter()
    const mounted = useRef(false)
    const products = trpc.getCart.useQuery();
    const checkout = trpc.checkoutPhase.useMutation({
        onSuccess(value) {
            toast.success('Carrito revisado correctamente.')
            if (value.cart_id) {
                router.push('/confirmation?cart_id=' + value.cart_id)
            } else {
                router.push('/payment')
            }
        },
        onError: (e) => {
            toast.error(e.message)
        }
    });
    const {
        watch,
        register,
        handleSubmit,
        formState: { errors },
        setValue,
    } = useForm<
        {
            delivery: 'store'
            phone_prefix: '+52'
            phone: string
            name: string
            apellidos: string
            payment_method: 'card' | 'cash' | 'oxxo' | 'bank_transfer'
            email: string
        } | {
            name: string
            apellidos: string
            street: string
            email: string
            country: string
            neighborhood: string
            zip: string
            city: string
            state: string
            phone: string
            address_id: string
            phone_prefix: '+52'
            payment_method: "cash" | "card" | "oxxo" | "bank_transfer",
            delivery: "city" | "national"
        }
    >({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            apellidos: '',
            street: '',
            email: '',
            country: '',
            neighborhood: '',
            zip: '',
            city: '',
            state: '',
            phone: '',
            address_id: '',
            phone_prefix: '+52',
            payment_method: 'card',
            delivery: 'city',
        }
    });
    const delivery = watch("delivery")
    const user = trpc.getUser.useQuery(undefined, {
        onSuccess: (values) => {
            if (!mounted.current) {
                const isLogged = !!values._id
                if (isLogged) {
                    const defaultAddress = values.addresses.find(address => address._id === values.default_address)
                    if (defaultAddress) {
                        setValue("street", defaultAddress.street)
                        setValue("country", defaultAddress.country)
                        setValue("neighborhood", defaultAddress.neighborhood)
                        setValue("zip", defaultAddress.zip)
                        setValue("city", defaultAddress.city)
                        setValue("state", defaultAddress.state)
                        setValue("phone", defaultAddress.phone)
                    }
                    setValue("name", values.name)
                    setValue("apellidos", values.apellidos)
                    setValue("email", values.email)
                    setValue("phone", values.phone)
                    setValue("address_id", values.default_address)
                } else {
                    setValue("name", values.name)
                    setValue("apellidos", values.apellidos)
                    setValue("street", values.addresses[0].street)
                    setValue("country", values.addresses[0].country)
                    setValue("neighborhood", values.addresses[0].neighborhood)
                    setValue("zip", values.addresses[0].zip)
                    setValue("city", values.addresses[0].city)
                    setValue("state", values.addresses[0].state)
                    setValue("phone", values.addresses[0].phone)
                    setValue("email", values.email)
                }
                mounted.current = true
            }
        },
    });
    const addresses = user.data?.addresses || []
    const total = products.data?.reduce((curr, product) => {
        const total = ((product.use_discount ? product.discount_price : product.price) * product.qty) / 100
        return curr + total
    }, 0)
    const deliveryCost = delivery === "city" ? 40 : delivery === "national" ? 119 : 0
    const totalWithDelivery = (total || 0) + deliveryCost
    return <div>
        <Head>
            <title>Revision - FOURB</title>
        </Head>
        <h2 className="title">
            Revisión
        </h2>
        <form
            id="checkout"
            onSubmit={handleSubmit((data) => {
                if (data.delivery === "store") {
                    checkout.mutate({
                        name: data.name,
                        apellidos: data.apellidos,
                        phone: data.phone,
                        phone_prefix: data.phone_prefix,
                        email: data.email,
                        payment_method: data.payment_method,
                        delivery: data.delivery,
                    })
                } else {
                    checkout.mutate({
                        name: data.name,
                        apellidos: data.apellidos,
                        street: data.street,
                        country: data.country,
                        neighborhood: data.neighborhood,
                        zip: data.zip,
                        city: data.city,
                        state: data.state,
                        phone: data.phone,
                        phone_prefix: data.phone_prefix,
                        email: data.email,
                        address_id: data.address_id,
                        payment_method: data.payment_method,
                        delivery: data.delivery,
                    })
                }
            })}
        >
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
                <div
                    style={{ flex: 1, display: "flex", flexDirection: 'column', alignItems: 'flex-end' }}
                    className="checkout"
                >
                    <div className="input-container-checkout" >
                        <label htmlFor="name">Escoge método de pago</label>
                        <div style={{ flexDirection: 'row', display: 'flex' }}>
                            <div className={css.container} style={{ width: 'unset' }}>
                                <input
                                    id="card"
                                    value="card"
                                    type="radio"
                                    className={css.input}
                                    {...register('payment_method')}
                                />
                                <label htmlFor={"card"} className={css.label}>
                                    Pagar en linea con tarjeta
                                </label>
                            </div>
                            <div className={css.container} style={{ width: 'unset' }}>
                                <input
                                    id="cash"
                                    value="cash"
                                    type="radio"
                                    className={css.input}
                                    {...register('payment_method')}
                                />
                                <label htmlFor={"cash"} className={css.label}>
                                    Pago personal en efectivo
                                </label>
                            </div>
                        </div>
                        <div style={{ flexDirection: 'row', display: 'flex' }}>
                            <div className={css.container} style={{ width: 'unset' }}>
                                <input
                                    id="oxxo"
                                    value="oxxo"
                                    type="radio"
                                    className={css.input}
                                    {...register('payment_method')}
                                />
                                <label htmlFor={"oxxo"} className={css.label}>
                                    Pagar en OXXO
                                </label>
                            </div>
                            <div className={css.container} style={{ width: 'unset' }}>
                                <input
                                    id="bank_transfer"
                                    value="bank_transfer"
                                    type="radio"
                                    className={css.input}
                                    {...register('payment_method')}
                                />
                                <label htmlFor={"bank_transfer"} className={css.label}>
                                    Pago por transferencia
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="input-container-checkout" >
                        <label htmlFor="name">Escoge método de entrega</label>
                        <div style={{ flexDirection: 'row', display: 'flex' }}>
                            <div className={css.container} style={{ width: 'unset' }}>
                                <input
                                    id="city"
                                    value="city"
                                    type="radio"
                                    className={css.input}
                                    {...register('delivery')}
                                />
                                <label htmlFor={"city"} className={css.label}>
                                    Entrega en Chetumal
                                </label>
                            </div>
                            <div className={css.container} style={{ width: 'unset' }}>
                                <input
                                    id="store"
                                    value="store"
                                    type="radio"
                                    className={css.input}
                                    {...register('delivery')}
                                />
                                <label htmlFor={"store"} className={css.label}>
                                    Recoger en tienda
                                </label>
                            </div>
                            <div className={css.container} style={{ width: 'unset' }}>
                                <input
                                    id="national"
                                    value="national"
                                    type="radio"
                                    className={css.input}
                                    {...register('delivery')}
                                />
                                <label htmlFor={"national"} className={css.label}>
                                    Entrega nacional
                                </label>
                            </div>
                        </div>
                    </div>
                    {delivery === "city" || delivery === "national" ? (
                        <div className="input-container-checkout">
                            El costo de entrega seran: {delivery === "city" ? '$40' : '$119'}
                        </div>
                    ) : null}
                    <div className="input-container-checkout">
                        <label htmlFor="email">Email</label>
                        {errors.email && <div style={{ color: 'salmon', marginBottom: 10 }}>{errors.email.message}</div>}
                        <input
                            id="email"
                            type="text"
                            required
                            {...register('email')}
                        />
                    </div>
                    {user.data?.default_address
                        ? <div className="input-container-checkout">
                            <label htmlFor="address_id">Direcciones guardadas</label>
                            <select
                                style={{ fontSize: 20 }}
                                id="address_id"
                                {...register('address_id')}
                            >
                                {addresses.map(address => (
                                    <option value={address._id} key={address._id}>{address.full_address}</option>
                                ))}
                            </select>
                        </div>
                        : null
                    }
                    <div className="input-container-checkout">
                        <label htmlFor="name">Nombre</label>
                        {errors.name && <div style={{ color: 'salmon', marginBottom: 10 }}>{errors.name.message}</div>}
                        <input
                            id="name"
                            type="text"
                            required
                            {...register('name')}
                        />
                    </div>
                    <div className="input-container-checkout">
                        <label htmlFor="apellidos">Apellidos</label>
                        {errors.apellidos && <div style={{ color: 'salmon', marginBottom: 10 }}>{errors.apellidos.message}</div>}
                        <input
                            id="apellidos"
                            type="text"
                            required
                            {...register('apellidos')}
                        />
                    </div>
                    {delivery === "store" ? null : (
                        <>
                            <div className="input-container-checkout">
                                <label htmlFor="street">Dirección</label>
                                {'street' in errors && errors.street && <div style={{ color: 'salmon', marginBottom: 10 }}>{errors.street.message}</div>}
                                <input
                                    id="street"
                                    type="text"
                                    required
                                    {...register('street')}
                                />
                            </div>
                            <div className="input-container-checkout">
                                <label htmlFor="country">País</label>
                                {'country' in errors && errors.country && <div style={{ color: 'salmon', marginBottom: 10 }}>{errors.country.message}</div>}
                                <select
                                    style={{ fontSize: 20 }}
                                    id="country"
                                    required
                                    {...register('country')}
                                >
                                    <option value="">Select</option>
                                    <option value="MX">🇲🇽 Mexico</option>
                                </select>
                            </div>
                            <div className="input-container-checkout">
                                <label htmlFor="neighborhood">Colonia</label>
                                {'neighborhood' in errors && errors.neighborhood && <div style={{ color: 'salmon', marginBottom: 10 }}>{errors.neighborhood.message}</div>}
                                <input
                                    id="neighborhood"
                                    type="text"
                                    required
                                    {...register('neighborhood')}
                                />
                            </div>
                            <div className="input-container-checkout">
                                <label htmlFor="zip">Código Postal</label>
                                {'zip' in errors && errors.zip && <div style={{ color: 'salmon', marginBottom: 10 }}>{errors.zip.message}</div>}
                                <input
                                    id="zip"
                                    type="text"
                                    required
                                    {...register('zip')}
                                />
                            </div>
                            <div className="input-container-checkout">
                                <label htmlFor="city">Ciudad</label>
                                {'city' in errors && errors.city && <div style={{ color: 'salmon', marginBottom: 10 }}>{errors.city.message}</div>}
                                <input
                                    id="city"
                                    type="text"
                                    required
                                    {...register('city')}
                                />
                            </div>
                            <div className="input-container-checkout">
                                <label htmlFor="state">Estado</label>
                                {'state' in errors && errors.state && <div style={{ color: 'salmon', marginBottom: 10 }}>{errors.state.message}</div>}
                                <input
                                    id="state"
                                    type="text"
                                    required
                                    {...register('state')}
                                />
                            </div>
                        </>
                    )}
                    <div className="input-container-checkout">
                        <label htmlFor="text">Telefono</label>
                        {errors.phone && <div style={{ color: 'salmon', marginBottom: 10 }}>{errors.phone.message}</div>}
                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                            <select
                                id="phone_prefix"
                                required
                                {...register('phone_prefix')}
                            >
                                <option value="+52">🇲🇽 Mexico (+52)</option>
                            </select>
                            <input
                                id="phone"
                                type="text"
                                required
                                style={{ flex: 1 }}
                                {...register('phone')}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <button style={{ padding: '10px 80px' }} className="fourb-button" type="submit">
                Pagar
            </button>
        </form>
    </div>
}