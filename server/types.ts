import { Collection, ObjectId } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";

export interface UserMongo {
    _id?: ObjectId;
    email: string;
    password: string;
    cart_id: ObjectId;
    name: string;
    apellidos: string;
    phone: string;
    conekta_id: string;
    default_address: ObjectId | null;
    addresses: AddressUser[]
    phone_prefix: string;
    is_admin: boolean;
    verified_email: boolean;
}

export interface AddressUser {
    _id: ObjectId;
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
}

export interface AddressUserJWT {
    _id: string;
    full_address: string;
    country: string;
    street: string;
    neighborhood: string;
    zip: string;
    city: string;
    state: string;
    phone: string;
    name: string;
    apellidos: string;
}

export interface SessionJWT {
    email: string | null;
    cart_id: string;
    name: string | null;
    apellidos: string | null;
    phone: string | null;
    conekta_id: string | null;
    country: string | null;
    street: string | null;
    neighborhood: string | null;
    zip: string | null;
    city: string | null;
    state: string | null;
    phone_prefix: string | null;
}

export interface InventoryMongo {
    _id?: ObjectId;
    available: number;
    total: number;
    name: string;
    price: number;
    img: string[];
    discount_price: number;
    use_discount: boolean;
    tags: string[]
    code: string;
    img_small: string[];
    img_big: string[];
    use_small_and_big: boolean;
    available_small: number;
    total_small: number;
    available_big: number;
    total_big: number;
}

export interface ItemsByCartMongo {
    _id?: ObjectId;
    product_id: ObjectId,
    cart_id: ObjectId,
    qty: number;
    qty_big: number;
    qty_small: number;
    price: number;
    discount_price: number;
    use_discount: boolean;
    name: string;
    img: string[];
    code: string;
    img_small: string[];
    img_big: string[];
    use_small_and_big: boolean;
}

export interface PurchasesMongo {
    _id?: ObjectId;
    product_id: ObjectId,
    qty: number;
    qty_big: number;
    qty_small: number;
    price: number;
    discount_price: number;
    use_discount: boolean;
    name: string;
    user_id: ObjectId | null;
    date: Date;
    img: string[];
    code: string;
    img_small: string[];
    img_big: string[];
    use_small_and_big: boolean;
}

export interface CartsByUserMongo {
    _id?: ObjectId;
    user_id: ObjectId | null;
    expire_date: Date | null;
    pay_in_cash: boolean;
    status: 'paid' | 'waiting'
    order_id: string | null
    email: string | null
    delivery: 'city' | 'national' | 'store' | null
    sent: boolean
    delivered: boolean
    address: string | null
    phone: string | null
    name: string | null
    checkout_id: string | null
}

export interface ReservedInventoryMongo {
    _id?: ObjectId;
    cart_id: ObjectId;
    product_id: ObjectId;
    qty: number;
    qty_small: number;
    qty_big: number;
}

export interface ContextLocals {
    req: NextApiRequest,
    res: NextApiResponse
    sessionData: SessionJWT
    userData?: DecodeJWT;
    users: Collection<UserMongo>;
    inventory: Collection<InventoryMongo>;
    itemsByCart: Collection<ItemsByCartMongo>;
    cartsByUser: Collection<CartsByUserMongo>;
    reservedInventory: Collection<ReservedInventoryMongo>;
    purchases: Collection<PurchasesMongo>
}

export interface UserJWT {
    _id: string;
    cart_id: string;
    is_admin: boolean;
    email: string
}

export interface DecodeJWT {
    user: UserJWT;
    iat: number;
    exp: number;
    refreshTokenExpireTime: number;
}