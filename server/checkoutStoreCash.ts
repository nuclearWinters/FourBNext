import { Collection, Filter, ObjectId } from "mongodb"
import { CartsByUserMongo, DecodeJWT, InventoryMongo, InventoryVariantsMongo, ItemsByCartMongo, SessionJWT, UserMongo } from "./types"
import { ACCESSSECRET, REFRESHSECRET, jwt, sessionToBase64 } from "./utils"
import sgMail from '@sendgrid/mail'
import cookie from "cookie"
import { NextApiResponse } from "next"

interface CheckoutStoreCash {
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
    variantInventory: Collection<InventoryVariantsMongo>
    inventory: Collection<InventoryMongo>
}

export const checkoutStoreCash = async ({
    cartsByUser,
    cart_oid,
    email,
    phone_prefix,
    phone,
    name,
    apellidos,
    userData,
    users,
    sessionData,
    res,
    itemsByCart,
    variantInventory,
    inventory,
}: CheckoutStoreCash): Promise<string> => {
    const expire_date = new Date()
    expire_date.setDate(expire_date.getDate() + 7)
    const products = await itemsByCart.find({ cart_id: cart_oid }).toArray()
    const line_items = products
        .filter(product => !product.disabled)
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
    if (!line_items.length) {
        throw new Error('No items selected')
    }
    await cartsByUser.updateOne(
        {
            _id: cart_oid
        },
        {
            $set: {
                pay_in_cash: true,
                email,
                delivery: "store",
                phone: `${phone_prefix}${phone}`,
                name: `${name} ${apellidos}`,
                user_id: userData?.user._id ? new ObjectId(userData.user._id) : null,
                order_id: null,
                checkout_id: null,
                status: "waiting",
                expire_date,
            }
        }
    )
    const new_cart_oid = new ObjectId()
    const new_cart_id = new_cart_oid.toHexString()
    if (userData) {
        const user_oid = new ObjectId(userData.user._id)
        await users.updateOne(
            {
                _id: user_oid
            },
            {
                $set: {
                    cart_id: new_cart_oid
                }
            },
        )
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
    } else {
        const session = sessionToBase64({
            ...sessionData,
            em: email,
            ph: phone,
            pp: phone_prefix,
            ap: apellidos,
            nm: name,
            ci: new_cart_id,
        })
        res.setHeader("Session-Token", session)
    }
    await sgMail.send({
        to: email,
        from: 'asistencia@fourb.mx',
        subject: 'Por favor contáctanos y envíanos el código adjunto',
        text: `Envíanos un mensaje a nuestro Instagram o Facebook con este código en mano: ${cart_oid.toHexString()}`,
        html: `<strong>Envíanos un mensaje a nuestro <a href='https://www.instagram.com/fourb_mx/' target='_blank'>Instagram</a> o <a href='https://www.facebook.com/fourbmx/' target='_blank'>Facebook</a> con este código en mano: ${cart_oid.toHexString()}</strong>`,
    });
    return cart_oid.toHexString()
}