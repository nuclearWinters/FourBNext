import { MongoClient, Db, ObjectId } from "mongodb";
import { ContextLocals, ItemsByCartMongo, UserMongo } from "./types";
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

describe("SignInMutation tests", () => {
    let client: MongoClient;
    let dbInstance: Db;

    beforeAll(async () => {
        client = await MongoClient.connect((globalThis as any).__MONGO_URI__, {});
        dbInstance = client.db((globalThis as any).__MONGO_DB_NAME__);
    });

    afterAll(async () => {
        await client.close();
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
        const caller = appRouter.createCaller({ req, res, users, sessionData, itemsByCart } as ContextLocals)
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
        const caller = appRouter.createCaller({ req, res, users, sessionData, itemsByCart } as ContextLocals)
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
