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

    it("checkoutPhase: session cart (without conekta id) / city or national / bank_transfer", async () => {
        const session_cart_oid = new ObjectId()
        const session_cart_id = session_cart_oid.toHexString()
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart")
        const phone = '9831228788'
        const name = 'Armando'
        const phone_prefix = '+52'
        const apellidos = "Rueda"
        const expire_date = new Date('2019-01-02T00:00:00.000Z')
        const new_expire_date = new Date()
        new_expire_date.setDate(new_expire_date.getDate() + 3)
        const delivery = 'city'
        const payment_method = 'bank_transfer'
        const status = 'waiting'
        const delivered = false
        const sent = false
        const pay_in_cash = false
        const email = 'anrp1@gmail.com'
        const checkout_id = 'new_checkout_id'
        const order_id = 'new_order_id'
        const conekta_id = "new_conekta_id"
        const city = 'Chetumal'
        const country = 'Mexico'
        const neighborhood = 'Neighborhood'
        const state = 'State'
        const street = 'Street'
        const zip = 'zip'
        const full_address = `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country}`
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
            city,
            country,
            neighborhood,
            state,
            street,
            zip,
            address_id: ''
        })
        const cart = await cartsByUser.findOne({ _id: session_cart_oid })
        expect(cart).toEqual({
            _id: session_cart_oid,
            address: full_address,
            checkout_id,
            delivered,
            delivery,
            email,
            expire_date: new_expire_date,
            name: `${name} ${apellidos}`,
            order_id,
            pay_in_cash,
            phone: phone_prefix + phone,
            sent,
            status,
            user_id: null,
            bank_info: {
                amount: "$10 MXN",
                bank: "STP",
                clabe: "123456789012345678",
                expire_at: 1546560000000,
            },
        })
        expect(response.cart_id).toBe(session_cart_id)
        const { ci, ...new_session_data } = getSessionData(res.getHeader("session-token") as string || "")
        expect(ci).not.toBe(session_cart_id)
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
                charges: [
                    {
                        payment_method: {
                            expires_at: 1546560000,
                            type: "spei",
                        },
                    },
                ],
                currency: "MXN",
                customer_info: {
                    customer_id: conekta_id,
                },
                shipping_lines: [
                    {
                        amount: 3500,
                        carrier: "Envio",
                    },
                ],
                line_items: productsInCart,
            }
        )
        expect(new_session_data).toEqual({
            ap: apellidos,
            ck: conekta_id,
            co: country,
            cy: city,
            em: email,
            nh: neighborhood,
            nm: name,
            ph: phone,
            pp: phone_prefix,
            se: state,
            st: street,
            zp: zip,
        })
    });

    it("checkoutPhase: session cart (with conekta id) / city or national / bank_transfer", async () => {
        const session_cart_oid = new ObjectId()
        const session_cart_id = session_cart_oid.toHexString()
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart")
        const phone = '9831228788'
        const name = 'Armando'
        const phone_prefix = '+52'
        const apellidos = "Rueda"
        const expire_date = new Date('2019-01-02T00:00:00.000Z')
        const new_expire_date = new Date()
        new_expire_date.setDate(new_expire_date.getDate() + 3)
        const delivery = 'national'
        const payment_method = 'bank_transfer'
        const status = 'waiting'
        const delivered = false
        const sent = false
        const pay_in_cash = false
        const email = 'anrp1@gmail.com'
        const checkout_id = 'new_checkout_id'
        const order_id = 'new_order_id'
        const conekta_id = 'conekta_id'
        const city = 'Chetumal'
        const country = 'Mexico'
        const neighborhood = 'Neighborhood'
        const state = 'State'
        const street = 'Street'
        const zip = 'zip'
        const full_address = `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country}`
        await cartsByUser.insertOne({
            _id: session_cart_oid,
            address: null,
            checkout_id: null,
            delivered,
            delivery: null,
            email: null,
            expire_date: new_expire_date,
            name: null,
            order_id: null,
            pay_in_cash,
            phone: null,
            sent,
            status,
            user_id: null,
            bank_info: {
                amount: "$10 MXN",
                bank: "STP",
                clabe: "123456789012345678",
                expire_at: 1546560000000,
            },
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
            city,
            country,
            neighborhood,
            state,
            street,
            zip,
            address_id: ''
        })
        const cart = await cartsByUser.findOne({ _id: session_cart_oid })
        expect(cart).toEqual({
            _id: session_cart_oid,
            address: full_address,
            checkout_id,
            delivered,
            delivery,
            email,
            expire_date: new_expire_date,
            name: `${name} ${apellidos}`,
            order_id,
            pay_in_cash,
            phone: phone_prefix + phone,
            sent,
            status,
            user_id: null,
            bank_info: {
                amount: "$10 MXN",
                bank: "STP",
                clabe: "123456789012345678",
                expire_at: 1546560000000,
            },
        })
        expect(response.cart_id).toBe(session_cart_id)
        const { ci, ...new_session_data } = getSessionData(res.getHeader("session-token") as string || "")
        expect(ci).not.toBe(session_cart_id)
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
                charges: [
                    {
                        payment_method: {
                            expires_at: 1546560000,
                            type: "spei",
                        },
                    },
                ],
                currency: "MXN",
                customer_info: {
                    customer_id: conekta_id,
                },
                shipping_lines: [
                    {
                        amount: 11900,
                        carrier: "Envio",
                    },
                ],
                line_items: productsInCart,
            }
        )
        expect(new_session_data).toEqual({
            ap: apellidos,
            ck: conekta_id,
            co: country,
            cy: city,
            em: email,
            nh: neighborhood,
            nm: name,
            ph: phone,
            pp: phone_prefix,
            se: state,
            st: street,
            zp: zip,
        })
    });

    it("checkoutPhase: user cart (without address id) / city or national / bank_transfer", async () => {
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
        const new_expire_date = new Date()
        new_expire_date.setDate(new_expire_date.getDate() + 3)
        const delivery = 'city'
        const payment_method = 'bank_transfer'
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
        const new_full_address = `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country}`
        const new_full_address_with_names = `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country} (${name} ${apellidos})`
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
            city,
            country,
            neighborhood,
            state,
            street,
            zip,
            address_id: '',
        })
        const cart = await cartsByUser.findOne({ _id: user_cart_oid })
        expect(cart).toEqual({
            _id: user_cart_oid,
            address: new_full_address,
            checkout_id,
            delivered,
            delivery,
            email,
            expire_date: new_expire_date,
            name: `${name} ${apellidos}`,
            order_id,
            pay_in_cash,
            phone: phone_prefix + phone,
            sent,
            status,
            user_id: user_oid,
            bank_info: {
                amount: "$10 MXN",
                bank: "STP",
                clabe: "123456789012345678",
                expire_at: 1546560000000,
            },
        })
        const user = await users.findOne({ _id: user_oid })
        if (!user) {
            throw new Error("No user found")
        }
        const { default_address, ...restUser } = user
        const { addresses, cart_id, ...userWithoutAddress } = restUser
        expect(default_address).not.toStrictEqual(address_oid)
        expect(cart_id).not.toStrictEqual(user_cart_oid)
        expect(userWithoutAddress).toEqual({
            _id: user_oid,
            email,
            password: passwordHashed,
            phone,
            name,
            phone_prefix,
            apellidos,
            conekta_id,
            is_admin: false,
            verified_email: false,
        })
        const [prevAddress, newAddress] = addresses
        expect(prevAddress).toEqual({
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
        })
        const { _id: new_address_oid, ...restNewAddress } = newAddress
        expect(new_address_oid).toStrictEqual(default_address)
        expect(restNewAddress).toEqual({
            apellidos,
            city,
            country,
            full_address: new_full_address_with_names,
            name,
            neighborhood,
            phone,
            phone_prefix,
            state,
            street,
            zip,
        })
        expect(response.cart_id).toBe(user_cart_id)
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
                charges: [
                    {
                        payment_method: {
                            expires_at: 1546560000,
                            type: "spei",
                        },
                    },
                ],
                currency: "MXN",
                customer_info: {
                    customer_id: conekta_id,
                },
                shipping_lines: [
                    {
                        amount: 3500,
                        carrier: "Envio",
                    },
                ],
                line_items: productsInCart,
            }
        )
        expect(res.getHeader("session-token")).toBe(undefined)
    });

    it("checkoutPhase: user cart (with address id) / city or national / bank_transfer", async () => {
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
        const new_expire_date = new Date()
        new_expire_date.setDate(new_expire_date.getDate() + 3)
        const delivery = 'national'
        const payment_method = 'bank_transfer'
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
        const new_full_address = `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country}`
        const new_full_address_with_names = `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country} (${name} ${apellidos})`
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
                name: "Test 7",
                product_id: product_oid_1,
                product_variant_id: product_variant_oid_1,
                cart_id: user_cart_oid,
                qty: 1,
                price: 70000,
                discount_price: 0,
                use_discount: false,
                imgs: [],
                sku: "TEST7",
                combination: [{ id: 'default', name: 'default' }],
                disabled: false,
            },
            {
                _id: item_cart_oid_2,
                name: "Test 8",
                product_id: product_oid_2,
                product_variant_id: product_variant_oid_2,
                cart_id: user_cart_oid,
                qty: 1,
                price: 85000,
                discount_price: 0,
                use_discount: false,
                imgs: [],
                sku: "TEST8",
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
            city,
            country,
            neighborhood,
            state,
            street,
            zip,
            address_id: address_oid.toHexString(),
        })
        const cart = await cartsByUser.findOne({ _id: user_cart_oid })
        expect(cart).toEqual({
            _id: user_cart_oid,
            address: new_full_address,
            checkout_id,
            delivered,
            delivery,
            email,
            expire_date: new_expire_date,
            name: `${name} ${apellidos}`,
            order_id,
            pay_in_cash,
            phone: phone_prefix + phone,
            sent,
            status,
            user_id: user_oid,
            bank_info: {
                amount: "$10 MXN",
                bank: "STP",
                clabe: "123456789012345678",
                expire_at: 1546560000000,
            },
        })
        const user = await users.findOne({ _id: user_oid })
        if (!user) {
            throw new Error("No user found")
        }
        const { default_address, ...restUser } = user
        const { addresses, cart_id, ...userWithoutAddress } = restUser
        expect(default_address).toStrictEqual(address_oid)
        expect(cart_id).not.toStrictEqual(user_cart_oid)
        expect(userWithoutAddress).toEqual({
            _id: user_oid,
            email,
            password: passwordHashed,
            phone,
            name,
            phone_prefix,
            apellidos,
            conekta_id,
            is_admin: false,
            verified_email: false,
        })
        const [prevAddress] = addresses
        expect(prevAddress).toEqual({
            _id: address_oid,
            apellidos,
            city,
            country,
            full_address: new_full_address_with_names,
            name,
            neighborhood,
            phone,
            phone_prefix,
            state,
            street,
            zip,
        })
        expect(response.cart_id).toBe(user_cart_id)
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
                charges: [
                    {
                        payment_method: {
                            expires_at: 1546560000,
                            type: "spei",
                        },
                    },
                ],
                currency: "MXN",
                customer_info: {
                    customer_id: conekta_id,
                },
                shipping_lines: [
                    {
                        amount: 11900,
                        carrier: "Envio",
                    },
                ],
                line_items: productsInCart,
            }
        )
        expect(res.getHeader("session-token")).toBe(undefined)
    });
})