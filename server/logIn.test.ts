import { MongoClient, Db, ObjectId } from "mongodb";
import { CartsByUserMongo, ContextLocals, ItemsByCartMongo, PurchasesMongo, UserMongo } from "./types";
import { createMocks } from 'node-mocks-http';
import { appRouter } from "./trpc";
import bcrypt from "bcryptjs"
import { TRPCError } from "@trpc/server";
import { jwt } from "./utils";
import { parseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import FakeTimers, { InstalledClock } from "@sinonjs/fake-timers";
import { addDays } from "date-fns";

jest.mock('conekta');
jest.mock('@sendgrid/mail');

Object.defineProperty(global, 'fetch', {
    value: () => Promise.resolve({
        json: () => Promise.resolve({}),
    }),
    writable: true
});

describe("SignInMutation tests", () => {
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

    it("logIn: success", async () => {
        const user_id = new ObjectId()
        const user_cart_id = new ObjectId()
        const address_id = new ObjectId()
        const email = "anrp3@gmail.com"
        const cart_id = new ObjectId().toHexString()
        const password = 'password'
        const passwordHashed = await bcrypt.hash(password, 12)
        const users = dbInstance.collection<UserMongo>("users");
        const purchases = dbInstance.collection<PurchasesMongo>("purchases");
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart");
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user");
        const { req, res } = createMocks({
            method: 'GET',
        })
        await users.insertOne({
            _id: user_id,
            email,
            password: passwordHashed,
            phone: "1111111111",
            name: "Name",
            phone_prefix: "+52",
            apellidos: "Apellidos",
            cart_id: user_cart_id,
            conekta_id: 'conekta_id',
            default_address: address_id,
            addresses: [{
                _id: address_id,
                apellidos: "Apellidos",
                city: "City",
                country: "Mexico",
                full_address: "Full Address",
                name: "Name",
                neighborhood: "Neighborhood",
                phone: "1111111111",
                phone_prefix: "+52",
                state: "State",
                street: "Street",
                zip: "11111",
            },],
            is_admin: false,
            verified_email: false,
        });
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
            itemsByCart,
            purchases,
            cartsByUser,
        } as ContextLocals)
        await caller.logIn({
            email,
            password,
        })
        const user = jwt.decode(res.getHeader("Access-Token") as string)?.user
        expect(user).toEqual({
            _id: user_id.toHexString(),
            cart_id: user_cart_id.toHexString(),
            email,
            is_admin: false,
        })
        const userRefresh = jwt.decode(parseCookie(res.getHeader("Set-Cookie") as string).get("refreshToken") || "")?.user
        expect(userRefresh).toEqual({
            _id: user_id.toHexString(),
            cart_id: user_cart_id.toHexString(),
            email,
            is_admin: false,
        })
    });


    it("logIn: success and move items to user cart", async () => {
        const user_id = new ObjectId()
        const user_cart_id = new ObjectId()
        const address_id = new ObjectId()
        const email = "anrp4@gmail.com"
        const session_cart_oid = new ObjectId()
        const cart_id = session_cart_oid.toHexString()
        const password = 'password'
        const passwordHashed = await bcrypt.hash(password, 12)
        const users = dbInstance.collection<UserMongo>("users");
        const purchases = dbInstance.collection<PurchasesMongo>("purchases");
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart");
        const inventory_oid = new ObjectId()
        const inventory_variant_oid = new ObjectId()
        const name = 'PRODUCTOTEST'
        const price = 50000
        const sku = 'TEST'
        const use_discount = false
        const discount_price = 0
        const idOne = '23456'
        const combination = [{
            id: idOne,
            name: 'default',
        }]
        const qty = 1
        const item_by_cart_oid = new ObjectId()
        await itemsByCart.insertOne({
            _id: item_by_cart_oid,
            cart_id: session_cart_oid,
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
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user");
        const now = new Date()
        await cartsByUser.insertOne({
            _id: session_cart_oid,
            address: null,
            checkout_id: null,
            delivered: false,
            delivery: null,
            email: null,
            expire_date: now,
            name: null,
            order_id: null,
            pay_in_cash: false,
            phone: null,
            sent: false,
            status: "waiting",
            user_id: null
        })
        await cartsByUser.insertOne({
            _id: user_cart_id,
            address: null,
            checkout_id: null,
            delivered: false,
            delivery: null,
            email: null,
            expire_date: now,
            name: null,
            order_id: null,
            pay_in_cash: false,
            phone: null,
            sent: false,
            status: "waiting",
            user_id: null
        })
        const { req, res } = createMocks({
            method: 'GET',
        })
        await users.insertOne({
            _id: user_id,
            email,
            password: passwordHashed,
            phone: "1111111111",
            name: "Name",
            phone_prefix: "+52",
            apellidos: "Apellidos",
            cart_id: user_cart_id,
            conekta_id: 'conekta_id',
            default_address: address_id,
            addresses: [{
                _id: address_id,
                apellidos: "Apellidos",
                city: "City",
                country: "Mexico",
                full_address: "Full Address",
                name: "Name",
                neighborhood: "Neighborhood",
                phone: "1111111111",
                phone_prefix: "+52",
                state: "State",
                street: "Street",
                zip: "11111",
            },],
            is_admin: false,
            verified_email: false,
        });
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
            itemsByCart,
            purchases,
            cartsByUser,
        } as ContextLocals)
        await caller.logIn({
            email,
            password,
        })
        const itemInCart = await itemsByCart.findOne({ _id: item_by_cart_oid })
        expect(itemInCart).toEqual({
            _id: item_by_cart_oid,
            cart_id: user_cart_id,
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
        const cartByUser = await cartsByUser.findOne({ _id: user_cart_id })
        expect(cartByUser).toEqual({
            _id: user_cart_id,
            address: null,
            checkout_id: null,
            delivered: false,
            delivery: null,
            email: null,
            expire_date: addDays(new Date(), 7),
            name: null,
            order_id: null,
            pay_in_cash: false,
            phone: null,
            sent: false,
            status: "waiting",
            user_id: null
        })
        const user = jwt.decode(res.getHeader("Access-Token") as string)?.user
        expect(user).toEqual({
            _id: user_id.toHexString(),
            cart_id: user_cart_id.toHexString(),
            email,
            is_admin: false,
        })
        const userRefresh = jwt.decode(parseCookie(res.getHeader("Set-Cookie") as string).get("refreshToken") || "")?.user
        expect(userRefresh).toEqual({
            _id: user_id.toHexString(),
            cart_id: user_cart_id.toHexString(),
            email,
            is_admin: false,
        })
    });

    it("logIn: success and move items to user cart and create cart", async () => {
        const user_id = new ObjectId()
        const user_cart_id = new ObjectId()
        const address_id = new ObjectId()
        const email = "anrp5@gmail.com"
        const session_cart_oid = new ObjectId()
        const cart_id = session_cart_oid.toHexString()
        const password = 'password'
        const passwordHashed = await bcrypt.hash(password, 12)
        const users = dbInstance.collection<UserMongo>("users");
        const purchases = dbInstance.collection<PurchasesMongo>("purchases");
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart");
        const inventory_oid = new ObjectId()
        const inventory_variant_oid = new ObjectId()
        const name = 'PRODUCTOTEST'
        const price = 50000
        const sku = 'TEST'
        const use_discount = false
        const discount_price = 0
        const idOne = '23456'
        const combination = [{
            id: idOne,
            name: 'default',
        }]
        const qty = 1
        const item_by_cart_oid = new ObjectId()
        await itemsByCart.insertOne({
            _id: item_by_cart_oid,
            cart_id: session_cart_oid,
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
        const cartsByUser = dbInstance.collection<CartsByUserMongo>("carts_by_user");
        const now = new Date()
        await cartsByUser.insertOne({
            _id: session_cart_oid,
            address: null,
            checkout_id: null,
            delivered: false,
            delivery: null,
            email: null,
            expire_date: now,
            name: null,
            order_id: null,
            pay_in_cash: false,
            phone: null,
            sent: false,
            status: "waiting",
            user_id: null
        })
        const { req, res } = createMocks({
            method: 'GET',
        })
        await users.insertOne({
            _id: user_id,
            email,
            password: passwordHashed,
            phone: "1111111111",
            name: "Name",
            phone_prefix: "+52",
            apellidos: "Apellidos",
            cart_id: user_cart_id,
            conekta_id: 'conekta_id',
            default_address: address_id,
            addresses: [{
                _id: address_id,
                apellidos: "Apellidos",
                city: "City",
                country: "Mexico",
                full_address: "Full Address",
                name: "Name",
                neighborhood: "Neighborhood",
                phone: "1111111111",
                phone_prefix: "+52",
                state: "State",
                street: "Street",
                zip: "11111",
            },],
            is_admin: false,
            verified_email: false,
        });
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
            itemsByCart,
            purchases,
            cartsByUser,
        } as ContextLocals)
        await caller.logIn({
            email,
            password,
        })
        const itemInCart = await itemsByCart.findOne({ _id: item_by_cart_oid })
        expect(itemInCart).toEqual({
            _id: item_by_cart_oid,
            cart_id: user_cart_id,
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
        const cartByUser = await cartsByUser.findOne({ _id: user_cart_id })
        expect(cartByUser).toEqual({
            _id: user_cart_id,
            address: null,
            checkout_id: null,
            delivered: false,
            delivery: null,
            email,
            expire_date: addDays(new Date(), 7),
            name: null,
            order_id: null,
            pay_in_cash: false,
            phone: null,
            sent: false,
            status: "waiting",
            user_id
        })
        const user = jwt.decode(res.getHeader("Access-Token") as string)?.user
        expect(user).toEqual({
            _id: user_id.toHexString(),
            cart_id: user_cart_id.toHexString(),
            email,
            is_admin: false,
        })
        const userRefresh = jwt.decode(parseCookie(res.getHeader("Set-Cookie") as string).get("refreshToken") || "")?.user
        expect(userRefresh).toEqual({
            _id: user_id.toHexString(),
            cart_id: user_cart_id.toHexString(),
            email,
            is_admin: false,
        })
    });

    it("logIn: user does not exist", async () => {
        const email = "anrp1@gmail.com"
        const cart_id = new ObjectId().toHexString()
        const password = 'password'
        const users = dbInstance.collection<UserMongo>("users");
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart");
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
        const caller = appRouter.createCaller({ req: req as any, res: res as any, users, sessionData, itemsByCart } as ContextLocals)
        try {
            await caller.logIn({
                email,
                password,
            })
        } catch (e) {
            if (e instanceof TRPCError) {
                expect(e.message).toBe("El usuario no existe.")
            } else {
                throw e
            }
        }
    });

    it("logIn: password is not correct", async () => {
        const user_id = new ObjectId()
        const user_cart_id = new ObjectId()
        const email = "anrp1@gmail.com"
        const address_id = new ObjectId()
        const cart_id = new ObjectId().toHexString()
        const password = 'password_error'
        const users = dbInstance.collection<UserMongo>("users");
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart");
        const passwordHashed = await bcrypt.hash(password, 12)
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
        await users.insertOne({
            _id: user_id,
            email,
            password: passwordHashed,
            phone: "1111111111",
            name: "Name",
            phone_prefix: "+52",
            apellidos: "Apellidos",
            cart_id: user_cart_id,
            conekta_id: 'conekta_id',
            default_address: address_id,
            addresses: [{
                _id: address_id,
                apellidos: "Apellidos",
                city: "City",
                country: "Mexico",
                full_address: "Full Address",
                name: "Name",
                neighborhood: "Neighborhood",
                phone: "1111111111",
                phone_prefix: "+52",
                state: "State",
                street: "Street",
                zip: "11111",
            },],
            is_admin: false,
            verified_email: false,
        });
        const caller = appRouter.createCaller({ req: req as any, res: res as any, users, sessionData, itemsByCart } as ContextLocals)
        try {
            const response = await caller.logIn({
                email,
                password: 'password',
            })
            expect(response).toBeTruthy()
        } catch (e) {
            if (e instanceof TRPCError) {
                expect(e.message).toBe("La contraseña no coincide.")
            } else {
                throw e
            }
        }
    });
});
