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
import { ModalTextArea } from "./ModalTextArea";

export const HomeHalf: FC<{
    src: string;
    moreButtonLink?: string
    title?: ReactNode
    name: HomeNames
    isAdmin?: boolean
    nameLink: string
}> = ({ src, moreButtonLink, title, name, isAdmin, nameLink }) => {
    const [form, setForm] = useState({ name: '', description: '' })
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
    const addOrEditDescription = trpc.addOrEditDescription.useMutation({
        onSuccess: () => {
            window.location.reload()
        },
        onError: (e) => {
            toast.error(e.message)
        }
    })
    return <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexDirection: 'column',
        position: 'relative',
    }}>
        <Image
            src={src}
            alt=""
            height={658}
            width={600}
            style={{
                position: 'absolute',
                objectFit: 'cover',
                left: 0,
                right: 0,
                bottom: 0,
                top: 0,
                width: '100%',
                objectPosition: 'center',
                zIndex: -1,
                height: '100%',
            }}
        />
        {form.name ? <Modal onClose={() => {
            setForm({ name: '', description: '' })
        }}>
            <ModalClose
                onClose={() => {
                    setForm({ name: '', description: '' })
                }}
                title={"Cambiar Link"}
            >
                <form className={css["auth-form"]}>
                    <div style={{ marginLeft: 20 }}>
                        <ModalTextArea
                            id="description"
                            label="Descripción"
                            required
                            name="description"
                            value={form.description}
                            onChange={(e) => {
                                setForm(state => ({ ...state, [e.target.name]: e.target.value }))
                            }}
                        />
                    </div>
                    <button
                        className={css["fourb-button"]}
                        onClick={(e) => {
                            e.preventDefault()
                            addOrEditDescription.mutate(form)
                        }}
                        type="submit"
                    >
                        Actualizar
                    </button>
                </form>
            </ModalClose>
        </Modal> : null}
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
        {isAdmin ? <button
            className='fourb-button'
            style={{
                position: 'absolute',
                top: 60,
                right: 0,
                background: 'white',
                border: 'none',
                cursor: 'pointer',
                margin: '10px',
                color: 'black',
            }}
            onClick={() => {
                setForm({ name: nameLink, description: moreButtonLink ?? '' })
            }}
        >
            Editar link
        </button> : null}
        {title}
        
    </div>
}
