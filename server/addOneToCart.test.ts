import { MongoClient, Db, ObjectId } from "mongodb";
import { CartsByUserMongo, ContextLocals, InventoryMongo, InventoryVariantsMongo, ItemsByCartMongo, ReservedInventoryMongo, UserMongo } from "./types";
import { createMocks } from 'node-mocks-http';
import { appRouter } from "./trpc";
import FakeTimers, { InstalledClock } from "@sinonjs/fake-timers";

jest.mock('conekta');
jest.mock('@sendgrid/mail');

Object.defineProperty(global, 'fetch', {
    value: () => Promise.resolve({
        json: () => Promise.resolve({}),
    }),
    writable: true
});

describe("AddOneToCart tests", () => {
    let client: MongoClient;
    let dbInstance: Db;
    let clock: InstalledClock

    beforeAll(async () => {
        client = await MongoClient.connect((globalThis as any).__MONGO_URI__, {});
        dbInstance = client.db((globalThis as any).__MONGO_DB_NAME__);
        clock = FakeTimers.install({
            now: new Date('2019-01-01')
        })
    });

    afterAll(async () => {
        clock.uninstall();
        await client.close();
    });

    it("addOneToCart: add one new item to session cart", async () => {
        const cart_oid = new ObjectId()
        const cart_id = cart_oid.toHexString()
        const inventory = dbInstance.collection<InventoryMongo>("inventory");
        const variantInventory = dbInstance.collection<InventoryVariantsMongo>("variants_inventory");
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart");
        const users = dbInstance.collection<UserMongo>("users");
        const reservedInventory = dbInstance.collection<ReservedInventoryMongo>("reserved_inventory");
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const inventory_oid = new ObjectId()
        const inventory_variant_oid = new ObjectId()
        const name = 'PRODUCTOTEST'
        const tags = ['test']
        const description = 'Este es un producto de prueba'
        const available = 10
        const total = 10
        const price = 50000
        const sku = 'TEST'
        const use_discount = false
        const discount_price = 0
        const combination = ['default']
        await inventory.insertOne({
            _id: inventory_oid,
            name,
            description,
            tags,
            use_variants: false,
            options: [],
            variants: {
                'default': {
                    inventory_variant_oid,
                    imgs: [],
                    available,
                    total,
                    price,
                    sku,
                    use_discount,
                    discount_price,
                    combination,
                }
            }
        })
        await variantInventory.insertOne({
            _id: inventory_variant_oid,
            inventory_id: inventory_oid,
            available,
            total,
            combination,
        })
        const { req, res } = createMocks({
            method: 'GET',
        })
        const sessionData = {
            email: null,
            cart_id,
            name: null,
            apellidos: null,
            phone: null,
            conekta_id: null,
            country: null,
            street: null,
            neighborhood: null,
            zip: null,
            city: null,
            state: null,
            phone_prefix: null,
        }
        const caller = appRouter.createCaller({
            req,
            res,
            users,
            sessionData,
            inventory,
            variantInventory,
            itemsByCart,
            reservedInventory,
            cartsByUser,
        } as ContextLocals)
        const qty = 1
        const response = await caller.addOneToCart({ product_variant_id: inventory_variant_oid.toHexString(), qty })
        const cart = await cartsByUser.findOne({ _id: cart_oid })
        expect(cart).toEqual({
            _id: cart_oid,
            address: null,
            checkout_id: null,
            delivered: false,
            delivery: null,
            email: null,
            expire_date: new Date('2019-01-08T00:00:00.000Z'),
            name: null,
            order_id: null,
            pay_in_cash: false,
            phone: null,
            sent: false,
            status: 'waiting',
            user_id: null
        })
        const product = await inventory.findOne({ _id: inventory_oid })
        const newAvailable = 9
        expect(product).toEqual({
            _id: inventory_oid,
            description,
            name,
            options: [],
            tags,
            use_variants: false,
            variants: {
                'default': {
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
            },
        })
        const variant = await variantInventory.findOne({ _id: inventory_variant_oid })
        expect(variant).toEqual({
            _id: inventory_variant_oid,
            inventory_id: inventory_oid,
            available: newAvailable,
            total,
            combination,
        })
        const itemsInCart = await itemsByCart.find({ cart_id: cart_oid }).toArray()
        expect(itemsInCart.map(item => ({ ...item, _id: ObjectId.isValid(item._id) }))).toEqual([{
            _id: true,
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
            product_id: inventory_oid
        }])
        const reserved = await reservedInventory.findOne({ product_variant_id: inventory_variant_oid })
        if (!reserved) {
            throw new Error('Reserved not found')
        }
        expect({ ...reserved, _id: ObjectId.isValid(reserved._id) }).toEqual({
            _id: true,
            cart_id: cart_oid,
            product_variant_id: inventory_variant_oid,
            qty,
        })
        expect(response).toBe(undefined)
    });

    it("addOneToCart: add one item to session cart already created", async () => {
        const cart_oid = new ObjectId()
        const cart_id = cart_oid.toHexString()
        const inventory = dbInstance.collection<InventoryMongo>("inventory");
        const variantInventory = dbInstance.collection<InventoryVariantsMongo>("variants_inventory");
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart");
        const users = dbInstance.collection<UserMongo>("users");
        const reservedInventory = dbInstance.collection<ReservedInventoryMongo>("reserved_inventory");
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const inventory_oid = new ObjectId()
        const inventory_variant_oid = new ObjectId()
        const name = 'PRODUCTOTEST'
        const tags = ['test']
        const description = 'Este es un producto de prueba'
        const available = 10
        const total = 10
        const price = 50000
        const sku = 'TEST'
        const use_discount = false
        const discount_price = 0
        const combination = ['default']
        const qty = 1
        const item_by_cart_oid = new ObjectId()
        const reserved_oid = new ObjectId()
        await reservedInventory.insertOne({
            _id: reserved_oid,
            product_variant_id: inventory_variant_oid,
            qty: 1,
            cart_id: cart_oid,
        })
        await itemsByCart.insertOne({
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
            product_id: inventory_oid
        })
        await inventory.insertOne({
            _id: inventory_oid,
            name,
            description,
            tags,
            use_variants: false,
            options: [],
            variants: {
                'default': {
                    inventory_variant_oid,
                    imgs: [],
                    available,
                    total,
                    price,
                    sku,
                    use_discount,
                    discount_price,
                    combination,
                }
            }
        })
        await variantInventory.insertOne({
            _id: inventory_variant_oid,
            inventory_id: inventory_oid,
            available,
            total,
            combination,
        })
        const { req, res } = createMocks({
            method: 'GET',
        })
        const sessionData = {
            email: null,
            cart_id,
            name: null,
            apellidos: null,
            phone: null,
            conekta_id: null,
            country: null,
            street: null,
            neighborhood: null,
            zip: null,
            city: null,
            state: null,
            phone_prefix: null,
        }
        const caller = appRouter.createCaller({
            req,
            res,
            users,
            sessionData,
            inventory,
            variantInventory,
            itemsByCart,
            reservedInventory,
            cartsByUser,
        } as ContextLocals)
        const newQty = 2
        const response = await caller.addOneToCart({ product_variant_id: inventory_variant_oid.toHexString(), qty })
        const cart = await cartsByUser.findOne({ _id: cart_oid })
        if (!cart) {
            throw new Error('Cart does not exist')
        }
        expect(cart).toEqual(
            {
                _id: cart_oid,
                address: null,
                checkout_id: null,
                delivered: false,
                delivery: null,
                email: null,
                expire_date: new Date('2019-01-08T00:00:00.000Z'),
                name: null,
                order_id: null,
                pay_in_cash: false,
                phone: null,
                sent: false,
                status: 'waiting',
                user_id: null
            }
        )
        const product = await inventory.findOne({ _id: inventory_oid })
        const newAvailable = 9
        if (!product) {
            throw new Error('Product does not exist')
        }
        expect(product).toEqual(
            {
                _id: inventory_oid,
                description,
                name,
                options: [],
                tags,
                use_variants: false,
                variants: {
                    'default': {
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
                },
            },
        )
        const variant = await variantInventory.findOne({ _id: inventory_variant_oid })
        if (!variant) {
            throw new Error('Inventory does not exist')
        }
        expect(variant).toEqual({
            _id: inventory_variant_oid,
            inventory_id: inventory_oid,
            available: newAvailable,
            total,
            combination,
        })
        const itemsInCart = await itemsByCart.find({ cart_id: cart_oid }).toArray()
        expect(itemsInCart.map(item => ({ ...item, _id: ObjectId.isValid(item._id) }))).toEqual([{
            _id: true,
            cart_id: cart_oid,
            discount_price,
            imgs: [],
            name,
            price,
            product_variant_id: inventory_variant_oid,
            qty: newQty,
            sku,
            use_discount,
            combination,
            product_id: inventory_oid
        }])
        const reserved = await reservedInventory.findOne({ _id: reserved_oid })
        if (!reserved) {
            throw new Error('Reserved not found')
        }
        expect(reserved).toEqual({
            _id: reserved_oid,
            cart_id: cart_oid,
            product_variant_id: inventory_variant_oid,
            qty: newQty,
        })
        expect(response).toBe(undefined)
    });

    it("addOneToCart: add one new item to user cart", async () => {
        const cart_oid = new ObjectId()
        const cart_id = cart_oid.toHexString()
        const inventory = dbInstance.collection<InventoryMongo>("inventory");
        const variantInventory = dbInstance.collection<InventoryVariantsMongo>("variants_inventory");
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart");
        const users = dbInstance.collection<UserMongo>("users");
        const reservedInventory = dbInstance.collection<ReservedInventoryMongo>("reserved_inventory");
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const inventory_oid = new ObjectId()
        const inventory_variant_oid = new ObjectId()
        const name = 'PRODUCTOTEST'
        const tags = ['test']
        const description = 'Este es un producto de prueba'
        const available = 10
        const total = 10
        const price = 50000
        const sku = 'TEST'
        const use_discount = false
        const discount_price = 0
        const combination = ['default']
        const user_oid = new ObjectId()
        const user_cart_oid = new ObjectId()
        const is_admin = false
        const email = 'anrp1@gmail.com'
        await inventory.insertOne({
            _id: inventory_oid,
            name,
            description,
            tags,
            use_variants: false,
            options: [],
            variants: {
                'default': {
                    inventory_variant_oid,
                    imgs: [],
                    available,
                    total,
                    price,
                    sku,
                    use_discount,
                    discount_price,
                    combination,
                }
            }
        })
        await variantInventory.insertOne({
            _id: inventory_variant_oid,
            inventory_id: inventory_oid,
            available,
            total,
            combination,
        })
        const { req, res } = createMocks({
            method: 'GET',
        })
        const sessionData = {
            email: null,
            cart_id,
            name: null,
            apellidos: null,
            phone: null,
            conekta_id: null,
            country: null,
            street: null,
            neighborhood: null,
            zip: null,
            city: null,
            state: null,
            phone_prefix: null,
        }
        const userData = {
            user: {
                _id: user_oid.toHexString(),
                cart_id: user_cart_oid.toHexString(),
                is_admin,
                email,
            },
            iat: 0,
            exp: 0,
            refreshTokenExpireTime: 0,
        }
        const caller = appRouter.createCaller({
            req,
            res,
            users,
            sessionData,
            inventory,
            variantInventory,
            itemsByCart,
            reservedInventory,
            cartsByUser,
            userData,
        } as ContextLocals)
        const qty = 1
        const response = await caller.addOneToCart({ product_variant_id: inventory_variant_oid.toHexString(), qty })
        const cart = await cartsByUser.findOne({ user_id: user_oid })
        expect(cart).toEqual({
            _id: user_cart_oid,
            address: null,
            checkout_id: null,
            delivered: false,
            delivery: null,
            email,
            expire_date: new Date('2019-01-08T00:00:00.000Z'),
            name: null,
            order_id: null,
            pay_in_cash: false,
            phone: null,
            sent: false,
            status: 'waiting',
            user_id: user_oid
        })
        const product = await inventory.findOne({ _id: inventory_oid })
        const newAvailable = 9
        expect(product).toEqual(
            {
                _id: inventory_oid,
                description,
                name,
                options: [],
                tags,
                use_variants: false,
                variants: {
                    'default': {
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
                },
            },
        )
        const variant = await variantInventory.findOne({ _id: inventory_variant_oid })
        if (!variant) {
            throw new Error('Variant does not exist')
        }
        expect(variant).toEqual({
            _id: inventory_variant_oid,
            inventory_id: inventory_oid,
            available: newAvailable,
            total,
            combination,
        })
        const itemsInCart = await itemsByCart.find({ cart_id: user_cart_oid }).toArray()
        expect(itemsInCart.map(item => ({ ...item, _id: ObjectId.isValid(item._id) }))).toEqual([{
            _id: true,
            cart_id: user_cart_oid,
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
        }])
        const reserved = await reservedInventory.findOne({ product_variant_id: inventory_variant_oid })
        if (!reserved) {
            throw new Error('Reserved not found')
        }
        expect({ ...reserved, _id: ObjectId.isValid(reserved._id) }).toEqual({
            _id: true,
            cart_id: user_cart_oid,
            product_variant_id: inventory_variant_oid,
            qty,
        })
        expect(response).toBe(undefined)
    });

    it("addOneToCart: add one item to user cart already created", async () => {
        const cart_oid = new ObjectId()
        const cart_id = cart_oid.toHexString()
        const inventory = dbInstance.collection<InventoryMongo>("inventory");
        const variantInventory = dbInstance.collection<InventoryVariantsMongo>("variants_inventory");
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart");
        const users = dbInstance.collection<UserMongo>("users");
        const reservedInventory = dbInstance.collection<ReservedInventoryMongo>("reserved_inventory");
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const inventory_oid = new ObjectId()
        const inventory_variant_oid = new ObjectId()
        const name = 'PRODUCTOTEST'
        const tags = ['test']
        const description = 'Este es un producto de prueba'
        const available = 10
        const total = 10
        const price = 50000
        const sku = 'TEST'
        const use_discount = false
        const discount_price = 0
        const combination = ['default']
        const user_oid = new ObjectId()
        const user_cart_oid = new ObjectId()
        const is_admin = false
        const email = 'anrp1@gmail.com'
        const qty = 1
        const item_by_cart_oid = new ObjectId()
        const reserved_oid = new ObjectId()
        await reservedInventory.insertOne({
            _id: reserved_oid,
            product_variant_id: inventory_variant_oid,
            qty: 1,
            cart_id: user_cart_oid,
        })
        await itemsByCart.insertOne({
            _id: item_by_cart_oid,
            cart_id: user_cart_oid,
            discount_price,
            imgs: [],
            name,
            price,
            product_variant_id: inventory_variant_oid,
            qty,
            sku,
            use_discount,
            combination,
            product_id: inventory_oid
        })
        await inventory.insertOne({
            _id: inventory_oid,
            name,
            description,
            tags,
            use_variants: false,
            options: [],
            variants: {
                'default': {
                    inventory_variant_oid,
                    imgs: [],
                    available,
                    total,
                    price,
                    sku,
                    use_discount,
                    discount_price,
                    combination,
                }
            }
        })
        await variantInventory.insertOne({
            _id: inventory_variant_oid,
            inventory_id: inventory_oid,
            available,
            total,
            combination,
        })
        const { req, res } = createMocks({
            method: 'GET',
        })
        const sessionData = {
            email: null,
            cart_id,
            name: null,
            apellidos: null,
            phone: null,
            conekta_id: null,
            country: null,
            street: null,
            neighborhood: null,
            zip: null,
            city: null,
            state: null,
            phone_prefix: null,
        }
        const userData = {
            user: {
                _id: user_oid.toHexString(),
                cart_id: user_cart_oid.toHexString(),
                is_admin,
                email,
            },
            iat: 0,
            exp: 0,
            refreshTokenExpireTime: 0,
        }
        const caller = appRouter.createCaller({
            req,
            res,
            users,
            sessionData,
            inventory,
            variantInventory,
            itemsByCart,
            reservedInventory,
            cartsByUser,
            userData,
        } as ContextLocals)
        const newQty = 2
        const response = await caller.addOneToCart({ product_variant_id: inventory_variant_oid.toHexString(), qty })
        const cart = await cartsByUser.findOne({ user_id: user_oid })
        expect(cart).toEqual({
            _id: user_cart_oid,
            address: null,
            checkout_id: null,
            delivered: false,
            delivery: null,
            email,
            expire_date: new Date('2019-01-08T00:00:00.000Z'),
            name: null,
            order_id: null,
            pay_in_cash: false,
            phone: null,
            sent: false,
            status: 'waiting',
            user_id: user_oid
        })
        const product = await inventory.findOne({ _id: inventory_oid })
        const newAvailable = 9
        expect(product).toEqual(
            {
                _id: inventory_oid,
                description,
                name,
                options: [],
                tags,
                use_variants: false,
                variants: {
                    'default': {
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
                },
            },
        )
        const variant = await variantInventory.findOne({ _id: inventory_variant_oid })
        if (!variant) {
            throw new Error('Variant does not exist')
        }
        expect(variant).toEqual({
            _id: inventory_variant_oid,
            inventory_id: inventory_oid,
            available: newAvailable,
            total,
            combination,
        })
        const itemsInCart = await itemsByCart.find({ cart_id: user_cart_oid }).toArray()
        expect(itemsInCart.map(item => ({ ...item, _id: ObjectId.isValid(item._id) }))).toEqual([{
            _id: true,
            cart_id: user_cart_oid,
            discount_price,
            imgs: [],
            name,
            price,
            product_variant_id: inventory_variant_oid,
            qty: newQty,
            sku,
            use_discount,
            combination,
            product_id: inventory_oid
        }])
        const reserved = await reservedInventory.findOne({ _id: reserved_oid })
        if (!reserved) {
            throw new Error('Reserved not found')
        }
        expect(reserved).toEqual({
            _id: reserved_oid,
            cart_id: user_cart_oid,
            product_variant_id: inventory_variant_oid,
            qty: newQty,
        })
        expect(response).toBe(undefined)
    });
});
