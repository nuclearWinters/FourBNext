import { TRPCError, initTRPC } from '@trpc/server';
import { CartsByUserMongo, ContextLocals, InventoryVariantsMongo, VariantMongo } from './types';
import { z } from 'zod';
import { Filter, ObjectId } from 'mongodb';
import { ACCESSSECRET, ACCESS_KEY, ACCESS_TOKEN_EXP_NUMBER, BUCKET_NAME, OWNER_EMAIL_ACCOUNT, REFRESHSECRET, REFRESH_TOKEN_EXP_NUMBER, SECRET_KEY, SENDGRID_API_KEY, jwt, revalidateHome, revalidateProduct, sessionToBase64 } from './utils';
import { InventoryMongo, ItemsByCartMongo, PurchasesMongo, UserMongo } from './types';
import bcrypt from "bcryptjs"
import cookie from "cookie"
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { isAxiosError } from 'axios';
import { randomUUID } from 'crypto';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sgMail from '@sendgrid/mail';
import Handlebars from "handlebars";
import { checkoutStoreCash } from './checkoutStoreCash';
import { checkoutStoreCard } from './checkoutStoreCard';
import { checkoutStoreOxxoTransfer } from './checkoutStoreOxxoTransfer';
import { checkoutNationalCityCash } from './checkoutNationalCityCash';
import { checkoutNationalCityCard } from './checkoutNationalCityCard';
import { checkoutNationalCityOxxoTransfer } from './checkoutNationalCityOxxoTransfer';
import { customerClient, orderClient } from './conektaConfig';
import { confirmationEmail } from './card_confirmation';
import { confirmationEmailNotification } from './card_confirmation_notification';

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

