import { MongoClient, Db, ObjectId } from "mongodb";
import { ContextLocals, ItemsByCartMongo, SessionJWT, UserMongo } from "./types";
import { createMocks } from 'node-mocks-http';
import { appRouter } from "./trpc";
import bcrypt from "bcryptjs"
import { TRPCError } from "@trpc/server";

jest.mock('conekta');
jest.mock('@sendgrid/mail');

Object.defineProperty(global, 'fetch', {
    value: () => Promise.resolve({
        json: () => Promise.resolve({}),
    }),
    writable: true
});

describe("RegisterMutation tests", () => {
    let client: MongoClient;
    let dbInstance: Db;

    beforeAll(async () => {
        client = await MongoClient.connect((globalThis as any).__MONGO_URI__, {});
        dbInstance = client.db((globalThis as any).__MONGO_DB_NAME__);
    });

    afterAll(async () => {
        await client.close();
    });

    it("register: user does not exist", async () => {
        const email = "anrp1@gmail.com"
        const cart_oid = new ObjectId()
        const cart_id = cart_oid.toHexString()
        const password = 'password'
        const users = dbInstance.collection<UserMongo>("users");
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart");
        const { req, res } = createMocks({
            method: 'GET',
        })
        const name = 'Armando'
        const apellidos = 'Rueda'
        const phone = '9831228788'
        const phonePrefix = '+52'
        const conekta_id = 'new_conekta_id'
        const is_admin = false
        const phone_prefix = '+52'
        const verified_email = false
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
        await caller.register({
            email,
            password,
            name,
            apellidos,
            confirmPassword: password,
            phone,
            phonePrefix,
        })
        const user = await users.findOne({ email })
        if (!user) {
            throw new Error('User does not exist.')
        }
        expect({ ...user, _id: ObjectId.isValid(user._id), password: await bcrypt.compare(password, user.password) }).toEqual({
            _id: true,
            addresses: [],
            apellidos,
            cart_id: cart_oid,
            conekta_id,
            default_address: null,
            email,
            is_admin,
            name,
            password: true,
            phone,
            phone_prefix,
            verified_email,
        })
    });

    it("register: user exists", async () => {
        const user_id = new ObjectId()
        const user_cart_id = new ObjectId()
        const email = "anrp1@gmail.com"
        const cart_id = new ObjectId().toHexString()
        const password = 'password'
        const users = dbInstance.collection<UserMongo>("users");
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart");
        const passwordHashed = await bcrypt.hash(password, 12)
        const name = 'Armando'
        const apellidos = 'Rueda'
        const phone = '9831228788'
        const phonePrefix = '+52'
        const conekta_id = 'new_conekta_id'
        const is_admin = false
        const verified_email = false
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
            phone,
            name,
            phone_prefix: phonePrefix,
            apellidos,
            cart_id: user_cart_id,
            conekta_id,
            default_address: null,
            addresses: [],
            is_admin,
            verified_email,
        });
        const caller = appRouter.createCaller({ req: req as any, res: res as any, users, sessionData, itemsByCart } as ContextLocals)
        try {
            const response = await caller.register({
                email,
                password,
                name,
                apellidos,
                confirmPassword: password,
                phone,
                phonePrefix,
            })
            expect(response).toBeTruthy()
        } catch (e) {
            if (e instanceof TRPCError) {
                expect(e.message).toBe("El email ya esta siendo usado.")
            } else {
                throw e
            }
        }
    });
});
