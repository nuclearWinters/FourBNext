import React, { Dispatch, FC, SetStateAction, useCallback, useState } from "react";
import { DraggableOption } from "./DraggableOption";
import { CombinationEdit } from "../pages/inventory-admin";
import { Combination } from "../server/types";

export const DropZoneOptions: FC<{
    options: {
        id: string;
        name: string;
        values: CombinationEdit[];
        type: "string" | "color";
    }[]
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
}> = ({ options, setForm }) => {
    const moveRow = useCallback((dragIndex: number, hoverIndex: number) => {
        setForm(form => {
            const temp = form.options[dragIndex];
            form.options[dragIndex] = form.options[hoverIndex];
            form.options[hoverIndex] = temp;
            return { ...form }
        })
    }, []);

    const renderDndCharacterCards = () =>
        options.map((option, index) => (
            <DraggableOption
                index={index}
                key={option.id}
                option={option}
                moveRow={moveRow}
                setForm={setForm}
            />
        ));

    return (
        <div>
            {renderDndCharacterCards()}
        </div>
    );
}
