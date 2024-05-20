import { Collection, ObjectId } from "mongodb"
import { ACCESSSECRET, REFRESHSECRET, jwt, sessionToBase64 } from "./utils"
import { CustomersApi, OrdersApi } from "conekta"
import { CartsByUserMongo, DecodeJWT, ItemsByCartMongo, SessionJWT, UserMongo } from "./types"
import { NextApiResponse } from "next"
import cookie from "cookie"

interface CheckoutStoreOxxoTransfer {
    userData?: DecodeJWT
    users: Collection<UserMongo>
    itemsByCart: Collection<ItemsByCartMongo>
    cart_oid: ObjectId
    orderClient: OrdersApi
    payment_method: "bank_transfer" | "oxxo"
    cartsByUser: Collection<CartsByUserMongo>
    phone_prefix: string
    phone: string
    name: string
    apellidos: string
    email: string
    sessionData: SessionJWT
    res: NextApiResponse
    customerClient: CustomersApi
}

export const checkoutStoreOxxoTransfer = async ({
    userData,
    users,
    itemsByCart,
    cart_oid,
    orderClient,
    payment_method,
    cartsByUser,
    phone_prefix,
    phone,
    name,
    apellidos,
    email,
    sessionData,
    res,
    customerClient,
}: CheckoutStoreOxxoTransfer): Promise<string> => {
    const new_cart_oid = new ObjectId()
    const new_cart_id = new_cart_oid.toHexString()
    let conekta_id = ""
    if (userData) {
        const user_oid = new ObjectId(userData.user._id)
        const result = await users.findOneAndUpdate(
            {
                _id: user_oid
            },
            {
                $set: {
                    cart_id: new_cart_oid
                }
            }
        )
        if (!result) {
            throw new Error("No user found.")
        }
        conekta_id = result.conekta_id
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
            ck: conekta_id,
            ph: phone,
            nm: name,
            ap: apellidos,
            em: email,
            pp: phone_prefix,
            ci: new_cart_id,
        })
        res.setHeader("Session-Token", session)
    }
    const products = await itemsByCart.find({ cart_id: cart_oid }).toArray()
    const expire_date = new Date()
    expire_date.setDate(expire_date.getDate() + 3)
    const expirationTimeMiliseconds = expire_date.getTime()
    const expirationTimeSeconds = Math.round(expirationTimeMiliseconds / 1000)
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
                delivery: "store",
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