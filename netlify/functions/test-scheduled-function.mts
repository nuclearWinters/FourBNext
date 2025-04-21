import type { Config } from "@netlify/functions";
import {
  itemsByCart,
  cartsByUser,
  variantInventory,
  inventory,
  purchases,
} from "../../pages/api/trpc/[trpc]";
import { revalidateProduct } from "../../server/utils";

export default async (req: Request) => {
  const { next_run } = await req.json();
  console.log("Received event! Next invocation at:", next_run);
  const now = new Date();
  const carts = await cartsByUser
    .find({ expire_date: { $lte: now } })
    .toArray();
  for (const cart of carts) {
    if (cart?.expire_date) {
      const items = await itemsByCart.find({ cart_id: cart._id }).toArray();
      for (const item of items) {
        const variantProduct = await variantInventory.findOneAndUpdate(
          {
            _id: item.product_variant_id,
          },
          {
            $inc: {
              available: item.qty,
            },
          },
          {
            returnDocument: "after",
          }
        );
        if (!variantProduct) {
          continue;
        }
        await inventory.updateOne(
          {
            _id: variantProduct.inventory_id,
          },
          {
            $set: {
              [`variants.$[variant].available`]: variantProduct.available,
              [`variants.$[variant].total`]: variantProduct.total,
            },
          },
          {
            arrayFilters: [
              {
                "variant.inventory_variant_oid": variantProduct._id,
              },
            ],
          }
        );
        revalidateProduct(variantProduct.inventory_id.toHexString());
      }
      await itemsByCart.deleteMany({ cart_id: cart._id });
      await purchases.updateMany(
        {
          cart_id: cart._id,
        },
        {
          $set: {
            status: "cancelled",
          },
        }
      );
      await cartsByUser.updateOne(
        { _id: cart._id },
        { $set: { expire_date: null } }
      );
    }
  }
};

export const config: Config = {
  schedule: "0 8 * * *",
};
