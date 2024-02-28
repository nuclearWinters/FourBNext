import { NextApiRequest, NextApiResponse } from "next"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const product_id = req.query.product_id
        if (product_id) {
            await res.revalidate(`/product/${product_id}`)
            return res.json({ revalidated: true })
        } else {
            await res.revalidate("/")
            await res.revalidate("/refunds")
            //await res.revalidate("/shipments")
            //await res.revalidate("/privacy-policy")
            return res.json({ revalidated: true }) 
        }
    } catch (err) {
        return res.status(500).send('Error revalidating')
    }
}