const t = initTRPC.context<ContextLocals>().create();
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export const createFactory = t.createCallerFactory

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
                const expire_date = new Date()
                expire_date.setHours(expire_date.getHours() + 24)
                expire_date.setUTCHours(8)
                expire_date.setUTCMinutes(0)
                expire_date.setUTCSeconds(0)
                //crear carrito si no existe
                await cartsByUser.updateOne(
                    {
                        _id: user.cart_id,
                    },
                    {
                        $set: {
                            expire_date,
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
            confirm_password: z.string(),
            phone: z.string(),
            phone_prefix: z.literal('+52'),
        }).superRefine(({ confirm_password, password }, ctx) => {
            if (confirm_password !== password) {
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
                const phonePrefix = input.phone_prefix
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
                //const token = Buffer.from(user_id.toHexString()).toString('base64')
                //await sgMail.send({
                //    to: email,
                //    from: 'asistencia@fourb.mx',
                //    subject: 'Confirmación de email',
                //    text: 'Haz click en este link para confirmar tu email',
                //    html: `<strong>Haz click en este <a target="_blank" href="https://${VIRTUAL_HOST}?token=${token}">link</a> para confirmar tu email</strong>`,
                //});
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
            const { inventory, userData } = ctx
            const is_admin = userData?.user.is_admin
            const search = input.search
            const tag = input.tag
            const limit = input.limit || 20
            const after = input.cursor || ""
            const discounts = input.discounts
            const limitParsed = limit + 1
            let nextCursor: string | undefined = undefined;
            if (search) {
                const filter: Filter<InventoryMongo> = {
                    $or: [
                        {
                            name: { $regex: search, $options: "i" },
                        },
                        {
                            skus: { $regex: search, $options: "i" },
                        }
                    ],
                }
                if (!is_admin) {
                    filter.disabled = {
                        $ne: true
                    }
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
                    tags: { $in: [tag] },
                }
                if (!is_admin) {
                    filter.disabled = {
                        $ne: true
                    }
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
                    use_discount: true,
                }
                if (!is_admin) {
                    filter.disabled = {
                        $ne: true
                    }
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
                if (!is_admin) {
                    filter.disabled = {
                        $ne: true
                    }
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
                        $gte: qty,
                    },
                    disabled: {
                        $ne: true
                    },
                }
                //Posible source
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
                    throw new Error("Not enough inventory, product not found or disabled.")
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
                const expire_date = new Date()
                expire_date.setHours(expire_date.getHours() + 24)
                expire_date.setUTCHours(8)
                expire_date.setUTCMinutes(0)
                expire_date.setUTCSeconds(0)
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
                            expire_date,
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
                const itemsInCart = await itemsByCart.find(
                    {
                        cart_id: cart_oid,
                        disabled: {
                            $ne: true
                        },
                    }
                ).toArray()
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
                //Posible source
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
                const expire_date = new Date()
                expire_date.setHours(expire_date.getHours() + 24)
                expire_date.setUTCHours(8)
                expire_date.setUTCMinutes(0)
                expire_date.setUTCSeconds(0)
                /* ---- Actualizar carrito ---- */
                await cartsByUser.updateOne(
                    {
                        _id: cart_oid,
                    },
                    {
                        $set: {
                            expire_date,
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
                //Posible source
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
                    payment_method: z.enum(["cash", "card", "oxxo", "bank_transfer"]),
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
                    payment_method: z.enum(["cash", "card", "oxxo", "bank_transfer"]),
                    delivery: z.enum(["city", "national"]),
                }),
            ]))
        .mutation(async ({ ctx, input }): Promise<{
            cart_id?: string,
            checkout_id?: string
        }> => {
            try {
                const {
                    itemsByCart,
                    users,
                    userData,
                    sessionData,
                    res,
                    cartsByUser,
                    inventory,
                    variantInventory,
                    purchases,
                } = ctx
                const cart_oid = new ObjectId(userData?.user.cart_id || sessionData.ci)
                if (input.delivery === "store") {
                    const { name, apellidos, phone, phone_prefix, payment_method, email } = input
                    if (payment_method === "cash") {
                        const new_cart_id = await checkoutStoreCash({
                            cartsByUser,
                            cart_oid,
                            email,
                            phone_prefix,
                            phone,
                            name,
                            apellidos,
                            userData,
                            users,
                            sessionData,
                            res,
                            inventory,
                            variantInventory,
                            itemsByCart,
                            purchases
                        })
                        return {
                            cart_id: new_cart_id,
                        }
                    } else if (payment_method === "card") {
                        const checkout_id = await checkoutStoreCard({
                            userData,
                            users,
                            itemsByCart,
                            cart_oid,
                            cartsByUser,
                            phone,
                            phone_prefix,
                            sessionData,
                            email,
                            apellidos,
                            res,
                            name,
                            customerClient,
                            orderClient,
                            inventory,
                            variantInventory,
                        })
                        return {
                            checkout_id,
                        }
                    } else {
                        const new_cart_id = await checkoutStoreOxxoTransfer({
                            userData,
                            users,
                            itemsByCart,
                            cart_oid,
                            orderClient,
                            payment_method,
                            cartsByUser,
                            phone_prefix,
                            phone,
                            name,
                            apellidos,
                            email,
                            sessionData,
                            res,
                            customerClient,
                            inventory,
                            variantInventory,
                            purchases,
                        })
                        return {
                            cart_id: new_cart_id,
                        }
                    }
                } else {
                    const { name, apellidos, street, email, country, neighborhood, zip, city, state, phone, address_id, phone_prefix, payment_method, delivery } = input
                    if (payment_method === "cash") {
                        const cart_id = await checkoutNationalCityCash({
                            cartsByUser,
                            cart_oid,
                            email,
                            delivery,
                            name,
                            apellidos,
                            street,
                            neighborhood,
                            zip,
                            city,
                            state,
                            country,
                            phone,
                            phone_prefix,
                            userData,
                            users,
                            res,
                            sessionData,
                            address_id,
                            inventory,
                            variantInventory,
                            itemsByCart,
                            purchases,
                        })
                        return {
                            cart_id,
                        }
                    } else if (payment_method === "card") {
                        const checkout_id = await checkoutNationalCityCard({
                            users,
                            userData,
                            res,
                            delivery,
                            customerClient,
                            orderClient,
                            email,
                            itemsByCart,
                            cart_oid,
                            name,
                            apellidos,
                            phone,
                            phone_prefix,
                            cartsByUser,
                            sessionData,
                            zip,
                            city,
                            state,
                            country,
                            street,
                            neighborhood,
                            address_id,
                            inventory,
                            variantInventory,
                        })
                        return {
                            checkout_id,
                        }
                    } else {
                        const cart_id = await checkoutNationalCityOxxoTransfer({
                            users,
                            userData,
                            res,
                            delivery,
                            customerClient,
                            orderClient,
                            email,
                            itemsByCart,
                            cart_oid,
                            name,
                            apellidos,
                            phone,
                            phone_prefix,
                            cartsByUser,
                            sessionData,
                            zip,
                            city,
                            state,
                            country,
                            street,
                            neighborhood,
                            address_id,
                            payment_method,
                            inventory,
                            variantInventory,
                            purchases,
                        })
                        return {
                            cart_id,
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
            type: z.enum(['card']),
        }))
        .mutation(async ({ ctx }): Promise<string> => {
            try {
                const { users, sessionData, userData, res } = ctx
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
                        }
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
                    return new_cart_id.toHexString()
                } else {
                    const session = sessionToBase64({
                        ...sessionData,
                        ci: new_cart_id.toHexString(),
                    })
                    res.setHeader("Session-Token", session)
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
                const { inventory, variantInventory, userData } = ctx
                const is_admin = userData?.user.is_admin
                if (!is_admin) {
                    throw new Error("Only admins allowed")
                }
                const newVariants = variants.map(variant => ({
                    ...variant,
                    inventory_variant_oid: new ObjectId(),
                    available: variant.qty,
                    total: variant.qty,
                    disabled: false,
                }))
                const skus = newVariants.reduce((curr, next) => {
                    return curr + next.sku + " "
                }, '')
                const product = await inventory.insertOne({
                    name,
                    tags,
                    description,
                    variants: newVariants,
                    options,
                    use_variants,
                    disabled: false,
                    skus,
                })
                await variantInventory.insertMany(newVariants.map(variant => ({
                    _id: variant.inventory_variant_oid,
                    inventory_id: product.insertedId,
                    available: variant.available,
                    total: variant.total,
                    combination: variant.combination,
                    disabled: false,
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
                ),
                disabled: z.boolean().optional(),
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
                ),
                disabled: z.boolean().optional(),
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
                const new_options = input.new_options
                const create_new_variants = input.create_new_variants && new_variants.length > 1 && new_options.length > 0
                const { inventory, variantInventory, userData } = ctx
                const is_admin = userData?.user.is_admin
                if (!is_admin) {
                    throw new Error("Only admins allowed")
                }
                const product_oid = new ObjectId(id)
                const filter: Filter<InventoryMongo> = {
                    _id: product_oid,
                }
                const updateVariants = variants.map(variant => ({
                    ...variant,
                    inventory_variant_oid: new ObjectId(variant.inventory_variant_oid),
                    disabled: variant.disabled ?? false,
                }))
                const newVariants = new_variants.map(variant => ({
                    ...variant,
                    inventory_variant_oid: new ObjectId(),
                    disabled: variant.disabled ?? false,
                }))
                const skus = create_new_variants
                    ? newVariants.reduce((curr, next) => {
                        return curr + next.sku + " "
                    }, '')
                    : updateVariants.reduce((curr, next) => {
                        return curr + next.sku + " "
                    }, '')
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
                            skus,
                        }
                    },
                    {
                        returnDocument: "after",
                    }
                )
                if (create_new_variants) {
                    const nextVariants = newVariants.map(({ inventory_variant_oid, ...variant }) => ({
                        ...variant,
                        _id: inventory_variant_oid,
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
            try {
                const { cartsByUser, purchases, itemsByCart } = ctx
                const body = ctx.req.body
                const isOrder = body?.data?.object?.object === "charge"
                const isPaid = body?.data?.object?.status === "paid"
                const orderId = body?.data?.object?.order_id
                const amount = body?.data?.object?.amount
                const payment = body?.data?.object?.payment_method?.object
                if (isOrder && isPaid && amount && orderId && payment) {
                    const amountParsed = (amount / 100).toFixed(2)
                    const cart = await cartsByUser.findOneAndUpdate(
                        {
                            order_id: orderId
                        },
                        {
                            $set: {
                                status: 'paid',
                                expire_date: null,
                            }
                        },
                        {
                            returnDocument: "after",
                        }
                    )
                    if (cart) {
                        const productsInCart = await itemsByCart.find(
                            {
                                cart_id: cart._id,
                                disabled: {
                                    $ne: true
                                },
                            }
                        ).toArray()
                        if (cart.user_id) {
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
                                status: "paid"
                            }))
                            await purchases.insertMany(purchasedProducts)
                        }
                        const email = cart.email
                        if (email) {
                            const template = Handlebars.compile(confirmationEmail);
                            const templateNotification = Handlebars.compile(confirmationEmailNotification);
                            const productsList = productsInCart.map(
                                product => {
                                    const total = product.price * product.qty
                                    return {
                                        qty: product.qty,
                                        total: '$ ' + (total / 100).toFixed(2),
                                        img: product?.imgs?.[0] || '',
                                        totalCents: total,
                                        name: product.name,
                                    }
                                }
                            )
                            const subtotal = productsList.reduce((curr, next) => {
                                const total = curr + next.totalCents
                                return total
                            }, 0)
                            const shipment = cart.delivery === "city"
                                ? 4000
                                : cart.delivery === "national"
                                    ? 11900
                                    : 0
                            const data = {
                                productsList,
                                total: '$ ' + amountParsed,
                                subtotal: '$ ' + (subtotal / 100).toFixed(2),
                                shipment: '$ ' + (shipment / 100).toFixed(2),
                                name: cart?.name || '',
                                shipmentMethod: cart?.delivery === "city"
                                    ? "Servicio en la ciudad"
                                    : cart?.delivery === "national"
                                        ? "Nacional"
                                        : "Recoger en tienda",
                                paymentMethod: payment === 'bank_transfer_payment'
                                    ? 'Transferencia'
                                    : payment === 'cash_payment'
                                        ? 'OXXO'
                                        : payment === 'card_payment'
                                            ? 'Pago con tarjeta'
                                            : 'No reconocido',
                                address: cart?.address || '',
                            };
                            const result = template(data)
                            const resultNotification = templateNotification(data)
                            await sgMail.send({
                                to: email,
                                from: 'asistencia@fourb.mx',
                                subject: 'Pago confirmado',
                                text: 'Tu pago ha sido procesado exitosamente',
                                html: result,
                            });
                            await sgMail.send({
                                to: OWNER_EMAIL_ACCOUNT,
                                from: 'asistencia@fourb.mx',
                                subject: 'Compra confirmada',
                                text: 'El pago del carrito se realizo correctamente',
                                html: resultNotification,
                            });
                        }
                    }
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
                const { cartsByUser, userData } = ctx
                const is_admin = userData?.user.is_admin
                if (!is_admin) {
                    throw new Error("Only admins allowed")
                }
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
                const { cartsByUser, purchases, userData } = ctx
                const is_admin = userData?.user.is_admin
                if (!is_admin) {
                    throw new Error("Only admins allowed")
                }
                const { cart_id, status, delivered, sent } = input
                const cart_oid = new ObjectId(cart_id)
                const expire_date = new Date()
                expire_date.setHours(expire_date.getHours() + 168)
                expire_date.setUTCHours(8)
                expire_date.setUTCMinutes(0)
                expire_date.setUTCSeconds(0)
                await cartsByUser.updateOne(
                    {
                        _id: cart_oid
                    },
                    {
                        $set: {
                            ...(typeof status === "string" ? { status } : {}),
                            ...(typeof delivered === "boolean" ? { delivered } : {}),
                            ...(typeof sent === "boolean" ? { sent } : {}),
                            ...(typeof status === "string" && status === "paid" ? {
                                expire_date: null,
                            } : typeof status === "string" && status === "waiting" ? {
                                expire_date,
                            } : {})
                        }
                    }
                )
                if (status === "paid") {
                    await purchases.updateMany(
                        {
                            cart_id: cart_oid,
                        },
                        {
                            $set: {
                                status: "paid",
                            }
                        },
                    )
                } else if (status === "waiting") {
                    await purchases.updateMany(
                        {
                            cart_id: cart_oid,
                        },
                        {
                            $set: {
                                status: "waiting_payment",
                            }
                        },
                    )
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
                const { itemsByCart, userData } = ctx
                const is_admin = userData?.user.is_admin
                if (!is_admin) {
                    throw new Error("Only admins allowed")
                }
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
    getUserCartDataById: publicProcedure
        .input(z.object({
            cart_id: z.string().min(1),
        }))
        .query(async ({ ctx, input }): Promise<CartsByUserTRPC | null> => {
            try {
                const { cartsByUser } = ctx
                const cart_oid = new ObjectId(input.cart_id)
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
                const { imagesHome, userData } = ctx
                const is_admin = userData?.user.is_admin
                if (!is_admin) {
                    throw new Error("Only admins allowed")
                }
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
                const { descriptions, userData } = ctx
                const is_admin = userData?.user.is_admin
                if (!is_admin) {
                    throw new Error("Only admins allowed")
                }
                const { name, description } = input
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
    disableProduct: publicProcedure
        .input(z.object({
            product_id: z.string().min(1),
            disabled: z.boolean()
        }))
        .mutation(async ({ ctx, input }): Promise<void | null> => {
            try {
                const { inventory, variantInventory, userData, itemsByCart } = ctx
                const is_admin = userData?.user.is_admin
                if (!is_admin) {
                    throw new Error("Only admins allowed")
                }
                const { product_id, disabled } = input
                const product_oid = new ObjectId(product_id)
                await inventory.updateOne(
                    {
                        _id: product_oid,
                    },
                    {
                        $set: {
                            disabled,
                        },
                    },
                )
                await variantInventory.updateMany(
                    {
                        inventory_id: product_oid,
                    },
                    {
                        $set: {
                            disabled,
                        },
                    },
                )
                await itemsByCart.updateMany(
                    {
                        product_id: product_oid,
                    },
                    {
                        $set: {
                            disabled,
                        },
                    },
                )
                revalidateProduct(product_oid.toHexString())
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
    deleteItemFromCart: publicProcedure
        .input(z.object({
            items_by_cart_id: z.string().min(1),
        }))
        .mutation(async ({ ctx, input }): Promise<void> => {
            try {
                const { itemsByCart, inventory, variantInventory, userData } = ctx
                const is_admin = userData?.user.is_admin
                if (!is_admin) {
                    throw new Error("Only admins allowed")
                }
                const items_by_cart_oid = new ObjectId(input.items_by_cart_id)
                /* ---- Eliminar item en el carrito ---- */
                const deletedItemInCart = await itemsByCart.findOneAndDelete(
                    {
                        _id: items_by_cart_oid,
                    },
                )
                /* ---- Eliminar item en el carrito ---- */
                if (!deletedItemInCart) {
                    throw new Error("Item in cart not modified.")
                }
                /* ---- Actualizar inventario ---- */
                const filter: Filter<InventoryVariantsMongo> = {
                    _id: deletedItemInCart.product_variant_id,
                }
                const variantProduct = await variantInventory.findOneAndUpdate(
                    filter,
                    {
                        $inc: {
                            available: deletedItemInCart.qty,
                        },
                    },
                    {
                        returnDocument: "after"
                    }
                )
                /* ---- Actualizar inventario ---- */
                if (!variantProduct) {
                    await itemsByCart.insertOne(deletedItemInCart)
                    throw new Error("Not enough inventory or product not found.")
                }
                /* ---- Actualizar inventario duplicado ---- */
                await inventory.findOneAndUpdate(
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
                                "variant.inventory_variant_oid": deletedItemInCart.product_variant_id,
                            }
                        ]
                    }
                )
                /* ---- Actualizar inventario duplicado ---- */
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
});