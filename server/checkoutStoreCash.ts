import { Collection, ObjectId } from "mongodb"
import { CartsByUserMongo, DecodeJWT, SessionJWT, UserMongo } from "./types"
import { ACCESSSECRET, REFRESHSECRET, jwt, sessionToBase64 } from "./utils"
import sgMail from '@sendgrid/mail'
import cookie from "cookie"
import { NextApiResponse } from "next"

interface CheckoutStoreCash {
    cartsByUser: Collection<CartsByUserMongo>
    cart_oid: ObjectId
    email: string
    name: string
    apellidos: string
    phone_prefix: string
    phone: string
    userData?: DecodeJWT
    users: Collection<UserMongo>
    sessionData: SessionJWT
    res: NextApiResponse
}

export const checkoutStoreCash = async ({
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
}: CheckoutStoreCash): Promise<string> => {
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
                delivery: "store",
                phone: `${phone_prefix}${phone}`,
                name: `${name} ${apellidos}`,
                user_id: userData?.user._id ? new ObjectId(userData.user._id) : null,
                order_id: null,
                checkout_id: null,
                status: "waiting",
                expire_date,
            }
        }
    )
    const new_cart_oid = new ObjectId()
    const new_cart_id = new_cart_oid.toHexString()
    if (userData) {
        const user_oid = new ObjectId(userData.user._id)
        await users.updateOne(
            {
                _id: user_oid
            },
            {
                $set: {
                    cart_id: new_cart_oid
                }
            },
        )
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
            ph: phone,
            pp: phone_prefix,
            ap: apellidos,
            nm: name,
            ci: new_cart_id,
        })
        res.setHeader("Session-Token", session)
    }
    await sgMail.send({
        to: email,
        from: 'asistencia@fourb.mx',
        subject: 'Por favor contáctanos y envíanos el código adjunto',
        text: `Envíanos un mensaje a nuestro Instagram o Facebook con este código en mano: ${cart_oid.toHexString()}`,
        html: `<strong>Envíanos un mensaje a nuestro <a href='https://www.instagram.com/fourb_mx/' target='_blank'>Instagram</a> o <a href='https://www.facebook.com/fourbmx/' target='_blank'>Facebook</a> con este código en mano: ${cart_oid.toHexString()}</strong>`,
    });
    return cart_oid.toHexString()
}