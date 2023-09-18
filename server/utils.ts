
import jsonwebtoken, { SignOptions } from 'jsonwebtoken'
import { DecodeJWT, SessionJWT, UserJWT } from '../server/types';
import { ObjectId } from 'mongodb';

export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || ""
export const VIRTUAL_HOST = process.env.VIRTUAL_HOST || ""
export const MONGO_DB = process.env.MONGO_DB;
export const REFRESH_TOKEN_EXP_NUMBER = 43200;
export const ACCESS_TOKEN_EXP_NUMBER = 900;
export const REFRESHSECRET = process.env.REFRESHSECRET || "REFRESHSECRET";
export const ACCESSSECRET = process.env.ACCESSSECRET || "ACCESSSECRET";
export const PORT = process.env.PORT || 8000
export const ACCESS_KEY = process.env.ACCESS_KEY || ""
export const SECRET_KEY = process.env.SECRET_KEY || ""
export const REGION = process.env.REGION || ""
export const CONEKTA_API_KEY = process.env.CONEKTA_API_KEY || ""
export const BUCKET_NAME = process.env.BUCKET_NAME || ""

export const jwt = {
  decode: (token: string): string | DecodeJWT | null => {
    const decoded = jsonwebtoken.decode(token);
    return decoded as string | DecodeJWT | null;
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
      name: null,
      apellidos: null,
      email: null,
      cart_id: cart_id.toHexString(),
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
  }
}

export const getSessionToken = (sessionToken: string | null): string => {
  try {
    if (!sessionToken) {
      throw new Error("No session token")
    }
    const session = JSON.parse(Buffer.from(sessionToken, 'base64').toString('utf-8'))
    if (session) {
      return sessionToken
    }
    throw new Error("No value")
  } catch (e) {
    const cart_id = new ObjectId()
    const session: SessionJWT = {
      name: null,
      apellidos: null,
      email: null,
      cart_id: cart_id.toHexString(),
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
    return sessionToBase64(session)
  }
}