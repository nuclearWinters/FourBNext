import React, { Component, FC, ReactNode } from "react";
import chevron from '../public/chevron.svg'
import Image from "next/image";

export const CarouselContainer: FC<{
    sliding: boolean,
    children: ReactNode,
    direction: 'prev' | 'next'
}> = ({ sliding, children, direction }) => {
    return (
        <div style={{
            display: 'flex',
            margin: '0px 0px 0px 0px',
            transition: sliding ? "none" : "transform 1s ease",
            transform: !sliding
                ? "translateX(calc(-25%))"
                : direction === "prev"
                    ? "translateX(calc(2 * (-25%)))"
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
    return (
        <div style={{
            flex: '1 0 25%',
            marginRight: '0px',
            order,
        }}>
            {children}
        </div>
    )
}

class Carousel extends Component<{ children: any[] }, { direction: 'prev' | 'next', position: number, sliding: boolean }> {
    constructor(props: { children: any[] }) {
        super(props);
        this.state = {
            position: 0,
            direction: props.children.length === 2 ? "prev" : "next",
            sliding: false
        };
    }

    getOrder(itemIndex: number) {
        const { position } = this.state;
        const { children } = this.props;
        const numItems = children.length;

        if (numItems === 2) return itemIndex;

        if (itemIndex - position < 0)
            return numItems - Math.abs(itemIndex - position);
        return itemIndex - position;
    }

    doSliding = (direction: 'prev' | 'next', position: number) => {
        this.setState({
            sliding: true,
            direction,
            position
        });

        setTimeout(() => {
            this.setState({
                sliding: false
            });
        }, 50);
    };

    nextSlide = () => {
        const { position } = this.state;
        const { children } = this.props;
        const numItems = children.length;

        if (numItems === 2 && position === 1) return;

        this.doSliding("next", position === numItems - 1 ? 0 : position + 1);
    };

    prevSlide = () => {
        const { position } = this.state;
        const { children } = this.props;
        const numItems = children.length;

        if (numItems === 2 && position === 0) return;

        this.doSliding("prev", position === 0 ? numItems - 1 : position - 1);
    };

    render() {
        const { children } = this.props;
        const { sliding, direction } = this.state;

        return (
            <div
                style={{
                    margin: '0px 100px',
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
                    onClick={() => this.prevSlide()}
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
                                order={this.getOrder(index)}
                            >
                                {child}
                            </CarouselSlot>
                        ))}
                    </CarouselContainer>
                </Wrapper>
                <button
                    onClick={() => this.nextSlide()}
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
}

export default Carousel;