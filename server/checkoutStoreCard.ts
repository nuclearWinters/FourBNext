import { Collection, Filter, ObjectId } from "mongodb"
import { CartsByUserMongo, DecodeJWT, InventoryMongo, InventoryVariantsMongo, ItemsByCartMongo, SessionJWT, UserMongo } from "./types"
import { NextApiResponse } from "next"
import { createOrderHelper, sessionToBase64 } from "./utils"
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
    customerClient: CustomersApi
    orderClient: OrdersApi
    variantInventory: Collection<InventoryVariantsMongo>
    inventory: Collection<InventoryMongo>
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
    variantInventory,
    inventory,
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
    const order = await createOrderHelper(
        {
            currency: "MXN",
            customer_info: {
                customer_id: conekta_id,
            },
            line_items,
            checkout: {
                type: 'Integration',
                allowed_payment_methods: ['card'],
            }
        },
        orderClient,
        customerClient,
        {
            phone,
            name: `${name} ${apellidos}`,
            email,
        },
        res,
        userData,
        users,
        sessionData,
    )
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