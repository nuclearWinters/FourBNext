import { FC, useState } from "react"
import { trpc } from "../utils/config"
import { Modal } from "../components/Modal"
import { ModalClose } from "../components/ModalClose"
import css from '../components/Layout.module.css'
import { ModalTextArea } from "../components/ModalTextArea"
import { descriptions } from "./api/trpc/[trpc]"
import { Modify } from "./product/[id]"
import { DescriptionsDBMongo } from "../server/types"
import { toast } from "react-toastify"

export type DescriptionsDBTRPC = Modify<DescriptionsDBMongo, {
    _id: string
}>

export const Shipments: FC<{ answers: DescriptionsDBTRPC[] }> = ({ answers }) => {
    const user = trpc.getUser.useQuery()
    const isAdmin = user.data?.is_admin
    const [form, setForm] = useState({ name: '', description: '' })
    const answer1 = answers.find(answer => answer.name === 'devolucion1')
    const answer2 = answers.find(answer => answer.name === 'devolucion2')
    const answer3 = answers.find(answer => answer.name === 'devolucion3')
    const answer4 = answers.find(answer => answer.name === 'devolucion4')
    const addOrEditDescription = trpc.addOrEditDescription.useMutation({
        onSuccess: () => {
            window.location.reload()
            setForm({ name: '', description: '' })
        },
        onError: (e) => {
            toast.error(e.message)
        }
    })
    return (
        <div style={{ margin: '0px auto', maxWidth: 800, display: 'flex', flexDirection: 'column', gap: '20px', padding: '0px 30px' }}>
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
            <h1 style={{ margin: 'auto' }}>Cambios y devoluciones</h1>
            <p><strong>¿Qué pasa si llegó incorrecto, incompleto o dañado mi pedido?</strong></p>
            {isAdmin ? (
                <button onClick={() => setForm({ name: 'devolucion1', description: answer1?.description ?? 'Si te llego tu pedido incompleto o incorrecto, no te preocupes te enviaremos tus piezas faltantes o haremos el cambio gratuitamente, siempre y cuando nos hayas devuelto primero los productos del pedido equivocado, en el estado en el que los recibiste. Nosotros te ayudaremos con este proceso y si es necesario enviaremos una guía pre-pagada para poder hacer los cambios necesarios. Únicamente en Aretes y Piercings no aceptamos devoluciones por higiene. Si tu producto llegó defectuoso o dañado escríbenos para evaluar la situación. Para daños de producto, se debe notificar en las primeras 24 hrs de recibir tu pedido. Si transcurren más horas, nos reservamos el derecho de cambiar o reemplazar el producto. Escríbenos por correo o cualquiera de nuestras redes sociales para ayudarte con el cambio.' })}>
                    Editar
                </button>
            ) : null}
            {answer1
                ? <p>{answer1.description}</p>
                : <p>
                    Si te llego tu pedido incompleto o incorrecto, no te preocupes te enviaremos tus piezas faltantes o haremos el cambio gratuitamente, siempre y cuando nos hayas devuelto primero los productos del pedido equivocado, en el estado en el que los recibiste. Nosotros te ayudaremos con este proceso y si es necesario enviaremos una guía pre-pagada para poder hacer los cambios necesarios. Únicamente en Aretes y Piercings no aceptamos devoluciones por higiene. Si tu producto llegó defectuoso o dañado escríbenos para evaluar la situación. Para daños de producto, se debe notificar en las primeras 24 hrs de recibir tu pedido. Si transcurren más horas, nos reservamos el derecho de cambiar o reemplazar el producto. Escríbenos por correo o cualquiera de nuestras redes sociales para ayudarte con el cambio.
                </p>
            }
            <p><strong>¿Se pueden hacer cambios de talla?</strong></p>
            {isAdmin ? (
                <button onClick={() => setForm({
                    name: 'devolucion2',
                    description: answer2?.description ?? 'Claro que sí, los accidentes pasan, podemos ayudarte a hacer el cambio correcto de tu talla siempre y cuando el producto sea el mismo, se regrese el producto original con los empaques originales y sin usar. Los costos de los envíos del cambio serán cubiertos por el cliente. Considera que se necesitarán dos envíos para realizar el cambio. Se tiene que notificar el cambio en las primeras 72 hrs de haber recibido el pedido. Escríbenos por correo a: fourboutiquemx@gmail.com En asunto agrega tu número de pedido para ayudarte con el cambio. No aplica garantía ni cambios para productos en venta final o regalos por promoción.',
                })}>
                    Editar
                </button>
            ) : null}
            {answer2
                ? <p>{answer2.description}</p>
                : <p>
                    Claro que sí, los accidentes pasan, podemos ayudarte a hacer el cambio correcto de tu talla siempre y cuando el producto sea el mismo, se regrese el producto original con los empaques originales y sin usar. Los costos de los envíos del cambio serán cubiertos por el cliente. Considera que se necesitarán dos envíos para realizar el cambio. Se tiene que notificar el cambio en las primeras 72 hrs de haber recibido el pedido. Escríbenos por correo a: fourboutiquemx@gmail.com En asunto agrega tu número de pedido para ayudarte con el cambio. No aplica garantía ni cambios para productos en venta final o regalos por promoción.
                </p>
            }
            <p><strong>¿Qué pasa si mi paquete se regreso a FOURB?</strong></p>
            {isAdmin ? (
                <button onClick={() => setForm({
                    name: 'devolucion3',
                    description: answer3?.description ?? 'En nuestro correo de confirmación especificamos estar pendiente de tu paquete, una vez que tu paquete haya llegado a su destino, si es necesario y DHL necesita más información de tu dirección, hay que llamarles para dar los datos necesarios o programar una entrega en las instalaciones de la paquetería. Si tu paquete ya fue devuelto a nosotros: a) Hay que pagar el envío de regreso a ti, este tiene un costo de $137 pesos. b) Si solicitas la devolución de tu dinero no se regresará el costo del envío o se restará de tu pedido. El monto es de $137 pesos, ya que este envío ya fue utilizado.',
                })}>
                    Editar
                </button>
            ) : null}
            {answer3
                ? <p>{answer3.description}</p>
                : <p>
                    En nuestro correo de confirmación especificamos estar pendiente de tu paquete, una vez que tu paquete haya llegado a su destino, si es necesario y DHL necesita más información de tu dirección, hay que llamarles para dar los datos necesarios o programar una entrega en las instalaciones de la paquetería. Si tu paquete ya fue devuelto a nosotros: a) Hay que pagar el envío de regreso a ti, este tiene un costo de $137 pesos. b) Si solicitas la devolución de tu dinero no se regresará el costo del envío o se restará de tu pedido. El monto es de $137 pesos, ya que este envío ya fue utilizado.
                </p>
            }
            <p><strong>¿Se puede hacer un cambio, devolución o cancelación de mi pedido?</strong></p>
            {isAdmin ? (
                <button onClick={() => setForm({
                    name: 'devolucion4',
                    description: answer4?.description ?? 'Para validar tu cambio ó devolución, hay que mandar mensaje a nuestras redes sociales con la solicitud de cambio o devolución. -Si tu pedido ya fue confirmado por correo electrónico no se podrá cancelar, ya que una vez que entra a nuestra página se hacen las preparaciones necesarias para que tu pedido se envíe lo más pronto posible. Si tu pedido no ha sido confirmado aún podrás cancelarlo. -Si quisieras hacer un cambio y tu pedido no ha sido enviado, escríbenos para ayudarte a hacer los arreglos necesarios. Si tu paquete ya se envío y quisieras hacer un cambio al recibirlo: -el artículo debe estar sin usarse, en las mismas condiciones en que lo recibiste y en su empaque original. Si quisieras hacer una devolución por cualquier motivo exento a nosotros, podrás hacerla siempre y cuando se cubran los gastos del envío por parte del cliente. El monto del envío no es reembolsable, en caso de que tu envío fue gratis se ajustará del total. Únicamente en Aretes y Piercings no aceptamos devoluciones por higiene/salud de nuestros clientes. Todos los aretes y piercings son venta final. No aplica garantía ni cambios para productos en venta final o regalos por promoción.',
                })}>
                    Editar
                </button>
            ) : null}
            {answer4
                ? <p>{answer4.description}</p>
                : <p>
                    Para validar tu cambio ó devolución, hay que mandar mensaje a nuestras redes sociales con la solicitud de cambio o devolución. -Si tu pedido ya fue confirmado por correo electrónico no se podrá cancelar, ya que una vez que entra a nuestra página se hacen las preparaciones necesarias para que tu pedido se envíe lo más pronto posible. Si tu pedido no ha sido confirmado aún podrás cancelarlo. -Si quisieras hacer un cambio y tu pedido no ha sido enviado, escríbenos para ayudarte a hacer los arreglos necesarios. Si tu paquete ya se envío y quisieras hacer un cambio al recibirlo: -el artículo debe estar sin usarse, en las mismas condiciones en que lo recibiste y en su empaque original. Si quisieras hacer una devolución por cualquier motivo exento a nosotros, podrás hacerla siempre y cuando se cubran los gastos del envío por parte del cliente. El monto del envío no es reembolsable, en caso de que tu envío fue gratis se ajustará del total. Únicamente en Aretes y Piercings no aceptamos devoluciones por higiene/salud de nuestros clientes. Todos los aretes y piercings son venta final. No aplica garantía ni cambios para productos en venta final o regalos por promoción.
                </p>
            }
        </div>
    )
}

export default Shipments

export const getStaticProps = async () => {
    const answers = await descriptions.find({ name: { $in: ['devolucion1', 'devolucion2', 'devolucion3', 'devolucion4'] } }).toArray()
    return {
        props: {
            answers: answers.map(answer => ({
                ...answer,
                _id: answer._id.toHexString()
            }))
        }
    }
}