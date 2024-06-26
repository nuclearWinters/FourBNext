import { MongoClient, Db, ObjectId } from "mongodb";
import { CartsByUserMongo, ContextLocals, ItemsByCartMongo, SessionJWT, UserMongo } from "./types";
import { createMocks } from 'node-mocks-http';
import { appRouter } from "./trpc";
import bcrypt from "bcryptjs"
import { getSessionData } from "./utils";
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
        await client.close();
    });

    it("checkoutPhase: session cart / city or national / cash", async () => {
        const cart_oid = new ObjectId()
        const cart_id = cart_oid.toHexString()
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart")
        const phone = '9831228788'
        const name = 'Armando'
        const phone_prefix = '+52'
        const apellidos = "Rueda"
        const expire_date = new Date('2019-01-02T00:00:00.000Z')
        const new_expire_date = new Date()
        new_expire_date.setDate(new_expire_date.getDate() + 7)
        const delivery = 'city'
        const payment_method = 'cash'
        const status = 'waiting'
        const delivered = false
        const sent = false
        const pay_in_cash = false
        const email = 'anrp1@gmail.com'
        const city = 'Chetumal'
        const country = 'Mexico'
        const neighborhood = 'Neighborhood'
        const state = 'State'
        const street = 'Street'
        const zip = 'zip'
        const address_id = ''
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
            zip,
            street,
            state,
            country,
            neighborhood,
            address_id,
        })
        const cart = await cartsByUser.findOne({ _id: cart_oid })
        const new_pay_in_cash = true
        expect(cart).toEqual({
            _id: cart_oid,
            address: `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country}`,
            checkout_id: null,
            delivered,
            delivery,
            email,
            expire_date: new_expire_date,
            name: `${name} ${apellidos}`,
            order_id: null,
            pay_in_cash: new_pay_in_cash,
            phone: phone_prefix + phone,
            sent,
            status,
            user_id: null
        })
        expect(response.cart_id).toBeTruthy()
    });

    it("checkoutPhase: user cart / city or national / cash", async () => {
        const cart_oid = new ObjectId()
        const cart_id = cart_oid.toHexString()
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart")
        const users = dbInstance.collection<UserMongo>("users")
        const phone = '9831228788'
        const name = 'Armando'
        const phone_prefix = '+52'
        const apellidos = "Rueda"
        const expire_date = new Date('2019-01-02T00:00:00.000Z')
        const new_expire_date = new Date()
        new_expire_date.setDate(new_expire_date.getDate() + 7)
        const delivery = 'city'
        const payment_method = 'cash'
        const status = 'waiting'
        const delivered = false
        const sent = false
        const pay_in_cash = false
        const email = 'anrp1@gmail.com'
        const user_oid = new ObjectId()
        const user_cart_oid = new ObjectId()
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
        const address_id = ''
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
            zip,
            street,
            state,
            country,
            neighborhood,
            address_id,
        })
        const cart = await cartsByUser.findOne({ _id: user_cart_oid })
        const new_pay_in_cash = true
        expect(cart).toEqual({
            _id: user_cart_oid,
            address: `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country}`,
            checkout_id: null,
            delivered,
            delivery,
            email,
            expire_date: new_expire_date,
            name: `${name} ${apellidos}`,
            order_id: null,
            pay_in_cash: new_pay_in_cash,
            phone: phone_prefix + phone,
            sent,
            status,
            user_id: null
        })
        expect(response.cart_id).toBeTruthy()
    });

    it("checkoutPhase: user cart / city or national / conekta (with address_id)", async () => {
        const cart_oid = new ObjectId()
        const cart_id = cart_oid.toHexString()
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart")
        const users = dbInstance.collection<UserMongo>("users")
        const phone = '9831228788'
        const name = 'Armando'
        const phone_prefix = '+52'
        const apellidos = "Rueda"
        const expire_date = new Date('2019-01-02T00:00:00.000Z')
        const delivery = 'city'
        const payment_method = 'card'
        const status = 'waiting'
        const delivered = false
        const sent = false
        const pay_in_cash = false
        const email = 'anrp1@gmail.com'
        const checkout_id = 'new_checkout_id'
        const order_id = 'new_order_id'
        const user_oid = new ObjectId()
        const user_cart_oid = new ObjectId()
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
        const new_phone = '9831228777'
        const new_name = 'Fernando'
        const new_apellidos = 'Perez'
        const new_city = 'Campeche'
        const new_zip = '70020'
        const new_street = 'Av Belice'
        const new_state = 'Ciudad del Carmen'
        const new_neighborhood = 'Adolfo Lopez Mateos'
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
            payment_method,
            phone_prefix,
            phone: new_phone,
            name: new_name,
            apellidos: new_apellidos,
            email,
            city: new_city,
            zip: new_zip,
            street: new_street,
            state: new_state,
            country,
            neighborhood: new_neighborhood,
            address_id: address_oid.toHexString(),
        })
        const cart = await cartsByUser.findOne({ _id: user_cart_oid })
        expect(cart).toEqual({
            _id: user_cart_oid,
            address: `${new_street}, ${new_neighborhood}, ${new_zip} ${new_city} ${new_state}, ${country}`,
            checkout_id,
            delivered,
            delivery,
            email,
            expire_date,
            name: `${new_name} ${new_apellidos}`,
            order_id,
            pay_in_cash,
            phone: phone_prefix + new_phone,
            sent,
            status,
            user_id: null
        })
        expect(response).toEqual({ checkout_id })
    });

    it("checkoutPhase: user cart / city or national / conekta (with NO address_id)", async () => {
        const cart_oid = new ObjectId()
        const cart_id = cart_oid.toHexString()
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart")
        const users = dbInstance.collection<UserMongo>("users")
        const phone = '9831228788'
        const name = 'Armando'
        const phone_prefix = '+52'
        const apellidos = "Rueda"
        const expire_date = new Date('2019-01-02T00:00:00.000Z')
        const delivery = 'city'
        const payment_method = 'card'
        const status = 'waiting'
        const delivered = false
        const sent = false
        const pay_in_cash = false
        const email = 'anrp1@gmail.com'
        const checkout_id = 'new_checkout_id'
        const order_id = 'new_order_id'
        const user_oid = new ObjectId()
        const user_cart_oid = new ObjectId()
        const is_admin = false
        const password = 'password'
        const passwordHashed = await bcrypt.hash(password, 12)
        const city = 'Chetumal'
        const country = 'Mexico'
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
            default_address: null,
            addresses: [],
            is_admin: false,
            verified_email: false,
        });
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
            payment_method,
            phone_prefix,
            phone,
            name,
            apellidos,
            email,
            city,
            zip,
            street,
            state,
            country,
            neighborhood,
            address_id: '',
        })
        const cart = await cartsByUser.findOne({ _id: user_cart_oid })
        expect(cart).toEqual({
            _id: user_cart_oid,
            address: `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country}`,
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
    });

    it("checkoutPhase: session cart / city or national / conekta", async () => {
        const cart_oid = new ObjectId()
        const cart_id = cart_oid.toHexString()
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart")
        const users = dbInstance.collection<UserMongo>("users")
        const phone = '9831228788'
        const name = 'Armando'
        const phone_prefix = '+52'
        const apellidos = "Rueda"
        const expire_date = new Date('2019-01-02T00:00:00.000Z')
        const delivery = 'city'
        const payment_method = 'card'
        const status = 'waiting'
        const delivered = false
        const sent = false
        const pay_in_cash = false
        const email = 'anrp1@gmail.com'
        const checkout_id = 'new_checkout_id'
        const order_id = 'new_order_id'
        const city = 'Chetumal'
        const country = 'Mexico'
        const neighborhood = 'Neighborhood'
        const state = 'State'
        const street = 'Street'
        const zip = 'zip'
        const conekta_id = 'new_conekta_id'
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
            user_id: null,
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
            sessionData,
            cartsByUser,
            itemsByCart,
            users,
        } as ContextLocals)
        const response = await caller.checkoutPhase({
            delivery,
            payment_method,
            phone_prefix,
            phone,
            name,
            apellidos,
            email,
            city,
            zip,
            street,
            state,
            country,
            neighborhood,
            address_id: '',
        })
        const cart = await cartsByUser.findOne({ _id: cart_oid })
        expect(cart).toEqual({
            _id: cart_oid,
            address: `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country}`,
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
        });
        const token = res.getHeader('Session-Token')
        const session = getSessionData(token as string)
        expect(session).toEqual({
            em: email,
            ci: cart_id,
            nm: name,
            ap: apellidos,
            ph: phone,
            ck: conekta_id,
            co: country,
            st: street,
            nh: neighborhood,
            zp: zip,
            cy: city,
            se: state,
            pp: phone_prefix,
        })
        expect(response).toEqual({ checkout_id })
    });
})