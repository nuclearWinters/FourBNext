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
        createOrder: jest.fn((args) => {
            const isSpei = args?.charges?.[0]?.payment_method.type === "spei"
            const isOxxo = args?.charges?.[0]?.payment_method.type === "cash"
            return ({
                data: {
                    id: 'new_order_id',
                    checkout: {
                        id: 'new_checkout_id'
                    },
                    amount: 1000,
                    currency: "MXN",
                    charges: {
                        data: [{
                            payment_method: {
                                object: isSpei ? "bank_transfer_payment" : isOxxo ? "cash_payment" : "",
                                bank: "STP",
                                clabe: "123456789012345678",
                                reference: "12345678980",
                                barcode_url: "https://barcode.com"
                            }
                        }]
                    }
                }
            })
        }),
    }
}