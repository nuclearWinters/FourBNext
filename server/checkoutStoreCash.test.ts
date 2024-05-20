import { MongoClient, Db, ObjectId } from "mongodb";
import { CartsByUserMongo, ContextLocals, ItemsByCartMongo, SessionJWT, UserMongo } from "./types";
import { createMocks } from 'node-mocks-http';
import { appRouter, createFactory } from "./trpc";
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

   it("checkoutPhase: session cart / store / cash", async () => {
        const session_cart_oid = new ObjectId()
        const session_cart_id = session_cart_oid.toHexString()
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const phone = '9831228788'
        const name = 'Armando'
        const phone_prefix = '+52'
        const apellidos = "Rueda"
        const expire_date = new Date('2019-01-02T00:00:00.000Z')
        const new_expire_date = new Date()
        new_expire_date.setDate(new_expire_date.getDate() + 7)
        const delivery = 'store'
        const payment_method = 'cash'
        const status = 'waiting'
        const delivered = false
        const sent = false
        const pay_in_cash = false
        const new_pay_in_cash = true
        const email = 'anrp1@gmail.com'
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
        const { ci, ...new_session_data } = getSessionData(res.getHeader("session-token") as string || "")
        expect(ci).not.toBe(session_cart_id)
        expect(new_session_data).toEqual({
            ap: "Rueda",
            ck: null,
            co: null,
            cy: null,
            em: "anrp1@gmail.com",
            nh: null,
            nm: "Armando",
            ph: "9831228788",
            pp: "+52",
            se: null,
            st: null,
            zp: null
        })
    });

    it("checkoutPhase: user cart / store / cash", async () => {
        const user_cart_oid = new ObjectId()
        const user_cart_id = user_cart_oid.toHexString()
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user")
        const users = dbInstance.collection<UserMongo>("users")
        const user_oid = new ObjectId()
        const session_cart_oid = new ObjectId()
        const session_cart_id = session_cart_oid.toHexString()
        const is_admin = false
        const email = 'anrp1@gmail.com'
        const password = 'password'
        const passwordHashed = await bcrypt.hash(password, 12)
        const phone = '9831228788'
        const name = 'Armando'
        const phone_prefix = '+52'
        const apellidos = "Rueda"
        const address_oid = new ObjectId()
        const city = 'Chetumal'
        const country = 'Mexico'
        const full_address = "Full Address"
        const neighborhood = 'Neighborhood'
        const state = 'State'
        const street = 'Street'
        const zip = 'zip'
        const conekta_id = 'conekta_id'
        const expire_date = new Date('2019-01-02T00:00:00.000Z')
        const new_expire_date = new Date()
        new_expire_date.setDate(new_expire_date.getDate() + 7)
        const delivery = 'store'
        const payment_method = 'cash'
        const status = 'waiting'
        const delivered = false
        const sent = false
        const pay_in_cash = false
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
        const caller = createFactory(appRouter)
        const response = await caller(
            {
                req: req as any,
                res: res as any,
                sessionData,
                cartsByUser,
                userData,
                users,
            } as ContextLocals
        ).checkoutPhase({
            delivery,
            phone_prefix,
            phone,
            name,
            apellidos,
            payment_method,
            email,
        })
        const cart = await cartsByUser.findOne({ _id: user_cart_oid })
        const new_pay_in_cash = true
        expect(cart).toEqual({
            _id: user_cart_oid,
            address: null,
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
            user_id: user_oid
        })
        expect(response.cart_id).toBeTruthy()
        expect(res.getHeader("session-token")).toBe(undefined)
    });
})