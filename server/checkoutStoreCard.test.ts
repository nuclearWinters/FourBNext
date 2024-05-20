import { MongoClient, Db, ObjectId } from "mongodb";
import { CartsByUserMongo, ContextLocals, ItemsByCartMongo, SessionJWT, UserMongo } from "./types";
import { createMocks } from 'node-mocks-http';
import { appRouter } from "./trpc";
import bcrypt from "bcryptjs"
import { getSessionData } from "./utils";
import FakeTimers, { InstalledClock } from "@sinonjs/fake-timers"
import * as conektaConfig from "./conektaConfig"

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
        await client.close();
    });

    it("checkoutPhase: session cart (without conekta id) / store / card", async () => {
        const session_cart_oid = new ObjectId()
        const session_cart_id = session_cart_oid.toHexString()
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart")
        const phone = '9831228788'
        const name = 'Armando'
        const phone_prefix = '+52'
        const apellidos = "Rueda"
        const expire_date = new Date('2019-01-02T00:00:00.000Z')
        const delivery = 'store'
        const payment_method = 'card'
        const status = 'waiting'
        const delivered = false
        const sent = false
        const pay_in_cash = false
        const email = 'anrp1@gmail.com'
        const checkout_id = 'new_checkout_id'
        const order_id = 'new_order_id'
        const conekta_id = "new_conekta_id"
        await cartsByUser.insertOne({
            _id: session_cart_oid,
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
        const item_cart_oid_1 = new ObjectId()
        const item_cart_oid_2 = new ObjectId()
        const product_oid_1 = new ObjectId()
        const product_oid_2 = new ObjectId()
        const product_variant_oid_1 = new ObjectId()
        const product_variant_oid_2 = new ObjectId()
        await itemsByCart.insertMany([
            {
                _id: item_cart_oid_1,
                name: "Test 1",
                product_id: product_oid_1,
                product_variant_id: product_variant_oid_1,
                cart_id: session_cart_oid,
                qty: 1,
                price: 10000,
                discount_price: 0,
                use_discount: false,
                imgs: [],
                sku: "TEST1",
                combination: [{ id: 'default', name: 'default' }],
                disabled: false,
            },
            {
                _id: item_cart_oid_2,
                name: "Test 2",
                product_id: product_oid_2,
                product_variant_id: product_variant_oid_2,
                cart_id: session_cart_oid,
                qty: 1,
                price: 25000,
                discount_price: 0,
                use_discount: false,
                imgs: [],
                sku: "TEST2",
                combination: [{ id: 'default', name: 'default' }],
                disabled: false,
            }
        ])
        const { req, res } = createMocks({
            method: 'GET',
        })
        const sessionData: SessionJWT = {
            em: null,
            ci: session_cart_id,
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
            sessionData,
            cartsByUser,
            itemsByCart,
        } as ContextLocals)
        const response = await caller.checkoutPhase({
            delivery,
            phone_prefix,
            phone,
            name,
            apellidos,
            payment_method,
            email,
        })
        const cart = await cartsByUser.findOne({ _id: session_cart_oid })
        expect(cart).toEqual({
            _id: session_cart_oid,
            address: null,
            checkout_id,
            delivered,
            delivery,
            email,
            expire_date,
            name: `${name} ${apellidos}`,
            order_id,
            pay_in_cash,
            phone: phone_prefix + phone,
            sent,
            status,
            user_id: null
        })
        expect(response).toEqual({ checkout_id })
        const { ci, ...new_session_data } = getSessionData(res.getHeader("session-token") as string || "")
        expect(ci).toBe(session_cart_id)
        const spyCreateCustomer = jest.spyOn(conektaConfig.customerClient, 'createCustomer')
        expect(spyCreateCustomer).toHaveBeenCalledTimes(1)
        const spyCreateOrder = jest.spyOn(conektaConfig.orderClient, 'createOrder')
        const productsInCart = (await itemsByCart.find(
            {
                cart_id: session_cart_oid
            }
        ).toArray()).map(({ name, qty, price }) => ({ name, quantity: qty, unit_price: price }))
        expect(productsInCart.length).toBe(2)
        expect(spyCreateOrder).toHaveBeenCalledWith(
            {
                checkout: {
                    allowed_payment_methods: [
                        "card",
                    ],
                    type: "Integration",
                },
                currency: "MXN",
                customer_info: {
                    customer_id: conekta_id,
                },

                line_items: productsInCart,
            }
        )
        expect(new_session_data).toEqual({
            ap: apellidos,
            ck: conekta_id,
            co: null,
            cy: null,
            em: email,
            nh: null,
            nm: name,
            ph: phone,
            pp: phone_prefix,
            se: null,
            st: null,
            zp: null
        })
    });

    it("checkoutPhase: session cart (with conekta id) / store / card", async () => {
        const session_cart_oid = new ObjectId()
        const session_cart_id = session_cart_oid.toHexString()
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart")
        const phone = '9831228788'
        const name = 'Armando'
        const phone_prefix = '+52'
        const apellidos = "Rueda"
        const expire_date = new Date('2019-01-02T00:00:00.000Z')
        const delivery = 'store'
        const payment_method = 'card'
        const status = 'waiting'
        const delivered = false
        const sent = false
        const pay_in_cash = false
        const email = 'anrp1@gmail.com'
        const checkout_id = 'new_checkout_id'
        const order_id = 'new_order_id'
        const conekta_id = 'conekta_id'
        await cartsByUser.insertOne({
            _id: session_cart_oid,
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
        const item_cart_oid_1 = new ObjectId()
        const item_cart_oid_2 = new ObjectId()
        const product_oid_1 = new ObjectId()
        const product_oid_2 = new ObjectId()
        const product_variant_oid_1 = new ObjectId()
        const product_variant_oid_2 = new ObjectId()
        await itemsByCart.insertMany([
            {
                _id: item_cart_oid_1,
                name: "Test 3",
                product_id: product_oid_1,
                product_variant_id: product_variant_oid_1,
                cart_id: session_cart_oid,
                qty: 1,
                price: 30000,
                discount_price: 0,
                use_discount: false,
                imgs: [],
                sku: "TEST3",
                combination: [{ id: 'default', name: 'default' }],
                disabled: false,
            },
            {
                _id: item_cart_oid_2,
                name: "Test 4",
                product_id: product_oid_2,
                product_variant_id: product_variant_oid_2,
                cart_id: session_cart_oid,
                qty: 1,
                price: 45000,
                discount_price: 0,
                use_discount: false,
                imgs: [],
                sku: "TEST4",
                combination: [{ id: 'default', name: 'default' }],
                disabled: false,
            }
        ])
        const { req, res } = createMocks({
            method: 'GET',
        })
        const sessionData: SessionJWT = {
            em: null,
            ci: session_cart_id,
            nm: null,
            ap: null,
            ph: null,
            ck: conekta_id,
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
            sessionData,
            cartsByUser,
            itemsByCart,
        } as ContextLocals)
        const response = await caller.checkoutPhase({
            delivery,
            phone_prefix,
            phone,
            name,
            apellidos,
            payment_method,
            email,
        })
        const cart = await cartsByUser.findOne({ _id: session_cart_oid })
        expect(cart).toEqual({
            _id: session_cart_oid,
            address: null,
            checkout_id,
            delivered,
            delivery,
            email,
            expire_date,
            name: `${name} ${apellidos}`,
            order_id,
            pay_in_cash,
            phone: phone_prefix + phone,
            sent,
            status,
            user_id: null
        })
        expect(response).toEqual({ checkout_id })
        const { ci, ...new_session_data } = getSessionData(res.getHeader("session-token") as string || "")
        expect(ci).toBe(session_cart_id)
        const spyCreateCustomer = jest.spyOn(conektaConfig.customerClient, 'createCustomer')
        expect(spyCreateCustomer).toHaveBeenCalledTimes(1)
        const spyCreateOrder = jest.spyOn(conektaConfig.orderClient, 'createOrder')
        const productsInCart = (await itemsByCart.find(
            {
                cart_id: session_cart_oid
            }
        ).toArray()).map(({ name, qty, price }) => ({ name, quantity: qty, unit_price: price }))
        expect(productsInCart.length).toBe(2)
        expect(spyCreateOrder).toHaveBeenCalledWith(
            {
                checkout: {
                    allowed_payment_methods: [
                        "card",
                    ],
                    type: "Integration",
                },
                currency: "MXN",
                customer_info: {
                    customer_id: conekta_id,
                },

                line_items: productsInCart,
            }
        )
        expect(new_session_data).toEqual({
            ap: apellidos,
            ck: conekta_id,
            co: null,
            cy: null,
            em: email,
            nh: null,
            nm: name,
            ph: phone,
            pp: phone_prefix,
            se: null,
            st: null,
            zp: null
        })
    });

    it("checkoutPhase: user cart / store / card", async () => {
        const user_cart_oid = new ObjectId()
        const user_cart_id = user_cart_oid.toHexString()
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart")
        const users = dbInstance.collection<UserMongo>("users")
        const phone = '9831228788'
        const name = 'Armando'
        const phone_prefix = '+52'
        const apellidos = "Rueda"
        const expire_date = new Date('2019-01-02T00:00:00.000Z')
        const delivery = 'store'
        const payment_method = 'card'
        const status = 'waiting'
        const delivered = false
        const sent = false
        const pay_in_cash = false
        const email = 'anrp1@gmail.com'
        const checkout_id = 'new_checkout_id'
        const order_id = 'new_order_id'
        const user_oid = new ObjectId()
        const session_cart_oid = new ObjectId()
        const session_cart_id = session_cart_oid.toHexString()
        const is_admin = false
        const password = 'password'
        const passwordHashed = await bcrypt.hash(password, 12)
        const address_oid = new ObjectId()
        const city = 'Chetumal'
        const country = 'Mexico'
        const full_address = "Full Address"
        const neighborhood = 'Neighborhood'
        const state = 'State'
        const street = 'Street'
        const zip = 'zip'
        const conekta_id = 'conekta_id'
        await cartsByUser.insertOne({
            _id: user_cart_oid,
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
        await users.insertOne({
            _id: user_oid,
            email,
            password: passwordHashed,
            phone,
            name,
            phone_prefix,
            apellidos,
            cart_id: user_cart_oid,
            conekta_id,
            default_address: address_oid,
            addresses: [{
                _id: address_oid,
                apellidos,
                city,
                country,
                full_address,
                name,
                neighborhood,
                phone,
                phone_prefix,
                state,
                street,
                zip,
            },],
            is_admin: false,
            verified_email: false,
        });
        const item_cart_oid_1 = new ObjectId()
        const item_cart_oid_2 = new ObjectId()
        const product_oid_1 = new ObjectId()
        const product_oid_2 = new ObjectId()
        const product_variant_oid_1 = new ObjectId()
        const product_variant_oid_2 = new ObjectId()
        await itemsByCart.insertMany([
            {
                _id: item_cart_oid_1,
                name: "Test 5",
                product_id: product_oid_1,
                product_variant_id: product_variant_oid_1,
                cart_id: user_cart_oid,
                qty: 1,
                price: 50000,
                discount_price: 0,
                use_discount: false,
                imgs: [],
                sku: "TEST5",
                combination: [{ id: 'default', name: 'default' }],
                disabled: false,
            },
            {
                _id: item_cart_oid_2,
                name: "Test 6",
                product_id: product_oid_2,
                product_variant_id: product_variant_oid_2,
                cart_id: user_cart_oid,
                qty: 1,
                price: 65000,
                discount_price: 0,
                use_discount: false,
                imgs: [],
                sku: "TEST6",
                combination: [{ id: 'default', name: 'default' }],
                disabled: false,
            }
        ])
        const { req, res } = createMocks({
            method: 'GET',
        })
        const sessionData: SessionJWT = {
            em: null,
            ci: session_cart_id,
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
        const userData = {
            user: {
                _id: user_oid.toHexString(),
                cart_id: user_cart_id,
                is_admin,
                email,
            },
            iat: 0,
            exp: 0,
            refreshTokenExpireTime: 0,
        }
        const caller = appRouter.createCaller({
            req: req as any,
            res: res as any,
            sessionData,
            cartsByUser,
            itemsByCart,
            userData,
            users,
        } as ContextLocals)
        const response = await caller.checkoutPhase({
            delivery,
            phone_prefix,
            phone,
            name,
            apellidos,
            payment_method,
            email,
        })
        const cart = await cartsByUser.findOne({ _id: user_cart_oid })
        expect(cart).toEqual({
            _id: user_cart_oid,
            address: null,
            checkout_id,
            delivered,
            delivery,
            email,
            expire_date,
            name: `${name} ${apellidos}`,
            order_id,
            pay_in_cash,
            phone: phone_prefix + phone,
            sent,
            status,
            user_id: null
        })
        expect(response).toEqual({ checkout_id })
        const spyCreateCustomer = jest.spyOn(conektaConfig.customerClient, 'createCustomer')
        expect(spyCreateCustomer).toHaveBeenCalledTimes(1)
        const spyCreateOrder = jest.spyOn(conektaConfig.orderClient, 'createOrder')
        const productsInCart = (await itemsByCart.find(
            {
                cart_id: user_cart_oid
            }
        ).toArray()).map(({ name, qty, price }) => ({ name, quantity: qty, unit_price: price }))
        expect(productsInCart.length).toBe(2)
        expect(spyCreateOrder).toHaveBeenCalledWith(
            {
                checkout: {
                    allowed_payment_methods: [
                        "card",
                    ],
                    type: "Integration",
                },
                currency: "MXN",
                customer_info: {
                    customer_id: conekta_id,
                },

                line_items: productsInCart,
            }
        )
        expect(res.getHeader("session-token")).toBe(undefined)
    });
})