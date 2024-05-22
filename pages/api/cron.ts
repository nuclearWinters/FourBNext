import { NextApiRequest, NextApiResponse } from "next";
import { cartsByUser, inventory, itemsByCart, purchases, variantInventory } from "./trpc/[trpc]";
import { revalidateProduct } from "../../server/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req?.headers?.['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).end('Unauthorized');
    }
    const now = new Date()
    const carts = await cartsByUser.find({ expire_date: { $lte: now } }).toArray()
    for (const cart of carts) {
        if (cart?.expire_date) {
            const items = await itemsByCart.find({ cart_id: cart._id }).toArray()
            for (const item of items) {
                const variantProduct = await variantInventory.findOneAndUpdate(
                    {
                        _id: item.product_variant_id
                    },
                    {
                        $inc: {
                            available: item.qty,
                        }
                    },
                    {
                        returnDocument: 'after'
                    }
                )
                if (!variantProduct) {
                    continue
                }
                await inventory.updateOne(
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
                        arrayFilters: [
                            {
                                "variant.inventory_variant_oid": variantProduct._id,
                            }
                        ]
                    }
                )
                revalidateProduct(variantProduct.inventory_id.toHexString())
            }
            await itemsByCart.deleteMany({ cart_id: cart._id })
            await purchases.updateMany(
                {
                    cart_id: cart._id
                },
                {
                    $set: {
                        status: "cancelled",
                    }
                }
            )
            await cartsByUser.updateOne({ _id: cart._id }, { $set: { expire_date: null } })
        }
    }
    res.status(200).end('Hello Cron!');
}