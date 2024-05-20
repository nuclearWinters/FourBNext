import { Configuration, CustomersApi, OrdersApi } from "conekta";
import { CONEKTA_API_KEY } from "./utils";

const config = new Configuration({ accessToken: CONEKTA_API_KEY });

export const customerClient = new CustomersApi(config);
export const orderClient = new OrdersApi(config);