import { MongoClient, Db, ObjectId } from "mongodb";
import { CartsByUserMongo, ContextLocals, InventoryMongo, InventoryVariantsMongo, ItemsByCartMongo, SessionJWT, UserMongo } from "./types";
import { createMocks } from 'node-mocks-http';
import { appRouter } from "./trpc";

jest.mock('conekta');
jest.mock('@sendgrid/mail');

Object.defineProperty(global, 'fetch', {
    value: () => Promise.resolve({
        json: () => Promise.resolve({}),
    }),
    writable: true
});

describe("RemoveOneCart tests", () => {
    let client: MongoClient;
    let dbInstance: Db;

    beforeAll(async () => {
        client = await MongoClient.connect((globalThis as any).__MONGO_URI__, {});
        dbInstance = client.db((globalThis as any).__MONGO_DB_NAME__);
    });

    afterAll(async () => {
        await client.close();
    });

    it("removeOneCart: delete one item to session cart", async () => {
        const cart_oid = new ObjectId()
        const cart_id = cart_oid.toHexString()
        const inventory = dbInstance.collection<InventoryMongo>("inventory");
        const variantInventory = dbInstance.collection<InventoryVariantsMongo>("variants_inventory");
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart");
        const users = dbInstance.collection<UserMongo>("users");
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const inventory_oid = new ObjectId()
        const inventory_variant_oid = new ObjectId()
        const name = 'PRODUCTOTEST'
        const tags = ['test']
        const description = 'Este es un producto de prueba'
        const available = 9
        const total = 10
        const price = 50000
        const sku = 'TEST'
        const use_discount = false
        const discount_price = 0
        const idOne = '56789'
        const combination = [{
            id: idOne,
            name: 'default',
        }]
        const qty = 1
        const item_by_cart_oid = new ObjectId()
        await itemsByCart.insertOne({
            disabled: false,
            _id: item_by_cart_oid,
            cart_id: cart_oid,
            discount_price,
            imgs: [],
            name,
            price,
            product_variant_id: inventory_variant_oid,
            qty,
            sku,
            use_discount,
            combination,
            product_id: inventory_oid,
        })
        await inventory.insertOne({
            disabled: false,
            _id: inventory_oid,
            name,
            description,
            tags,
            use_variants: false,
            options: [],
            variants: [
                {
                    inventory_variant_oid,
                    imgs: [],
                    available,
                    total,
                    price,
                    sku,
                    use_discount,
                    discount_price,
                    combination,
                    disabled: false,
                }
            ]
        })
        await variantInventory.insertOne({
            _id: inventory_variant_oid,
            inventory_id: inventory_oid,
            available,
            total,
            combination,
            disabled: false,
        })
        await cartsByUser.insertOne({
            _id: cart_oid,
            address: null,
            checkout_id: null,
            delivered: false,
            delivery: null,
            email: null,
            expire_date: new Date('2019-01-02T00:00:00.000Z'),
            name: null,
            order_id: null,
            pay_in_cash: false,
            phone: null,
            sent: false,
            status: 'waiting',
            user_id: null
        })
        const { req, res } = createMocks({
            method: 'GET',
        })
        const sessionData : SessionJWT = {
            em: null,
            ci: cart_id,
            nm: null,
            ap: null,
            ph: null,
            ck: null,
            co: null,
            st: null,
            nh: null,
            zp: null,
            cy: null,
            se: null,
            pp: null,
        }
        const caller = appRouter.createCaller({
            req: req as any,
            res: res as any,
            users,
            sessionData,
            inventory,
            variantInventory,
            itemsByCart,
            cartsByUser,
        } as ContextLocals)
        const response = await caller.removeOneCart({ item_by_cart_id: item_by_cart_oid.toHexString() })
        const cart = await cartsByUser.findOne({ _id: cart_oid })
        expect(cart).toEqual({
            _id: cart_oid,
            address: null,
            checkout_id: null,
            delivered: false,
            delivery: null,
            email: null,
            expire_date: new Date('2019-01-02T00:00:00.000Z'),
            name: null,
            order_id: null,
            pay_in_cash: false,
            phone: null,
            sent: false,
            status: 'waiting',
            user_id: null
        })
        const product = await inventory.findOne({ _id: inventory_oid })
        const newAvailable = 10
        expect(product).toEqual({
            disabled: false,
            _id: inventory_oid,
            description,
            name,
            options: [],
            tags,
            use_variants: false,
            variants: [
                {
                    disabled: false,
                    available: newAvailable,
                    combination,
                    discount_price,
                    imgs: [],
                    inventory_variant_oid,
                    price,
                    sku,
                    total,
                    use_discount,
                },
            ],
        })
        const variant = await variantInventory.findOne({ _id: inventory_variant_oid })
        expect(variant).toEqual({
            disabled: false,
            _id: inventory_variant_oid,
            inventory_id: inventory_oid,
            available: newAvailable,
            total,
            combination,
        })
        const itemsInCart = await itemsByCart.find({ cart_id: cart_oid }).toArray()
        expect(itemsInCart).toEqual([])
        expect(response).toBe(undefined)
    });
})