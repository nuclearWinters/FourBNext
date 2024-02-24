import Link from "next/link"
import { FC, ReactNode, useState } from "react"
import { trpc } from "../utils/config";
import { toast } from "react-toastify";
import { Modal } from "./Modal";
import { ModalClose } from "./ModalClose";
import css from './Layout.module.css'
import picture from '../public/picture.svg'
import { HomeNames } from "../server/types";
import Image from "next/image"

export const HomeHalf: FC<{
    src: string;
    moreButtonLink?: string
    title?: ReactNode
    name: HomeNames
    isAdmin?: boolean
}> = ({ src, moreButtonLink, title, name, isAdmin }) => {
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
    return <div style={{
        flex: 1,
        backgroundImage: `url(${src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexDirection: 'column',
        position: 'relative',
    }}>
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
        {title}
        {moreButtonLink ? <Link
            href={moreButtonLink}
            style={{
                background: "rgb(253, 240, 224)",
                border: "none",
                color: "black",
                fontSize: '24px',
                lineHeight: '33px',
                padding: '8px 60px',
                cursor: "pointer",
                textAlign: 'center',
                borderRadius: '100px',
                marginBottom: '66px',
            }}
        >
            VER MÁS
        </Link> : null}
    </div>
}