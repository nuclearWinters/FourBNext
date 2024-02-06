import React, { Dispatch, FC, SetStateAction, useCallback } from "react";
import { CombinationEdit } from "../pages/inventory-admin";
import { Combination } from "../server/types";
import { DraggableOptionEdit } from "./DraggableOptionEdit";

export const DropZoneOptionsEdit: FC<{
    options: {
        id: string;
        name: string;
        values: CombinationEdit[];
        type: "string" | "color";
    }[]
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
            <DraggableOptionEdit
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