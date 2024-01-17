/**
 * This is the API-handler of your app that contains all your API routes.
 * On a bigger app, you will probably want to split this file up into multiple files.
 */
import * as trpcNext from '@trpc/server/adapters/next';
import { appRouter } from '../../../server/trpc';
import { MongoClient } from 'mongodb';
import { MONGO_DB, getSessionData, getSessionToken, getTokenData, revalidateProduct } from '../../../server/utils';
import { CartsByUserMongo, InventoryMongo, InventoryVariantsMongo, ItemsByCartMongo, PurchasesMongo, UserMongo } from '../../../server/types';
import { CronJob } from 'cron';

const client = await MongoClient.connect(MONGO_DB || "mongodb://127.0.0.1:27017", {})
const db = client.db("fourb");
export const users = db.collection<UserMongo>("users")
export const cartsByUser = db.collection<CartsByUserMongo>("carts_by_user")
export const inventory = db.collection<InventoryMongo>("inventory")
export const variantInventory = db.collection<InventoryVariantsMongo>("variants_inventory")
export const itemsByCart = db.collection<ItemsByCartMongo>("items_by_cart")
export const purchases = db.collection<PurchasesMongo>("purchases")

const job = new CronJob(
    '00 00 03 * * *',
    async () => {
        const carts = await cartsByUser.find({ expire_date: { $ne: null } }).toArray()
        const now = (new Date).getTime()
        for (const cart of carts) {
            if (cart?.expire_date) {
                const cartExpireTime = cart.expire_date.getTime()
                if (cartExpireTime < now) {
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
                    await cartsByUser.updateOne({ _id: cart._id }, { $set: { expire_date: null } })
                }
            }
        }
    },
    null,
    true,
    'America/Cancun'
);

job.start()

export type AppRouter = typeof appRouter;

export default trpcNext.createNextApiHandler({
    router: appRouter,
    middleware(req, res, next) {
        const sessionToken = req.headers['session-token'] as string
        const validSessionToken = getSessionToken(sessionToken)
        req.headers['session-token'] = validSessionToken
        res.setHeader("Session-Token", validSessionToken)
        next()
    },
    createContext: async ({ req, res }) => {
        const refreshToken = req.cookies.refreshToken
        const accessToken = req.headers['authorization']
        const sessionToken = req.headers['session-token'] as string
        const tokenData = getTokenData(accessToken, refreshToken)
        if (tokenData?.accessToken) {
            res.setHeader("Access-Token", tokenData?.accessToken)
        }
        const sessionData = getSessionData(sessionToken)
        return ({
            req,
            res,
            sessionData: sessionData,
            userData: tokenData?.payload,
            users,
            cartsByUser,
            inventory,
            itemsByCart,
            purchases,
            variantInventory
        })
    },
});