import { MongoClient, Db, ObjectId } from "mongodb";
import { ContextLocals } from "./types";
import { createMocks } from 'node-mocks-http';
import { appRouter } from "./trpc";
import { NextApiResponse } from "next";
import FakeTimers, { InstalledClock } from "@sinonjs/fake-timers";

jest.mock('conekta');
jest.mock('@sendgrid/mail');

Object.defineProperty(global, 'fetch', {
    value: () => Promise.resolve({
        json: () => Promise.resolve({}),
    }),
    writable: true
});

describe("LogOutMutation tests", () => {
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

    it("logOut", async () => {
        const cart_oid = new ObjectId()
        const cart_id = cart_oid.toHexString()
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
        const caller = appRouter.createCaller({ req: req as any, res: res as any, sessionData } as ContextLocals)
        await caller.logOut()
        const cookies = res.getHeader('Set-Cookie')
        expect(cookies).toBe("refreshToken=; Expires=Tue, 01 Jan 2019 00:00:00 GMT; HttpOnly; Secure")
        const accessToken = res.getHeader('Access-Token')
        expect(accessToken).toBe("")
    });
});
