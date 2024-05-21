import { Collection, Filter, ObjectId } from "mongodb"
import { CartsByUserMongo, DecodeJWT, InventoryMongo, InventoryVariantsMongo, ItemsByCartMongo, SessionJWT, UserMongo } from "./types"
import { NextApiResponse } from "next"
import { CustomersApi, OrdersApi } from "conekta"
import { sessionToBase64 } from "./utils"

interface CheckoutNationalCityCard {
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
    variantInventory: Collection<InventoryVariantsMongo>
    inventory: Collection<InventoryMongo>
}

export const checkoutNationalCityCard = async ({
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
    variantInventory,
    inventory,
}: CheckoutNationalCityCard): Promise<string | undefined> => {
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
    const shipping_lines = [
        {
            carrier: "Envio",
            amount: delivery === "city" ? 3500 : 11900
        }
    ]
    const order = await orderClient.createOrder({
        currency: "MXN",
        shipping_lines,
        customer_info: {
            customer_id: conekta_id,
        },
        line_items,
        checkout: {
            type: 'Integration',
            allowed_payment_methods: ['card'],
        },
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
            }
        }
    )
    return order?.data?.checkout?.id
}