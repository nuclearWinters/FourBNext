import Link from "next/link"
import { FC, useState } from "react"
import { trpc } from "../utils/config";
import { toast } from "react-toastify";
import { Modal } from "./Modal";
import { ModalClose } from "./ModalClose";
import css from './Layout.module.css'
import { HomeNames } from "../server/types";
import Image from "next/image"
import picture from '../public/picture.svg'

export const HomeMore: FC<{
    title: string;
    href: string;
    img: JSX.Element;
    name: HomeNames
    isAdmin?: boolean
}> = (collection) => {
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
            display: 'flex',
            flexDirection: 'column',
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
                                    <img className="img-uploaded" alt="" width={"100%"} src={newURL} />
                                </div>
                            </div>
                        ) : null}
                    </div>
                    <button
                        className={css["fourb-button"]}
                        onClick={(e) => {
                            e.preventDefault()
                            updateHome.mutate({ url: newURL, name: collection.name })
                        }}
                        type="submit"
                    >
                        Actualizar
                    </button>
                </form>
            </ModalClose>
        </Modal> : null}
        {collection.isAdmin ? <button
            style={{
                position: 'absolute',
                top: 0,
                right: 0,
                background: 'white',
                border: 'none',
                cursor: 'pointer',
                margin: '10px',
            }}
            onClick={(e) => {
                setShowImageModal(true)
            }}
        >
            <Image src={picture} alt="" height={51} width={27} />
        </button> : null}
        <Link
            href={collection.href}
        >
            {collection.img}
            <div
                style={{
                    fontWeight: '600',
                    color: 'rgb(0, 0, 0)',
                    fontFamily: 'Montserrat',
                    fontSize: '14px',
                    textAlign: 'center',
                    marginTop: '10px',
                    marginBottom: '16px',
                }}
            >
                {collection.title}
            </div>
        </Link>
    </div>
}