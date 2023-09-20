import { FC, useState } from "react"
import { trpc } from "../utils/config";
import { Modal } from "./Modal";
import { ModalClose } from "./ModalClose";

export const UpdateCartButton: FC<{
    cartId: string;
    onSuccess: () => void;
    status: 'waiting' | 'paid' | null;
    delivered: boolean | null;
    sent: boolean | null;
    text: string;
}> = ({
    cartId,
    status,
    onSuccess,
    delivered,
    sent,
    text,
}) => {
        const [showModal, setShowModal] = useState(false)
        const onCloseCallback = () => {
            setShowModal(false)
        }
        const confirmCartAsPaid = trpc.updateCart.useMutation()
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
                                await confirmCartAsPaid.mutateAsync({
                                    cart_id: cartId,
                                    status: typeof status === "string" ? (status === "paid" ? "waiting" : "paid") : null,
                                    delivered: typeof delivered === "boolean" ? !delivered : null,
                                    sent: typeof sent === "boolean" ? !sent : null,
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