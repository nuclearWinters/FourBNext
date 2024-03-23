import { MongoClient, Db, ObjectId } from "mongodb";
import { ContextLocals, UserMongo } from "./types";
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

    it("getUser: not logged user", async () => {
        const cart_id = new ObjectId().toHexString()
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
        const caller = appRouter.createCaller({ req: req as any, res: res as any, users, sessionData } as ContextLocals)
        const response = await caller.getUser()
        expect(response).toEqual({
            _id: '',
            addresses: [
                {
                    _id: "",
                    apellidos: "",
                    city: "",
                    country: "",
                    full_address: "",
                    name: "",
                    neighborhood: "",
                    phone: "",
                    phone_prefix: "",
                    state: "",
                    street: "",
                    zip: "",
                },
            ],
            apellidos: '',
            cart_id,
            conekta_id: '',
            default_address: '',
            email: '',
            is_admin: false,
            name: '',
            password: undefined,
            phone: '',
            phone_prefix: '',
            verified_email: false,
        })
    });

    it("getUser: logged user", async () => {
        const user_id = new ObjectId()
        const session_cart_id = new ObjectId()
        const user_cart_id = new ObjectId()
        const users = dbInstance.collection<UserMongo>("users");
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
                cart_id: user_cart_id.toHexString(),
                is_admin: false,
                email,
            },
            iat: timeSeconds,
            exp: expritation,
            refreshTokenExpireTime: expritation,
        }
        const caller = appRouter.createCaller({ req: req as any, res: res as any, users, sessionData, userData } as ContextLocals)
        const response = await caller.getUser()
        expect(response).toEqual({
            _id: user_id.toHexString(),
            addresses: [
                {
                    _id: address_id.toHexString(),
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
                },
            ],
            apellidos: 'Apellidos',
            cart_id: user_cart_id.toHexString(),
            conekta_id: 'conekta_id',
            default_address: address_id.toHexString(),
            email,
            is_admin: false,
            name: 'Name',
            password: undefined,
            phone: '1111111111',
            phone_prefix: '+52',
            verified_email: false,
        })
    });
});
