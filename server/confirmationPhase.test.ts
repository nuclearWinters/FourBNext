import { MongoClient, Db, ObjectId } from "mongodb";
import { CartsByUserMongo, ContextLocals, ItemsByCartMongo, UserMongo } from "./types";
import { createMocks } from 'node-mocks-http';
import { appRouter } from "./trpc";
import { ACCESS_TOKEN_EXP_NUMBER } from "./utils";
import FakeTimers, { InstalledClock } from "@sinonjs/fake-timers";

jest.mock('conekta');
jest.mock('@sendgrid/mail');

Object.defineProperty(global, 'fetch', {
    value: () => Promise.resolve({
        json: () => Promise.resolve({}),
    }),
    writable: true
});

describe("CheckoutPhase tests", () => {
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

    it("confirmationPhase: user cart / cash", async () => {
        const cart_oid = new ObjectId()
        const cart_id = cart_oid.toHexString()
        const users = dbInstance.collection<UserMongo>("users");
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const purchases = dbInstance.collection<CartsByUserMongo>("purchases")
        const expire_date = new Date('2019-01-08T00:00:00.000Z')
        const status = 'waiting'
        const delivered = false
        const sent = false
        const pay_in_cash = false
        const email = 'anrp1@gmail.com'
        const user_id = new ObjectId()
        const variantIdOne = new ObjectId()
        const productIdOne = new ObjectId()
        const itemInCartIdOne = new ObjectId()
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart")
        await itemsByCart.insertMany([
            {
                _id: itemInCartIdOne,
                product_variant_id: variantIdOne,
                cart_id: cart_oid,
                qty: 1,
                price: 10000,
                discount_price: 0,
                use_discount: false,
                name: "Test 1",
                imgs: [],
                sku: "122435",
                combination: [],
                product_id: productIdOne,
            },
        ])
        await cartsByUser.insertOne({
            _id: cart_oid,
            address: null,
            checkout_id: null,
            delivered,
            delivery: null,
            email: null,
            expire_date,
            name: null,
            order_id: null,
            pay_in_cash,
            phone: null,
            sent,
            status,
            user_id: null
        })
        const address_id = new ObjectId()
        await users.insertOne({
            _id: user_id,
            email,
            password: 'password',
            phone: "1111111111",
            name: "Name",
            phone_prefix: "+52",
            apellidos: "Apellidos",
            cart_id: cart_oid,
            conekta_id: 'conekta_id',
            default_address: address_id,
            addresses: [],
            is_admin: false,
            verified_email: false,
        });
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
        const time = new Date()
        time.setMilliseconds(0)
        const timeMiliseconds = time.getTime()
        const timeSeconds = timeMiliseconds / 1000
        const expritation = timeSeconds + ACCESS_TOKEN_EXP_NUMBER
        const userData = {
            user: {
                _id: user_id.toHexString(),
                cart_id: cart_id,
                is_admin: false,
                email,
            },
            iat: timeSeconds,
            exp: expritation,
            refreshTokenExpireTime: expritation,
        }
        const caller = appRouter.createCaller({
            req,
            res,
            sessionData,
            cartsByUser,
            purchases,
            userData,
            users,
            itemsByCart,
        } as ContextLocals)
        const response = await caller.confirmationPhase({
            type: 'cash',
        })
        const cart = await cartsByUser.findOne({ _id: cart_oid })
        const allPurchases = await purchases.find({ user_id }).toArray()
        const user = await users.findOne({ _id: user_id })
        expect(allPurchases).toEqual([])
        expect(user).toEqual({
            _id: user_id,
            email,
            password: 'password',
            phone: "1111111111",
            name: "Name",
            phone_prefix: "+52",
            apellidos: "Apellidos",
            cart_id: new ObjectId(response),
            conekta_id: 'conekta_id',
            default_address: address_id,
            addresses: [],
            is_admin: false,
            verified_email: false,
        })
        expect(cart).toEqual({
            _id: cart_oid,
            address: null,
            checkout_id: null,
            delivered,
            delivery: null,
            email: null,
            expire_date,
            name: null,
            order_id: null,
            pay_in_cash,
            phone: null,
            sent,
            status,
            user_id: null
        })
        expect(response).toBeTruthy()
    });

    it("confirmationPhase: user cart / card", async () => {
        const cart_oid = new ObjectId()
        const cart_id = cart_oid.toHexString()
        const users = dbInstance.collection<UserMongo>("users");
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const purchases = dbInstance.collection<CartsByUserMongo>("purchases")
        const expire_date = new Date('2019-01-08T00:00:00.000Z')
        const status = 'waiting'
        const delivered = false
        const sent = false
        const pay_in_cash = false
        const email = 'anrp1@gmail.com'
        const user_id = new ObjectId()
        const variantIdOne = new ObjectId()
        const productIdOne = new ObjectId()
        const itemInCartIdOne = new ObjectId()
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart")
        await itemsByCart.insertMany([
            {
                _id: itemInCartIdOne,
                product_variant_id: variantIdOne,
                cart_id: cart_oid,
                qty: 1,
                price: 10000,
                discount_price: 0,
                use_discount: false,
                name: "Test 1",
                imgs: [],
                sku: "122435",
                combination: [],
                product_id: productIdOne,
            },
        ])
        await cartsByUser.insertOne({
            _id: cart_oid,
            address: null,
            checkout_id: null,
            delivered,
            delivery: null,
            email: null,
            expire_date,
            name: null,
            order_id: null,
            pay_in_cash,
            phone: null,
            sent,
            status,
            user_id: null
        })
        const address_id = new ObjectId()
        await users.insertOne({
            _id: user_id,
            email,
            password: 'password',
            phone: "1111111111",
            name: "Name",
            phone_prefix: "+52",
            apellidos: "Apellidos",
            cart_id: cart_oid,
            conekta_id: 'conekta_id',
            default_address: address_id,
            addresses: [],
            is_admin: false,
            verified_email: false,
        });
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
        const time = new Date()
        time.setMilliseconds(0)
        const timeMiliseconds = time.getTime()
        const timeSeconds = timeMiliseconds / 1000
        const expritation = timeSeconds + ACCESS_TOKEN_EXP_NUMBER
        const userData = {
            user: {
                _id: user_id.toHexString(),
                cart_id: cart_id,
                is_admin: false,
                email,
            },
            iat: timeSeconds,
            exp: expritation,
            refreshTokenExpireTime: expritation,
        }
        const caller = appRouter.createCaller({
            req,
            res,
            sessionData,
            cartsByUser,
            purchases,
            userData,
            users,
            itemsByCart,
        } as ContextLocals)
        const response = await caller.confirmationPhase({
            type: 'card',
        })
        const cart = await cartsByUser.findOne({ _id: cart_oid })
        const allPurchases = await purchases.find({ user_id }).toArray()
        const user = await users.findOne({ _id: user_id })
        expect(
            allPurchases.map(purchase => {
                return { ...purchase, _id: ObjectId.isValid(purchase._id) }
            })
        ).toEqual([{
            _id: true,
            product_variant_id: variantIdOne,
            date: new Date('2019-01-01T00:00:00.000Z'),
            qty: 1,
            price: 10000,
            discount_price: 0,
            use_discount: false,
            name: "Test 1",
            imgs: [],
            sku: "122435",
            combination: [],
            product_id: productIdOne,
            user_id,
        }])
        expect(user).toEqual({
            _id: user_id,
            email,
            password: 'password',
            phone: "1111111111",
            name: "Name",
            phone_prefix: "+52",
            apellidos: "Apellidos",
            cart_id: new ObjectId(response),
            conekta_id: 'conekta_id',
            default_address: address_id,
            addresses: [],
            is_admin: false,
            verified_email: false,
        })
        expect(cart).toEqual({
            _id: cart_oid,
            address: null,
            checkout_id: null,
            delivered,
            delivery: null,
            email: null,
            expire_date,
            name: null,
            order_id: null,
            pay_in_cash,
            phone: null,
            sent,
            status: 'paid',
            user_id: null
        })
        expect(response).toBeTruthy()
    });

    it("confirmationPhase: user cart / bank_transfer", async () => {
        const cart_oid = new ObjectId()
        const cart_id = cart_oid.toHexString()
        const users = dbInstance.collection<UserMongo>("users");
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const purchases = dbInstance.collection<CartsByUserMongo>("purchases")
        const expire_date = new Date('2019-01-08T00:00:00.000Z')
        const status = 'waiting'
        const delivered = false
        const sent = false
        const pay_in_cash = false
        const email = 'anrp1@gmail.com'
        const user_id = new ObjectId()
        const variantIdOne = new ObjectId()
        const productIdOne = new ObjectId()
        const itemInCartIdOne = new ObjectId()
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart")
        await itemsByCart.insertMany([
            {
                _id: itemInCartIdOne,
                product_variant_id: variantIdOne,
                cart_id: cart_oid,
                qty: 1,
                price: 10000,
                discount_price: 0,
                use_discount: false,
                name: "Test 1",
                imgs: [],
                sku: "122435",
                combination: [],
                product_id: productIdOne,
            },
        ])
        await cartsByUser.insertOne({
            _id: cart_oid,
            address: null,
            checkout_id: null,
            delivered,
            delivery: null,
            email: null,
            expire_date,
            name: null,
            order_id: null,
            pay_in_cash,
            phone: null,
            sent,
            status,
            user_id: null
        })
        const address_id = new ObjectId()
        await users.insertOne({
            _id: user_id,
            email,
            password: 'password',
            phone: "1111111111",
            name: "Name",
            phone_prefix: "+52",
            apellidos: "Apellidos",
            cart_id: cart_oid,
            conekta_id: 'conekta_id',
            default_address: address_id,
            addresses: [],
            is_admin: false,
            verified_email: false,
        });
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
        const time = new Date()
        time.setMilliseconds(0)
        const timeMiliseconds = time.getTime()
        const timeSeconds = timeMiliseconds / 1000
        const expritation = timeSeconds + ACCESS_TOKEN_EXP_NUMBER
        const userData = {
            user: {
                _id: user_id.toHexString(),
                cart_id: cart_id,
                is_admin: false,
                email,
            },
            iat: timeSeconds,
            exp: expritation,
            refreshTokenExpireTime: expritation,
        }
        const caller = appRouter.createCaller({
            req,
            res,
            sessionData,
            cartsByUser,
            purchases,
            userData,
            users,
            itemsByCart,
        } as ContextLocals)
        const response = await caller.confirmationPhase({
            type: 'bank_transfer',
        })
        const cart = await cartsByUser.findOne({ _id: cart_oid })
        const allPurchases = await purchases.find({ user_id }).toArray()
        const user = await users.findOne({ _id: user_id })
        expect(
            allPurchases.map(purchase => {
                return { ...purchase, _id: ObjectId.isValid(purchase._id) }
            })
        ).toEqual([])
        expect(user).toEqual({
            _id: user_id,
            email,
            password: 'password',
            phone: "1111111111",
            name: "Name",
            phone_prefix: "+52",
            apellidos: "Apellidos",
            cart_id: new ObjectId(response),
            conekta_id: 'conekta_id',
            default_address: address_id,
            addresses: [],
            is_admin: false,
            verified_email: false,
        })
        expect(cart).toEqual({
            _id: cart_oid,
            address: null,
            checkout_id: null,
            delivered,
            delivery: null,
            email: null,
            expire_date,
            name: null,
            order_id: null,
            pay_in_cash,
            phone: null,
            sent,
            status,
            user_id: null
        })
        expect(response).toBeTruthy()
    });

    it("confirmationPhase: session cart / cash", async () => {
        const cart_oid = new ObjectId()
        const cart_id = cart_oid.toHexString()
        const users = dbInstance.collection<UserMongo>("users");
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const purchases = dbInstance.collection<CartsByUserMongo>("purchases")
        const expire_date = new Date('2019-01-08T00:00:00.000Z')
        const status = 'waiting'
        const delivered = false
        const sent = false
        const pay_in_cash = false
        const email = 'anrp1@gmail.com'
        const user_id = new ObjectId()
        const variantIdOne = new ObjectId()
        const productIdOne = new ObjectId()
        const itemInCartIdOne = new ObjectId()
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart")
        await itemsByCart.insertMany([
            {
                _id: itemInCartIdOne,
                product_variant_id: variantIdOne,
                cart_id: cart_oid,
                qty: 1,
                price: 10000,
                discount_price: 0,
                use_discount: false,
                name: "Test 1",
                imgs: [],
                sku: "122435",
                combination: [],
                product_id: productIdOne,
            },
        ])
        await cartsByUser.insertOne({
            _id: cart_oid,
            address: null,
            checkout_id: null,
            delivered,
            delivery: null,
            email: null,
            expire_date,
            name: null,
            order_id: null,
            pay_in_cash,
            phone: null,
            sent,
            status,
            user_id: null
        })
        const address_id = new ObjectId()
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
            sessionData,
            cartsByUser,
            purchases,
            users,
            itemsByCart,
        } as ContextLocals)
        const response = await caller.confirmationPhase({
            type: 'cash',
        })
        const cart = await cartsByUser.findOne({ _id: cart_oid })
        const allPurchases = await purchases.find({ user_id }).toArray()
        const user = await users.findOne({ _id: user_id })
        expect(allPurchases).toEqual([])
        expect(cart).toEqual({
            _id: cart_oid,
            address: null,
            checkout_id: null,
            delivered,
            delivery: null,
            email: null,
            expire_date,
            name: null,
            order_id: null,
            pay_in_cash,
            phone: null,
            sent,
            status,
            user_id: null
        })
        expect(response).toBeTruthy()
    });

    it("confirmationPhase: session cart / card", async () => {
        const cart_oid = new ObjectId()
        const cart_id = cart_oid.toHexString()
        const users = dbInstance.collection<UserMongo>("users");
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const purchases = dbInstance.collection<CartsByUserMongo>("purchases")
        const expire_date = new Date('2019-01-08T00:00:00.000Z')
        const status = 'waiting'
        const delivered = false
        const sent = false
        const pay_in_cash = false
        const variantIdOne = new ObjectId()
        const productIdOne = new ObjectId()
        const itemInCartIdOne = new ObjectId()
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart")
        await itemsByCart.insertMany([
            {
                _id: itemInCartIdOne,
                product_variant_id: variantIdOne,
                cart_id: cart_oid,
                qty: 1,
                price: 10000,
                discount_price: 0,
                use_discount: false,
                name: "Test 1",
                imgs: [],
                sku: "122435",
                combination: [],
                product_id: productIdOne,
            },
        ])
        await cartsByUser.insertOne({
            _id: cart_oid,
            address: null,
            checkout_id: null,
            delivered,
            delivery: null,
            email: null,
            expire_date,
            name: null,
            order_id: null,
            pay_in_cash,
            phone: null,
            sent,
            status,
            user_id: null
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
            sessionData,
            cartsByUser,
            purchases,
            users,
            itemsByCart,
        } as ContextLocals)
        const response = await caller.confirmationPhase({
            type: 'card',
        })
        const cart = await cartsByUser.findOne({ _id: cart_oid })
        const allPurchases = await purchases.find({ product_id: productIdOne }).toArray()
        expect(
            allPurchases.map(purchase => {
                return { ...purchase, _id: ObjectId.isValid(purchase._id) }
            })
        ).toEqual([{
            _id: true,
            product_variant_id: variantIdOne,
            date: new Date('2019-01-01T00:00:00.000Z'),
            qty: 1,
            price: 10000,
            discount_price: 0,
            use_discount: false,
            name: "Test 1",
            imgs: [],
            sku: "122435",
            combination: [],
            product_id: productIdOne,
            user_id: null,
        }])
        expect(cart).toEqual({
            _id: cart_oid,
            address: null,
            checkout_id: null,
            delivered,
            delivery: null,
            email: null,
            expire_date,
            name: null,
            order_id: null,
            pay_in_cash,
            phone: null,
            sent,
            status: 'paid',
            user_id: null
        })
        expect(response).toBeTruthy()
    });

    it("confirmationPhase: user cart / bank_transfer", async () => {
        const cart_oid = new ObjectId()
        const cart_id = cart_oid.toHexString()
        const users = dbInstance.collection<UserMongo>("users");
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const purchases = dbInstance.collection<CartsByUserMongo>("purchases")
        const expire_date = new Date('2019-01-08T00:00:00.000Z')
        const status = 'waiting'
        const delivered = false
        const sent = false
        const pay_in_cash = false
        const user_id = new ObjectId()
        const variantIdOne = new ObjectId()
        const productIdOne = new ObjectId()
        const itemInCartIdOne = new ObjectId()
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart")
        await itemsByCart.insertMany([
            {
                _id: itemInCartIdOne,
                product_variant_id: variantIdOne,
                cart_id: cart_oid,
                qty: 1,
                price: 10000,
                discount_price: 0,
                use_discount: false,
                name: "Test 1",
                imgs: [],
                sku: "122435",
                combination: [],
                product_id: productIdOne,
            },
        ])
        await cartsByUser.insertOne({
            _id: cart_oid,
            address: null,
            checkout_id: null,
            delivered,
            delivery: null,
            email: null,
            expire_date,
            name: null,
            order_id: null,
            pay_in_cash,
            phone: null,
            sent,
            status,
            user_id: null
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
            sessionData,
            cartsByUser,
            purchases,
            users,
            itemsByCart,
        } as ContextLocals)
        const response = await caller.confirmationPhase({
            type: 'bank_transfer',
        })
        const cart = await cartsByUser.findOne({ _id: cart_oid })
        const allPurchases = await purchases.find({ user_id }).toArray()
        expect(
            allPurchases.map(purchase => {
                return { ...purchase, _id: ObjectId.isValid(purchase._id) }
            })
        ).toEqual([])
        expect(cart).toEqual({
            _id: cart_oid,
            address: null,
            checkout_id: null,
            delivered,
            delivery: null,
            email: null,
            expire_date,
            name: null,
            order_id: null,
            pay_in_cash,
            phone: null,
            sent,
            status,
            user_id: null
        })
        expect(response).toBeTruthy()
    });
})