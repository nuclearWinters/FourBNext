import { FC, useState } from "react"
import { useMediaQuery } from "../hooks/mediaQuery";
import { trpc } from "../utils/config";
import { toast } from "react-toastify";
import css from './Layout.module.css'
import picture from '../public/picture.svg'
import { HomeNames } from "../server/types";
import Image from "next/image"
import { Modal } from "./Modal";
import { ModalClose } from "./ModalClose";

export const HomeFullBig: FC<{ src: string; children: string, name: HomeNames, isAdmin?: boolean }> = ({ src, children, name, isAdmin }) => {
    const isMobile = useMediaQuery('(max-width: 800px)')
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
    const signedUrl = trpc.signedUrl.useMutation()
    const [newURL, setNewURL] = useState('')
    return <div
        style={{
            backgroundImage: `url(${src})`,
            height: 685,
            backgroundSize: 'cover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            backgroundPosition: '50% 56%',
            position: 'relative',
        }}
    >
        {showImageModal ? <Modal onClose={() => {
            setShowImageModal(false)
        }}>
            <ModalClose onClose={() => {
                setShowImageModal(false)
            }} title={"Cambiar imagen"}>
                <form className={css["auth-form"]}>
                    <div style={{ marginLeft: 20 }}>
                        <input title="Subir foto" name="image-big" type="file" accept="png,jpg,jpeg" onChange={async (event) => {
                            const files = event.target.files
                            if (files) {
                                for (const file of files) {
                                    if (file.type) {
                                        try {
                                            const data = await signedUrl.mutateAsync({ fileType: file.type })
                                            const url = new URL(data.uploadUrl);
                                            await fetch(data.uploadUrl, {
                                                method: "PUT",
                                                body: file,
                                            })
                                            setNewURL(url.origin + url.pathname)
                                        } catch (e) {
                                            toast.error('Error while uploading')
                                        }
                                    }
                                }
                            }
                        }} />
                        {newURL ? (
                            <div className="input-container images-container">
                                <div style={{ position: 'relative' }}>
                                    <Image className="img-uploaded" alt="" style={{ width: "100%" }} width={200} height={200} src={newURL} />
                                </div>
                            </div>
                        ) : null}
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
        <div
            style={{
                fontWeight: '400',
                color: 'rgb(255, 255, 255)',
                fontSize: isMobile ? '60px' : '180px',
                textTransform: 'capitalize',
                fontFamily: 'Kage',
            }}
        >
            {children}
        </div>
    </div>
}