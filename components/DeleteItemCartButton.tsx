import { FC, useState } from "react"
import { trpc } from "../utils/config";
import { Modal } from "./Modal";
import { ModalClose } from "./ModalClose";
import { toast } from "react-toastify";

export const DeleteItemCartButton: FC<{
    items_by_cart_id: string;
    onSuccess: () => void;
    text: string;
}> = ({
    items_by_cart_id,
    onSuccess,
    text,
}) => {
        const [showModal, setShowModal] = useState(false)
        const onCloseCallback = () => {
            setShowModal(false)
        }
        const deleteItemFromCart = trpc.deleteItemFromCart.useMutation({
            onSuccess: () => {
                toast.success('Carrito actualizado con exito.')
            },
            onError: (e) => {
                toast.error(e.message)
            }
        })
        return <div>
            <button className="fourb-button" onClick={() => {
                setShowModal(true)
            }}>
                {text}
            </button>
            {showModal ? <Modal onClose={onCloseCallback}>
                <ModalClose onClose={onCloseCallback} title={"Confirmar"}>
                    <div style={{ marginBottom: 20 }}>¿Estas seguro que quieres realizar este cambio?</div>
                    <button
                        onClick={async () => {
                            try {
                                await deleteItemFromCart.mutateAsync({
                                    items_by_cart_id: items_by_cart_id,
                                })
                                onSuccess()
                                setShowModal(false)
                            } catch(e) {

                            }
                        }}
                        className="fourb-button"
                    >
                        Confirmar
                    </button>
                </ModalClose>
            </Modal > : null}
        </div >
    }