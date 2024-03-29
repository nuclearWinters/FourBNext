import { TRPCError, initTRPC } from '@trpc/server';
import { CartsByUserMongo, ContextLocals, InventoryVariantsMongo, VariantMongo } from './types';
import { z } from 'zod';
import { Filter, ObjectId } from 'mongodb';
import { ACCESSSECRET, ACCESS_KEY, ACCESS_TOKEN_EXP_NUMBER, BUCKET_NAME, CONEKTA_API_KEY, REFRESHSECRET, REFRESH_TOKEN_EXP_NUMBER, SECRET_KEY, SENDGRID_API_KEY, VIRTUAL_HOST, jwt, revalidateHome, revalidateProduct, sessionToBase64 } from './utils';
import { InventoryMongo, ItemsByCartMongo, PurchasesMongo, UserMongo } from './types';
import bcrypt from "bcryptjs"
import cookie from "cookie"
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Configuration, CustomersApi, OrdersApi } from 'conekta';
import { isAxiosError } from 'axios';
import { randomUUID } from 'crypto';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(SENDGRID_API_KEY)

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

export type VariantTRPC = Modify<VariantMongo, {
    inventory_variant_oid: string
}>

export type InventoryTRPC = Modify<InventoryMongo, {
    _id: string
    variants: VariantTRPC[]
}>

export type ItemsByCartTRPC = Modify<ItemsByCartMongo, {
    _id: string
    product_variant_id: string,
    cart_id: string,
    product_id: string
}>

