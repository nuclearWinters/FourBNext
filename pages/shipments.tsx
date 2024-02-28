import { FC, useState } from "react"
import { DescriptionsDBTRPC } from "./refunds"
import { trpc } from "../utils/config"
import { toast } from "react-toastify"
import { ModalClose } from "../components/ModalClose"
import { Modal } from "../components/Modal"
import { ModalTextArea } from "../components/ModalTextArea"
import css from '../components/Layout.module.css'
import { descriptions } from "./api/trpc/[trpc]"

export const Shipments: FC<{ answers: DescriptionsDBTRPC[] }> = ({ answers }) => {
    const user = trpc.getUser.useQuery()
    const isAdmin = user.data?.is_admin
    const [form, setForm] = useState({ name: '', description: '' })
    const answer1 = answers.find(answer => answer.name === 'entrega1')
    const answer2 = answers.find(answer => answer.name === 'entrega2')
    const answer3 = answers.find(answer => answer.name === 'entrega3')
    const addOrEditDescription = trpc.addOrEditDescription.useMutation({
        onSuccess: () => {
            window.location.reload()
            setForm({ name: '', description: '' })
        },
        onError: (e) => {
            toast.error(e.message)
        }
    })
    return <div style={{ margin: '0px auto', maxWidth: 800, display: 'flex', flexDirection: 'column', gap: '20px', padding: '0px 30px' }}>
        {form.name ? <Modal onClose={() => {
            setForm({ name: '', description: '' })
        }}>
            <ModalClose
                onClose={() => {
                    setForm({ name: '', description: '' })
                }}
                title={"Cambiar Respuesta"}
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
        <h1 style={{ margin: 'auto' }}>Envíos</h1>
        <p><strong>Tiempo de envio</strong></p>
        {isAdmin ? (
            <button onClick={() => setForm({ name: 'entrega1', description: answer1?.description ?? 'El tiempo de entrega es de 3 a 5 días hábiles(lunes-viernes). Enviamos con DHL Express. El tiempo de entrega podría variar por alta demanda o zona extendida.' })}>
                Editar
            </button>
        ) : null}
        {answer1
            ? <p>{answer1.description}</p>
            : <p>
                El tiempo de entrega es de 3 a 5 días hábiles(lunes-viernes). Enviamos con DHL Express. El tiempo de entrega podría variar por alta demanda o zona extendida.
            </p>
        }
        <p><strong>Costo de envío</strong></p>
        {isAdmin ? (
            <button onClick={() => setForm({ name: 'entrega2', description: answer2?.description ?? 'Nuestro envío es de $119 pesos a todo México y tenemos envío gratis a partir de $599.00' })}>
                Editar
            </button>
        ) : null}
        {answer2
            ? <p>{answer2.description}</p>
            : <p>
                Nuestro envío es de $119 pesos a todo México y tenemos envío gratis a partir de $599.00
            </p>
        }
        <p><strong>Cuál es el proceso de envío</strong></p>
        {isAdmin ? (
            <button onClick={() => setForm({ name: 'entrega3', description: answer3?.description ?? 'Te enviaremos un correo electrónico con la confirmación de tu pedido, después de que tengamos preparado tu pedido te enviaremos un correo con la información de tu envío y el enlace para poder rastrear tu pedido y por último la empresa encargada del envío (DHL/Treggo para CDMX) se podrá poner en contacto contigo vía E-mail o por teléfono para darte más detalles de tu entrega. Si deseas que tu paquete llegue a sucursal por favor avisanos antes de realizar tu pedido, te asesoraremos con dirección, tiempos de envío, etc.' })}>
                Editar
            </button>
        ) : null}
        {answer3
            ? <p>{answer3.description}</p>
            : <p>
                Te enviaremos un correo electrónico con la confirmación de tu pedido, después de que tengamos preparado tu pedido te enviaremos un correo con la información de tu envío y el enlace para poder rastrear tu pedido y por último la empresa encargada del envío (DHL/Treggo para CDMX) se podrá poner en contacto contigo vía E-mail o por teléfono para darte más detalles de tu entrega. Si deseas que tu paquete llegue a sucursal por favor avisanos antes de realizar tu pedido, te asesoraremos con dirección, tiempos de envío, etc.
            </p>
        }
    </div>
}

export default Shipments

export const getStaticProps = async () => {
    const answers = await descriptions.find({ name: { $in: ['entrega1', 'entrega2', 'entrega3'] } }).toArray()
    return {
        props: {
            answers: answers.map(answer => ({
                ...answer,
                _id: answer._id.toHexString()
            }))
        }
    }
}