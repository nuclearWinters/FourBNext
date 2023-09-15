import { GetServerSideProps } from "next";
import { InventoryTRPC } from "./product/[id]";
import { VIRTUAL_HOST } from "../utils/config";
import { inventory } from "./api/trpc/[trpc]";

const EXTERNAL_DATA_URL = `https://${VIRTUAL_HOST}`;

function generateSiteMap(products: InventoryTRPC[]) {
    return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url>
            <loc>${EXTERNAL_DATA_URL}</loc>
        </url>
        <url>
            <loc>${EXTERNAL_DATA_URL}/search</loc>
        </url>
        ${products
            .map(({ _id }) => {
                return `
                    <url>
                        <loc>${`${EXTERNAL_DATA_URL}/product/${_id}`}</loc>
                    </url>
                `;
            })
            .join('')}
    </urlset>`;
}

function SiteMap() {
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
    const products = await inventory.find().toArray()
    const sitemap = generateSiteMap(products.map(product => ({ ...product, _id: product._id.toHexString() })));
    res.setHeader('Content-Type', 'text/xml');
    res.write(sitemap);
    res.end();
    return {
        props: {},
    };
}

export default SiteMap;