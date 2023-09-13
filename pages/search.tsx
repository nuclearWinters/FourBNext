import { trpc } from '../utils/config';
import { Fragment } from 'react';
import { ProductList } from '../components/ProductList';
import { useSearchParams } from 'next/navigation'
import { InfiniteScroll } from '../components/InfiniteScroll';

export default function Search() {
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
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
                <InfiniteScroll
                    loading={searchProducts.isFetchingNextPage}
                    next={searchProducts.fetchNextPage}
                    hasMore={!!searchProducts.hasNextPage}
                >
                {searchProducts.data?.pages.map((pages, index) => {
                    return <Fragment key={index}>{pages.items.map(product => (
                        <ProductList product={product} key={product._id} />
                    ))}
                    </Fragment>
                })}
                </InfiniteScroll>
            </div>
            {searchProducts.isLoading ? <div className="loading" /> : null}
        </div>
    )
}
