import { TRPCError, initTRPC } from '@trpc/server';
import { CartsByUserMongo, ContextLocals } from './types';
import { z } from 'zod';
import { Filter, ObjectId } from 'mongodb';
import { ACCESSSECRET, ACCESS_KEY, ACCESS_TOKEN_EXP_NUMBER, BUCKET_NAME, CONEKTA_API_KEY, REFRESHSECRET, REFRESH_TOKEN_EXP_NUMBER, SECRET_KEY, VIRTUAL_HOST, jwt, revalidateProduct, sessionToBase64 } from './utils';
import { InventoryMongo, ItemsByCartMongo, PurchasesMongo, UserMongo } from './types';
import bcrypt from "bcryptjs"
import cookie from "cookie"
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Configuration, CustomersApi, OrdersApi } from 'conekta';
import { isAxiosError } from 'axios';
import { randomUUID } from 'crypto';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sgMail from '@sendgrid/mail';

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
        neighborhood: string;
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
    date: number
}>

export type CartsByUserTRPC = Modify<CartsByUserMongo, {
    _id: string;
    user_id: string | null;
    expire_date: number | null;
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

const t = initTRPC.context<ContextLocals>().create();
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

export const appRouter = router({
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
                        neighborhood: session.neighborhood || "",
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
                    verified_email: false,
                };
            }
        }),
    logIn: publicProcedure
        .input(z.object({ email: z.string().email(), password: z.string().min(8) }))
        .mutation(async ({ ctx, input }): Promise<void> => {
            try {
                const email = input.email
                const password = input.password
                const { users, res, itemsByCart, sessionData } = ctx
                const user = await users.findOne({
                    email,
                })
                if (!user) throw new Error("El usuario no existe.");
                const hash = await bcrypt.compare(password, user.password);
                if (!hash) throw new Error("La contraseña no coincide.");
                await itemsByCart.updateMany(
                    {
                        cart_id: new ObjectId(sessionData.cart_id)
                    },
                    {
                        $set: {
                            cart_id: new ObjectId(user.cart_id)
                        }
                    }
                )
                const session = sessionToBase64({
                    ...sessionData,
                    cart_id: user.cart_id.toHexString(),
                })
                res.setHeader("Session-Token", session)
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
                            email: user.email,
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
                            email: user.email,
                        },
                        refreshTokenExpireTime: refreshTokenExpireTime,
                        exp: accessTokenExpireTime,
                    },
                    ACCESSSECRET
                );
                const refreshTokenExpireDate = new Date(refreshTokenExpireTime * 1000);
                res.setHeader("Access-Token", accessToken)
                res.setHeader("Set-Cookie", cookie.serialize("refreshToken", refreshToken, {
                    httpOnly: true,
                    expires: refreshTokenExpireDate,
                    secure: true,
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
            secure: true,
        }))
        res.setHeader("Access-Token", "")
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
                const { users, res, sessionData } = ctx
                const cart_id = new ObjectId(sessionData.cart_id);
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
                            email,
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
                            email,
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
                    secure: true,
                }))
                const userData: UserMongo = {
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
                    verified_email: false,
                }
                await users.insertOne(userData)
                res.setHeader("Access-Token", accessToken)
                const token = Buffer.from(user_id.toHexString()).toString('base64')
                await sgMail.send({
                    to: email,
                    from: 'asistencia@fourb.mx',
                    subject: 'Confirmación de email',
                    text: 'Haz click en este link para confirmar tu email',
                    html: `<strong>Haz click en este <a target="_blank" href="https://${VIRTUAL_HOST}?token=${token}">link</a> para confirmar tu email</strong>`,
                });
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
                    filter._id = { $lte: new ObjectId(after) };
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
                    filter._id = { $lte: new ObjectId(after) };
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
                    filter._id = { $lte: new ObjectId(after) };
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
                    filter._id = { $lte: new ObjectId(after) };
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
                const { inventory, itemsByCart, reservedInventory, cartsByUser, sessionData, userData, res } = ctx
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
                    }
                )
                if (!product) {
                    throw new Error("Not enough inventory or product not found")
                }
                revalidateProduct(product._id.toHexString())
                const expireDate = new Date()
                expireDate.setDate(expireDate.getDate() + 7)
                const reserved = await reservedInventory.updateOne(
                    {
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
                    }
                )
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
                            name: product.name,
                            product_id: product_oid,
                            cart_id: cart_oid,
                            price: product.price,
                            discount_price: product.discount_price,
                            use_discount: product.use_discount,
                            img: product.img,
                            code: product.code,
                            img_big: product.img_big,
                            img_small: product.img_small,
                            use_small_and_big: product.use_small_and_big,
                        }
                    },
                    {
                        upsert: true
                    }
                )
                if (!(result.modifiedCount || result.upsertedCount)) {
                    throw new Error("Item not added to cart.")
                }
                await cartsByUser.updateOne(
                    {
                        _id: cart_oid,
                    },
                    {
                        $set: {
                            expire_date: expireDate
                        },
                        $setOnInsert: {
                            _id: cart_oid,
                            pay_in_cash: false,
                            user_id: userData?.user.cart_id ? new ObjectId(userData?.user.cart_id) : null,
                            status: 'waiting',
                            email: userData?.user.email ?? sessionData.email,
                            order_id: null,
                            sent: false,
                            delivered: false,
                            delivery: null,
                            address: null,
                            phone: null,
                            name: null,
                            checkout_id: null
                        }
                    },
                    {
                        upsert: true
                    }
                )
                if (userData?.user.cart_id) {
                    const session = sessionToBase64({
                        ...sessionData,
                        cart_id: cart_oid.toHexString(),
                    })
                    res.setHeader("Session-Token", session)
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
                if (!reserved) {
                    throw new Error("Item not reserved.")
                }
                const filter: Filter<InventoryMongo> = {
                    _id: product_oid,
                }
                if (qty) {
                    filter.available = {
                        $gte: qty - reserved.qty,
                    }
                }
                if (qtyBig) {
                    filter.available_big = {
                        $gte: qtyBig - reserved.qty_big,
                    }
                }
                if (qtySmall) {
                    filter.available_small = {
                        $gte: qtySmall - reserved.qty_small,
                    }
                }
                const product = await inventory.findOneAndUpdate(
                    filter,
                    {
                        $inc: {
                            available: reserved.qty - qty,
                            available_big: reserved.qty_big - qtyBig,
                            available_small: reserved.qty_small - qtySmall,
                        },
                    },
                    {
                        returnDocument: "after"
                    })
                if (!product) {
                    throw new Error("Not enough inventory or product not found")
                }
                revalidateProduct(product._id.toHexString())
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
                await cartsByUser.updateOne(
                    {
                        _id: cart_oid,
                    },
                    {
                        $set: {
                            expire_date: expireDate
                        },
                        $setOnInsert: {
                            _id: cart_oid,
                            pay_in_cash: false,
                            user_id: userData?.user.cart_id ? new ObjectId(userData?.user.cart_id) : null,
                            status: 'waiting',
                            email: userData?.user.email ?? sessionData.email,
                            order_id: null,
                            sent: false,
                            delivered: false,
                            delivery: null,
                            address: null,
                            phone: null,
                            name: null,
                            checkout_id: null
                        },
                    },
                    {
                        upsert: true
                    }
                )
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
                if (!result) {
                    throw new Error("Item in cart was not deleted.")
                }
                const reservation = await reservedInventory.findOneAndDelete(
                    {
                        product_id: result.product_id,
                        cart_id: cart_oid,
                    })
                if (!reservation) {
                    throw new Error("Item in reservation was not deleted.")
                }
                const product = await inventory.findOneAndUpdate({
                    _id: result.product_id,
                },
                    {
                        $inc: {
                            available: reservation.qty,
                            available_small: reservation.qty_small,
                            available_big: reservation.qty_big,
                        },
                    })
                if (!product) {
                    throw new Error("Inventory not modified.")
                }
                revalidateProduct(product._id.toHexString())
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
        .input(
            z.union([
                z.object({
                    delivery: z.literal('store'),
                    phone_prefix: z.literal('+52'),
                    phone: z.string().nonempty(),
                    name: z.string().nonempty(),
                    apellidos: z.string().nonempty(),
                    payment_method: z.enum(["cash", "conekta"]),
                    email: z.string(),
                }),
                z.object({
                    name: z.string().nonempty(),
                    apellidos: z.string().nonempty(),
                    street: z.string().nonempty(),
                    email: z.string(),
                    country: z.string().nonempty(),
                    neighborhood: z.string().nonempty(),
                    zip: z.string().nonempty(),
                    city: z.string().nonempty(),
                    state: z.string().nonempty(),
                    phone: z.string().nonempty(),
                    address_id: z.string(),
                    phone_prefix: z.literal('+52'),
                    payment_method: z.enum(["cash", "conekta"]),
                    delivery: z.enum(["city", "national"]),
                }),
            ]))
        .mutation(async ({ ctx, input }): Promise<string | undefined> => {
            try {
                const { itemsByCart, users, userData, sessionData, res, cartsByUser } = ctx
                const cart_oid = new ObjectId(userData?.user.cart_id || sessionData.cart_id)
                if (input.delivery === "store") {
                    const { name, apellidos, phone, phone_prefix, payment_method, email } = input
                    if (payment_method === "cash") {
                        const session = sessionToBase64({
                            ...sessionData,
                            email,
                            phone,
                            phone_prefix,
                            apellidos,
                            name,
                        })
                        res.setHeader("Session-Token", session)
                        await cartsByUser.updateOne(
                            {
                                _id: cart_oid
                            },
                            {
                                $set: {
                                    pay_in_cash: true,
                                    email: userData?.user.email ?? sessionData.email,
                                    delivery: input.delivery,
                                    phone: `${phone_prefix}${phone}`,
                                    name: `${name} ${apellidos}`,
                                }
                            }
                        )
                        await sgMail.send({
                            to: email,
                            from: 'asistencia@fourb.mx',
                            subject: 'Por favor contáctanos y envíanos el código adjunto',
                            text: `Envíanos un mensaje a nuestro Instagram o Facebook con este código en mano: ${cart_oid.toHexString()}`,
                            html: `<strong>Envíanos un mensaje a nuestro <a href='https://www.instagram.com/fourb_mx/' target='_blank'>Instagram</a> o <a href='https://www.facebook.com/fourbmx/' target='_blank'>Facebook</a> con este código en mano: ${cart_oid.toHexString()}</strong>`,
                        });
                        return ''
                    } else {
                        if (userData) {
                            const user_oid = new ObjectId(userData.user._id)
                            const result = await users.findOne({
                                _id: user_oid
                            })
                            if (!result) {
                                throw new Error("No user found.")
                            }
                            const products = await itemsByCart.find({ cart_id: cart_oid }).toArray()
                            const order = await orderClient.createOrder({
                                currency: "MXN",
                                customer_info: {
                                    customer_id: result.conekta_id,
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
                            await cartsByUser.updateOne(
                                {
                                    _id: cart_oid
                                },
                                {
                                    $set: {
                                        email: userData.user.email,
                                        order_id: order.data.id,
                                        delivery: input.delivery,
                                        phone: `${phone_prefix}${phone}`,
                                        name: `${name} ${apellidos}`,
                                        checkout_id: order?.data?.checkout?.id
                                    }
                                }
                            )
                            return order?.data?.checkout?.id
                        } else {
                            if (!email) {
                                throw new Error("Email is required and must be a string")
                            }
                            const conekta_id = sessionData.conekta_id ?? (await customerClient.createCustomer({ phone, name: `${name} ${apellidos}`, email })).data.id
                            const session = sessionToBase64({
                                ...sessionData,
                                conekta_id,
                                phone,
                                name,
                                apellidos,
                                email,
                                phone_prefix
                            })
                            res.setHeader("Session-Token", session)
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
                            await cartsByUser.updateOne(
                                {
                                    _id: cart_oid
                                },
                                {
                                    $set: {
                                        email,
                                        order_id: order.data.id,
                                        delivery: input.delivery,
                                        phone: `${phone_prefix}${phone}`,
                                        name: `${name} ${apellidos}`,
                                        checkout_id: order?.data?.checkout?.id
                                    }
                                }
                            )
                            return order?.data?.checkout?.id
                        }
                    }
                } else {
                    const { name, apellidos, street, email, country, neighborhood, zip, city, state, phone, address_id, phone_prefix, payment_method } = input
                    if (payment_method === "cash") {
                        await cartsByUser.updateOne(
                            {
                                _id: cart_oid
                            },
                            {
                                $set: {
                                    pay_in_cash: true,
                                    email: userData?.user.email ?? sessionData.email,
                                    delivery: input.delivery,
                                    address: `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country}`,
                                    phone: `${phone_prefix}${phone}`,
                                    name: `${name} ${apellidos}`,
                                }
                            }
                        )
                        return ''
                    } else {
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
                                        "addresses.$.full_address": `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country} (${name} ${apellidos})`,
                                        "addresses.$.country": country,
                                        "addresses.$.street": street,
                                        "addresses.$.neighborhood": neighborhood,
                                        "addresses.$.zip": zip,
                                        "addresses.$.city": city,
                                        "addresses.$.state": state,
                                        "addresses.$.phone": phone,
                                        "addresses.$.name": name,
                                        "addresses.$.apellidos": apellidos,
                                        "addresses.$.phone_prefix": phone_prefix,
                                    },
                                },
                                {
                                    returnDocument: "after"
                                })
                            if (!result) {
                                throw new Error("No user updated")
                            }
                            const products = await itemsByCart.find({ cart_id: cart_oid }).toArray()
                            const order = await orderClient.createOrder({
                                currency: "MXN",
                                customer_info: {
                                    customer_id: result.conekta_id,
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
                            await cartsByUser.updateOne(
                                {
                                    _id: cart_oid
                                },
                                {
                                    $set: {
                                        email: userData.user.email,
                                        order_id: order.data.id,
                                        delivery: input.delivery,
                                        address: `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country}`,
                                        phone: `${phone_prefix}${phone}`,
                                        name: `${name} ${apellidos}`,
                                        checkout_id: order?.data?.checkout?.id ?? null
                                    }
                                }
                            )
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
                                            full_address: `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country} (${name} ${apellidos})`,
                                            country,
                                            street,
                                            neighborhood,
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
                            if (!result) {
                                throw new Error("No user updated")
                            }
                            const products = await itemsByCart.find({ cart_id: cart_oid }).toArray()
                            const order = await orderClient.createOrder({
                                currency: "MXN",
                                customer_info: {
                                    customer_id: result.conekta_id,
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
                            await cartsByUser.updateOne(
                                {
                                    _id: cart_oid
                                },
                                {
                                    $set: {
                                        email: userData.user.email,
                                        order_id: order.data.id,
                                        delivery: input.delivery,
                                        address: `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country}`,
                                        phone: `${phone_prefix}${phone}`,
                                        name: `${name} ${apellidos}`,
                                        checkout_id: order?.data?.checkout?.id ?? null,
                                    }
                                }
                            )
                            return order?.data?.checkout?.id
                        } else {
                            if (!email) {
                                throw new Error("Email is required and must be a string")
                            }
                            const conekta_id = sessionData.conekta_id ?? (await customerClient.createCustomer({ phone, name: `${name} ${apellidos}`, email })).data.id
                            const session = sessionToBase64({
                                ...sessionData,
                                email,
                                country,
                                street,
                                neighborhood,
                                zip,
                                city,
                                state,
                                phone,
                                name,
                                apellidos,
                                phone_prefix,
                                conekta_id,
                            })
                            res.setHeader("Session-Token", session)
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
                            await cartsByUser.updateOne(
                                {
                                    _id: cart_oid
                                },
                                {
                                    $set: {
                                        email,
                                        order_id: order.data.id,
                                        delivery: input.delivery,
                                        address: `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country}`,
                                        phone: `${phone_prefix}${phone}`,
                                        name: `${name} ${apellidos}`,
                                        checkout_id: order?.data?.checkout?.id ?? null,
                                    }
                                }
                            )
                            return order?.data?.checkout?.id
                        }
                    }
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
        .input(z.object({
            type: z.enum(['card', 'cash', 'bank_transfer']),
        }))
        .mutation(async ({ ctx, input }): Promise<void> => {
            try {
                const { type } = input
                const { users, cartsByUser, purchases, itemsByCart, sessionData, userData, res } = ctx
                const new_cart_id = new ObjectId()
                const previous_cart_id = new ObjectId(userData?.user.cart_id || sessionData.cart_id)
                const session = sessionToBase64({
                    ...sessionData,
                    cart_id: new_cart_id.toHexString(),
                })
                res.setHeader("Session-Token", session)
                if (userData) {
                    const user_oid = new ObjectId(userData.user._id)
                    await users.updateOne(
                        {
                            _id: user_oid
                        },
                        {
                            $set: {
                                cart_id: new_cart_id
                            }
                        }
                    )
                    if (type === "card") {
                        await cartsByUser.updateOne(
                            {
                                _id: previous_cart_id
                            },
                            {
                                $set: {
                                    status: 'paid',
                                }
                            }
                        )
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
                            date: new Date(),
                            img: product.img,
                            code: product.code,
                            use_small_and_big: product.use_small_and_big,
                            img_big: product.img_big,
                            img_small: product.img_small,
                        }))
                        await purchases.insertMany(purchasedProducts)
                    }
                    const newAccessToken = jwt.sign(
                        {
                            user: {
                                _id: userData.user._id,
                                cart_id: new_cart_id.toHexString(),
                                is_admin: userData.user.is_admin,
                                email: userData.user.email,
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
                                email: userData.user.email,
                            },
                            refreshTokenExpireTime: userData.refreshTokenExpireTime,
                            exp: userData.refreshTokenExpireTime,
                        },
                        REFRESHSECRET
                    );
                    const refreshTokenExpireDate = new Date(userData.refreshTokenExpireTime * 1000);
                    res.setHeader("Set-Cookie", cookie.serialize("refreshToken", refreshToken, {
                        httpOnly: true,
                        expires: refreshTokenExpireDate,
                        secure: true,
                    }))
                    res.setHeader("Access-Token", newAccessToken)
                    return
                } else {
                    if (type === "card") {
                        await cartsByUser.updateOne(
                            {
                                _id: previous_cart_id
                            },
                            {
                                $set: {
                                    status: 'paid',
                                }
                            }
                        )
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
                            date: new Date(),
                            img: product.img,
                            code: product.code,
                            use_small_and_big: product.use_small_and_big,
                            img_big: product.img_big,
                            img_small: product.img_small,
                        }))
                        await purchases.insertMany(purchasedProducts)
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
        .input(z.object({
            limit: z.number().min(1).max(100).nullish(),
            cursor: z.string().nullish(),
        }))
        .query(async ({ ctx, input }): Promise<{ items: PurchasesTRPC[], nextCursor: string | undefined }> => {
            try {
                const limit = input.limit || 8
                const after = input.cursor || ""
                const limitParsed = limit + 1
                let nextCursor: string | undefined = undefined;
                const { userData, purchases } = ctx
                if (!userData?.user._id) {
                    throw new Error("Inicia sesión primero")
                }
                const user_oid = new ObjectId(userData?.user._id)
                const filter: Filter<PurchasesMongo> = {
                    user_id: user_oid
                }
                if (after) {
                    filter._id = { $lte: new ObjectId(after) };
                }
                const history = await purchases.find(filter).limit(limitParsed).sort({ $natural: -1 }).toArray()
                if (history.length > limit) {
                    const nextItem = history.pop();
                    nextCursor = nextItem!._id.toHexString();
                }
                return {
                    items: history.map(history => ({
                        ...history,
                        _id: history._id.toHexString(),
                        product_id: history.product_id.toHexString(),
                        user_id: history.user_id?.toHexString() || null,
                        date: history.date.getTime(),
                    })),
                    nextCursor
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
                const product = await inventory.insertOne({
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
                revalidateProduct(product.insertedId.toHexString())
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
                    }
                )
                if (!result) {
                    throw new Error("Not enough inventory or product not found")
                }
                revalidateProduct(result._id.toHexString())
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
    webhook: publicProcedure
        .mutation(async ({ ctx }): Promise<void> => {
            const { cartsByUser, purchases, itemsByCart } = ctx
            const body = ctx.req.body
            const isOrder = body?.data?.object?.object === "order"
            const isPaid = body?.data?.object?.payment_status === "paid"
            const orderId = body?.data?.object?.id
            const amount = body?.data?.object?.amount
            const paidAt = body?.data?.object?.updated_at
            if (isOrder && isPaid && orderId) {
                const amountParsed = (amount / 100).toFixed(2)
                const date = new Date(paidAt * 1000)
                const formatDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
                const cart = await cartsByUser.findOneAndUpdate(
                    {
                        order_id: orderId
                    },
                    {
                        $set: {
                            status: 'paid',
                        }
                    },
                )
                if (cart) {
                    if (cart.user_id) {
                        const productsInCart = await itemsByCart.find({ cart_id: cart._id }).toArray()
                        const purchasedProducts: PurchasesMongo[] = productsInCart.map(product => ({
                            name: product.name,
                            product_id: product.product_id,
                            qty: product.qty,
                            qty_big: product.qty_big,
                            qty_small: product.qty_small,
                            price: product.price,
                            discount_price: product.discount_price,
                            use_discount: product.use_discount,
                            user_id: cart.user_id,
                            date: new Date(),
                            img: product.img,
                            code: product.code,
                            use_small_and_big: product.use_small_and_big,
                            img_big: product.img_big,
                            img_small: product.img_small,
                        }))
                        await purchases.insertMany(purchasedProducts)
                    }
                    if (cart.email) {
                        await sgMail.send({
                            to: cart.email,
                            from: 'asistencia@fourb.mx',
                            subject: 'Pago confirmado',
                            text: 'Tu pago ha sido procesado exitosamente',
                            html: `<strong>Tu pago por $${amountParsed} MXN ha sido procesado exitosamente (${formatDate})</strong>`,
                        });
                    }
                }
            }
            return
        }),
    verifyEmail: publicProcedure
        .input(z.object({
            token: z.string().nonempty(),
        }))
        .mutation(async ({ ctx, input }): Promise<void> => {
            try {
                const { users } = ctx
                const user_id = Buffer.from(input.token, 'base64').toString('utf-8')
                await users.updateOne(
                    {
                        _id: new ObjectId(user_id),
                    },
                    {
                        $set: {
                            verified_email: true,
                        }
                    }
                )
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
    carts: publicProcedure
        .input(z.object({
            limit: z.number().min(1).max(100).nullish(),
            cursor: z.string().nullish(),
            delivery: z.enum(["city", "national", "store"]).nullish(),
            sent: z.boolean().nullish(),
            delivered: z.boolean().nullish(),
            pay_in_cash: z.boolean().nullish(),
            status: z.enum(['paid', 'waiting']).nullish(),
            search: z.string().nullish(),
        }))
        .query(async ({ ctx, input }): Promise<{ items: CartsByUserTRPC[], nextCursor: string | undefined }> => {
            try {
                const { cartsByUser } = ctx
                const limit = input.limit || 20
                const after = input.cursor || ""
                const limitParsed = limit + 1
                const payInCash = input.pay_in_cash
                const status = input.status
                const delivery = input.delivery
                const sent = input.sent
                const delivered = input.delivered
                const search = input.search
                let nextCursor: string | undefined = undefined;
                const filter: Filter<CartsByUserMongo> = {}
                if (search) {
                    filter._id = new ObjectId(search)
                }
                if (typeof payInCash === "boolean") {
                    filter.pay_in_cash = payInCash
                }
                if (typeof sent === "boolean") {
                    filter.sent = sent
                }
                if (typeof delivered === "boolean") {
                    filter.delivered = delivered
                }
                if (delivery) {
                    filter.delivery = delivery
                }
                if (status) {
                    filter.status = status
                }
                if (after) {
                    filter._id = { $lte: new ObjectId(after) };
                }
                const carts = await cartsByUser.find(filter).limit(limitParsed).sort({ $natural: -1 }).toArray()
                if (carts.length > limit) {
                    const nextItem = carts.pop();
                    nextCursor = nextItem!._id.toHexString();
                }
                return {
                    items: carts.map(cart => ({
                        ...cart,
                        _id: cart._id.toHexString(),
                        user_id: cart.user_id?.toHexString() ?? null,
                        expire_date: cart.expire_date?.getTime() ?? null,
                    })),
                    nextCursor,
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
    updateCart: publicProcedure
        .input(z.object({
            cart_id: z.string().nonempty(),
            status: z.enum(['paid', 'waiting']).nullish(),
            delivered: z.boolean().nullish(),
            sent: z.boolean().nullish(),
        }))
        .mutation(async ({ ctx, input }): Promise<void> => {
            try {
                const { cartsByUser } = ctx
                const { cart_id, status, delivered, sent } = input
                await cartsByUser.updateOne(
                    {
                        _id: new ObjectId(cart_id)
                    },
                    {
                        $set: {
                            ...(typeof status === "string" ? { status } : {}),
                            ...(typeof delivered === "boolean" ? { delivered } : {}),
                            ...(typeof sent === "boolean" ? { sent } : {}),
                        }
                    }
                )
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
    getItemsByCart: publicProcedure
        .input(z.object({
            cart_id: z.string().nonempty(),
        }))
        .query(async ({ ctx, input }): Promise<ItemsByCartTRPC[]> => {
            try {
                const { itemsByCart } = ctx
                const { cart_id } = input
                const cart_oid = new ObjectId(cart_id)
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
    getUserCartData: publicProcedure
        .query(async ({ ctx }): Promise<CartsByUserTRPC | null> => {
            try {
                const { userData, sessionData, cartsByUser } = ctx
                const cart_oid = new ObjectId(userData?.user.cart_id || sessionData.cart_id)
                const cart = await cartsByUser.findOne({ _id: cart_oid })
                return cart ? ({
                    ...cart,
                    _id: cart._id.toHexString(),
                    user_id: cart.user_id?.toHexString() ?? null,
                    expire_date: cart.expire_date?.getTime() ?? null,
                }) : null
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