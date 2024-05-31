import React, { FC, MutableRefObject, ReactNode, useEffect, useRef, useState } from "react";

export const InfiniteScroll: FC<{
    next: () => void,
    children: ReactNode
    loading: boolean
    hasMore: boolean
    refContainer: MutableRefObject<HTMLDivElement | null>
}> = ({ next, children, loading, hasMore, refContainer }) => {
    const moreProductsLeft = useRef(true)
    useEffect(() => {
        moreProductsLeft.current = hasMore
    }, [hasMore])
    useEffect(() => {
        const removeInfiniteScroll = () => {
            window.removeEventListener("scroll", handleInfiniteScroll);
        };
        let throttleTimer = false;
        const throttle = (callback: () => void, time: number) => {
            if (throttleTimer) return;
            throttleTimer = true;
            setTimeout(() => {
                callback();
                throttleTimer = false;
            }, time);
        };
        const handleInfiniteScroll = () => {
            throttle(async () => {
                const endOfPage = Math.ceil(window.innerHeight + window.scrollY) >= (document.body.offsetHeight - (refContainer.current?.offsetHeight || 0));
                if (endOfPage) {
                    next();
                }
                if (!moreProductsLeft.current) {
                    removeInfiniteScroll();
                }
            }, 1000);
        };
        window.addEventListener("scroll", handleInfiniteScroll)
        return () => {
            window.removeEventListener("scroll", handleInfiniteScroll);
        }
    }, [])
    return <>
        {children}
    </>
}