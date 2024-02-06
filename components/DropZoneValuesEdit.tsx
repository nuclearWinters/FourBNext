import React, { Dispatch, FC, SetStateAction, useCallback } from "react";
import { CombinationEdit } from "../pages/inventory-admin";
import { Combination } from "../server/types";
import { DraggableValuesEdit } from "./DraggableValuesEdit";

export const DropZoneValuesEdit: FC<{
    type: "string" | "color"
    setForm: Dispatch<SetStateAction<{
        options: {
            id: string;
            name: string;
            values: CombinationEdit[];
            type: "string" | "color";
        }[];
        variants: {
            imgs: string[];
            available: string,
            total: string,
            price: string;
            sku: string;
            use_discount: boolean;
            discount_price: string;
            combination: Combination[];
        }[];
    }>>
    optionId: string
    optionIndex: number
    values: CombinationEdit[]
}> = ({ values, optionId, optionIndex, setForm, type }) => {
    const moveRow = useCallback((dragIndex: number, hoverIndex: number) => {
        setForm(form => {
            const temp = form.options[optionIndex].values[dragIndex];
            form.options[optionIndex].values[dragIndex] = form.options[optionIndex].values[hoverIndex];
            form.options[optionIndex].values[hoverIndex] = temp;
            return { ...form }
        })
    }, []);
    const renderDndCharacterCards = () =>
        values.map((value, index) => (
            <DraggableValuesEdit
                optionIndex={optionIndex}
                optionId={optionId}
                index={index}
                key={value.id}
                value={value}
                moveRow={moveRow}
                setForm={setForm}
                type={type}
            />
        ));
    return (
        <div>
            {renderDndCharacterCards()}
        </div>
    );
}