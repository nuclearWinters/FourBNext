
import jsonwebtoken, { SignOptions } from 'jsonwebtoken'
import { DecodeJWT, OldSessionJWT, SessionJWT, UserJWT, UserMongo } from '../server/types';
import { Collection, ObjectId } from 'mongodb';
import { CustomersApi, OrderRequest, OrdersApi, Customer, OrderResponse } from 'conekta';
import { NextApiResponse } from 'next';
import { AxiosResponse, isAxiosError } from 'axios';

export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || ""
export const VIRTUAL_HOST = process.env.VIRTUAL_HOST || ""
export const MONGO_DB = process.env.MONGO_DB;
export const REFRESH_TOKEN_EXP_NUMBER = 43200;
export const ACCESS_TOKEN_EXP_NUMBER = 900;
export const REFRESHSECRET = process.env.REFRESHSECRET || "REFRESHSECRET";
export const ACCESSSECRET = process.env.ACCESSSECRET || "ACCESSSECRET";
export const ACCESS_KEY = process.env.ACCESS_KEY || ""
export const SECRET_KEY = process.env.SECRET_KEY || ""
export const REGION = process.env.REGION || ""
export const CONEKTA_API_KEY = process.env.CONEKTA_API_KEY || ""
export const BUCKET_NAME = process.env.BUCKET_NAME || ""
export const OWNER_EMAIL_ACCOUNT = process.env.OWNER_EMAIL_ACCOUNT || ""

export const jwt = {
  decode: (token: string): DecodeJWT | null => {
    try {
      const payload = jsonwebtoken.decode(token);
      if (typeof payload === "string") {
        throw new Error("payload is not string")
      }
      return payload as DecodeJWT;
    } catch (e) {
      return null
    }
  },
  verify: (token: string, password: string): DecodeJWT | null => {
    try {
      const payload = jsonwebtoken.verify(token, password);
      if (typeof payload === "string") {
        throw new Error("payload is not string")
      }
      return payload as DecodeJWT;
    } catch {
      return null
    }
  },
  sign: (
    data: {
      user: UserJWT;
      refreshTokenExpireTime: number;
      exp: number;
    },
    secret: string,
    options?: SignOptions
  ): string => {
    const token = jsonwebtoken.sign(data, secret, options);
    return token;
  },
};

export const getTokenData = (accessToken?: string, refreshToken?: string): {
  payload: DecodeJWT,
  accessToken: string,
  refreshToken: string,
} | null => {
  if (!refreshToken) {
    return null
  }
  if (accessToken) {
    const payload = jwt.verify(accessToken, ACCESSSECRET)
    if (payload && typeof payload !== "string") {
      return { payload, accessToken, refreshToken }
    }
  }
  const payload = jwt.verify(refreshToken, REFRESHSECRET);
  if (payload) {
    const now = new Date();
    now.setMilliseconds(0);
    const accessTokenExpireTime = now.getTime() / 1000 + ACCESS_TOKEN_EXP_NUMBER;
    const newAccessToken = jwt.sign(
      {
        user: {
          _id: payload.user._id,
          cart_id: payload.user.cart_id,
          is_admin: payload.user.is_admin,
          email: payload.user.email,
        },
        refreshTokenExpireTime: payload.exp,
        exp: accessTokenExpireTime > payload.exp ? payload.exp : accessTokenExpireTime,
      },
      ACCESSSECRET
    );
    return { payload, accessToken: newAccessToken, refreshToken }
  } else {
    return null
  }
}

export const sessionToBase64 = (value: SessionJWT) => {
  return Buffer.from(JSON.stringify(value)).toString('base64')
}

export const oldSessionToBase64 = (value: OldSessionJWT) => {
  const newSession: SessionJWT = {
    nm: value.name,
    ap: value.apellidos,
    em: value.email,
    ci: value.cart_id,
    ph: value.phone,
    ck: value.conekta_id,
    co: value.country,
    st: value.street,
    nh: value.neighborhood,
    zp: value.zip,
    cy: value.city,
    se: value.state,
    pp: value.phone_prefix,
  }
  return Buffer.from(JSON.stringify(newSession)).toString('base64')
}

export const getSessionData = (sessionToken: string): SessionJWT => {
  try {
    if (!sessionToken) {
      throw new Error("No session token")
    }
    const session = JSON.parse(Buffer.from(sessionToken, 'base64').toString('utf-8'))
    if (session) {
      return session
    }
    throw new Error("No value")
  } catch (e) {
    const cart_id = new ObjectId()
    return {
      nm: null,
      ap: null,
      em: null,
      ci: cart_id.toHexString(),
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
  }
}

export const getSessionToken = (sessionToken: string | null): string => {
  try {
    if (!sessionToken) {
      throw new Error("No session token")
    }
    const session = JSON.parse(Buffer.from(sessionToken, 'base64').toString('utf-8'))
    if (!session.ci) {
      return oldSessionToBase64(session)
    }
    if (session) {
      return sessionToken
    }
    throw new Error("No value")
  } catch (e) {
    const cart_id = new ObjectId()
    const session: SessionJWT = {
      nm: null,
      ap: null,
      em: null,
      ci: cart_id.toHexString(),
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
    return sessionToBase64(session)
  }
}

export const revalidateProduct = (product_id: string) => {
  fetch(`https://${VIRTUAL_HOST}/api/revalidate?product_id=${product_id}`)
}

export const revalidateHome = () => {
  fetch(`https://${VIRTUAL_HOST}/api/revalidate`)
}

export const createOrderHelper = async (
  orderClientRequest: OrderRequest,
  orderClient: OrdersApi,
  customerClient: CustomersApi,
  customerRequest: Customer,
  res: NextApiResponse,
  userData: DecodeJWT | undefined,
  users: Collection<UserMongo>,
  sessionData: SessionJWT,
): Promise<AxiosResponse<OrderResponse, any>> => {
  try {
    const order = await orderClient.createOrder(orderClientRequest)
    return order
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.details?.[0].message.includes("Not found customer_id")) {
      const new_conekta_id = (await customerClient.createCustomer(customerRequest)).data.id
      if ('customer_id' in orderClientRequest.customer_info) {
        orderClientRequest.customer_info.customer_id = new_conekta_id
      }
      const order = await orderClient.createOrder(orderClientRequest)
      if (new_conekta_id) {
        if (userData) {
          const user_oid = new ObjectId(userData.user._id)
          await users.updateOne(
            {
              _id: user_oid,
            },
            {
              $set: {
                conekta_id: new_conekta_id,
              }
            },
          )
        } else {
          const session = sessionToBase64({
            ...sessionData,
            ck: new_conekta_id,
          })
          res.setHeader("Session-Token", session)
        }
      }
      return order
    }
    throw error
  }
}