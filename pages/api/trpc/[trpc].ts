/**
 * This is the API-handler of your app that contains all your API routes.
 * On a bigger app, you will probably want to split this file up into multiple files.
 */
import * as trpcNext from '@trpc/server/adapters/next';
import { z } from 'zod';
import { publicProcedure, router } from '../../../server/trpc';
import { Filter, MongoClient, ObjectId } from 'mongodb';
import { ACCESSSECRET, ACCESS_KEY, ACCESS_TOKEN_EXP_NUMBER, BUCKET_NAME, CONEKTA_API_KEY, MONGO_DB, REFRESHSECRET, REFRESH_TOKEN_EXP_NUMBER, SECRET_KEY, getSessionData, getTokenData, jwt } from '../../../server/utils';
import { CartsByUserMongo, InventoryMongo, ItemsByCartMongo, PurchasesMongo, ReservedInventoryMongo, SessionMongo, UserMongo } from '../../../server/types';
import bcrypt from "bcryptjs"
import cookie from "cookie"
import { TRPCError } from '@trpc/server';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Configuration, CustomersApi, OrdersApi } from 'conekta';
import { isAxiosError } from 'axios';
import { randomUUID } from 'crypto';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';


const client = await MongoClient.connect(MONGO_DB || "mongodb://mongo-fourb:27017", {})
const db = client.db("fourb");
export const users = db.collection<UserMongo>("users")
export const cartsByUser = db.collection<CartsByUserMongo>("carts_by_user")
export const inventory = db.collection<InventoryMongo>("inventory")
export const itemsByCart = db.collection<ItemsByCartMongo>("items_by_cart")
export const reservedInventory = db.collection<ReservedInventoryMongo>("reserved_inventory")
export const sessions = db.collection<SessionMongo>("sessions")
export const purchases = db.collection<PurchasesMongo>("purchases")

type Modify<T, R> = Omit<T, keyof R> & R;

export type UserTRPC = Modify<UserMongo, {
    _id: string;
    password: undefined;
    cart_id: string;
    default_address: string;
    addresses: {
        _id: string;
        full_address: string;
        country: string;
        street: string;
        colonia: string;
        zip: string;
        city: string;
        state: string;
        phone: string;
        phone_prefix: string;
        name: string;
        apellidos: string;
    }[]
}>

export type InventoryTRPC = Modify<InventoryMongo, {
    _id: string
}>

export type ItemsByCartTRPC = Modify<ItemsByCartMongo, {
    _id: string
    product_id: string,
    cart_id: string,
}>

export type PurchasesTRPC = Modify<PurchasesMongo, {
    _id: string
    product_id: string
    user_id: string | null
    session_id: string
    date: number
}>

const clientS3 = new S3Client({
    apiVersion: "2006-03-01",
    region: process.env.REGION,
    credentials: {
        accessKeyId: ACCESS_KEY,
        secretAccessKey: SECRET_KEY,
    },
});

const config = new Configuration({ accessToken: CONEKTA_API_KEY });
const customerClient = new CustomersApi(config);
const orderClient = new OrdersApi(config);

