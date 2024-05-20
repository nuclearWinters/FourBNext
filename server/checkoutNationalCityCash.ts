import { Collection, ObjectId } from "mongodb"
import { CartsByUserMongo, DecodeJWT, SessionJWT, UserMongo } from "./types"
import sgMail from '@sendgrid/mail'
import { ACCESSSECRET, REFRESHSECRET, jwt, sessionToBase64 } from "./utils"
import { NextApiResponse } from "next"
import cookie from "cookie"

interface CheckoutNationalCityCash {
    cartsByUser: Collection<CartsByUserMongo>
    cart_oid: ObjectId
    email: string
    name: string
    delivery: "national" | "city"
    apellidos: string
    phone_prefix: string
    phone: string
    street: string
    neighborhood: string
    zip: string
    city: string
    state: string
    country: string
    userData?: DecodeJWT
    users: Collection<UserMongo>
    sessionData: SessionJWT
    res: NextApiResponse
    address_id: string
}

export const checkoutNationalCityCash = async ({
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
}: CheckoutNationalCityCash): Promise<string> => {
    const expire_date = new Date()
    expire_date.setDate(expire_date.getDate() + 7)
    await cartsByUser.updateOne(
        {
            _id: cart_oid
        },
        {
            $set: {
                pay_in_cash: true,
                email,
                delivery,
                address: `${street}, ${neighborhood}, ${zip} ${city} ${state}, ${country}`,
                phone: `${phone_prefix}${phone}`,
                name: `${name} ${apellidos}`,
                order_id: null,
                checkout_id: null,
                status: "waiting",
                expire_date,
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
    const new_cart_oid = new ObjectId()
    const new_cart_id = new_cart_oid.toHexString()
    if (userData) {
        if (address_id) {
            const address_oid = new ObjectId(address_id)
            const user_oid = new ObjectId(userData.user._id)
            const result = await users.updateOne(
                {
                    _id: user_oid,
                    "addresses._id": address_oid,
                },
                {
                    $set: {
                        cart_id: new_cart_oid,
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
            )
            if (!result.modifiedCount) {
                throw new Error("No user updated")
            }
        } else {
            const address_id = new ObjectId()
            const user_oid = new ObjectId(userData.user._id)
            const result = await users.updateOne(
                {
                    _id: user_oid,
                },
                {
                    $set: {
                        default_address: address_id,
                        cart_id: new_cart_oid,
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
            )
            if (!result.modifiedCount) {
                throw new Error("No user updated")
            }
        }
        const newAccessToken = jwt.sign(
            {
                user: {
                    _id: userData.user._id,
                    cart_id: new_cart_id,
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
                    cart_id: new_cart_id,
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
    } else {
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
            ci: new_cart_id,
        })
        res.setHeader("Session-Token", session)
    }
    return new_cart_id
}