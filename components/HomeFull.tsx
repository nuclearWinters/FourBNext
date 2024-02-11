import Link from "next/link"
import { FC, useState } from "react"
import { trpc } from "../utils/config"
import { toast } from "react-toastify"
import { HomeNames } from "../server/types"
import { Modal } from "./Modal"
import { ModalClose } from "./ModalClose"
import css from './Layout.module.css'
import Image from "next/image"
import picture from '../public/picture.svg'

export const HomeFull: FC<{
  src: string
  moreButtonLink?: string
  name: HomeNames
  isAdmin?: boolean
}> = ({ src, moreButtonLink, name, isAdmin }) => {
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
      height: 518,
      backgroundSize: 'cover',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flexDirection: 'column',
      backgroundPosition: 'center',
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
    {moreButtonLink ? <Link
      href={moreButtonLink}
      style={{
        background: "rgb(253, 240, 224)",
        border: "none",
        color: "black",
        fontSize: '24px',
        lineHeight: '33px',
        padding: '4px 10px',
        cursor: "pointer",
        textAlign: 'center',
        borderRadius: '100px',
        marginBottom: '66px'
      }}
    >
      VER TODO LO NUEVO
    </Link> : null}
  </div>
}