export type PurchasesTRPC = Modify<PurchasesMongo, {
    _id: string
    product_variant_id: string
    user_id: string | null
    date: number
    product_id: string
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
                    email: session.em || "",
                    password: undefined,
                    cart_id: session.ci,
                    name: session.nm || "",
                    apellidos: session.ap || "",
                    phone: session.ph || "",
                    conekta_id: session.ck || "",
                    default_address: "",
                    addresses: [{
                        _id: "",
                        full_address: "",
                        country: session.co || "",
                        street: session.st || "",
                        neighborhood: session.nh || "",
                        zip: session.zp || "",
                        city: session.cy || "",
                        state: session.se || "",
                        phone: session.ph || "",
                        phone_prefix: session.pp || "",
                        name: session.nm || "",
                        apellidos: session.ap || "",
                    }],
                    phone_prefix: session.pp || "",
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
                const { users, res, itemsByCart, sessionData, cartsByUser } = ctx
                const user = await users.findOne({
                    email,
                })
                if (!user) throw new Error("El usuario no existe.");
                const hash = await bcrypt.compare(password, user.password);
                if (!hash) throw new Error("La contraseña no coincide.");
                //mover items en el carrito anonimo al carrito del usuario
                await itemsByCart.updateMany(
                    {
                        cart_id: new ObjectId(sessionData.ci)
                    },
                    {
                        $set: {
                            cart_id: new ObjectId(user.cart_id)
                        }
                    }
                )
                const expireDate = new Date()
                expireDate.setDate(expireDate.getDate() + 7)
                //crear carrito si no existe
                await cartsByUser.updateOne(
                    {
                        _id: user.cart_id,
                    },
                    {
                        $set: {
                            expire_date: expireDate
                        },
                        $setOnInsert: {
                            _id: user.cart_id,
                            pay_in_cash: false,
                            user_id: user._id,
                            status: 'waiting',
                            email: user.email,
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
                const cart_id = new ObjectId(sessionData.ci);
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
                const newProducts = products.map(product => {
                    return {
                        ...product,
                        _id: product._id.toHexString(),
                        variants: product.variants.map(variant => ({
                            ...variant,
                            inventory_variant_oid: variant.inventory_variant_oid.toHexString()
                        }))
                    }
                })
                return {
                    items: newProducts,
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
                const newProducts = products.map(product => {
                    return {
                        ...product,
                        _id: product._id.toHexString(),
                        variants: product.variants.map(variant => ({
                            ...variant,
                            inventory_variant_oid: variant.inventory_variant_oid.toHexString()
                        }))
                    }
                })
                return {
                    items: newProducts,
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
                const newProducts = products.map(product => {
                    return {
                        ...product,
                        _id: product._id.toHexString(),
                        variants: product.variants.map(variant => ({
                            ...variant,
                            inventory_variant_oid: variant.inventory_variant_oid.toHexString()
                        }))
                    }
                })
                return {
                    items: newProducts,
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
                const newProducts = products.map(product => {
                    return {
                        ...product,
                        _id: product._id.toHexString(),
                        variants: product.variants.map(variant => ({
                            ...variant,
                            inventory_variant_oid: variant.inventory_variant_oid.toHexString()
                        }))
                    }
                })
                return {
                    items: newProducts,
                    nextCursor,
                };
            }
        }),
    addOneToCart: publicProcedure
        .input(z.object({
            product_variant_id: z.string(),
            qty: z.number(),
        }))
        .mutation(async ({ ctx, input }): Promise<void> => {
            try {
                const { inventory, variantInventory, itemsByCart, cartsByUser, sessionData, userData } = ctx
                const product_variant_id = input.product_variant_id
                const qty = input.qty
                const cart_oid = new ObjectId(userData?.user.cart_id || sessionData.ci)
                /* ---- Restar del inventario ---- */
                const product_variant_oid = new ObjectId(product_variant_id)
                if (qty === 0) {
                    throw new Error('Quantity must not be zero or less.')
                }
                const filter: Filter<InventoryVariantsMongo> = {
                    _id: product_variant_oid,
                    available: {
                        $gte: qty
                    }
                }
                const variantProduct = await variantInventory.findOneAndUpdate(
                    filter,
                    {
                        $inc: {
                            available: -qty,
                        }
                    },
                    {
                        returnDocument: "after"
                    }
                )
                /* ---- Restar del inventario ---- */
                if (!variantProduct) {
                    throw new Error("Not enough inventory or product not found.")
                }
                /* ---- Actualizar inventario duplicado ---- */
                const product = await inventory.findOneAndUpdate(
                    {
                        _id: variantProduct.inventory_id
                    },
                    {
                        $set: {
                            [`variants.$[variant].available`]: variantProduct.available,
                            [`variants.$[variant].total`]: variantProduct.total,
                        },
                    },
                    {
                        returnDocument: 'after',
                        arrayFilters: [
                            {
                                "variant.inventory_variant_oid": product_variant_oid,
                            }
                        ]
                    }
                )
                /* ---- Actualizar inventario duplicado ---- */
                if (!product) {
                    throw new Error("Product not found.")
                }
                revalidateProduct(product._id.toHexString())
                const expireDate = new Date()
                expireDate.setDate(expireDate.getDate() + 7)
                const variant = Object.values(product.variants).find(variant => variant.inventory_variant_oid.toHexString() === product_variant_id)
                if (!variant) {
                    throw new Error('Variant not found.')
                }
                /* ---- Actualizar/crear items en el carrito ---- */
                const result = await itemsByCart.updateOne(
                    {
                        product_variant_id: product_variant_oid,
                        cart_id: cart_oid,
                    },
                    {
                        $inc: {
                            qty,
                        },
                        $setOnInsert: {
                            name: product.name,
                            product_variant_id: variant.inventory_variant_oid,
                            cart_id: cart_oid,
                            price: variant.price,
                            discount_price: variant.discount_price,
                            use_discount: variant.use_discount,
                            imgs: variant.imgs,
                            sku: variant.sku,
                            combination: variant.combination,
                            product_id: product._id,
                        }
                    },
                    {
                        upsert: true
                    }
                )
                /* ---- Actualizar/crear items en el carrito ---- */
                if (!(result.modifiedCount || result.upsertedCount)) {
                    throw new Error("Item not added to cart.")
                }
                /* ---- Actualizar/crear carrito ---- */
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
                            user_id: userData?.user._id ? new ObjectId(userData?.user._id) : null,
                            status: 'waiting',
                            email: userData?.user.email ?? sessionData.em,
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
                /* ---- Actualizar/crear carrito ---- */
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
                const cart_oid = new ObjectId(userData?.user.cart_id || sessionData.ci)
                const itemsInCart = await itemsByCart.find({ cart_id: cart_oid }).toArray()
                return itemsInCart.map(item => ({
                    ...item,
                    _id: item._id.toHexString(),
                    product_variant_id: item.product_variant_id.toHexString(),
                    cart_id: item.cart_id.toHexString(),
                    product_id: item.product_id.toHexString()
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
            product_variant_id: z.string(),
            qty: z.number(),
        }))
        .mutation(async ({ ctx, input }): Promise<void> => {
            try {
                const { inventory, variantInventory, itemsByCart, cartsByUser, userData, sessionData } = ctx
                const item_by_cart_id = input.item_by_cart_id
                const product_variant_id = input.product_variant_id
                const qty = input.qty || 0
                const cart_oid = new ObjectId(userData?.user.cart_id || sessionData.ci)
                const product_variant_oid = new ObjectId(product_variant_id)
                const item_by_cart_oid = new ObjectId(item_by_cart_id)
                if (qty <= 0) {
                    throw new Error('Quantity must not be zero or less.')
                }
                /* ---- Eliminar item en el carrito ---- */
                const deletedCart = await itemsByCart.findOneAndDelete(
                    {
                        _id: item_by_cart_oid,
                    },
                )
                /* ---- Eliminar item en el carrito ---- */
                if (!deletedCart) {
                    throw new Error("Item in cart not modified.")
                }
                /* ---- Actualizar inventario ---- */
                const filter: Filter<InventoryVariantsMongo> = {
                    _id: product_variant_oid,
                    available: {
                        $gte: qty - deletedCart.qty,
                    }
                }
                const variantProduct = await variantInventory.findOneAndUpdate(
                    filter,
                    {
                        $inc: {
                            available: deletedCart.qty - qty,
                        },
                    },
                    {
                        returnDocument: "after"
                    }
                )
                /* ---- Actualizar inventario ---- */
                if (!variantProduct) {
                    await itemsByCart.insertOne(deletedCart)
                    throw new Error("Not enough inventory or product not found.")
                }
                /* ---- Actualizar inventario duplicado ---- */
                const product = await inventory.findOneAndUpdate(
                    {
                        _id: variantProduct.inventory_id
                    },
                    {
                        $set: {
                            [`variants.$[variant].available`]: variantProduct.available,
                            [`variants.$[variant].total`]: variantProduct.total,
                        },
                    },
                    {
                        returnDocument: 'after',
                        arrayFilters: [
                            {
                                "variant.inventory_variant_oid": product_variant_oid,
                            }
                        ]
                    }
                )
                /* ---- Actualizar inventario duplicado ---- */
                if (!product) {
                    throw new Error("Product not found.")
                }
                revalidateProduct(product._id.toHexString())
                /* ---- Crear item en el carrito ---- */
                await itemsByCart.insertOne(
                    {
                        ...deletedCart,
                        qty,
                    },
                )
                /* ---- Crear item en el carrito ---- */
                const expireDate = new Date()
                expireDate.setDate(expireDate.getDate() + 7)
                /* ---- Actualizar carrito ---- */
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
                            user_id: userData?.user._id ? new ObjectId(userData?.user._id) : null,
                            status: 'waiting',
                            email: userData?.user.email ?? sessionData.em,
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
                /* ---- Actualizar carrito ---- */
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
                const { inventory, itemsByCart, variantInventory } = ctx
                const item_by_cart_id = input.item_by_cart_id
                if (item_by_cart_id && typeof item_by_cart_id !== "string") {
                    throw new Error("Product ID is required and must be a string")
                }
                if (item_by_cart_id.length !== 24) {
                    throw new Error("Product ID must contain 24 characters")
                }
                /* ---- Eliminar item en el carrito ---- */
                const item_by_cart_oid = new ObjectId(item_by_cart_id)
                const result = await itemsByCart.findOneAndDelete(
                    {
                        _id: item_by_cart_oid,
                    },
                )
                /* ---- Eliminar item en el carrito ---- */
                if (!result) {
                    throw new Error("Item in cart was not deleted.")
                }
                /* ---- Actualizar inventario ---- */
                const variantProduct = await variantInventory.findOneAndUpdate(
                    {
                        _id: result.product_variant_id,
                    },
                    {
                        $inc: {
                            available: result.qty,
                        },
                    },
                    {
                        returnDocument: 'after'
                    }
                )
                /* ---- Actualizar inventario ---- */
                if (!variantProduct) {
                    throw new Error("Inventory not modified.")
                }
                /* ---- Actualizar inventario duplicado ---- */
                const product = await inventory.findOneAndUpdate(
                    {
                        _id: variantProduct.inventory_id
                    },
                    {
                        $set: {
                            [`variants.$[variant].available`]: variantProduct.available,
                            [`variants.$[variant].total`]: variantProduct.total,
                        },
                    },
                    {
                        returnDocument: 'after',
                        arrayFilters: [
                            {
                                "variant.inventory_variant_oid": variantProduct._id,
                            }
                        ]
                    }
                )
                /* ---- Actualizar inventario duplicado ---- */
                if (!product) {
                    throw new Error("Product not found.")
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
                    phone: z.string().min(1),
                    name: z.string().min(1),
                    apellidos: z.string().min(1),
                    payment_method: z.enum(["cash", "conekta"]),
                    email: z.string().email(),
                }),
                z.object({
                    name: z.string().min(1),
                    apellidos: z.string().min(1),
                    street: z.string().min(1),
                    email: z.string().email(),
                    country: z.string().min(1),
                    neighborhood: z.string().min(1),
                    zip: z.string().min(1),
                    city: z.string().min(1),
                    state: z.string().min(1),
                    phone: z.string().min(1),
                    address_id: z.string(),
                    phone_prefix: z.literal('+52'),
                    payment_method: z.enum(["cash", "conekta"]),
                    delivery: z.enum(["city", "national"]),
                }),
            ]))
        .mutation(async ({ ctx, input }): Promise<{
            cart_id?: string,
            checkout_id?: string
        }> => {
            try {
                const { itemsByCart, users, userData, sessionData, res, cartsByUser } = ctx
                const cart_oid = new ObjectId(userData?.user.cart_id || sessionData.ci)
                if (input.delivery === "store") {
                    const { name, apellidos, phone, phone_prefix, payment_method, email } = input
                    if (payment_method === "cash") {
                        if (!email) {
                            throw new Error("Email is required and must be a string")
                        }
                        await cartsByUser.updateOne(
                            {
                                _id: cart_oid
                            },
                            {
                                $set: {
                                    pay_in_cash: true,
                                    email,
                                    delivery: input.delivery,
                                    phone: `${phone_prefix}${phone}`,
                                    name: `${name} ${apellidos}`,
                                    user_id: userData?.user._id ? new ObjectId(userData.user._id) : null,
                                    order_id: null,
                                    checkout_id: null,
                                    status: "waiting"
                                }
                            }
                        )
                        const new_cart_id = new ObjectId()
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
                                },
                            )
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
                        }
                        const session = sessionToBase64({
                            ...sessionData,
                            em: email,
                            ph: phone,
                            pp: phone_prefix,
                            ap: apellidos,
                            nm: name,
                            ...(userData ? {} : { ci: new_cart_id.toHexString() }),
                        })
                        res.setHeader("Session-Token", session)
                        await sgMail.send({
                            to: email,
                            from: 'asistencia@fourb.mx',
                            subject: 'Por favor contáctanos y envíanos el código adjunto',
                            text: `Envíanos un mensaje a nuestro Instagram o Facebook con este código en mano: ${cart_oid.toHexString()}`,
                            html: `<strong>Envíanos un mensaje a nuestro <a href='https://www.instagram.com/fourb_mx/' target='_blank'>Instagram</a> o <a href='https://www.facebook.com/fourbmx/' target='_blank'>Facebook</a> con este código en mano: ${cart_oid.toHexString()}</strong>`,
                        });
                        return {
                            cart_id: new_cart_id.toHexString()
                        }
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
                                    quantity: product.qty,
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
                            return {
                                checkout_id: order?.data?.checkout?.id
                            }
                        } else {
                            if (!email) {
                                throw new Error("Email is required and must be a string")
                            }
                            const conekta_id = sessionData.ci ?? (await customerClient.createCustomer({ phone, name: `${name} ${apellidos}`, email })).data.id
                            const session = sessionToBase64({
                                ...sessionData,
                                ci: conekta_id,
                                ph: phone,
                                nm: name,
                                ap: apellidos,
                                em: email,
                                pp: phone_prefix
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
                                    quantity: product.qty,
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
                            return {
                                checkout_id: order?.data?.checkout?.id
                            }
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
                                    email,
                                    delivery: input.delivery,
                                    address: `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country}`,
                                    phone: `${phone_prefix}${phone}`,
                                    name: `${name} ${apellidos}`,
                                    order_id: null,
                                    checkout_id: null,
                                    status: "waiting",
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
                        const new_cart_id = new ObjectId()
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
                                },
                            )
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
                        }
                        const session = sessionToBase64({
                            ...sessionData,
                            em: email,
                            co: country,
                            st: street,
                            nh: neighborhood,
                            zp: zip,
                            cy: city,
                            se: state,
                            ph: phone,
                            nm: name,
                            ap: apellidos,
                            pp: phone_prefix,
                            ...(userData ? {} : { ct: new_cart_id.toHexString() }),
                        })
                        res.setHeader("Session-Token", session)
                        return {
                            cart_id: new_cart_id.toHexString()
                        }
                    } else {
                        if (address_id && userData) {
                            const address_oid = new ObjectId(address_id)
                            const user_oid = new ObjectId(userData.user._id)
                            const result = await users.findOneAndUpdate(
                                {
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
                            const line_items = products.map(product => ({
                                name: product.name,
                                unit_price: product.use_discount ? product.discount_price : product.price,
                                quantity: product.qty,
                            }))
                            if (input.delivery === "city") {
                                line_items.push({
                                    name: 'Envío',
                                    unit_price: 3500,
                                    quantity: 1,
                                })
                            }
                            if (input.delivery === "national") {
                                line_items.push({
                                    name: 'Envío',
                                    unit_price: 11900,
                                    quantity: 1,
                                })
                            }
                            const order = await orderClient.createOrder({
                                currency: "MXN",
                                customer_info: {
                                    customer_id: result.conekta_id,
                                },
                                line_items,
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
                            return {
                                checkout_id: order?.data?.checkout?.id
                            }
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
                            const line_items = products.map(product => ({
                                name: product.name,
                                unit_price: product.use_discount ? product.discount_price : product.price,
                                quantity: product.qty,
                            }))
                            if (input.delivery === "city") {
                                line_items.push({
                                    name: 'Envío',
                                    unit_price: 3500,
                                    quantity: 1,
                                })
                            }
                            if (input.delivery === "national") {
                                line_items.push({
                                    name: 'Envío',
                                    unit_price: 11900,
                                    quantity: 1,
                                })
                            }
                            const order = await orderClient.createOrder({
                                currency: "MXN",
                                customer_info: {
                                    customer_id: result.conekta_id,
                                },
                                line_items,
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
                            return {
                                checkout_id: order?.data?.checkout?.id
                            }
                        } else {
                            if (!email) {
                                throw new Error("Email is required and must be a string")
                            }
                            const conekta_id = sessionData.ck ?? (await customerClient.createCustomer({ phone, name: `${name} ${apellidos}`, email })).data.id
                            const session = sessionToBase64({
                                ...sessionData,
                                em: email,
                                co: country,
                                st: street,
                                nh: neighborhood,
                                zp: zip,
                                cy: city,
                                se: state,
                                ph: phone,
                                nm: name,
                                ap: apellidos,
                                pp: phone_prefix,
                                ck: conekta_id,
                            })
                            res.setHeader("Session-Token", session)
                            const products = await itemsByCart.find({ cart_id: cart_oid }).toArray()
                            const line_items = products.map(product => ({
                                name: product.name,
                                unit_price: product.use_discount ? product.discount_price : product.price,
                                quantity: product.qty,
                            }))
                            if (input.delivery === "city") {
                                line_items.push({
                                    name: 'Envío',
                                    unit_price: 3500,
                                    quantity: 1,
                                })
                            }
                            if (input.delivery === "national") {
                                line_items.push({
                                    name: 'Envío',
                                    unit_price: 11900,
                                    quantity: 1,
                                })
                            }
                            const order = await orderClient.createOrder({
                                currency: "MXN",
                                customer_info: {
                                    customer_id: conekta_id,
                                },
                                line_items,
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
                            return {
                                checkout_id: order?.data?.checkout?.id
                            }
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
            type: z.enum(['card', 'cash', 'bankTransfer']),
        }))
        .mutation(async ({ ctx, input }): Promise<string> => {
            try {
                const { type } = input
                const { users, cartsByUser, purchases, itemsByCart, sessionData, userData, res } = ctx
                const new_cart_id = new ObjectId()
                const previous_cart_id = new ObjectId(userData?.user.cart_id || sessionData.ci)
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
                            product_variant_id: product.product_variant_id,
                            qty: product.qty,
                            price: product.price,
                            discount_price: product.discount_price,
                            use_discount: product.use_discount,
                            user_id: user_oid,
                            date: new Date(),
                            imgs: product.imgs,
                            sku: product.sku,
                            product_id: product.product_id,
                            combination: product.combination,
                            cart_id: product.cart_id,
                            cart_item: product,
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
                    return new_cart_id.toHexString()
                } else {
                    const session = sessionToBase64({
                        ...sessionData,
                        ci: new_cart_id.toHexString(),
                    })
                    res.setHeader("Session-Token", session)
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
                            product_variant_id: product.product_variant_id,
                            qty: product.qty,
                            price: product.price,
                            discount_price: product.discount_price,
                            use_discount: product.use_discount,
                            user_id: null,
                            date: new Date(),
                            imgs: product.imgs,
                            sku: product.sku,
                            combination: product.combination,
                            product_id: product.product_id,
                            cart_id: product.cart_id,
                            cart_item: product,
                        }))
                        await purchases.insertMany(purchasedProducts)
                    }
                    return new_cart_id.toHexString()
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
                        product_variant_id: history.product_variant_id.toHexString(),
                        user_id: history.user_id?.toHexString() || null,
                        date: history.date.getTime(),
                        product_id: history.product_id.toHexString(),
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
            fileType: z.string().min(1)
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
            name: z.string().min(1),
            apellidos: z.string().min(1),
            phone: z.string().min(1),
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
            name: z.string().min(1),
            description: z.string(),
            variants: z.array(z.object({
                imgs: z.array(z.string()),
                qty: z.number(),
                price: z.number(),
                sku: z.string(),
                use_discount: z.boolean(),
                discount_price: z.number(),
                combination: z.array(
                    z.object({
                        id: z.string(),
                        name: z.string(),
                    })
                )
            })),
            use_variants: z.boolean(),
            options: z.array(z.object({
                id: z.string().min(1),
                name: z.string().min(1),
                values: z.array(
                    z.object({
                        id: z.string(),
                        name: z.string()
                    })
                ),
                type: z.enum(["string", "color"])
            })),
            tags: z.array(z.string()),
        })).mutation(async ({ ctx, input }): Promise<void> => {
            try {
                const name = input.name
                const description = input.description
                const variants = input.variants
                const options = input.options
                const use_variants = input.use_variants
                const tags = input.tags
                const { inventory, variantInventory } = ctx
                const newVariants = variants.map(variant => ({
                    ...variant,
                    inventory_variant_oid: new ObjectId(),
                    available: variant.qty,
                    total: variant.qty,
                }))
                const product = await inventory.insertOne({
                    name,
                    tags,
                    description,
                    variants: newVariants,
                    options,
                    use_variants,
                })
                await variantInventory.insertMany(newVariants.map(variant => ({
                    _id: variant.inventory_variant_oid,
                    inventory_id: product.insertedId,
                    available: variant.available,
                    total: variant.total,
                    combination: variant.combination,
                })))
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
            id: z.string().min(1),
            name: z.string().min(1),
            description: z.string(),
            variants: z.array(z.object({
                inventory_variant_oid: z.string().min(1),
                imgs: z.array(z.string()),
                increment: z.number(),
                total: z.number(),
                available: z.number(),
                price: z.number(),
                sku: z.string(),
                use_discount: z.boolean(),
                discount_price: z.number(),
                combination: z.array(
                    z.object({
                        id: z.string(),
                        name: z.string()
                    })
                )
            })),
            create_new_variants: z.boolean(),
            new_variants: z.array(z.object({
                imgs: z.array(z.string()),
                total: z.number(),
                available: z.number(),
                price: z.number(),
                sku: z.string(),
                use_discount: z.boolean(),
                discount_price: z.number(),
                combination: z.array(
                    z.object({
                        id: z.string(),
                        name: z.string()
                    })
                )
            })),
            use_variants: z.boolean(),
            options: z.array(z.object({
                id: z.string().min(1),
                name: z.string().min(1),
                values: z.array(
                    z.object({
                        id: z.string(),
                        name: z.string()
                    })
                ),
                type: z.enum(['string', 'color'])
            })),
            tags: z.array(z.string()),
            new_options: z.array(z.object({
                id: z.string().min(1),
                name: z.string().min(1),
                values: z.array(
                    z.object({
                        id: z.string(),
                        name: z.string()
                    })
                ),
                type: z.enum(['string', 'color'])
            })),
        })).mutation(async ({ ctx, input }): Promise<void> => {
            try {
                const id = input.id
                const name = input.name
                const description = input.description
                const tags = input.tags
                const use_variants = input.use_variants
                const options = input.options
                const variants = input.variants
                const new_variants = input.new_variants
                const create_new_variants = input.create_new_variants
                const new_options = input.new_options
                const { inventory, variantInventory } = ctx
                const product_oid = new ObjectId(id)
                const filter: Filter<InventoryMongo> = {
                    _id: product_oid,
                }
                const updateVariants = variants.map(variant => ({
                    ...variant,
                    inventory_variant_oid: new ObjectId(variant.inventory_variant_oid),
                }))
                const newVariants = new_variants.map(variant => ({
                    ...variant,
                    inventory_variant_oid: new ObjectId(),
                }))
                const result = await inventory.findOneAndUpdate(
                    filter,
                    {
                        $set: {
                            name,
                            description,
                            tags,
                            options: create_new_variants ? new_options : options,
                            variants: create_new_variants ? newVariants : updateVariants,
                            use_variants,
                        }
                    },
                    {
                        returnDocument: "after",
                    }
                )
                if (create_new_variants) {
                    const nextVariants = new_variants.map(variant => ({
                        ...variant,
                        inventory_id: product_oid,
                    }))
                    await variantInventory.insertMany(nextVariants)
                } else {
                    for (const key in variants) {
                        const variant = variants[key]
                        if (variant.increment) {
                            const filter: Filter<InventoryVariantsMongo> = {
                                _id: new ObjectId(variant.inventory_variant_oid),
                                available: {
                                    $gte: -variant.increment
                                }
                            }
                            const result = await variantInventory.findOneAndUpdate(
                                filter,
                                {
                                    ...(variant.increment ? {
                                        $inc: {
                                            available: variant.increment,
                                            total: variant.increment,
                                        }
                                    } : {}),
                                },
                                {
                                    returnDocument: "after",
                                }
                            )
                            if (result) {
                                await inventory.findOneAndUpdate(
                                    { _id: result?.inventory_id },
                                    {
                                        $set: {
                                            [`variants.$[variant].available`]: result.available,
                                            [`variants.$[variant].total`]: result.total,
                                        }
                                    },
                                    {
                                        returnDocument: "after",
                                        arrayFilters: [
                                            {
                                                "variant.inventory_variant_oid": result._id,
                                            }
                                        ],
                                    }
                                )
                            }
                        }
                    }
                }
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
                            product_variant_id: product.product_variant_id,
                            qty: product.qty,
                            price: product.price,
                            discount_price: product.discount_price,
                            use_discount: product.use_discount,
                            user_id: cart.user_id,
                            date: new Date(),
                            imgs: product.imgs,
                            sku: product.sku,
                            combination: product.combination,
                            product_id: product.product_id,
                            cart_id: product.cart_id,
                            cart_item: product,
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
            token: z.string().min(1),
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
            cart_id: z.string().min(1),
            status: z.enum(['paid', 'waiting']).nullish(),
            delivered: z.boolean().nullish(),
            sent: z.boolean().nullish(),
        }))
        .mutation(async ({ ctx, input }): Promise<void> => {
            try {
                const { cartsByUser, purchases, itemsByCart, users } = ctx
                const { cart_id, status, delivered, sent } = input
                const cart_oid = new ObjectId(cart_id)
                await cartsByUser.updateOne(
                    {
                        _id: cart_oid
                    },
                    {
                        $set: {
                            ...(typeof status === "string" ? { status } : {}),
                            ...(typeof delivered === "boolean" ? { delivered } : {}),
                            ...(typeof sent === "boolean" ? { sent } : {}),
                        }
                    }
                )
                if (status === "paid") {
                    const productsInCart = await itemsByCart.find({ cart_id: cart_oid }).toArray()
                    const purchasedProducts: PurchasesMongo[] = productsInCart.map(product => ({
                        name: product.name,
                        product_variant_id: product.product_variant_id,
                        qty: product.qty,
                        price: product.price,
                        discount_price: product.discount_price,
                        use_discount: product.use_discount,
                        user_id: null,
                        date: new Date(),
                        imgs: product.imgs,
                        sku: product.sku,
                        product_id: product.product_id,
                        combination: product.combination,
                        cart_id: product.cart_id,
                        cart_item: product,
                    }))
                    await purchases.insertMany(purchasedProducts)
                    await itemsByCart.deleteMany({ cart_id: cart_oid })
                } else if (status === "waiting") {
                    const items = await purchases.find({ cart_id: cart_oid }).toArray()
                    await itemsByCart.insertMany(items.map(item => item.cart_item))
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
    getItemsByCart: publicProcedure
        .input(z.object({
            cart_id: z.string().min(1),
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
                    product_variant_id: item.product_variant_id.toHexString(),
                    cart_id: item.cart_id.toHexString(),
                    product_id: item.product_id.toHexString(),
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
                const cart_oid = new ObjectId(userData?.user.cart_id || sessionData.ci)
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
        }),
    updateHome: publicProcedure
        .input(z.object({
            name: z.enum([
                'home',
                'nuevo1',
                'nuevo2',
                'piercing1',
                'piercing2',
                'waterproof',
                'collares',
                'anillos',
                'pulseras',
                'aretes',
                'piercings',
                'favoritos',
                'nuevo3',
                'descuentos',
                'insta1',
                'insta2',
                'piercing3'
            ]),
            url: z.string().min(1),
        }))
        .mutation(async ({ ctx, input }): Promise<void | null> => {
            try {
                const { imagesHome } = ctx
                const { name, url } = input
                await imagesHome.updateOne(
                    {
                        name
                    },
                    {
                        $set: {
                            url,
                        },
                        $setOnInsert: {
                            name,
                        }
                    },
                    {
                        upsert: true
                    },
                )
                revalidateHome()
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
    addOrEditDescription: publicProcedure
        .input(z.object({
            name: z.string().min(1),
            description: z.string().min(1),
        }))
        .mutation(async ({ ctx, input }): Promise<void | null> => {
            try {
                const { descriptions } = ctx
                const { name, description } = input
                console.log(name, description)
                await descriptions.updateOne(
                    {
                        name
                    },
                    {
                        $set: {
                            description,
                        },
                        $setOnInsert: {
                            name,
                        }
                    },
                    {
                        upsert: true
                    },
                )
                revalidateHome()
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
});