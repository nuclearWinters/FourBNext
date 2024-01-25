import React, { FC, ReactNode, useState } from "react";
import chevron from '../public/chevron.svg'
import Image from "next/image";
import { useMediaQuery } from "../hooks/mediaQuery";

export const CarouselContainer: FC<{
    sliding: boolean,
    children: ReactNode,
    direction: 'prev' | 'next'
}> = ({ sliding, children, direction }) => {
    const isMobile1000 = useMediaQuery('(max-width: 1000px)')
    const isMobile800 = useMediaQuery('(max-width: 800px)')
    const isMobile600 = useMediaQuery('(max-width: 600px)')
    return (
        <div style={{
            display: 'flex',
            margin: '0px 0px 0px 0px',
            transition: sliding ? "none" : "transform 1s ease",
            transform: !sliding
                ? `translateX(calc(-${isMobile600 ? "100%" : isMobile800 ? "50%" : isMobile1000 ? "33%" : "25%" }))`
                : direction === "prev"
                    ? `translateX(calc(2 * (-${isMobile600 ? "100%" : isMobile800 ? "50%" : isMobile1000 ? "33%" : "25%" })))`
                    : "translateX(0%)"

        }}>
            {children}
        </div>
    )
}

export const Wrapper: FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <div style={{
            width: '100%',
            overflow: 'hidden',
        }}>
            {children}
        </div>
    )
}

export const CarouselSlot: FC<{ children: ReactNode, order: number }> = ({ order, children }) => {
    const isMobile1000 = useMediaQuery('(max-width: 1000px)')
    const isMobile800 = useMediaQuery('(max-width: 800px)')
    const isMobile600 = useMediaQuery('(max-width: 600px)')
    return (
        <div style={{
            flex: `1 0 ${isMobile600 ? "100%" : isMobile800 ? "50%" : isMobile1000 ? "33%" : "25%" }`,
            marginRight: '0px',
            order,
        }}>
            {children}
        </div>
    )
}

const Carousel: FC<{
    children: ReactNode[]
}> = ({ children }) => {
    const [position, setPosition] = useState(0)
    const [direction, setDirection] = useState<"prev" | "next">(children?.length === 2 ? "prev" : "next")
    const [sliding, setSliding] = useState(false)

    const getOrder = (itemIndex: number) => {
        const numItems = children.length;

        if (numItems === 2) return itemIndex;

        if (itemIndex - position < 0)
            return numItems - Math.abs(itemIndex - position);
        return itemIndex - position;
    }

    const doSliding = (direction: 'prev' | 'next', position: number) => {
        setSliding(true)
        setDirection(direction)
        setPosition(position)

        setTimeout(() => {
            setSliding(false)
        }, 50);
    };

    const nextSlide = () => {
        const numItems = children.length;

        if (numItems === 2 && position === 1) return;

        doSliding("next", position === numItems - 1 ? 0 : position + 1);
    };

    const prevSlide = () => {
        const numItems = children.length;

        if (numItems === 2 && position === 0) return;

        doSliding("prev", position === 0 ? numItems - 1 : position - 1);
    };

    const isMobile = useMediaQuery('(max-width: 800px)')

    return (
        <div
            style={{
                margin: isMobile ? '0px 10px' : '0px 100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <button
                style={{
                    background: 'transparent',
                    border: 'none',
                    transform: 'rotate(180deg)',
                    height: '51px',
                    width: '27px',
                    padding: '0px',
                    marginRight: '16px',
                    cursor: 'pointer',
                }}
                onClick={() => prevSlide()}
            >
                <Image src={chevron} alt="" height={51} width={27} />
            </button>
            <Wrapper>
                <CarouselContainer
                    sliding={sliding}
                    direction={direction}
                >
                    {children.map((child, index) => (
                        <CarouselSlot
                            key={index}
                            order={getOrder(index)}
                        >
                            {child}
                        </CarouselSlot>
                    ))}
                </CarouselContainer>
            </Wrapper>
            <button
                onClick={() => nextSlide()}
                style={{
                    background: 'transparent',
                    border: 'none',
                    height: '51px',
                    width: '27px',
                    padding: '0px',
                    marginLeft: '16px',
                    cursor: 'pointer',
                }}
            >
                <Image src={chevron} alt="" height={51} width={27} />
            </button>
        </div>
    );
}

export default Carousel;