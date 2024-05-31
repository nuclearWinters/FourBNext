const { MongoClient } = require("mongodb");

MongoClient.connect("", {}).then(async client => {
    const db = client.db("fourb");
    const inventory = db.collection("inventory")
    const allProducts = await inventory.find({}).toArray()
    for (const product of allProducts) {
        const skus = product.variants.reduce((curr, next) => {
            return curr + next.sku + " "
        }, '')
        await inventory.updateOne(
            {
                _id: product._id
            },
            {
                $set: {
                    skus,
                }
            }
        )
    }
})
