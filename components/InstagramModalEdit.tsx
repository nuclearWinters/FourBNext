import { FC, useState } from "react";
import css from './Layout.module.css'
import picture from '../public/picture.svg'
import { HomeNames } from "../server/types";
import Image from "next/image"
import { trpc } from "../utils/config";
import { toast } from "react-toastify";
import { Modal } from "./Modal";
import { ModalClose } from "./ModalClose";
import { ModalField } from "./ModalField";


export const InstagramModalEdit: FC<{ name: HomeNames, isAdmin?: boolean }> = ({ name, isAdmin }) => {
    const [showImageModal, setShowImageModal] = useState(false)
    const updateHome = trpc.updateHome.useMutation({
        onSuccess: () => {
            toast.success('Imagen actualizada con éxito.')
            setShowImageModal(false)
            window.location.reload()
        },
        onError: (e) => {
            toast.error(e.message)
        }
    })
    const [newURL, setNewURL] = useState('')
    return <>
        {showImageModal ? <Modal onClose={() => {
            setShowImageModal(false)
        }}>
            <ModalClose onClose={() => {
                setShowImageModal(false)
            }} title={"Cambiar imagen"}>
                <form className={css["auth-form"]}>
                    <div style={{ marginLeft: 20 }}>
                        <ModalField
                            id="code"
                            label="Code"
                            required
                            name="code"
                            type="text"
                            value={newURL}
                            onChange={(e) => {
                                setNewURL(e.target.value)
                            }}
                        />
                    </div>
                    <button
                        className={css["fourb-button"]}
                        onClick={(e) => {
                            e.preventDefault()
                            updateHome.mutate({ url: newURL, name })
                        }}
                        type="submit"
                    >
                        Actualizar
                    </button>
                </form>
            </ModalClose>
        </Modal> : null}
        {isAdmin ? <button
            style={{
                position: 'absolute',
                top: 0,
                right: 0,
                background: 'white',
                border: 'none',
                cursor: 'pointer',
                margin: '10px',
            }}
            onClick={() => {
                setShowImageModal(true)
            }}
        >
            <Image src={picture} alt="" height={51} width={27} />
        </button> : null}
    </>
}
