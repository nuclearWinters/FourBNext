import { trpc } from '../utils/config';
import { Fragment, MutableRefObject, useRef } from 'react';
import { ProductList } from '../components/ProductList';
import { useSearchParams } from 'next/navigation'
import { InfiniteScroll } from '../components/InfiniteScroll';
import Head from 'next/head';

export default function Search(props: {
    footerRef: MutableRefObject<HTMLDivElement | null>
}) {
    const urlParams = useSearchParams()
    const tag = urlParams.get('tag') || ""
    const search = urlParams.get('search') || ""
    const discounts = urlParams.get('discounts') === 'true'
    const searchProducts = trpc.inventory.useInfiniteQuery(
        { limit: 20, tag, discounts, search },
        { getNextPageParam: (lastPage) => lastPage.nextCursor, }
    );
    return (
        <div>
            <Head>
                <title>Busqueda - FOURB</title>
            </Head>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
                <InfiniteScroll
                    loading={searchProducts.isFetchingNextPage}
                    next={searchProducts.fetchNextPage}
                    hasMore={!!searchProducts.hasNextPage}
                    refContainer={props.footerRef}
                >
                    {searchProducts.data?.pages.map((pages, index) => {
                        return <Fragment key={index}>{pages.items.filter(product => !product.disabled).map(product => (
                            <ProductList product={product} key={product._id} />
                        ))}
                        </Fragment>
                    })}
                </InfiniteScroll>
            </div>
            {searchProducts.hasNextPage ? (
                <strong
                    style={{
                        margin: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    ¡Baja para ver más!
                </strong>
            ) : (
                <strong
                style={{
                    margin: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                ¡Se han mostrado todos los productos de la busqueda!
            </strong>  
            )}
            {searchProducts.isLoading ? <div className="loading" /> : null}
        </div>
    )
}