const appRouter = router({
    getUser: publicProcedure
        .query(async ({ ctx }): Promise<UserTRPC> => {
            try {
                const user_id = ctx.userData?.user._id
                if (!user_id) {
                    throw new Error("Not logged.")
                }
                const user = await ctx.users.findOne({ _id: new ObjectId(user_id) })
                if (!user) {
                    throw new Error("Not found.")
                }
                return {
                    ...user,
                    _id: user?._id.toHexString(),
                    password: undefined,
                    cart_id: user.cart_id.toHexString(),
                    default_address: user.default_address?.toHexString() || "",
                    addresses: user.addresses.map(address => ({
                        ...address,
                        _id: address._id.toHexString(),
                    }))
                };
            } catch (e) {
                const session = ctx.sessionData
                return {
                    _id: "",
                    email: session.email || "",
                    password: undefined,
                    cart_id: session.cart_id,
                    name: session.name || "",
                    apellidos: session.apellidos || "",
                    phone: session.phone || "",
                    conekta_id: session.conekta_id || "",
                    default_address: "",
                    addresses: [{
                        _id: "",
                        full_address: "",
                        country: session.country || "",
                        street: session.street || "",
                        colonia: session.colonia || "",
                        zip: session.zip || "",
                        city: session.city || "",
                        state: session.state || "",
                        phone: session.phone || "",
                        phone_prefix: session.phone_prefix || "",
                        name: session.name || "",
                        apellidos: session.apellidos || "",
                    }],
                    phone_prefix: session.phone_prefix || "",
                    is_admin: false,
                };
            }
        }),
    logIn: publicProcedure
        .input(z.object({ email: z.string().email(), password: z.string().min(8) }))
        .mutation(async ({ ctx, input }): Promise<void> => {
            try {
                const email = input.email
                const password = input.password
                const { users, res } = ctx
                const user = await users.findOne({
                    email,
                })
                if (!user) throw new Error("El usuario no existe.");
                const hash = await bcrypt.compare(password, user.password);
                if (!hash) throw new Error("La contraseña no coincide.");
                const now = new Date();
                now.setMilliseconds(0);
                const nowTime = now.getTime() / 1000;
                const refreshTokenExpireTime = nowTime + REFRESH_TOKEN_EXP_NUMBER;
                const accessTokenExpireTime = nowTime + ACCESS_TOKEN_EXP_NUMBER;
                const refreshToken = jwt.sign(
                    {
                        user: {
                            _id: user._id.toHexString(),
                            cart_id: user.cart_id.toHexString(),
                            is_admin: user.is_admin,
                        },
                        refreshTokenExpireTime: refreshTokenExpireTime,
                        exp: refreshTokenExpireTime,
                    },
                    REFRESHSECRET
                );
                const accessToken = jwt.sign(
                    {
                        user: {
                            _id: user._id.toHexString(),
                            cart_id: user.cart_id.toHexString(),
                            is_admin: user.is_admin,
                        },
                        refreshTokenExpireTime: refreshTokenExpireTime,
                        exp: accessTokenExpireTime,
                    },
                    ACCESSSECRET
                );
                const refreshTokenExpireDate = new Date(refreshTokenExpireTime * 1000);
                res.setHeader("accessToken", accessToken)
                res.setHeader("Set-Cookie", cookie.serialize("refreshToken", refreshToken, {
                    httpOnly: true,
                    expires: refreshTokenExpireDate,
                    secure: false,
                }))
                return
            } catch (e) {
                if (e instanceof Error) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: e.message,
                    });
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An unexpected error occurred, please try again later.',
                });
            }
        }),
    logOut: publicProcedure.mutation(async ({ ctx }): Promise<void> => {
        const { res } = ctx
        res.setHeader("Set-Cookie", cookie.serialize("refreshToken", "", {
            httpOnly: true,
            expires: new Date(),
            secure: false,
        }))
        res.setHeader("accessToken", "")
        return
    }),
    register: publicProcedure
        .input(z.object({
            email: z.string().email(),
            password: z.string().min(8),
            name: z.string(),
            apellidos: z.string(),
            confirmPassword: z.string(),
            phone: z.string(),
            phonePrefix: z.string(),
        }).superRefine(({ confirmPassword, password }, ctx) => {
            if (confirmPassword !== password) {
                ctx.addIssue({
                    code: "custom",
                    message: "The passwords did not match"
                });
            }
        }))
        .mutation(async ({ ctx, input }): Promise<void> => {
            try {
                const email = input.email
                const password = input.password
                const name = input.name
                const apellidos = input.apellidos
                const phonePrefix = input.phonePrefix
                const phone = input.phone
                const { users, cartsByUser, res } = ctx
                const cart_id = new ObjectId();
                const user_id = new ObjectId();
                const user = await users.findOne({ email });
                if (user) throw new Error("El email ya esta siendo usado.");
                const [customer, hash_password] = await Promise.all([
                    customerClient.createCustomer({
                        name: `${name} ${apellidos}`,
                        email,
                        phone: phonePrefix + phone,
                    }),
                    bcrypt.hash(password, 12),
                ])
                const now = new Date();
                now.setMilliseconds(0);
                const nowTime = now.getTime() / 1000;
                const refreshTokenExpireTime = nowTime + REFRESH_TOKEN_EXP_NUMBER;
                const accessTokenExpireTime = nowTime + ACCESS_TOKEN_EXP_NUMBER;
                const refreshToken = jwt.sign(
                    {
                        user: {
                            _id: user_id.toHexString(),
                            cart_id: cart_id.toHexString(),
                            is_admin: false,
                        },
                        refreshTokenExpireTime: refreshTokenExpireTime,
                        exp: refreshTokenExpireTime,
                    },
                    REFRESHSECRET
                );
                const accessToken = jwt.sign(
                    {
                        user: {
                            _id: user_id.toHexString(),
                            cart_id: cart_id.toHexString(),
                            is_admin: false,
                        },
                        refreshTokenExpireTime: refreshTokenExpireTime,
                        exp: accessTokenExpireTime,
                    },
                    ACCESSSECRET
                );
                const refreshTokenExpireDate = new Date(refreshTokenExpireTime * 1000);
                res.setHeader("Set-Cookie", cookie.serialize("refreshToken", refreshToken, {
                    httpOnly: true,
                    expires: refreshTokenExpireDate,
                    secure: false,
                }))
                const userData = {
                    _id: user_id,
                    email,
                    password: hash_password,
                    cart_id,
                    name,
                    apellidos,
                    conekta_id: customer.data.id,
                    phone,
                    default_address: null,
                    addresses: [],
                    phone_prefix: phonePrefix,
                    is_admin: false,
                }
                await Promise.all([
                    users.insertOne(userData),
                    cartsByUser.insertOne({
                        _id: cart_id,
                        user_id,
                        expireDate: null
                    }),
                ])
                res.setHeader("accessToken", accessToken)
                return
            } catch (e) {
                if (e instanceof Error) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: e.message,
                    });
                } else if (isAxiosError(e)) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: e.response?.data?.details?.[0].message,
                    });
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An unexpected error occurred, please try again later.',
                });
            }
        }),
    inventory: publicProcedure
        .input(z.object({
            tag: z.string().nullish(),
            limit: z.number().min(1).max(100).nullish(),
            cursor: z.string().nullish(),
            discounts: z.boolean().nullish(),
            search: z.string().nullish(),
        }))
        .query(async ({ ctx, input }): Promise<{ items: InventoryTRPC[], nextCursor: string | undefined }> => {
            const { inventory } = ctx
            const search = input.search
            const tag = input.tag
            const limit = input.limit || 20
            const after = input.cursor || ""
            const discounts = input.discounts
            const limitParsed = limit + 1
            let nextCursor: string | undefined = undefined;
            if (search) {
                const filter: Filter<InventoryMongo> = {
                    name: { $regex: search, $options: "i" }
                }
                if (after) {
                    filter._id = { $lt: new ObjectId(after) };
                }
                const products = await inventory.find(filter).limit(limitParsed).sort({ $natural: -1 }).toArray()
                if (products.length > limit) {
                    const nextItem = products.pop();
                    nextCursor = nextItem!._id.toHexString();
                }
                return {
                    items: products.map(product => ({ ...product, _id: product._id.toHexString() })),
                    nextCursor,
                };
            } else if (tag) {
                const filter: Filter<InventoryMongo> = {
                    tags: { $in: [tag] }
                }
                if (after) {
                    filter._id = { $lt: new ObjectId(after) };
                }
                const products = await inventory.find(filter).limit(limitParsed).sort({ $natural: -1 }).toArray()
                if (products.length > limit) {
                    const nextItem = products.pop();
                    nextCursor = nextItem!._id.toHexString();
                }
                return {
                    items: products.map(product => ({ ...product, _id: product._id.toHexString() })),
                    nextCursor,
                };
            } else if (discounts) {
                const filter: Filter<InventoryMongo> = {
                    use_discount: true
                }
                if (after) {
                    filter._id = { $lt: new ObjectId(after) };
                }
                const products = await inventory.find(filter).limit(limitParsed).sort({ $natural: -1 }).toArray()
                if (products.length > limit) {
                    const nextItem = products.pop();
                    nextCursor = nextItem!._id.toHexString();
                }
                return {
                    items: products.map(product => ({ ...product, _id: product._id.toHexString() })),
                    nextCursor,
                };
            } else {
                const filter: Filter<InventoryMongo> = {}
                if (after) {
                    filter._id = { $lt: new ObjectId(after) };
                }
                const products = await inventory.find(filter).limit(limitParsed).sort({ $natural: -1 }).toArray()
                if (products.length > limit) {
                    const nextItem = products.pop();
                    nextCursor = nextItem!._id.toHexString();
                }
                return {
                    items: products.map(product => ({ ...product, _id: product._id.toHexString() })),
                    nextCursor,
                };
            }
        }),
    addOneToCart: publicProcedure
        .input(z.object({
            product_id: z.string(),
            qty: z.number(),
            qtyBig: z.number(),
            qtySmall: z.number(),
        }))
        .mutation(async ({ ctx, input }): Promise<void> => {
            try {
                const { inventory, itemsByCart, reservedInventory, cartsByUser, sessionData, userData } = ctx
                const product_id = input.product_id
                const qty = input.qty || 0
                const qtyBig = input.qtyBig || 0
                const qtySmall = input.qtySmall || 0
                const cart_oid = new ObjectId(userData?.user.cart_id || sessionData.cart_id)
                const product_oid = new ObjectId(product_id)
                const filter: Filter<InventoryMongo> = {
                    _id: product_oid
                }
                if (qty) {
                    filter.available = {
                        $gte: qty
                    }
                }
                if (qtyBig) {
                    filter.available_big = {
                        $gte: qtyBig
                    }
                }
                if (qtySmall) {
                    filter.available_small = {
                        $gte: qtySmall
                    }
                }
                const product = await inventory.findOneAndUpdate(
                    filter,
                    {
                        $inc: {
                            available: -qty,
                            available_big: -qtyBig,
                            available_small: -qtySmall,
                        }
                    },
                    {
                        returnDocument: "after"
                    })
                const { value } = product
                if (!value) {
                    throw new Error("Not enough inventory or product not found")
                }
                const expireDate = new Date()
                expireDate.setDate(expireDate.getDate() + 7)
                const reserved = await reservedInventory.updateOne({
                    cart_id: cart_oid,
                    product_id: product_oid,
                },
                    {
                        $inc: {
                            qty,
                            qty_big: qtyBig,
                            qty_small: qtySmall,
                        },
                        $setOnInsert: {
                            cart_id: cart_oid,
                            product_id: product_oid,
                        },
                    },
                    {
                        upsert: true
                    })
                if (!(reserved.modifiedCount || reserved.upsertedCount)) {
                    throw new Error("Item not reserved.")
                }
                const result = await itemsByCart.updateOne(
                    {
                        product_id: product_oid,
                        cart_id: cart_oid,
                    },
                    {
                        $inc: {
                            qty,
                            qty_big: qtyBig,
                            qty_small: qtySmall,
                        },
                        $setOnInsert: {
                            name: value.name,
                            product_id: product_oid,
                            cart_id: cart_oid,
                            price: value.price,
                            discount_price: value.discount_price,
                            use_discount: value.use_discount,
                            img: value.img,
                            code: value.code,
                            img_big: value.img_big,
                            img_small: value.img_small,
                            use_small_and_big: value.use_small_and_big,
                        }
                    },
                    {
                        upsert: true
                    }
                )
                if (!(result.modifiedCount || result.upsertedCount)) {
                    throw new Error("Item not added to cart.")
                }
                await cartsByUser.updateOne({
                    _id: cart_oid,
                },
                    {
                        $set: {
                            expireDate
                        }
                    })
                return
            } catch (e) {
                if (e instanceof Error) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: e.message,
                    });
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An unexpected error occurred, please try again later.',
                });
            }
        }),
    getCart: publicProcedure
        .query(async ({ ctx }): Promise<ItemsByCartTRPC[]> => {
            try {
                const { itemsByCart, userData, sessionData } = ctx
                const cart_oid = new ObjectId(userData?.user.cart_id || sessionData.cart_id)
                const itemsInCart = await itemsByCart.find({ cart_id: cart_oid }).toArray()
                return itemsInCart.map(item => ({
                    ...item,
                    _id: item._id.toHexString(),
                    product_id: item.product_id.toHexString(),
                    cart_id: item.cart_id.toHexString(),
                }))
            } catch (e) {
                if (e instanceof Error) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: e.message,
                    });
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An unexpected error occurred, please try again later.',
                });
            }
        }),
    updateOneCart: publicProcedure
        .input(z.object({
            item_by_cart_id: z.string(),
            product_id: z.string(),
            qty: z.number(),
            qtyBig: z.number(),
            qtySmall: z.number(),
        }))
        .mutation(async ({ ctx, input }): Promise<void> => {
            try {
                const { inventory, itemsByCart, reservedInventory, cartsByUser, userData, sessionData } = ctx
                const item_by_cart_id = input.item_by_cart_id
                const product_id = input.product_id
                const qty = input.qty || 0
                const qtyBig = input.qtyBig || 0
                const qtySmall = input.qtySmall || 0
                const cart_oid = new ObjectId(userData?.user.cart_id || sessionData.cart_id)
                const product_oid = new ObjectId(product_id)
                const reserved = await reservedInventory.findOneAndDelete({
                    cart_id: cart_oid,
                    product_id: product_oid,
                })
                if (!reserved.value) {
                    throw new Error("Item not reserved.")
                }
                const filter: Filter<InventoryMongo> = {
                    _id: product_oid,
                }
                if (qty) {
                    filter.available = {
                        $gte: qty - reserved.value.qty,
                    }
                }
                if (qtyBig) {
                    filter.available_big = {
                        $gte: qtyBig - reserved.value.qty_big,
                    }
                }
                if (qtySmall) {
                    filter.available_small = {
                        $gte: qtySmall - reserved.value.qty_small,
                    }
                }
                const product = await inventory.findOneAndUpdate(
                    filter,
                    {
                        $inc: {
                            available: reserved.value.qty - qty,
                            available_big: reserved.value.qty_big - qtyBig,
                            available_small: reserved.value.qty_small - qtySmall,
                        },
                    },
                    {
                        returnDocument: "after"
                    })
                const { value } = product
                if (!value) {
                    throw new Error("Not enough inventory or product not found")
                }
                const item_by_cart_oid = new ObjectId(item_by_cart_id)
                const result = await itemsByCart.updateOne(
                    {
                        _id: item_by_cart_oid,
                        cart_id: cart_oid,
                    },
                    {
                        $set: {
                            qty,
                            qty_big: qtyBig,
                            qty_small: qtySmall,
                        },
                    },
                )
                if (!result.modifiedCount) {
                    throw new Error("Item in cart not modified.")
                }
                const expireDate = new Date()
                expireDate.setDate(expireDate.getDate() + 7)
                const newReserved = await reservedInventory.insertOne(
                    {
                        qty,
                        cart_id: cart_oid,
                        product_id: product_oid,
                        qty_big: qtyBig,
                        qty_small: qtySmall,
                    })
                if (!newReserved.insertedId) {
                    throw new Error("Item not reserved.")
                }
                await cartsByUser.updateOne({
                    _id: cart_oid,
                },
                    {
                        $set: {
                            expireDate
                        }
                    })
                return
            } catch (e) {
                if (e instanceof Error) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: e.message,
                    });
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An unexpected error occurred, please try again later.',
                });
            }
        }),
    removeOneCart: publicProcedure
        .input(z.object({
            item_by_cart_id: z.string(),
        }))
        .mutation(async ({ ctx, input }): Promise<void> => {
            try {
                const { itemsByCart, reservedInventory, inventory, userData, sessionData } = ctx
                const item_by_cart_id = input.item_by_cart_id
                if (item_by_cart_id && typeof item_by_cart_id !== "string") {
                    throw new Error("Product ID is required and must be a string")
                }
                if (item_by_cart_id.length !== 24) {
                    throw new Error("Product ID must contain 24 characters")
                }
                const cart_oid = new ObjectId(userData?.user.cart_id || sessionData.cart_id)
                const item_by_cart_oid = new ObjectId(item_by_cart_id)
                const result = await itemsByCart.findOneAndDelete(
                    {
                        _id: item_by_cart_oid,
                        cart_id: cart_oid
                    },
                )
                if (!result.value) {
                    throw new Error("Item in cart was not deleted.")
                }
                const reservation = await reservedInventory.findOneAndDelete(
                    {
                        product_id: result.value.product_id,
                        cart_id: cart_oid,
                    })
                if (!reservation.value) {
                    throw new Error("Item in reservation was not deleted.")
                }
                const product = await inventory.findOneAndUpdate({
                    _id: result.value.product_id,
                },
                    {
                        $inc: {
                            available: reservation.value.qty,
                            available_small: reservation.value.qty_small,
                            available_big: reservation.value.qty_big,
                        },
                    })
                const { value } = product
                if (!value) {
                    throw new Error("Inventory not modified.")
                }
                return
            } catch (e) {
                if (e instanceof Error) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: e.message,
                    });
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An unexpected error occurred, please try again later.',
                });
            }
        }),
    checkoutPhase: publicProcedure
        .input(z.object({
            name: z.string().nonempty(),
            apellidos: z.string().nonempty(),
            street: z.string().nonempty(),
            email: z.string(),
            country: z.string().nonempty(),
            colonia: z.string().nonempty(),
            zip: z.string().nonempty(),
            city: z.string().nonempty(),
            state: z.string().nonempty(),
            phone: z.string().nonempty(),
            address_id: z.string(),
            phone_prefix: z.literal('+52'),
        }))
        .mutation(async ({ ctx, input }): Promise<string | undefined> => {
            try {
                const { itemsByCart, sessions, users, userData, sessionData, res } = ctx
                const { name, apellidos, street, email, country, colonia, zip, city, state, phone, address_id, phone_prefix } = input
                const cart_oid = new ObjectId(userData?.user.cart_id || sessionData.cart_id)
                if (address_id && userData) {
                    const address_oid = new ObjectId(address_id)
                    const user_oid = new ObjectId(userData.user._id)
                    const result = await users.findOneAndUpdate({
                        _id: user_oid,
                        "addresses._id": address_oid,
                    },
                        {
                            $set: {
                                default_address: address_oid,
                                "addresses.$.full_address": `${street}, ${colonia}, ${zip} ${city} ${state}, ${country} (${name} ${apellidos})`,
                                "addresses.$.country": country,
                                "addresses.$.street": street,
                                "addresses.$.colonia": colonia,
                                "addresses.$.zip": zip,
                                "addresses.$.city": city,
                                "addresses.$.state": state,
                                "addresses.$.phone": phone,
                                "addresses.$.name": name,
                                "addresses.$.apellidos": apellidos,
                            },
                        },
                        {
                            returnDocument: "after"
                        })
                    if (!result.value) {
                        throw new Error("No user updated")
                    }
                    const user = result.value
                    const products = await itemsByCart.find({ cart_id: cart_oid }).toArray()
                    const order = await orderClient.createOrder({
                        currency: "MXN",
                        customer_info: {
                            customer_id: result.value.conekta_id,
                        },
                        line_items: products.map(product => ({
                            name: product.name,
                            unit_price: product.use_discount ? product.discount_price : product.price,
                            quantity: product.use_small_and_big ? product.qty_big ? product.qty_big : product.qty_small : product.qty,
                        })),
                        checkout: {
                            type: 'Integration',
                            allowed_payment_methods: ['card', 'cash', 'bank_transfer'],
                        }
                    })
                    return order?.data?.checkout?.id
                } else if (userData) {
                    const address_id = new ObjectId()
                    const user_oid = new ObjectId(userData.user._id)
                    const result = await users.findOneAndUpdate({
                        _id: user_oid,
                    },
                        {
                            $set: {
                                default_address: address_id,
                            },
                            $push: {
                                addresses: {
                                    _id: address_id,
                                    full_address: `${street}, ${colonia}, ${zip} ${city} ${state}, ${country} (${name} ${apellidos})`,
                                    country,
                                    street,
                                    colonia,
                                    zip,
                                    city,
                                    state,
                                    phone,
                                    name,
                                    apellidos,
                                    phone_prefix,
                                }
                            },
                        },
                        {
                            returnDocument: "after"
                        })
                    if (!result.value) {
                        throw new Error("No user updated")
                    }
                    const user = result.value
                    const products = await itemsByCart.find({ cart_id: cart_oid }).toArray()
                    const order = await orderClient.createOrder({
                        currency: "MXN",
                        customer_info: {
                            customer_id: result.value.conekta_id,
                        },
                        line_items: products.map(product => ({
                            name: product.name,
                            unit_price: product.use_discount ? product.discount_price : product.price,
                            quantity: product.use_small_and_big ? product.qty_big ? product.qty_big : product.qty_small : product.qty,
                        })),
                        checkout: {
                            type: 'Integration',
                            allowed_payment_methods: ['card', 'cash', 'bank_transfer'],
                        }
                    })
                    return order?.data?.checkout?.id
                } else {
                    if (!email) {
                        throw new Error("Email is required and must be a string")
                    }
                    const session_oid = new ObjectId(sessionData._id)
                    const result = await sessions.findOneAndUpdate({
                        _id: session_oid,
                    },
                        {
                            $set: {
                                email,
                                country,
                                street,
                                colonia,
                                zip,
                                city,
                                state,
                                phone,
                                name,
                                apellidos,
                                phone_prefix,
                            },
                        },
                        {
                            returnDocument: "after"
                        })
                    if (!result.value) {
                        throw new Error("No session updated")
                    }
                    const conekta_id = result.value.conekta_id ?? (await customerClient.createCustomer({ phone, name: `${name} ${apellidos}`, email })).data.id
                    if (!result.value.conekta_id) {
                        await sessions.updateOne({
                            _id: session_oid,
                        },
                            {
                                $set: {
                                    conekta_id,
                                }
                            })
                    }
                    const products = await itemsByCart.find({ cart_id: cart_oid }).toArray()
                    const order = await orderClient.createOrder({
                        currency: "MXN",
                        customer_info: {
                            customer_id: conekta_id,
                        },
                        line_items: products.map(product => ({
                            name: product.name,
                            unit_price: product.use_discount ? product.discount_price : product.price,
                            quantity: product.use_small_and_big ? product.qty_big ? product.qty_big : product.qty_small : product.qty,
                        })),
                        checkout: {
                            type: 'Integration',
                            allowed_payment_methods: ['card', 'cash', 'bank_transfer'],
                        }
                    })
                    result.value.conekta_id = conekta_id
                    const session = Buffer.from(JSON.stringify(result.value)).toString('base64')
                    res.setHeader("sessionToken", session)
                    return order?.data?.checkout?.id
                }
            } catch (e) {
                if (isAxiosError(e)) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: e.response?.data?.details?.[0].message,
                    });
                } else if (e instanceof Error) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: e.message,
                    });
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An unexpected error occurred, please try again later.',
                });
            }
        }),
    confirmationPhase: publicProcedure
        .mutation(async ({ ctx }): Promise<void> => {
            try {
                const { users, cartsByUser, sessions, purchases, itemsByCart, sessionData, userData, res } = ctx
                const new_cart_id = new ObjectId()
                const previous_cart_id = new ObjectId(userData?.user.cart_id || sessionData.cart_id)
                const session_oid = new ObjectId(sessionData._id)
                if (userData) {
                    const user_oid = new ObjectId(userData.user._id)
                    await Promise.all([users.updateOne({
                        _id: user_oid
                    }, {
                        $set: {
                            cart_id: new_cart_id
                        }
                    }),
                    cartsByUser.bulkWrite([
                        {
                            updateOne: {
                                filter: {
                                    _id: previous_cart_id
                                },
                                update: {
                                    $set: {
                                        expireDate: null
                                    }
                                }
                            },
                            insertOne: {
                                document: {
                                    _id: new_cart_id,
                                    user_id: user_oid,
                                    expireDate: null
                                }
                            }
                        }
                    ])
                    ])
                    const productsInCart = await itemsByCart.find({ cart_id: previous_cart_id }).toArray()
                    const purchasedProducts: PurchasesMongo[] = productsInCart.map(product => ({
                        name: product.name,
                        product_id: product.product_id,
                        qty: product.qty,
                        qty_big: product.qty_big,
                        qty_small: product.qty_small,
                        price: product.price,
                        discount_price: product.discount_price,
                        use_discount: product.use_discount,
                        user_id: user_oid,
                        session_id: session_oid,
                        date: new Date(),
                        img: product.img,
                        code: product.code,
                        use_small_and_big: product.use_small_and_big,
                        img_big: product.img_big,
                        img_small: product.img_small,
                    }))
                    await purchases.insertMany(purchasedProducts)
                    const newAccessToken = jwt.sign(
                        {
                            user: {
                                _id: userData.user._id,
                                cart_id: new_cart_id.toHexString(),
                                is_admin: userData.user.is_admin,
                            },
                            refreshTokenExpireTime: userData.refreshTokenExpireTime,
                            exp: userData.exp,
                        },
                        ACCESSSECRET
                    );
                    const refreshToken = jwt.sign(
                        {
                            user: {
                                _id: userData.user._id,
                                cart_id: new_cart_id.toHexString(),
                                is_admin: userData.user.is_admin,
                            },
                            refreshTokenExpireTime: userData.refreshTokenExpireTime,
                            exp: userData.exp,
                        },
                        REFRESHSECRET
                    );
                    const refreshTokenExpireDate = new Date(userData.refreshTokenExpireTime * 1000);
                    res.setHeader("Set-Cookie", cookie.serialize("refreshToken", refreshToken, {
                        httpOnly: true,
                        expires: refreshTokenExpireDate,
                        secure: false,
                    }))
                    res.setHeader("accessToken", newAccessToken)
                    return
                } else {
                    const [session] = await Promise.all([
                        sessions.findOneAndUpdate(
                            {
                                _id: session_oid
                            },
                            {
                                $set: {
                                    cart_id: new_cart_id
                                }
                            },
                            {
                                returnDocument: "after"
                            }
                        ),
                        cartsByUser.bulkWrite([
                            {
                                updateOne: {
                                    filter: {
                                        _id: previous_cart_id
                                    },
                                    update: {
                                        $set: {
                                            expireDate: null
                                        }
                                    }
                                },
                                insertOne: {
                                    document: {
                                        _id: new_cart_id,
                                        user_id: session_oid,
                                        expireDate: null
                                    }
                                }
                            }
                        ])
                    ])
                    const productsInCart = await itemsByCart.find({ cart_id: previous_cart_id }).toArray()
                    const purchasedProducts: PurchasesMongo[] = productsInCart.map(product => ({
                        name: product.name,
                        product_id: product._id,
                        qty: product.qty,
                        qty_small: product.qty_small,
                        qty_big: product.qty_big,
                        price: product.price,
                        discount_price: product.discount_price,
                        use_discount: product.use_discount,
                        user_id: null,
                        session_id: session_oid,
                        date: new Date(),
                        img: product.img,
                        code: product.code,
                        use_small_and_big: product.use_small_and_big,
                        img_big: product.img_big,
                        img_small: product.img_small,
                    }))
                    await purchases.insertMany(purchasedProducts)
                    if (session.value) {
                        const sessionToken = Buffer.from(JSON.stringify(session.value)).toString('base64')
                        res.setHeader("sessionToken", sessionToken)
                    }
                    return
                }
            } catch (e) {
                if (e instanceof Error) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: e.message,
                    });
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An unexpected error occurred, please try again later.',
                });
            }
        }),
    purchases: publicProcedure
        .query(async ({ ctx }): Promise<PurchasesTRPC[]> => {
            try {
                const { userData, purchases } = ctx
                if (!userData?.user._id) {
                    throw new Error("Inicia sesión primero")
                }
                const user_oid = new ObjectId(userData?.user._id)
                const history = await purchases.find({ user_id: user_oid }).toArray()
                return history.map(history => ({
                    ...history,
                    _id: history._id.toHexString(),
                    product_id: history.product_id.toHexString(),
                    user_id: history.user_id?.toHexString() || null,
                    date: history.date.getTime(),
                    session_id: history.session_id.toHexString(),
                }))
            } catch (e) {
                if (e instanceof Error) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: e.message,
                    });
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An unexpected error occurred, please try again later.',
                });
            }
        }),
    signedUrl: publicProcedure
        .input(z.object({
            fileType: z.string().nonempty()
        }))
        .mutation(async ({ input }): Promise<{
            uploadUrl: string
            key: string
        }> => {
            try {
                const { fileType } = input
                const ex = fileType.split("/")[1];
                const Key = `${randomUUID()}.${ex}`;
                const putObjectParams = {
                    Bucket: BUCKET_NAME,
                    Key,
                    ContentType: `image/${ex}`,
                };
                const command = new PutObjectCommand(putObjectParams);
                const uploadUrl = await getSignedUrl(clientS3, command, { expiresIn: 3600 });
                return {
                    uploadUrl,
                    key: Key,
                };
            } catch (e) {
                if (e instanceof Error) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: e.message,
                    });
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An unexpected error occurred, please try again later.',
                });
            }
        }),
    editUser: publicProcedure
        .input(z.object({
            email: z.string().email(),
            name: z.string().nonempty(),
            apellidos: z.string().nonempty(),
            phone: z.string().nonempty(),
            phonePrefix: z.literal('+52')
        })).mutation(async ({ ctx, input }): Promise<void> => {
            try {
                const { userData, users } = ctx
                if (!userData?.user._id) {
                    throw new Error("Inicia sesión primero")
                }
                const email = input.email
                const name = input.name
                const apellidos = input.apellidos
                const phonePrefix = input.phonePrefix
                const phone = input.phone
                const user_oid = new ObjectId(userData?.user._id)
                await users.updateOne(
                    { _id: user_oid },
                    {
                        $set: {
                            name,
                            email,
                            apellidos,
                            phone,
                            phone_prefix: phonePrefix,
                        }
                    },
                );
                return
            } catch (e) {
                if (e instanceof Error) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: e.message,
                    });
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An unexpected error occurred, please try again later.',
                });
            }
        }),
    addProduct: publicProcedure
        .input(z.object({
            qty: z.number(),
            qtySmall: z.number(),
            qtyBig: z.number(),
            name: z.string().nonempty(),
            price: z.number(),
            useSmallAndBig: z.boolean(),
            img: z.array(z.string()),
            imgBig: z.array(z.string()),
            imgSmall: z.array(z.string()),
            discountPrice: z.number(),
            useDiscount: z.boolean(),
            checkboxArete: z.boolean(),
            checkboxCollar: z.boolean(),
            checkboxAnillo: z.boolean(),
            checkboxPulsera: z.boolean(),
            checkboxPiercing: z.boolean(),
            checkboxTobillera: z.boolean(),
            checkboxOro10K: z.boolean(),
            checkboxAjustable: z.boolean(),
            checkboxTalla5: z.boolean(),
            checkboxTalla6: z.boolean(),
            checkboxTalla7: z.boolean(),
            checkboxTalla8: z.boolean(),
            checkboxTalla9: z.boolean(),
            checkboxTalla10: z.boolean(),
            code: z.string(),
        }).superRefine(({ useSmallAndBig, imgBig, imgSmall, img }, ctx) => {
            if (useSmallAndBig) {
                if (imgBig.length === 0) {
                    ctx.addIssue({
                        code: "custom",
                        message: "Images for big option must include at least one image"
                    });
                }
                if (imgSmall.length === 0) {
                    ctx.addIssue({
                        code: "custom",
                        message: "Images for small option must include at least one image"
                    });
                }
            } else {
                if (img.length === 0) {
                    ctx.addIssue({
                        code: "custom",
                        message: "Images must include at least one image"
                    });
                }
            }
        })).mutation(async ({ ctx, input }): Promise<void> => {
            try {
                const qty = input.qty
                const qtySmall = input.qtySmall
                const qtyBig = input.qtyBig
                const name = input.name
                const price = input.price
                const useSmallAndBig = input.useSmallAndBig
                const img = input.img
                const imgBig = input.imgBig
                const imgSmall = input.imgSmall
                const discountPrice = input.discountPrice
                const useDiscount = input.useDiscount
                const checkboxArete = input.checkboxArete
                const checkboxCollar = input.checkboxCollar
                const checkboxAnillo = input.checkboxAnillo
                const checkboxPulsera = input.checkboxPulsera
                const checkboxPiercing = input.checkboxPiercing
                const checkboxTobillera = input.checkboxTobillera
                const checkboxOro10K = input.checkboxOro10K
                const checkboxAjustable = input.checkboxAjustable
                const checkboxTalla5 = input.checkboxTalla5
                const checkboxTalla6 = input.checkboxTalla6
                const checkboxTalla7 = input.checkboxTalla7
                const checkboxTalla8 = input.checkboxTalla8
                const checkboxTalla9 = input.checkboxTalla9
                const checkboxTalla10 = input.checkboxTalla10
                const code = input.code
                const tags = []
                if (checkboxArete) {
                    tags.push("arete")
                }
                if (checkboxCollar) {
                    tags.push("collar")
                }
                if (checkboxAnillo) {
                    tags.push("anillo")
                }
                if (checkboxPulsera) {
                    tags.push("pulsera")
                }
                if (checkboxPiercing) {
                    tags.push("piercing")
                }
                if (checkboxTobillera) {
                    tags.push("tobillera")
                }
                if (checkboxOro10K) {
                    tags.push("oro10k")
                }
                if (checkboxAjustable) {
                    tags.push("ajustable")
                }
                if (checkboxTalla5) {
                    tags.push("talla5")
                }
                if (checkboxTalla6) {
                    tags.push("talla6")
                }
                if (checkboxTalla7) {
                    tags.push("talla7")
                }
                if (checkboxTalla8) {
                    tags.push("tall8")
                }
                if (checkboxTalla9) {
                    tags.push("tall9")
                }
                if (checkboxTalla10) {
                    tags.push("talla10")
                }
                const { inventory } = ctx
                await inventory.insertOne({
                    available: qty,
                    total: qty,
                    name,
                    price,
                    img,
                    discount_price: discountPrice,
                    use_discount: useDiscount,
                    tags,
                    code,
                    use_small_and_big: useSmallAndBig,
                    img_big: imgBig,
                    img_small: imgSmall,
                    available_big: qtyBig,
                    total_big: qtyBig,
                    available_small: qtySmall,
                    total_small: qtySmall,
                })
                return
            } catch (e) {
                if (e instanceof Error) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: e.message,
                    });
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An unexpected error occurred, please try again later.',
                });
            }
        }),
    editProduct: publicProcedure
        .input(z.object({
            id: z.string().nonempty(),
            increment: z.number(),
            incrementSmall: z.number(),
            incrementBig: z.number(),
            name: z.string().nonempty(),
            price: z.number(),
            useSmallAndBig: z.boolean(),
            img: z.array(z.string()),
            imgBig: z.array(z.string()),
            imgSmall: z.array(z.string()),
            discountPrice: z.number(),
            useDiscount: z.boolean(),
            checkboxArete: z.boolean(),
            checkboxCollar: z.boolean(),
            checkboxAnillo: z.boolean(),
            checkboxPulsera: z.boolean(),
            checkboxPiercing: z.boolean(),
            checkboxTobillera: z.boolean(),
            checkboxOro10K: z.boolean(),
            checkboxAjustable: z.boolean(),
            checkboxTalla5: z.boolean(),
            checkboxTalla6: z.boolean(),
            checkboxTalla7: z.boolean(),
            checkboxTalla8: z.boolean(),
            checkboxTalla9: z.boolean(),
            checkboxTalla10: z.boolean(),
            code: z.string(),
        }).superRefine(({ useSmallAndBig, imgBig, imgSmall, img }, ctx) => {
            if (useSmallAndBig) {
                if (imgBig.length === 0) {
                    ctx.addIssue({
                        code: "custom",
                        message: "Images for big option must include at least one image"
                    });
                }
                if (imgSmall.length === 0) {
                    ctx.addIssue({
                        code: "custom",
                        message: "Images for small option must include at least one image"
                    });
                }
            } else {
                if (img.length === 0) {
                    ctx.addIssue({
                        code: "custom",
                        message: "Images must include at least one image"
                    });
                }
            }
        })).mutation(async ({ ctx, input }): Promise<void> => {
            try {
                const id = input.id
                const increment = input.increment || 0
                const incrementSmall = input.incrementSmall || 0
                const incrementBig = input.incrementBig || 0
                const name = input.name
                const price = input.price
                const code = input.code
                const discountPrice = input.discountPrice
                const useDiscount = input.useDiscount
                const checkboxArete = input.checkboxArete
                const checkboxCollar = input.checkboxCollar
                const checkboxAnillo = input.checkboxAnillo
                const checkboxPulsera = input.checkboxPulsera
                const checkboxPiercing = input.checkboxPiercing
                const checkboxTobillera = input.checkboxTobillera
                const checkboxOro10K = input.checkboxOro10K
                const checkboxAjustable = input.checkboxAjustable
                const checkboxTalla5 = input.checkboxTalla5
                const checkboxTalla6 = input.checkboxTalla6
                const checkboxTalla7 = input.checkboxTalla7
                const checkboxTalla8 = input.checkboxTalla8
                const checkboxTalla9 = input.checkboxTalla9
                const checkboxTalla10 = input.checkboxTalla10
                const useSmallAndBig = input.useSmallAndBig
                const img = input.img as string[]
                const imgBig = input.imgBig as string[]
                const imgSmall = input.imgSmall as string[]
                const tags = []
                if (checkboxArete) {
                    tags.push("arete")
                }
                if (checkboxCollar) {
                    tags.push("collar")
                }
                if (checkboxAnillo) {
                    tags.push("anillo")
                }
                if (checkboxPulsera) {
                    tags.push("pulsera")
                }
                if (checkboxPiercing) {
                    tags.push("piercing")
                }
                if (checkboxTobillera) {
                    tags.push("tobillera")
                }
                if (checkboxOro10K) {
                    tags.push("oro10k")
                }
                if (checkboxAjustable) {
                    tags.push("ajustable")
                }
                if (checkboxTalla5) {
                    tags.push("talla5")
                }
                if (checkboxTalla6) {
                    tags.push("talla6")
                }
                if (checkboxTalla7) {
                    tags.push("talla7")
                }
                if (checkboxTalla8) {
                    tags.push("tall8")
                }
                if (checkboxTalla9) {
                    tags.push("tall9")
                }
                if (checkboxTalla10) {
                    tags.push("talla10")
                }
                const { inventory } = ctx
                const product_oid = new ObjectId(id)
                const filter: Filter<InventoryMongo> = {
                    _id: product_oid,
                }
                if (increment) {
                    filter.available = {
                        $gte: -increment
                    }
                }
                if (incrementBig) {
                    filter.available_big = {
                        $gte: -incrementBig
                    }
                }
                if (incrementSmall) {
                    filter.available_small = {
                        $gte: -incrementSmall
                    }
                }
                const result = await inventory.findOneAndUpdate(
                    filter,
                    {
                        ...(increment ? {
                            $inc: {
                                available: increment,
                                total: increment,
                            }
                        } : {}),
                        ...(incrementBig ? {
                            $inc: {
                                available_big: incrementBig,
                                total_big: incrementBig,
                            }
                        } : {}),
                        ...(incrementSmall ? {
                            $inc: {
                                available_small: incrementSmall,
                                total_small: incrementSmall,
                            }
                        } : {}),
                        $set: {
                            name,
                            price,
                            discount_price: discountPrice,
                            use_discount: useDiscount,
                            tags,
                            code,
                            use_small_and_big: useSmallAndBig,
                            img,
                            img_big: imgBig,
                            img_small: imgSmall,
                        }
                    },
                    {
                        returnDocument: "after",
                    })
                const { value } = result
                if (!value) {
                    throw new Error("Not enough inventory or product not found")
                }
                return
            } catch (e) {
                if (e instanceof Error) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: e.message,
                    });
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An unexpected error occurred, please try again later.',
                });
            }
        })
});

export type AppRouter = typeof appRouter;

export default trpcNext.createNextApiHandler({
    router: appRouter,
    createContext: async ({ req, res }) => {
        const refreshToken = req.cookies.refreshToken
        const accessToken = req.headers.authorization
        const sessionToken = req.headers.sessiontoken as string | undefined
        const tokenData = getTokenData(accessToken, refreshToken)
        if (tokenData?.accessToken) {
            res.setHeader("accessToken", tokenData?.accessToken)
        }
        const sessionData = await getSessionData(sessionToken)
        res.setHeader("sessionToken", sessionData.sessionBase64)
        return ({
            res,
            sessionData: sessionData.session,
            userData: tokenData?.payload,
            users,
            cartsByUser,
            inventory,
            itemsByCart,
            reservedInventory,
            sessions,
            purchases,
        })
    },
});