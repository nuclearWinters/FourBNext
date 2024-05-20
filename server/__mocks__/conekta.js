export function Configuration() {

}

export function CustomersApi() {
    return {
        createCustomer: jest.fn(() => ({
            data: {
                id: 'new_conekta_id'
            }
        }))
    }
}

export function OrdersApi() {
    return {
        createOrder: jest.fn(() => ({
            data: {
                id: 'new_order_id',
                checkout: {
                    id: 'new_checkout_id'
                }
            }
        })),
    }
}