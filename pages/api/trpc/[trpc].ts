import * as trpcNext from '@trpc/server/adapters/next';
import { appRouter } from '../../../server/trpc';
import { MongoClient } from 'mongodb';
import { MONGO_DB, getSessionData, getSessionToken, getTokenData, revalidateProduct } from '../../../server/utils';
import { CartsByUserMongo, DescriptionsDBMongo, ImagesDBMongo, InventoryMongo, InventoryVariantsMongo, ItemsByCartMongo, PurchasesMongo, UserMongo } from '../../../server/types';

const client = await MongoClient.connect(MONGO_DB || "mongodb://mongo-fourb:27017", {})
const db = client.db("fourb");
export const users = db.collection<UserMongo>("users")
export const cartsByUser = db.collection<CartsByUserMongo>("carts_by_user")
export const inventory = db.collection<InventoryMongo>("inventory")
export const variantInventory = db.collection<InventoryVariantsMongo>("variants_inventory")
export const itemsByCart = db.collection<ItemsByCartMongo>("items_by_cart")
export const purchases = db.collection<PurchasesMongo>("purchases")
export const imagesHome = db.collection<ImagesDBMongo>("images")
export const descriptions = db.collection<DescriptionsDBMongo>("descriptions")

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
            req: req as any,
            res: res as any,
            sessionData,
            userData: tokenData?.payload,
            users,
            cartsByUser,
            inventory,
            itemsByCart,
            purchases,
            variantInventory,
            imagesHome,
            descriptions,
        })
    },
});