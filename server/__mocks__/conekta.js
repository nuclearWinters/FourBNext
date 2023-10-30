export function Configuration() {

}

export function CustomersApi() {
    return {
        createCustomer() {
            return {
                data: {
                    id: 'conekta_id'
                }
            }
        }
    }
}

export function OrdersApi() {
    return {
        createOrder() {
            return {
                data: {
                    id: 'order_id',
                    checkout: {
                        id: 'checkout_id'
                    }
                }
            }
        }
    }

}