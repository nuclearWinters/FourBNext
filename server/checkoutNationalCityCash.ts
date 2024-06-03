import { Collection, Filter, ObjectId } from "mongodb"
import { CartsByUserMongo, DecodeJWT, InventoryMongo, InventoryVariantsMongo, ItemsByCartMongo, PurchasesMongo, SessionJWT, UserMongo } from "./types"
import sgMail from '@sendgrid/mail'
import { ACCESSSECRET, OWNER_EMAIL_ACCOUNT, REFRESHSECRET, jwt, sessionToBase64 } from "./utils"
import { NextApiResponse } from "next"
import cookie from "cookie"
import { payInStore } from "./pay_in_store"
import Handlebars from "handlebars"
import { confirmationEmailNotification } from "./card_confirmation_notification"

interface CheckoutNationalCityCash {
    cartsByUser: Collection<CartsByUserMongo>
    cart_oid: ObjectId
    email: string
    name: string
    delivery: "national" | "city"
    apellidos: string
    phone_prefix: string
    phone: string
    street: string
    neighborhood: string
    zip: string
    city: string
    state: string
    country: string
    userData?: DecodeJWT
    users: Collection<UserMongo>
    sessionData: SessionJWT
    res: NextApiResponse
    address_id: string
    itemsByCart: Collection<ItemsByCartMongo>
    variantInventory: Collection<InventoryVariantsMongo>
    inventory: Collection<InventoryMongo>
    purchases: Collection<PurchasesMongo>
}

export const checkoutNationalCityCash = async ({
    cartsByUser,
    cart_oid,
    email,
    delivery,
    name,
    apellidos,
    street,
    neighborhood,
    zip,
    city,
    state,
    country,
    phone,
    phone_prefix,
    userData,
    users,
    res,
    sessionData,
    address_id,
    itemsByCart,
    inventory,
    variantInventory,
    purchases,
}: CheckoutNationalCityCash): Promise<string> => {
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
    const cart = await cartsByUser.findOneAndUpdate(
        {
            _id: cart_oid
        },
        {
            $set: {
                pay_in_cash: true,
                email,
                delivery,
                address: `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country}`,
                phone: `${phone_prefix}${phone}`,
                name: `${name} ${apellidos}`,
                order_id: null,
                checkout_id: null,
                status: "waiting",
                expire_date,
            }
        },
        {
            returnDocument: "after",
        }
    )
    const template = Handlebars.compile(payInStore);
    const templateNotification = Handlebars.compile(confirmationEmailNotification);
    const productsList = products.map(
        product => {
            const total = product.price * product.qty
            return {
                qty: product.qty,
                total: '$ ' + (total / 100).toFixed(2),
                img: product?.imgs?.[0] || '',
                totalCents: total,
                name: product.name,
                code: cart_oid.toHexString(),
            }
        }
    )
    const subtotal = productsList.reduce((curr, next) => {
        const total = curr + next.totalCents
        return total
    }, 0)
    const shipment = cart?.delivery === "city" ? 3500 : 11900
    const data = {
        productsList,
        total: '$ ' + ((subtotal + shipment) / 100).toFixed(2),
        subtotal: '$ ' + (subtotal / 100).toFixed(2),
        shipment: '$ ' + (shipment / 100).toFixed(2),
        name: cart?.name || '',
        shipmentMethod: cart?.delivery === "city"
            ? "Servicio en la ciudad"
            : cart?.delivery === "national"
                ? "Nacional"
                : "Recoger en tienda",
        paymentMethod: 'Pago en tienda',
        address: cart?.address || '',
    };
    const result = template(data)
    const resultNotification = templateNotification(data)
    await sgMail.send({
        to: email,
        from: 'asistencia@fourb.mx',
        subject: 'Pago pendiente de cobro',
        text: 'Por favor, realiza el pago pendiente en la tienda',
        html: result,
    });
    await sgMail.send({
        to: OWNER_EMAIL_ACCOUNT,
        from: 'asistencia@fourb.mx',
        subject: 'Reserva confirmada',
        text: 'El pago del carrito se realizara en tienda',
        html: resultNotification,
    });
    const new_cart_oid = new ObjectId()
    const new_cart_id = new_cart_oid.toHexString()
    if (userData) {
        if (address_id) {
            const address_oid = new ObjectId(address_id)
            const user_oid = new ObjectId(userData.user._id)
            const result = await users.updateOne(
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
            )
            if (!result.modifiedCount) {
                throw new Error("No user updated")
            }
        } else {
            const address_id = new ObjectId()
            const user_oid = new ObjectId(userData.user._id)
            const result = await users.updateOne(
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
            )
            if (!result.modifiedCount) {
                throw new Error("No user updated")
            }
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
    } else {
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
            ci: new_cart_id,
        })
        res.setHeader("Session-Token", session)
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