import { MongoClient, Db, ObjectId } from "mongodb";
import { ContextLocals, UserMongo } from "../../../server/types";
import { createMocks } from 'node-mocks-http';
import { appRouter } from "../../../server/trpc";
import { getSessionData, sessionToBase64 } from "../../../server/utils";

describe("SignInMutation tests", () => {
    let client: MongoClient;
    let dbInstance: Db;

    beforeAll(async () => {
        client = await MongoClient.connect(process.env.MONGO_URL as string, {});
        dbInstance = client.db("auth");
    });

    afterAll(async () => {
        await client.close();
    });

    it("getUser: not logged user", async () => {
        const cart_id = new ObjectId().toHexString()
        const users = dbInstance.collection<UserMongo>("users");
        await users.insertOne({
            _id: new ObjectId("000000000000000000000020"),
            email: "anrp1@gmail.com",
            password: '',
            phone: "",
            name: "",
            phone_prefix: "",
            apellidos: "",
            cart_id: new ObjectId(),
            conekta_id: '',
            default_address: null,
            addresses: [],
            is_admin: false,
            verified_email: false,
        });
        const { req, res } = createMocks({
            method: 'GET',
        })
        const session = {
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
        const sessionData = getSessionData(sessionToBase64(session))
        const caller = appRouter.createCaller({ req, res, users, sessionData } as ContextLocals)
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
});
