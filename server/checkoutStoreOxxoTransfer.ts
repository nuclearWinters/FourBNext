import { Collection, Filter, ObjectId } from "mongodb"
import { ACCESSSECRET, REFRESHSECRET, jwt, sessionToBase64 } from "./utils"
import { CustomersApi, OrdersApi } from "conekta"
import { CartsByUserMongo, DecodeJWT, InventoryMongo, InventoryVariantsMongo, ItemsByCartMongo, PurchasesMongo, SessionJWT, UserMongo } from "./types"
import { NextApiResponse } from "next"
import cookie from "cookie"
import sgMail from '@sendgrid/mail'
import Handlebars from "handlebars"
import { formatInTimeZone } from 'date-fns-tz'
import { spei_email } from "./bank_email"

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
    variantInventory: Collection<InventoryVariantsMongo>
    inventory: Collection<InventoryMongo>
    purchases: Collection<PurchasesMongo>
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
    variantInventory,
    inventory,
    purchases,
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
    const line_items = products
        .filter(product => !product.disabled)
        .map(product => ({
            name: product.name,
            unit_price: product.use_discount ? product.discount_price : product.price,
            quantity: product.qty,
        }))
    const disabled_items = products
        .filter(product => product.disabled)
    if (disabled_items.length) {
        for (const item of disabled_items) {
            /* ---- Eliminar item en el carrito ---- */
            const deletedCart = await itemsByCart.findOneAndDelete(
                {
                    _id: item._id,
                },
            )
            /* ---- Eliminar item en el carrito ---- */
            if (!deletedCart) {
                throw new Error("Item in cart not modified.")
            }
            /* ---- Actualizar inventario ---- */
            const filter: Filter<InventoryVariantsMongo> = {
                _id: item.product_variant_id,
            }
            const variantProduct = await variantInventory.findOneAndUpdate(
                filter,
                {
                    $inc: {
                        available: deletedCart.qty,
                    },
                },
                {
                    returnDocument: "after"
                }
            )
            /* ---- Actualizar inventario ---- */
            if (!variantProduct) {
                await itemsByCart.insertOne(deletedCart)
                throw new Error("Not enough inventory or product not found.")
            }
            /* ---- Actualizar inventario duplicado ---- */
            await inventory.findOneAndUpdate(
                {
                    _id: variantProduct.inventory_id
                },
                {
                    $set: {
                        [`variants.$[variant].available`]: variantProduct.available,
                        [`variants.$[variant].total`]: variantProduct.total,
                    },
                },
                {
                    returnDocument: 'after',
                    arrayFilters: [
                        {
                            "variant.inventory_variant_oid": item.product_variant_id,
                        }
                    ]
                }
            )
            /* ---- Actualizar inventario duplicado ---- */
        }
    }
    const expire_date = new Date()
    expire_date.setHours(expire_date.getHours() + 72)
    expire_date.setUTCHours(8)
    expire_date.setUTCMinutes(0)
    expire_date.setUTCSeconds(0)
    const expirationTimeMiliseconds = expire_date.getTime()
    const expirationTimeSeconds = Math.round(expirationTimeMiliseconds / 1000)
    const order = await orderClient.createOrder({
        currency: "MXN",
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
    const payment_method_obj = order?.data?.charges?.data?.[0].payment_method
    const bank = payment_method_obj?.object === "bank_transfer_payment" ? (payment_method_obj.bank || "") : ""
    const clabe = payment_method_obj?.object === "bank_transfer_payment" ? (payment_method_obj.clabe || "") : ""
    const amount = "$" + ((order?.data?.amount || 0) / 100) + " " + order.data.currency
    const reference = payment_method_obj?.object === "cash_payment" ? (payment_method_obj.reference || "") : ""
    const barcode_url = payment_method_obj?.object === "cash_payment" ? (payment_method_obj.barcode_url || "") : ""
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
                            barcode_url,
                            reference,
                            amount,
                            expire_at: expirationTimeMiliseconds,
                        }
                    }
                    : {
                        bank_info: {
                            bank,
                            clabe,
                            amount,
                            expire_at: expirationTimeMiliseconds,
                        }
                    }
                )
            }
        }
    )
    if (payment_method_obj?.object === "bank_transfer_payment") {
        const template = Handlebars.compile(spei_email)
        const result = template({
            amount,
            clabe,
            date: formatInTimeZone(new Date(expire_date), 'America/Mexico_City', 'dd/MM/yyyy hh:mm a') + " hora centro de México"
        })
        await sgMail.send({
            to: email,
            from: 'asistencia@fourb.mx',
            subject: 'Pago por transferencia pendiente',
            text: 'Por favor, realiza el pago por transferencia',
            html: result,
        });
    }
    const purchasedProducts: PurchasesMongo[] = products.map(product => ({
        name: product.name,
        product_variant_id: product.product_variant_id,
        qty: product.qty,
        price: product.price,
        discount_price: product.discount_price,
        use_discount: product.use_discount,
        user_id: userData?.user._id ? new ObjectId(userData.user._id) : null,
        date: new Date(),
        imgs: product.imgs,
        sku: product.sku,
        combination: product.combination,
        product_id: product.product_id,
        cart_id: product.cart_id,
        cart_item: product,
        status: "waiting_payment",
    }))
    await purchases.insertMany(purchasedProducts)
    return cart_oid.toHexString()
}