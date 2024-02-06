import React, { Dispatch, FC, SetStateAction, useRef } from "react";
import { DropTargetMonitor, useDrag, useDrop } from "react-dnd";
import { CombinationEdit } from "../pages/inventory-admin";
import { ModalField } from "./ModalField";
import { Combination } from "../server/types";

export const DraggableValuesEdit: FC<{
  type: "string" | "color"
  optionIndex: number
  optionId: string
  value: CombinationEdit
  moveRow: (dragIndex: number, hoverIndex: number) => void
  index: number
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
      total: string;
      price: string;
      sku: string;
      use_discount: boolean;
      discount_price: string;
      combination: Combination[];
    }[];
  }>>
}> = ({ value, moveRow, index, optionId, optionIndex, setForm, type }) => {
  const { id } = value;
  const ref = useRef<HTMLDivElement | null>(null);
  const [collectedProps, drop] = useDrop(() => ({
    accept: `value-${optionId}`,
    collect: (monitor: DropTargetMonitor) => {
      return {
        handlerId: monitor.getHandlerId()
      };
    },
    hover: (item: { index: number }, monitor) => {
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
    type: `value-${optionId}`,
    item: () => {
      return { id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });
  const bgColor = collectedDragProps.isDragging ? "gray" : "";
  drag(drop(ref));

  return (
    <div
      ref={ref}
      style={{
        padding: "2px 12px",
        backgroundColor: bgColor
      }}
      data-handler-id={collectedProps.handlerId}
    >
      <ModalField
        focusOnMount={value.focus}
        label=""
        disabled={type === "color"}
        id={`${optionId}-${id}-option-value`}
        key={value.id}
        value={value.name === "Dorado" ? "#FFD700" : value.name === "Plateado" ? "#C0C0C0" : value.name}
        type={type === "color" ? "color" : "text"}
        onChange={(event) => {
          if (event.target.value === "") {
            setForm(form => {
              const newOptions = [...form.options]
              newOptions[optionIndex].values.splice(index)
              return { ...form, options: newOptions }
            })
          } else {
            setForm(form => {
              const newOptions = [...form.options]
              newOptions[optionIndex].values[index].name = event.target.value
              return { ...form, options: newOptions }
            })
          }
        }}
        placeholder="Añadir otro valor"
      />
    </div>
  );
}