import { MongoClient, Db, ObjectId } from "mongodb";
import { ContextLocals, ItemsByCartMongo, SessionJWT, UserMongo } from "./types";
import { createMocks } from 'node-mocks-http';
import { appRouter } from "./trpc";
import { ACCESS_TOKEN_EXP_NUMBER } from "./utils";

jest.mock('conekta');
jest.mock('@sendgrid/mail');

Object.defineProperty(global, 'fetch', {
    value: () => Promise.resolve({
        json: () => Promise.resolve({}),
    }),
    writable: true
});

describe("getCart tests", () => {
    let client: MongoClient;
    let dbInstance: Db;

    beforeAll(async () => {
        client = await MongoClient.connect((globalThis as any).__MONGO_URI__, {});
        dbInstance = client.db((globalThis as any).__MONGO_DB_NAME__);
    });

    afterAll(async () => {
        await client.close();
    });

    it("getCart: not logged user", async () => {
        const cart_oid = new ObjectId()
        const cart_id = cart_oid.toHexString()
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart")
        const variantIdOne = new ObjectId()
        const variantIdTwo = new ObjectId()
        const productIdOne = new ObjectId()
        const itemInCartIdOne = new ObjectId()
        const itemInCartIdTwo = new ObjectId()
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
            {
                _id: itemInCartIdTwo,
                product_variant_id: variantIdTwo,
                cart_id: cart_oid,
                qty: 1,
                price: 20000,
                discount_price: 0,
                use_discount: false,
                name: "Test 2",
                imgs: [],
                sku: "422435",
                combination: [],
                product_id: productIdOne,
            }
        ])
        const users = dbInstance.collection<UserMongo>("users");
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
        const response = await caller.getCart()
        expect(response).toEqual([
            {
                _id: itemInCartIdOne.toHexString(),
                cart_id: cart_oid.toHexString(),
                combination: [],
                discount_price: 0,
                imgs: [],
                name: "Test 1",
                price: 10000,
                product_id: productIdOne.toHexString(),
                product_variant_id: variantIdOne.toHexString(),
                qty: 1,
                sku: "122435",
                use_discount: false
            },
            {
                _id: itemInCartIdTwo.toHexString(),
                cart_id: cart_oid.toHexString(),
                combination: [],
                discount_price: 0,
                imgs: [],
                name: "Test 2",
                price: 20000,
                product_id: productIdOne.toHexString(),
                product_variant_id: variantIdTwo.toHexString(),
                qty: 1,
                sku: "422435",
                use_discount: false
            }
        ])
    });

    it("getCart: logged user", async () => {
        const user_id = new ObjectId()
        const session_cart_id = new ObjectId()
        const user_cart_oid = new ObjectId()
        const user_cart_id = user_cart_oid.toHexString()
        const users = dbInstance.collection<UserMongo>("users");
        const itemsByCart = dbInstance.collection<ItemsByCartMongo>("items_by_cart")
        const email = "anrp1@gmail.com"
        const address_id = new ObjectId()
        await users.insertOne({
            _id: user_id,
            email,
            password: 'password',
            phone: "1111111111",
            name: "Name",
            phone_prefix: "+52",
            apellidos: "Apellidos",
            cart_id: user_cart_oid,
            conekta_id: 'conekta_id',
            default_address: address_id,
            addresses: [],
            is_admin: false,
            verified_email: false,
        });
        const variantIdOne = new ObjectId()
        const variantIdTwo = new ObjectId()
        const productIdOne = new ObjectId()
        const itemInCartIdOne = new ObjectId()
        const itemInCartIdTwo = new ObjectId()
        await itemsByCart.insertMany([
            {
                _id: itemInCartIdOne,
                product_variant_id: variantIdOne,
                cart_id: user_cart_oid,
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
            {
                _id: itemInCartIdTwo,
                product_variant_id: variantIdTwo,
                cart_id: user_cart_oid,
                qty: 1,
                price: 20000,
                discount_price: 0,
                use_discount: false,
                name: "Test 2",
                imgs: [],
                sku: "422435",
                combination: [],
                product_id: productIdOne,
            }
        ])
        const { req, res } = createMocks({
            method: 'GET',
        })
        const sessionData : SessionJWT = {
            email: null,
            cart_id: session_cart_id.toHexString(),
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
                cart_id: user_cart_id,
                is_admin: false,
                email,
            },
            iat: timeSeconds,
            exp: expritation,
            refreshTokenExpireTime: expritation,
        }
        const caller = appRouter.createCaller({ req: req as any, res: res as any, users, sessionData, userData, itemsByCart } as ContextLocals)
        const response = await caller.getCart()
        expect(response).toEqual([
            {
                _id: itemInCartIdOne.toHexString(),
                cart_id: user_cart_id,
                combination: [],
                discount_price: 0,
                imgs: [],
                name: "Test 1",
                price: 10000,
                product_id: productIdOne.toHexString(),
                product_variant_id: variantIdOne.toHexString(),
                qty: 1,
                sku: "122435",
                use_discount: false
            },
            {
                _id: itemInCartIdTwo.toHexString(),
                cart_id: user_cart_id,
                combination: [],
                discount_price: 0,
                imgs: [],
                name: "Test 2",
                price: 20000,
                product_id: productIdOne.toHexString(),
                product_variant_id: variantIdTwo.toHexString(),
                qty: 1,
                sku: "422435",
                use_discount: false
            }
        ])
    });
});
