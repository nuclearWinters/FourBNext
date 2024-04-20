const { MongoClient, ObjectId } = require("mongodb");

MongoClient.connect("", {}).then(async client => {
    const db = client.db("fourb");
    const inventory = db.collection("inventory")
    const inventoryItem = await inventory.findOne({ _id: new ObjectId("66216ba529a0eccce5f0dbc7") })
    const variants = inventoryItem.variants.reduce((curr, next) => {
        const combination = next.combination[0]
        if (combination.name === "default") {
            return curr
        }
        curr.push(combination)
        return curr
    }, [])
    await inventory.updateOne(
        {
            _id: new ObjectId("66216ba529a0eccce5f0dbc7")
        },
        {
            $set: {
                options: [
                    {
                        id: "qSn5d",
                        name: "Letra",
                        type: "string",
                        values: variants,
                    }
                ]
            }
        }
    )
})
