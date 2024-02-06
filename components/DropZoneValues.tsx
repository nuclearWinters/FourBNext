import React, { Dispatch, FC, SetStateAction, useCallback, useState } from "react";
import { DraggableValues } from "./DraggableValues1";
import { CombinationEdit } from "../pages/inventory-admin";
import { Combination } from "../server/types";

export const DropZoneValues: FC<{
    type: "string" | "color"
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
            <DraggableValues
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
