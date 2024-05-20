import { Collection, ObjectId } from "mongodb"
import { CartsByUserMongo, DecodeJWT, ItemsByCartMongo, SessionJWT, UserMongo } from "./types"
import { NextApiResponse } from "next"
import { sessionToBase64 } from "./utils"
import { CustomersApi, OrdersApi } from "conekta"

interface CheckoutStoreCard {
    cartsByUser: Collection<CartsByUserMongo>
    cart_oid: ObjectId
    email: string
    name: string
    apellidos: string
    phone_prefix: string
    phone: string
    userData?: DecodeJWT
    users: Collection<UserMongo>
    sessionData: SessionJWT
    res: NextApiResponse
    itemsByCart: Collection<ItemsByCartMongo>
    customerClient: CustomersApi,
    orderClient: OrdersApi,
}


export const checkoutStoreCard = async ({
    userData,
    users,
    itemsByCart,
    cart_oid,
    cartsByUser,
    phone,
    phone_prefix,
    sessionData,
    email,
    apellidos,
    res,
    name,
    customerClient,
    orderClient,
}: CheckoutStoreCard): Promise<string | undefined> => {
    let conekta_id = ""
    if (userData) {
        const user_oid = new ObjectId(userData.user._id)
        const result = await users.findOne({
            _id: user_oid
        })
        if (!result) {
            throw new Error("No user found.")
        }
        conekta_id = result.conekta_id
    }
    if (!conekta_id) {
        conekta_id = sessionData.ck ?? (await customerClient.createCustomer({ phone, name: `${name} ${apellidos}`, email })).data.id
        const session = sessionToBase64({
            ...sessionData,
            ck: conekta_id,
            ph: phone,
            nm: name,
            ap: apellidos,
            em: email,
            pp: phone_prefix
        })
        res.setHeader("Session-Token", session)
    }
    const products = await itemsByCart.find({ cart_id: cart_oid }).toArray()
    const order = await orderClient.createOrder({
        currency: "MXN",
        customer_info: {
            customer_id: conekta_id,
        },
        line_items: products.map(product => ({
            name: product.name,
            unit_price: product.use_discount ? product.discount_price : product.price,
            quantity: product.qty,
        })),
        checkout: {
            type: 'Integration',
            allowed_payment_methods: ['card'],
        }
    })
    await cartsByUser.updateOne(
        {
            _id: cart_oid
        },
        {
            $set: {
                email,
                order_id: order.data.id,
                delivery: "store",
                phone: `${phone_prefix}${phone}`,
                name: `${name} ${apellidos}`,
                checkout_id: order?.data?.checkout?.id ?? null
            }
        }
    )
    return order?.data?.checkout?.id
}