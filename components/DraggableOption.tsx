import React, { Dispatch, FC, SetStateAction, useRef } from "react";
import { DropTargetMonitor, useDrag, useDrop } from "react-dnd";
import { DropZoneValues } from "./DropZoneValues";
import { CombinationEdit } from "../pages/inventory-admin";
import Image from "next/image";
import { ModalField } from "./ModalField";
import { Combination } from "../server/types";
import { nanoid } from "nanoid";

export const DraggableOption: FC<{
    option: {
        id: string;
        name: string;
        values: CombinationEdit[];
        type: "string" | "color";
    }
    moveRow: (dragIndex: number, hoverIndex: number) => void
    index: number
    setForm: Dispatch<SetStateAction<{
        name: string;
        description: string;
        use_variants: boolean;
        tags: string[];
        options: {
            id: string;
            name: string;
            values: CombinationEdit[];
            type: "string" | "color";
        }[];
        variants: {
            imgs: string[];
            qty: string;
            price: string;
            sku: string;
            use_discount: boolean;
            discount_price: string;
            combination: Combination[];
        }[];
    }>>
}> = ({ option, moveRow, index, setForm }) => {
    const { id, values } = option;
    const ref = useRef<HTMLDivElement | null>(null);
    const [collectedProps, drop] = useDrop(() => ({
        accept: "option",
        collect: (monitor: DropTargetMonitor) => {
            return {
                handlerId: monitor.getHandlerId()
            };
        },
        hover: (item: { index: number, id: string, race: string, classType: string }, monitor) => {
            if (!ref.current) {
                return;
            }
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) {
                return;
            }
            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleY =
                (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            if (clientOffset) {
                const hoverClientY = clientOffset.y - hoverBoundingRect.top;
                if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
                    return;
                }
                if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
                    return;
                }
                moveRow(dragIndex, hoverIndex);
                item.index = hoverIndex;
            }
        }
    }));
    const [collectedDragProps, drag] = useDrag({
        type: "option",
        item: () => {
            return { id, index };
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging()
        })
    });
    const bgColor = collectedDragProps.isDragging ? "gray" : "";
    drag(drop(ref));
    console.log('type:', option.type)
    return (
        <div
            ref={ref}
            style={{
                width: "50%",
                padding: "2px 12px",
                backgroundColor: bgColor
            }}
            data-handler-id={collectedProps.handlerId}
        >
            <div style={{ display: 'flex', flexDirection: 'row', paddingBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30 }}>
                    <Image src={'/drag.svg'} alt="" width={30} height={60} />
                </div>
                <div style={{ display: 'flex', flexDirection: "column" }}>
                    <ModalField
                        id={`${id}-option-name`}
                        label={option.type === "color" ? "Nombre de la opción de color" : "Nombre de la opción"}
                        required
                        name="name"
                        type="text"
                        value={option.name}
                        onChange={(e) => {
                            setForm(form => {
                                form.options[index].name = e.target.value
                                return {
                                    ...form,
                                }
                            })
                        }}
                    />
                    <div style={{ paddingBottom: 8 }}>Valores de la opción</div>
                    <DropZoneValues
                        optionIndex={index}
                        optionId={id}
                        values={values}
                        setForm={setForm}
                        type={option.type}
                    />
                    {option.type === "string" ? <input
                        value=""
                        onChange={(event) => {
                            setForm(form => {
                                const newOptions = [...form.options]
                                newOptions[index].values.push({
                                    id: nanoid(5),
                                    name: event.target.value,
                                    focus: true,
                                })
                                return { ...form, options: newOptions }
                            })
                        }}
                        placeholder="Añadir otro valor"
                    />: null}
                </div>
                <button
                    style={{ width: 60, display: 'flex', padding: 20, alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onClick={() => {
                        setForm(form => {
                            form.options.splice(index, 1)
                            return { ...form, options: [...form.options] }
                        })
                    }}
                >
                    <Image src={'/trash-can.svg'} alt="" width={20} height={30} />
                </button>
            </div>
        </div>
    );
}