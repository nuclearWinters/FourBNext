import { Dispatch, FC, SetStateAction } from "react";
import { DragDropContext, Draggable, DropResult, Droppable } from "react-beautiful-dnd"
import { Combination } from "../server/types";
import { ModalField } from "./ModalField";
import { CombinationEdit, getItemStyle } from "../pages/inventory-admin";
import drag from '../public/drag.svg'
import Image from "next/image";

export const reorderOptions = (
    list: CombinationEdit[],
    startIndex: number,
    endIndex: number,
) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
};

export const DraggableValues: FC<{
    setNewOptions: Dispatch<SetStateAction<{
        options: {
            id: string;
            name: string;
            values: CombinationEdit[];
            type: "string" | "color";
        }[];
        variants: {
            imgs: string[];
            available: string;
            total: string;
            price: string;
            sku: string;
            use_discount: boolean;
            discount_price: string;
            combination: Combination[];
        }[];
    }>>
    values: CombinationEdit[];
    index: number,
    type: "string" | "color"
    newOptions: {
        options: {
            id: string;
            name: string;
            values: CombinationEdit[];
            type: "string" | "color";
        }[];
        variants: {
            imgs: string[];
            available: string;
            total: string;
            price: string;
            sku: string;
            use_discount: boolean;
            discount_price: string;
            combination: Combination[];
        }[];
    }
}> = ({
    setNewOptions,
    values,
    index,
    type,
    newOptions,
}) => {
        const onDragEndNewValues = (result: DropResult) => {
            if (!result.destination) {
                return;
            }
            const items = reorderOptions(
                values,
                result.source.index,
                result.destination.index
            );
            setNewOptions(state => {
                state.options[index].values = items
                return ({
                    ...state,
                    options: [
                        ...state.options,
                    ]
                })
            })
        }
        return <DragDropContext onDragEnd={onDragEndNewValues}>
            <Droppable droppableId="droppable" direction="horizontal">
                {(provided) => (
                    <div
                        ref={provided.innerRef}
                        style={{
                            display: 'flex',
                            padding: 8,
                            overflow: 'auto',
                            flexDirection: 'column',
                        }}
                        {...provided.droppableProps}
                    >
                        {values.map((value, idxValue) => (
                            <Draggable key={value.id} draggableId={value.id} index={index}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        style={getItemStyle(
                                            snapshot.isDragging,
                                            provided.draggableProps.style
                                        )}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30 }}>
                                                <Image src={drag} alt="" />
                                            </div>
                                            <ModalField
                                                focusOnMount={value.focus}
                                                label=""
                                                disabled={type === "color"}
                                                id={`${index}-${idxValue}-option-value`}
                                                key={value.id}
                                                value={value.name === "Dorado" ? "#FFD700" : value.name === "Plateado" ? "#C0C0C0" : value.name}
                                                type={type === "color" ? "color" : "text"}
                                                onChange={(event) => {
                                                    if (event.target.value === "") {
                                                        const nextOptions = [...newOptions.options]
                                                        nextOptions[index].values.splice(idxValue)
                                                        setNewOptions({ ...newOptions, options: nextOptions })
                                                    } else {
                                                        const nextOptions = [...newOptions.options]
                                                        nextOptions[index].values[idxValue].name = event.target.value
                                                        setNewOptions({ ...newOptions, options: nextOptions })
                                                    }
                                                }}
                                                placeholder="Añadir otro valor"
                                            />
                                        </div>
                                    </div>
                                )}
                            </Draggable>
                        ))
                        }
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    }