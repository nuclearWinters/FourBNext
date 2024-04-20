
import jsonwebtoken, { SignOptions } from 'jsonwebtoken'
import { DecodeJWT, OldSessionJWT, SessionJWT, UserJWT } from '../server/types';
import { ObjectId } from 'mongodb';

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

export const jwt = {
  decode: (token: string): DecodeJWT | null => {
    try {
      const payload = jsonwebtoken.decode(token);
      if (typeof payload === "string") {
        throw new Error("payload is not string")
      }
      return payload as DecodeJWT;
    } catch(e) {
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