import { Collection, ObjectId } from "mongodb"
import { CartsByUserMongo, DecodeJWT, ItemsByCartMongo, SessionJWT, UserMongo } from "./types"
import { NextApiResponse } from "next"
import { CustomersApi, OrdersApi } from "conekta"
import { ACCESSSECRET, REFRESHSECRET, jwt, sessionToBase64 } from "./utils"
import cookie from "cookie"

interface CheckoutNationalCityOxxoTransfer {
    cartsByUser: Collection<CartsByUserMongo>
    cart_oid: ObjectId
    name: string
    apellidos: string
    phone_prefix: string
    phone: string
    userData?: DecodeJWT
    users: Collection<UserMongo>
    sessionData: SessionJWT
    res: NextApiResponse
    delivery: "city" | "national"
    orderClient: OrdersApi
    customerClient: CustomersApi
    email: string
    itemsByCart: Collection<ItemsByCartMongo>
    zip: string
    city: string
    state: string
    country: string
    street: string
    neighborhood: string
    address_id: string
    payment_method: "bank_transfer" | "oxxo"
}

export const checkoutNationalCityOxxoTransfer = async ({
    users,
    userData,
    res,
    delivery,
    customerClient,
    orderClient,
    email,
    itemsByCart,
    cart_oid,
    name,
    apellidos,
    phone,
    phone_prefix,
    cartsByUser,
    sessionData,
    zip,
    city,
    state,
    country,
    street,
    neighborhood,
    address_id,
    payment_method,
}: CheckoutNationalCityOxxoTransfer): Promise<string | undefined> => {
    const new_cart_oid = new ObjectId()
    const new_cart_id = new_cart_oid.toHexString()
    let conekta_id = ""
    if (userData) {
        if (address_id) {
            const address_oid = new ObjectId(address_id)
            const user_oid = new ObjectId(userData.user._id)
            const result = await users.findOneAndUpdate(
                {
                    _id: user_oid,
                    "addresses._id": address_oid,
                },
                {
                    $set: {
                        cart_id: new_cart_oid,
                        default_address: address_oid,
                        "addresses.$.full_address": `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country} (${name} ${apellidos})`,
                        "addresses.$.country": country,
                        "addresses.$.street": street,
                        "addresses.$.neighborhood": neighborhood,
                        "addresses.$.zip": zip,
                        "addresses.$.city": city,
                        "addresses.$.state": state,
                        "addresses.$.phone": phone,
                        "addresses.$.name": name,
                        "addresses.$.apellidos": apellidos,
                        "addresses.$.phone_prefix": phone_prefix,
                    },
                },
                {
                    returnDocument: "after"
                }
            )
            if (!result) {
                throw new Error("No user updated")
            }
            conekta_id = result.conekta_id
        } else {
            const address_id = new ObjectId()
            const user_oid = new ObjectId(userData.user._id)
            const result = await users.findOneAndUpdate(
                {
                    _id: user_oid,
                },
                {
                    $set: {
                        default_address: address_id,
                        cart_id: new_cart_oid,
                    },
                    $push: {
                        addresses: {
                            _id: address_id,
                            full_address: `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country} (${name} ${apellidos})`,
                            country,
                            street,
                            neighborhood,
                            zip,
                            city,
                            state,
                            phone,
                            name,
                            apellidos,
                            phone_prefix,
                        }
                    },
                },
                {
                    returnDocument: "after"
                }
            )
            if (!result) {
                throw new Error("No user updated")
            }
            conekta_id = result.conekta_id
        }
        const newAccessToken = jwt.sign(
            {
                user: {
                    _id: userData.user._id,
                    cart_id: new_cart_id,
                    is_admin: userData.user.is_admin,
                    email: userData.user.email,
                },
                refreshTokenExpireTime: userData.refreshTokenExpireTime,
                exp: userData.exp,
            },
            ACCESSSECRET
        );
        const refreshToken = jwt.sign(
            {
                user: {
                    _id: userData.user._id,
                    cart_id: new_cart_id,
                    is_admin: userData.user.is_admin,
                    email: userData.user.email,
                },
                refreshTokenExpireTime: userData.refreshTokenExpireTime,
                exp: userData.refreshTokenExpireTime,
            },
            REFRESHSECRET
        );
        const refreshTokenExpireDate = new Date(userData.refreshTokenExpireTime * 1000);
        res.setHeader("Set-Cookie", cookie.serialize("refreshToken", refreshToken, {
            httpOnly: true,
            expires: refreshTokenExpireDate,
            secure: true,
        }))
        res.setHeader("Access-Token", newAccessToken)
    }
    if (!conekta_id) {
        conekta_id = sessionData.ck ?? (await customerClient.createCustomer({ phone, name: `${name} ${apellidos}`, email })).data.id
        const session = sessionToBase64({
            ...sessionData,
            em: email,
            co: country,
            st: street,
            nh: neighborhood,
            zp: zip,
            cy: city,
            se: state,
            ph: phone,
            nm: name,
            ap: apellidos,
            pp: phone_prefix,
            ck: conekta_id,
            ci: new_cart_id
        })
        res.setHeader("Session-Token", session)
    }
    const products = await itemsByCart.find({ cart_id: cart_oid }).toArray()
    const line_items = products.map(product => ({
        name: product.name,
        unit_price: product.use_discount ? product.discount_price : product.price,
        quantity: product.qty,
    }))
    const shipping_lines = [
        {
            carrier: "Envio",
            amount: delivery === "city" ? 3500 : 11900
        }
    ]
    const expire_date = new Date()
    expire_date.setDate(expire_date.getDate() + 3)
    const expirationTimeMiliseconds = expire_date.getTime()
    const expirationTimeSeconds = Math.round(expirationTimeMiliseconds / 1000)
    const order = await orderClient.createOrder({
        currency: "MXN",
        shipping_lines,
        customer_info: {
            customer_id: conekta_id,
        },
        line_items,
        charges: [{
            payment_method: {
                type: payment_method === "bank_transfer" ? "spei" : "cash",
                expires_at: expirationTimeSeconds
            }
        }]
    })
    await cartsByUser.updateOne(
        {
            _id: cart_oid
        },
        {
            $set: {
                email,
                order_id: order.data.id,
                delivery,
                address: `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country}`,
                phone: `${phone_prefix}${phone}`,
                name: `${name} ${apellidos}`,
                checkout_id: order?.data?.checkout?.id ?? null,
                user_id: userData?.user._id ? new ObjectId(userData.user._id) : null,
                status: "waiting",
                expire_date,
                ...(payment_method === "oxxo"
                    ? {
                        oxxo_info: {
                            reference: "",
                            amount: "",
                            expire_at: expirationTimeMiliseconds,
                        }
                    }
                    : {
                        bank_info: {
                            bank: "",
                            clabe: "",
                            amount: "",
                            expire_at: expirationTimeMiliseconds,
                        }
                    }
                )
            }
        }
    )
    return new_cart_id
}